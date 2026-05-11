import axios from 'axios'
import { supabase } from '@/lib/supabase'
import { getDisplayName } from '@/lib/teamNames'

const LEAGUE_ID = 218
const SEASON = 2024
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY

type StandingTeamItem = {
  rank: number
  points: number
  team: {
    id: number
    name: string
    logo: string | null
  }
  all: {
    played: number
    goals: {
      for: number
      against: number
    }
  }
}

function mapStandingTeam(
  item: StandingTeamItem,
  leagueGroup: 'championship' | 'relegation'
) {
  return {
    id: item.team.id,
    name: item.team.name,
    display_name: getDisplayName(item.team.name),
    logo_url: item.team.logo,
    points: item.points,
    goals_scored: item.all.goals.for,
    goals_against: item.all.goals.against,
    league_group: leagueGroup,
    played: item.all.played,
    rank: item.rank,
  }
}

export async function GET() {
  if (!FOOTBALL_API_KEY) {
    return Response.json(
      { success: false, error: 'FOOTBALL_API_KEY fehlt' },
      { status: 500 }
    )
  }

  const response = await axios.get('https://v3.football.api-sports.io/standings', {
    headers: {
      'x-apisports-key': FOOTBALL_API_KEY,
    },
    params: {
      league: LEAGUE_ID,
      season: SEASON,
    },
  })

  const apiData = response.data.response

  if (!apiData || apiData.length === 0) {
    return Response.json({
      success: false,
      error: 'Keine Standings-Daten gefunden',
      raw: response.data,
    })
  }

  const allStandings = apiData[0]?.league?.standings || []

  const championshipTeams = ((allStandings[0] || []) as StandingTeamItem[]).map((item) =>
    mapStandingTeam(item, 'championship')
  )

  const relegationTeams = ((allStandings[1] || []) as StandingTeamItem[]).map((item) =>
    mapStandingTeam(item, 'relegation')
  )

  const teams = [...championshipTeams, ...relegationTeams]

  const { error } = await supabase.from('teams').upsert(teams)

  if (error) {
    return Response.json({
      success: false,
      error,
    })
  }

  return Response.json({
    success: true,
    championshipCount: championshipTeams.length,
    relegationCount: relegationTeams.length,
    total: teams.length,
    teams,
  })
}
