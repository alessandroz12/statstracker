import axios from 'axios'
import { requireFetchSecret } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getDisplayName } from '@/lib/teamNames'

const LEAGUE_ID = 218
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY

type FixtureResponseItem = {
  fixture: {
    id: number
    date: string
    status: {
      short: string
    }
  }
  teams: {
    home: {
      id: number
      name: string
    }
    away: {
      id: number
      name: string
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
}

export async function GET(request: Request) {
  const authError = requireFetchSecret(request)
  if (authError) return authError

  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()

  const season = Number(new URL(request.url).searchParams.get('season') ?? 2024)

  const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
    headers: {
      'x-apisports-key': FOOTBALL_API_KEY,
    },
    params: {
      league: LEAGUE_ID,
      season,
    },
  })

  const fixtures = response.data.response

  const matches = fixtures.map((item: FixtureResponseItem) => ({
    id: item.fixture.id,
    date: item.fixture.date,
    home_team_id: item.teams.home.id,
    away_team_id: item.teams.away.id,
    home_team_name: getDisplayName(item.teams.home.name),
    away_team_name: getDisplayName(item.teams.away.name),
    home_goals: item.goals.home,
    away_goals: item.goals.away,
    status: item.fixture.status.short,
    league_id: LEAGUE_ID,
    season,
  }))

  const { error } = await supabaseAdmin.from('matches').upsert(matches)

  if (error) {
    return Response.json({ success: false, error })
  }

  return Response.json({
    success: true,
    count: matches.length,
    matches,
  })
}
