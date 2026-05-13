import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'

const AUSTRIA_ID = 601
const LEAGUE_ID = 218
const REQUEST_DELAY_MS = 7000
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY

type PlayerStatisticsItem = {
  player: {
    id: number
    name: string
    firstname: string | null
    lastname: string | null
    age: number | null
    nationality: string | null
    photo: string | null
  }
  statistics: Array<{
    games?: {
      appearences?: number | null
    }
    goals?: {
      total?: number | null
      assists?: number | null
    }
    cards?: {
      yellow?: number | null
      red?: number | null
    }
  }>
}

type PlayersResponse = {
  response: PlayerStatisticsItem[]
  paging: {
    current: number
    total: number
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toNumber(value: number | null | undefined) {
  return value ?? 0
}

export async function GET(request: Request) {
  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const season = Number(new URL(request.url).searchParams.get('season') ?? 2024)

  const players = new Map<number, PlayerStatisticsItem['player']>()
  const statsRows = new Map<number, Record<string, number>>()
  let page = 1
  let totalPages = 1

  try {
    do {
      const response = await axios.get<PlayersResponse>(
        'https://v3.football.api-sports.io/players',
        {
          headers: {
            'x-apisports-key': FOOTBALL_API_KEY,
          },
          params: {
            team: AUSTRIA_ID,
            league: LEAGUE_ID,
            season,
            page,
          },
        }
      )

      totalPages = response.data.paging.total

      for (const item of response.data.response) {
        const seasonStats = item.statistics[0] ?? {}

        players.set(item.player.id, item.player)
        statsRows.set(item.player.id, {
          player_id: item.player.id,
          team_id: AUSTRIA_ID,
          league_id: LEAGUE_ID,
          season,
          appearances: toNumber(seasonStats.games?.appearences),
          goals: toNumber(seasonStats.goals?.total),
          assists: toNumber(seasonStats.goals?.assists),
          yellow_cards: toNumber(seasonStats.cards?.yellow),
          red_cards: toNumber(seasonStats.cards?.red),
        })
      }

      if (page < totalPages) {
        await sleep(REQUEST_DELAY_MS)
      }

      page += 1
    } while (page <= totalPages)
  } catch (error) {
    const apiError = error as AxiosError

    return Response.json(
      {
        success: false,
        message: 'Fehler beim Spieler-Fetch',
        page,
        status: apiError.response?.status,
        apiError: apiError.response?.data,
      },
      { status: 500 }
    )
  }

  const playerRows = Array.from(players.values()).map((player) => ({
    id: player.id,
    name: player.name,
    firstname: player.firstname,
    lastname: player.lastname,
    age: player.age,
    nationality: player.nationality,
    photo_url: player.photo,
  }))

  const { error: playersError } = await supabase
    .from('players')
    .upsert(playerRows)

  if (playersError) {
    return Response.json(
      { success: false, error: playersError },
      { status: 500 }
    )
  }

  const { error: statsError } = await supabase
    .from('player_season_stats')
    .upsert(Array.from(statsRows.values()), {
      onConflict: 'player_id,team_id,league_id,season',
    })

  if (statsError) {
    return Response.json({ success: false, error: statsError }, { status: 500 })
  }

  return Response.json({
    success: true,
    pagesFetched: totalPages,
    players: playerRows.length,
    statsRows: statsRows.size,
  })
}
