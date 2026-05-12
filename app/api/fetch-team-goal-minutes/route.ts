import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'

const LEAGUE_ID = 218
const SEASON = 2024
const REQUEST_DELAY_MS = 7000
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY

type Team = {
  id: number
}

type MinuteStats = Record<
  string,
  {
    total: number | null
    percentage: string | null
  }
>

type TeamStatisticsResponse = {
  response: {
    goals: {
      for: {
        minute: MinuteStats
      }
      against: {
        minute: MinuteStats
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET() {
  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id')
    .order('rank', { ascending: true })

  if (teamsError) {
    return Response.json({ success: false, error: teamsError }, { status: 500 })
  }

  const rows = []

  for (const team of (teams ?? []) as Team[]) {
    try {
      const response = await axios.get<TeamStatisticsResponse>(
        'https://v3.football.api-sports.io/teams/statistics',
        {
          headers: {
            'x-apisports-key': FOOTBALL_API_KEY,
          },
          params: {
            league: LEAGUE_ID,
            season: SEASON,
            team: team.id,
          },
        }
      )

      const goalsFor = response.data.response.goals.for.minute
      const goalsAgainst = response.data.response.goals.against.minute
      const buckets = new Set([
        ...Object.keys(goalsFor),
        ...Object.keys(goalsAgainst),
      ])

      for (const bucket of buckets) {
        rows.push({
          team_id: team.id,
          league_id: LEAGUE_ID,
          season: SEASON,
          bucket,
          goals_for: goalsFor[bucket]?.total ?? 0,
          goals_against: goalsAgainst[bucket]?.total ?? 0,
        })
      }

      await sleep(REQUEST_DELAY_MS)
    } catch (error) {
      const apiError = error as AxiosError

      return Response.json(
        {
          success: false,
          message: 'Fehler beim Tor-Minuten-Fetch',
          teamId: team.id,
          status: apiError.response?.status,
          apiError: apiError.response?.data,
        },
        { status: 500 }
      )
    }
  }

  const { error } = await supabase
    .from('team_goal_minute_stats')
    .upsert(rows, { onConflict: 'team_id,league_id,season,bucket' })

  if (error) {
    return Response.json({ success: false, error }, { status: 500 })
  }

  return Response.json({
    success: true,
    teams: teams?.length ?? 0,
    rows: rows.length,
  })
}
