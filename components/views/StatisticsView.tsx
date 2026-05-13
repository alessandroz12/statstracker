'use client'

import { useEffect, useState } from 'react'
import SeasonSelector from '@/components/SeasonSelector'
import { supabase } from '@/lib/supabase'
import { getSeasonLabel } from '@/lib/seasons'

const AUSTRIA_ID = 601

type SummaryKey = 'top' | 'bottom' | 'possessionStrong' | 'possessionWeak'
type PossessionGroup = 'possessionStrong' | 'possessionWeak'

type Team = {
  id: number
  name: string
  display_name: string | null
  rank: number
  league_group: string | null
}

type TeamSeason = {
  team_id: number
  rank: number
  league_group: string | null
}

type Match = {
  id: number
  date: string
  home_team_id: number
  away_team_id: number
  home_goals: number
  away_goals: number
  status: string
}

type MatchTeamStats = {
  match_id: number
  team_id: number
  ball_possession: number | null
  total_shots: number | null
  shots_on_goal: number | null
  corner_kicks: number | null
}

type GroupSummary = {
  key: SummaryKey
  title: string
  games: number
  wins: number
  draws: number
  losses: number
  pointsPerGame: number | null
  ballPossession: number | null
  totalShots: number | null
  shotsOnGoal: number | null
  corners: number | null
}

type LoadState = {
  loading: boolean
  error: string | null
  summaries: GroupSummary[]
}

const emptySummaries: GroupSummary[] = [
  {
    key: 'top',
    title: 'Gegen Top 6 Teams',
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsPerGame: null,
    ballPossession: null,
    totalShots: null,
    shotsOnGoal: null,
    corners: null,
  },
  {
    key: 'bottom',
    title: 'Gegen Bottom 6 Teams',
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsPerGame: null,
    ballPossession: null,
    totalShots: null,
    shotsOnGoal: null,
    corners: null,
  },
  {
    key: 'possessionStrong',
    title: 'Gegen ballbesitzstarke Teams',
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsPerGame: null,
    ballPossession: null,
    totalShots: null,
    shotsOnGoal: null,
    corners: null,
  },
  {
    key: 'possessionWeak',
    title: 'Gegen ballbesitzschwache Teams',
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsPerGame: null,
    ballPossession: null,
    totalShots: null,
    shotsOnGoal: null,
    corners: null,
  },
]

function getOpponentId(match: Match) {
  return match.home_team_id === AUSTRIA_ID
    ? match.away_team_id
    : match.home_team_id
}

function getResult(match: Match) {
  const isHome = match.home_team_id === AUSTRIA_ID
  const austriaGoals = isHome ? match.home_goals : match.away_goals
  const opponentGoals = isHome ? match.away_goals : match.home_goals

  if (austriaGoals > opponentGoals) return 'win'
  if (austriaGoals < opponentGoals) return 'loss'
  return 'draw'
}

function getPoints(result: 'win' | 'draw' | 'loss') {
  if (result === 'win') return 3
  if (result === 'draw') return 1
  return 0
}

function getOpponentGroup(team: Team): 'top' | 'bottom' {
  if (team.league_group === 'championship') return 'top'
  if (team.league_group === 'relegation') return 'bottom'

  return team.rank <= 6 ? 'top' : 'bottom'
}

function buildPossessionGroups(stats: MatchTeamStats[]) {
  const possessionByTeam = new Map<number, number[]>()

  for (const row of stats) {
    if (row.team_id === AUSTRIA_ID || row.ball_possession === null) continue

    const values = possessionByTeam.get(row.team_id) ?? []
    values.push(row.ball_possession)
    possessionByTeam.set(row.team_id, values)
  }

  const teamsByPossession = Array.from(possessionByTeam.entries())
    .map(([teamId, values]) => ({
      teamId,
      possession: average(values),
    }))
    .filter(
      (team): team is { teamId: number; possession: number } =>
        team.possession !== null
    )
    .sort((a, b) => b.possession - a.possession)

  const strongTeamCount = Math.ceil(teamsByPossession.length / 2)
  const possessionGroups = new Map<number, PossessionGroup>()

  teamsByPossession.forEach((team, index) => {
    possessionGroups.set(
      team.teamId,
      index < strongTeamCount ? 'possessionStrong' : 'possessionWeak'
    )
  })

  return possessionGroups
}

function average(values: Array<number | null | undefined>) {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number'
  )

  if (validValues.length === 0) return null

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

function formatAverage(value: number | null, suffix = '') {
  if (value === null) return '-'

  return `${value.toLocaleString('de-AT', {
    maximumFractionDigits: 1,
  })}${suffix}`
}

function formatPoints(value: number | null) {
  if (value === null) return '-'

  return value.toLocaleString('de-AT', {
    maximumFractionDigits: 2,
  })
}

function buildSummaries(
  matches: Match[],
  teams: Team[],
  stats: MatchTeamStats[]
) {
  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const austriaStatsByMatchId = new Map(
    stats
      .filter((row) => row.team_id === AUSTRIA_ID)
      .map((row) => [row.match_id, row])
  )
  const possessionGroupsByTeamId = buildPossessionGroups(stats)

  return emptySummaries.map((summary) => {
    const groupMatches = matches.filter((match) => {
      const opponentId = getOpponentId(match)

      if (
        summary.key === 'possessionStrong' ||
        summary.key === 'possessionWeak'
      ) {
        return possessionGroupsByTeamId.get(opponentId) === summary.key
      }

      const opponent = teamsById.get(getOpponentId(match))

      return opponent ? getOpponentGroup(opponent) === summary.key : false
    })

    const results = groupMatches.map((match) => getResult(match))
    const points = results.reduce(
      (sum, result) => sum + getPoints(result),
      0
    )
    const groupStats = groupMatches
      .map((match) => austriaStatsByMatchId.get(match.id))
      .filter((row): row is MatchTeamStats => Boolean(row))

    return {
      ...summary,
      games: groupMatches.length,
      wins: results.filter((result) => result === 'win').length,
      draws: results.filter((result) => result === 'draw').length,
      losses: results.filter((result) => result === 'loss').length,
      pointsPerGame:
        groupMatches.length > 0 ? points / groupMatches.length : null,
      ballPossession: average(groupStats.map((row) => row.ball_possession)),
      totalShots: average(groupStats.map((row) => row.total_shots)),
      shotsOnGoal: average(groupStats.map((row) => row.shots_on_goal)),
      corners: average(groupStats.map((row) => row.corner_kicks)),
    }
  })
}

function ResultCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0B1020] p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  )
}

function PointsBarChart({ summaries }: { summaries: GroupSummary[] }) {
  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Punkteschnitt</h2>
          <p className="mt-1 text-xs text-slate-400">
            Punkte pro Spiel in den vier Vergleichsgruppen.
          </p>
        </div>
        <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
          max. 3,00
        </span>
      </div>

      <div className="space-y-4">
        {summaries.map((summary) => {
          const value = summary.pointsPerGame ?? 0
          const width = `${Math.min((value / 3) * 100, 100)}%`

          return (
            <div key={summary.key}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-300">{summary.title}</span>
                <span className="font-semibold text-violet-200">
                  {formatPoints(summary.pointsPerGame)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-[#0B1020]">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{ width }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SummaryBlock({ summary }: { summary: GroupSummary }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{summary.title}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {summary.games} ausgewertete Spiele
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultCard
          label="Siege"
          value={summary.wins}
          tone="text-green-400"
        />
        <ResultCard
          label="Unentschieden"
          value={summary.draws}
          tone="text-yellow-300"
        />
        <ResultCard
          label="Niederlagen"
          value={summary.losses}
          tone="text-red-400"
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-[#0B1020] px-4">
        <MetricRow
          label="Punkteschnitt"
          value={`${formatPoints(summary.pointsPerGame)} Pkt/Spiel`}
        />
        <MetricRow
          label="Ballbesitz"
          value={formatAverage(summary.ballPossession, ' %')}
        />
        <MetricRow label="Schuesse" value={formatAverage(summary.totalShots)} />
        <MetricRow
          label="Schuesse aufs Tor"
          value={formatAverage(summary.shotsOnGoal)}
        />
        <MetricRow label="Ecken" value={formatAverage(summary.corners)} />
      </div>
    </section>
  )
}

type StatisticsViewProps = {
  selectedSeason: number
  setSelectedSeason: (season: number) => void
}

export default function StatisticsView({
  selectedSeason,
  setSelectedSeason,
}: StatisticsViewProps) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    summaries: emptySummaries,
  })

  useEffect(() => {
    async function loadData() {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, display_name')

      const { data: teamSeasonsData, error: teamSeasonsError } = await supabase
        .from('team_seasons')
        .select('team_id, rank, league_group')
        .eq('season', selectedSeason)

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(
          'id, date, home_team_id, away_team_id, home_goals, away_goals, status'
        )
        .eq('status', 'FT')
        .eq('season', selectedSeason)
        .or(`home_team_id.eq.${AUSTRIA_ID},away_team_id.eq.${AUSTRIA_ID}`)

      const { data: statsData, error: statsError } = await supabase
        .from('match_team_stats')
        .select(
          'match_id, team_id, ball_possession, total_shots, shots_on_goal, corner_kicks'
        )

      const error = teamsError || teamSeasonsError || matchesError || statsError

      if (error) {
        setState({
          loading: false,
          error: error.message,
          summaries: emptySummaries,
        })
        return
      }

      const teamsById = new Map(
        ((teamsData ?? []) as Array<
          Pick<Team, 'id' | 'name' | 'display_name'>
        >).map((team) => [team.id, team])
      )
      const teams = ((teamSeasonsData ?? []) as TeamSeason[])
        .map((season) => {
          const team = teamsById.get(season.team_id)
          if (!team) return null

          return {
            ...team,
            id: season.team_id,
            rank: season.rank,
            league_group: season.league_group,
          }
        })
        .filter((team): team is Team => Boolean(team))

      setState({
        loading: false,
        error: null,
        summaries: buildSummaries(
          (matchesData ?? []) as Match[],
          teams,
          (statsData ?? []) as MatchTeamStats[]
        ),
      })
    }

    loadData()
  }, [selectedSeason])

  if (state.loading) {
    return <p className="text-slate-400">Statistiken werden geladen...</p>
  }

  if (state.error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Statistiken konnten nicht geladen werden: {state.error}
      </p>
    )
  }

  return (
    <>
      <header className="mb-8">
        <div className="mb-2">
          <SeasonSelector
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiken</h1>
        <p className="mt-2 text-sm text-slate-400">
          Austria Wien nach Ligaposition und gegnerischem Ballbesitzprofil in
          der Saison {getSeasonLabel(selectedSeason)}.
        </p>
      </header>

      <PointsBarChart summaries={state.summaries} />

      <div className="grid gap-6 xl:grid-cols-2">
        {state.summaries.map((summary) => (
          <SummaryBlock key={summary.key} summary={summary} />
        ))}
      </div>
    </>
  )
}
