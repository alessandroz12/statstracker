import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'

const AUSTRIA_ID = 601
const REQUEST_DELAY_MS = 7000
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY

type FixtureStatistic = {
  type: string
  value: number | string | null
}

type TeamStatisticsResponseItem = {
  team: {
    id: number
  }
  statistics: FixtureStatistic[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getStat(stats: FixtureStatistic[], name: string) {
  const stat = stats.find((s) => s.type === name)
  if (!stat || stat.value === null) return null

  if (typeof stat.value === 'string' && stat.value.includes('%')) {
    return Number(stat.value.replace('%', ''))
  }

  return Number(stat.value)
}

export async function GET() {
  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, date')
    .eq('status', 'FT')
    .or(`home_team_id.eq.${AUSTRIA_ID},away_team_id.eq.${AUSTRIA_ID}`)
    .order('date', { ascending: true })

  if (matchError) {
    return Response.json({ success: false, error: matchError })
  }

  const { data: existingStats } = await supabase
    .from('match_team_stats')
    .select('match_id')
    .eq('team_id', AUSTRIA_ID)

  const existingMatchIds = new Set(
    existingStats?.map((row) => row.match_id) ?? []
  )

  const matchesToFetch =
    matches?.filter((match) => !existingMatchIds.has(match.id)) ?? []

  const rows = []

  for (const match of matchesToFetch) {
    try {
      const response = await axios.get(
        'https://v3.football.api-sports.io/fixtures/statistics',
        {
          headers: {
            'x-apisports-key': FOOTBALL_API_KEY,
          },
          params: {
            fixture: match.id,
          },
        }
      )

      for (const teamStats of response.data.response as TeamStatisticsResponseItem[]) {
        const stats = teamStats.statistics

        rows.push({
          match_id: match.id,
          team_id: teamStats.team.id,
          is_home: teamStats.team.id === match.home_team_id,

          shots_on_goal: getStat(stats, 'Shots on Goal'),
          shots_off_goal: getStat(stats, 'Shots off Goal'),
          total_shots: getStat(stats, 'Total Shots'),
          blocked_shots: getStat(stats, 'Blocked Shots'),
          shots_insidebox: getStat(stats, 'Shots insidebox'),
          shots_outsidebox: getStat(stats, 'Shots outsidebox'),
          fouls: getStat(stats, 'Fouls'),
          corner_kicks: getStat(stats, 'Corner Kicks'),
          offsides: getStat(stats, 'Offsides'),
          ball_possession: getStat(stats, 'Ball Possession'),
          yellow_cards: getStat(stats, 'Yellow Cards'),
          red_cards: getStat(stats, 'Red Cards'),
          goalkeeper_saves: getStat(stats, 'Goalkeeper Saves'),
          total_passes: getStat(stats, 'Total passes'),
          passes_accurate: getStat(stats, 'Passes accurate'),
          passes_percentage: getStat(stats, 'Passes %'),
        })
      }

      await sleep(REQUEST_DELAY_MS)
    } catch (error) {
      const apiError = error as AxiosError

      return Response.json({
        success: false,
        message: 'Fehler beim API-Fetch',
        matchId: match.id,
        status: apiError.response?.status,
        apiError: apiError.response?.data,
      })
    }
  }

  if (rows.length === 0) {
    return Response.json({
      success: true,
      message: 'Keine neuen Matches zu fetchen',
    })
  }

  const { error } = await supabase
    .from('match_team_stats')
    .upsert(rows, { onConflict: 'match_id,team_id' })

  if (error) {
    return Response.json({ success: false, error })
  }

  return Response.json({
    success: true,
    fetchedMatches: matchesToFetch.length,
    insertedRows: rows.length,
  })
}
