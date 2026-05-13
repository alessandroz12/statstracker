import axios from 'axios'
import { requireFetchSecret } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getDisplayName } from '@/lib/teamNames'

const LEAGUE_ID = 218
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
    team_id: item.team.id,
    points: item.points,
    goals_scored: item.all.goals.for,
    goals_against: item.all.goals.against,
    league_group: leagueGroup,
    played: item.all.played,
    rank: item.rank,
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

  const response = await axios.get('https://v3.football.api-sports.io/standings', {
    headers: {
      'x-apisports-key': FOOTBALL_API_KEY,
    },
    params: {
      league: LEAGUE_ID,
      season,
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
  const teamRows = teams.map((team) => ({
    id: team.id,
    name: team.name,
    display_name: team.display_name,
    logo_url: team.logo_url,
  }))
  const teamSeasonRows = teams.map((team) => ({
    team_id: team.id,
    league_id: LEAGUE_ID,
    season,
    points: team.points,
    goals_scored: team.goals_scored,
    goals_against: team.goals_against,
    league_group: team.league_group,
    played: team.played,
    rank: team.rank,
  }))

  const { error: teamsError } = await supabaseAdmin.from('teams').upsert(teamRows)

  if (teamsError) {
    return Response.json({
      success: false,
      error: teamsError,
    })
  }

  const { error: seasonsError } = await supabaseAdmin
    .from('team_seasons')
    .upsert(teamSeasonRows, { onConflict: 'team_id,league_id,season' })

  if (seasonsError) {
    return Response.json({
      success: false,
      error: seasonsError,
    })
  }

  return Response.json({
    success: true,
    championshipCount: championshipTeams.length,
    relegationCount: relegationTeams.length,
    total: teams.length,
    season,
    teams,
  })
}
