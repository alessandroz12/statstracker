import axios from 'axios'
import { supabase } from '@/lib/supabase'

const LEAGUE_ID = 218
const SEASON = 2024
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

export async function GET() {
  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
    headers: {
      'x-apisports-key': FOOTBALL_API_KEY,
    },
    params: {
      league: LEAGUE_ID,
      season: SEASON,
    },
  })

  const fixtures = response.data.response

  const matches = fixtures.map((item: FixtureResponseItem) => ({
    id: item.fixture.id,
    date: item.fixture.date,
    home_team_id: item.teams.home.id,
    away_team_id: item.teams.away.id,
    home_team_name: item.teams.home.name,
    away_team_name: item.teams.away.name,
    home_goals: item.goals.home,
    away_goals: item.goals.away,
    status: item.fixture.status.short,
  }))

  const { error } = await supabase.from('matches').upsert(matches)

  if (error) {
    return Response.json({ success: false, error })
  }

  return Response.json({
    success: true,
    count: matches.length,
    matches,
  })
}
