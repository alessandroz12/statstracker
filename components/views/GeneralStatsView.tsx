'use client'

import { useEffect, useMemo, useState } from 'react'
import SeasonSelector from '@/components/SeasonSelector'
import { supabase } from '@/lib/supabase'
import { getSeasonLabel } from '@/lib/seasons'

const AUSTRIA_ID = 601
const LEAGUE_ID = 218

type Team = {
  id: number
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
  shots_off_goal: number | null
  blocked_shots: number | null
  corner_kicks: number | null
  passes_percentage: number | null
  yellow_cards: number | null
  red_cards: number | null
}

type GoalMinuteStats = {
  team_id: number
  league_id: number
  season: number
  bucket: string
  goals_for: number
  goals_against: number
}

type LoadState = {
  loading: boolean
  error: string | null
  teams: Team[]
  matches: Match[]
  leagueMatches: Match[]
  stats: MatchTeamStats[]
  goalMinutes: GoalMinuteStats[]
}

function average(values: Array<number | null | undefined>) {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number'
  )

  if (validValues.length === 0) return null

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

function formatNumber(value: number | null, digits = 1, suffix = '') {
  if (value === null) return '-'

  return `${value.toLocaleString('de-AT', {
    maximumFractionDigits: digits,
  })}${suffix}`
}

function getMinuteBucketIndex(bucket: string) {
  const order = [
    '0-15',
    '16-30',
    '31-45',
    '46-60',
    '61-75',
    '76-90',
    '91-105',
    '106-120',
  ]

  return order.indexOf(bucket)
}

function getMatchGoals(match: Match) {
  return match.home_team_id === AUSTRIA_ID ? match.home_goals : match.away_goals
}

function getResult(match: Match) {
  const isHome = match.home_team_id === AUSTRIA_ID
  const austriaGoals = isHome ? match.home_goals : match.away_goals
  const opponentGoals = isHome ? match.away_goals : match.home_goals

  if (austriaGoals > opponentGoals) return 'wins'
  if (austriaGoals < opponentGoals) return 'losses'
  return 'draws'
}

function StatCard({
  label,
  value,
  rank,
}: {
  label: string
  value: string
  rank: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-xl shadow-black/20">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-violet-300">{rank}</p>
    </div>
  )
}

function buildMetricRanks(
  teams: Team[],
  stats: MatchTeamStats[],
  metric: keyof Pick<
    MatchTeamStats,
    | 'ball_possession'
    | 'total_shots'
    | 'shots_on_goal'
    | 'passes_percentage'
    | 'corner_kicks'
  >
) {
  const valuesByTeam = new Map<number, number[]>()

  for (const row of stats) {
    const value = row[metric]
    if (typeof value !== 'number') continue

    const values = valuesByTeam.get(row.team_id) ?? []
    values.push(value)
    valuesByTeam.set(row.team_id, values)
  }

  return teams
    .map((team) => ({
      teamId: team.id,
      value: average(valuesByTeam.get(team.id) ?? []),
    }))
    .filter(
      (item): item is { teamId: number; value: number } => item.value !== null
    )
    .sort((a, b) => b.value - a.value)
}

function getRankLabel(
  teams: Team[],
  stats: MatchTeamStats[],
  metric: Parameters<typeof buildMetricRanks>[2]
) {
  const ranks = buildMetricRanks(teams, stats, metric)
  const rank = ranks.findIndex((item) => item.teamId === AUSTRIA_ID)

  if (rank === -1) return 'Liga-Rang -'

  return `Liga-Rang ${rank + 1}/${ranks.length}`
}

function GoalsLineChart({ matches }: { matches: Match[] }) {
  const values = matches.map((match) => getMatchGoals(match))
  const maxValue = Math.max(3, ...values)
  const width = 420
  const height = 180
  const minX = 28
  const maxX = 396
  const minY = 24
  const maxY = 152
  const xStep = values.length > 1 ? (maxX - minX) / (values.length - 1) : 0
  const points = values.map((value, index) => ({
    x: minX + index * xStep,
    y: maxY - (value / maxValue) * (maxY - minY),
  }))
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20 xl:col-span-2">
      <h2 className="font-semibold">Tore pro Spiel</h2>
      <svg
        className="mt-4 h-48 w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Tore pro Spiel"
      >
        {[0, 1, 2, 3].map((tick) => {
          const y = maxY - (tick / maxValue) * (maxY - minY)

          return (
            <g key={tick}>
              <line
                x1={minX}
                x2={maxX}
                y1={y}
                y2={y}
                className="stroke-white/10"
              />
              <text x="4" y={y + 4} className="fill-slate-500 text-[10px]">
                {tick}
              </text>
            </g>
          )
        })}

        <polyline
          points={polyline}
          fill="none"
          className="stroke-violet-400"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r="4"
            className="fill-violet-300"
          >
            <title>
              Spiel {index + 1}: {values[index]} Tore
            </title>
          </circle>
        ))}
      </svg>
    </section>
  )
}

function ResultsChart({ matches }: { matches: Match[] }) {
  const counts = matches.reduce(
    (sum, match) => {
      sum[getResult(match)] += 1
      return sum
    },
    { wins: 0, draws: 0, losses: 0 }
  )
  const total = Math.max(matches.length, 1)
  const winPercent = (counts.wins / total) * 100
  const drawPercent = (counts.draws / total) * 100

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
      <h2 className="font-semibold">Ergebnisse</h2>
      <div className="mt-5 flex items-center gap-6">
        <div
          className="h-28 w-28 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(#22c55e 0 ${winPercent}%, #facc15 ${winPercent}% ${
              winPercent + drawPercent
            }%, #ef4444 ${winPercent + drawPercent}% 100%)`,
          }}
        >
          <div className="m-5 h-18 w-18 rounded-full bg-[#0B1020]" />
        </div>

        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <ResultLegend label="Siege" value={counts.wins} color="bg-green-500" />
          <ResultLegend
            label="Unentschieden"
            value={counts.draws}
            color="bg-yellow-400"
          />
          <ResultLegend
            label="Niederlagen"
            value={counts.losses}
            color="bg-red-500"
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {matches.length} ausgewertete Spiele
      </p>
    </section>
  )
}

function ResultLegend({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-300">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

function MinuteBarPanel({
  title,
  values,
}: {
  title: string
  values: GoalMinuteStats[]
}) {
  const maxValue = Math.max(
    1,
    ...values.map((item) =>
      title.includes('Erzielte') ? item.goals_for : item.goals_against
    )
  )

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-5 flex h-40 items-end gap-4">
        {values.map((item) => (
          <div key={item.bucket} className="flex flex-1 flex-col items-center">
            <span className="mb-2 text-xs font-semibold text-slate-200">
              {title.includes('Erzielte')
                ? item.goals_for
                : item.goals_against}
            </span>
            <div
              className="w-full rounded-t-lg bg-violet-500"
              style={{
                height: `${Math.max(
                  (((title.includes('Erzielte')
                    ? item.goals_for
                    : item.goals_against) || 0) /
                    maxValue) *
                    100,
                  8
                )}%`,
              }}
            />
            <span className="mt-2 text-center text-[10px] text-slate-500">
              {item.bucket}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

type GeneralStatsViewProps = {
  selectedSeason: number
  setSelectedSeason: (season: number) => void
}

export default function GeneralStatsView({
  selectedSeason,
  setSelectedSeason,
}: GeneralStatsViewProps) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    teams: [],
    matches: [],
    leagueMatches: [],
    stats: [],
    goalMinutes: [],
  })

  useEffect(() => {
    async function loadData() {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(
          'id, date, home_team_id, away_team_id, home_goals, away_goals, status'
        )
        .eq('status', 'FT')
        .eq('season', selectedSeason)
        .or(`home_team_id.eq.${AUSTRIA_ID},away_team_id.eq.${AUSTRIA_ID}`)
        .order('date', { ascending: true })

      const { data: leagueMatchesData, error: leagueMatchesError } =
        await supabase
          .from('matches')
          .select(
            'id, date, home_team_id, away_team_id, home_goals, away_goals, status'
          )
          .eq('status', 'FT')
          .eq('season', selectedSeason)

      const { data: statsData, error: statsError } = await supabase
        .from('match_team_stats')
        .select(
          'match_id, team_id, ball_possession, total_shots, shots_on_goal, shots_off_goal, blocked_shots, corner_kicks, passes_percentage, yellow_cards, red_cards'
        )

      const { data: minuteData } = await supabase
        .from('team_goal_minute_stats')
        .select('team_id, league_id, season, bucket, goals_for, goals_against')
        .eq('team_id', AUSTRIA_ID)
        .eq('league_id', LEAGUE_ID)
        .eq('season', selectedSeason)

      const error = teamsError || matchesError || leagueMatchesError || statsError

      if (error) {
        setState({
          loading: false,
          error: error.message,
          teams: [],
          matches: [],
          leagueMatches: [],
          stats: [],
          goalMinutes: [],
        })
        return
      }

      setState({
        loading: false,
        error: null,
        teams: (teamsData ?? []) as Team[],
        matches: (matchesData ?? []) as Match[],
        leagueMatches: (leagueMatchesData ?? []) as Match[],
        stats: (statsData ?? []) as MatchTeamStats[],
        goalMinutes: ((minuteData ?? []) as GoalMinuteStats[]).sort(
          (a, b) => getMinuteBucketIndex(a.bucket) - getMinuteBucketIndex(b.bucket)
        ),
      })
    }

    loadData()
  }, [selectedSeason])

  const summary = useMemo(() => {
    const goals = state.matches.map((match) => getMatchGoals(match))
    const seasonMatchIds = new Set(state.leagueMatches.map((match) => match.id))
    const seasonStats = state.stats.filter((row) => seasonMatchIds.has(row.match_id))
    const austriaStats = seasonStats.filter((row) => row.team_id === AUSTRIA_ID)

    return {
      ballPossession: average(austriaStats.map((row) => row.ball_possession)),
      shots: average(austriaStats.map((row) => row.total_shots)),
      shotsOnGoal: average(austriaStats.map((row) => row.shots_on_goal)),
      passAccuracy: average(austriaStats.map((row) => row.passes_percentage)),
      corners: average(austriaStats.map((row) => row.corner_kicks)),
      goalsPerGame: average(goals),
      seasonStats,
    }
  }, [state.leagueMatches, state.matches, state.stats])

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
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2">
            <SeasonSelector
              selectedSeason={selectedSeason}
              setSelectedSeason={setSelectedSeason}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Statistik Übersicht
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Allgemeine Austria-Wien-Kennzahlen ohne Kontextfilter fuer die
            Saison {getSeasonLabel(selectedSeason)}.
          </p>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Ballbesitz"
          value={formatNumber(summary.ballPossession, 1, ' %')}
          rank={getRankLabel(state.teams, summary.seasonStats, 'ball_possession')}
        />
        <StatCard
          label="Schuesse pro Spiel"
          value={formatNumber(summary.shots)}
          rank={getRankLabel(state.teams, summary.seasonStats, 'total_shots')}
        />
        <StatCard
          label="Schuesse aufs Tor"
          value={formatNumber(summary.shotsOnGoal)}
          rank={getRankLabel(state.teams, summary.seasonStats, 'shots_on_goal')}
        />
        <StatCard
          label="Passgenauigkeit"
          value={formatNumber(summary.passAccuracy, 1, ' %')}
          rank={getRankLabel(state.teams, summary.seasonStats, 'passes_percentage')}
        />
        <StatCard
          label="Ecken pro Spiel"
          value={formatNumber(summary.corners)}
          rank={getRankLabel(state.teams, summary.seasonStats, 'corner_kicks')}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <GoalsLineChart matches={state.matches} />
        <ResultsChart matches={state.matches} />
        <MinuteBarPanel title="Erzielte Tore nach Minuten" values={state.goalMinutes} />
        <MinuteBarPanel title="Bekommene Tore nach Minuten" values={state.goalMinutes} />
      </div>
    </>
  )
}
