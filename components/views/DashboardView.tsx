'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDisplayName } from '@/lib/teamNames'

const AUSTRIA_ID = 601

type Team = {
  id: number
  name: string
  display_name: string | null
  logo_url: string | null
  rank: number
  points: number
  played: number
  goals_scored: number
  goals_against: number
  league_group: string | null
}

type Match = {
  id: number
  date: string
  home_team_id: number
  away_team_id: number
  home_team_name: string
  away_team_name: string
  home_goals: number
  away_goals: number
  status: string
}

function getTeamName(team: Team) {
  return team.display_name || team.name
}

function getResult(match: Match) {
  const isHome = match.home_team_id === AUSTRIA_ID
  const austriaGoals = isHome ? match.home_goals : match.away_goals
  const opponentGoals = isHome ? match.away_goals : match.home_goals

  if (austriaGoals > opponentGoals) return 'S'
  if (austriaGoals < opponentGoals) return 'N'
  return 'U'
}

function getPoints(match: Match) {
  const result = getResult(match)

  if (result === 'S') return 3
  if (result === 'U') return 1
  return 0
}

function getOpponent(match: Match, teams: Team[]) {
  const opponentId =
    match.home_team_id === AUSTRIA_ID ? match.away_team_id : match.home_team_id
  const fallbackName =
    match.home_team_id === AUSTRIA_ID
      ? match.away_team_name
      : match.home_team_name
  const opponent = teams.find((team) => team.id === opponentId)

  return opponent ? getTeamName(opponent) : getDisplayName(fallbackName)
}

function getScore(match: Match) {
  return match.home_team_id === AUSTRIA_ID
    ? `${match.home_goals}:${match.away_goals}`
    : `${match.away_goals}:${match.home_goals}`
}

function resultClass(result: string) {
  if (result === 'S') return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (result === 'N') return 'bg-red-500/20 text-red-400 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}

function TeamLogo({ team }: { team: Team }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={`${getTeamName(team)} Logo`}
          className="h-6 w-6 object-contain"
        />
      ) : (
        <span className="text-xs font-bold">{getTeamName(team).slice(0, 1)}</span>
      )}
    </div>
  )
}

function TableBlock({ title, teams }: { title: string; teams: Team[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-black/20">
      <div className="border-b border-white/10 p-5">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">
          Austria Wien ist violett markiert.
        </p>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase text-slate-400">
          <tr>
            <th className="px-5 py-3 text-left">#</th>
            <th className="px-5 py-3 text-left">Team</th>
            <th className="px-5 py-3 text-right">SP</th>
            <th className="px-5 py-3 text-right">Tore</th>
            <th className="px-5 py-3 text-right">Diff</th>
            <th className="px-5 py-3 text-right">Pkt</th>
          </tr>
        </thead>

        <tbody>
          {teams.map((team) => {
            const isAustria = team.id === AUSTRIA_ID
            const goalDiff = team.goals_scored - team.goals_against

            return (
              <tr
                key={team.id}
                className={`border-t border-white/5 ${
                  isAustria
                    ? 'bg-violet-600/30 text-white'
                    : 'text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <td className="px-5 py-4">{team.rank}</td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} />
                    <span className="font-medium">{getTeamName(team)}</span>
                  </div>
                </td>

                <td className="px-5 py-4 text-right">{team.played}</td>

                <td className="px-5 py-4 text-right">
                  {team.goals_scored}:{team.goals_against}
                </td>

                <td className="px-5 py-4 text-right">
                  {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                </td>

                <td className="px-5 py-4 text-right font-semibold">
                  {team.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FormPointChart({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <p className="mt-4 text-sm text-slate-400">Keine Formdaten.</p>
  }

  const chartWidth = 240
  const chartHeight = 80
  const minX = 18
  const maxX = 222
  const minY = 16
  const maxY = 66
  const xStep = points.length > 1 ? (maxX - minX) / (points.length - 1) : 0
  const coordinates = points.map((point, index) => ({
    x: minX + index * xStep,
    y: maxY - (point / 3) * (maxY - minY),
  }))
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const averagePoints =
    points.reduce((sum, point) => sum + point, 0) / points.length

  return (
    <div className="mt-4">
      <svg
        className="h-20 w-full overflow-visible"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Punkteausbeute der letzten Spiele"
      >
        {[0, 1, 3].map((tick) => {
          const y = maxY - (tick / 3) * (maxY - minY)

          return (
            <g key={tick}>
              <line
                x1={minX}
                x2={maxX}
                y1={y}
                y2={y}
                className="stroke-white/10"
                strokeWidth="1"
              />
              <text
                x="0"
                y={y + 4}
                className="fill-slate-500 text-[10px]"
              >
                {tick}
              </text>
            </g>
          )
        })}

        <polyline
          points={polyline}
          fill="none"
          className="stroke-violet-300"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coordinates.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r="5"
            className="fill-violet-400 stroke-[#0B1020]"
            strokeWidth="3"
          >
            <title>
              Spiel {index + 1}: {points[index]} Punkte
            </title>
          </circle>
        ))}
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>alt</span>
        <span className="font-medium text-violet-300">
          {averagePoints.toLocaleString('de-AT', {
            maximumFractionDigits: 1,
          })}{' '}
          Pkt/Spiel
        </span>
        <span>neu</span>
      </div>
    </div>
  )
}

export default function DashboardView() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: teamsData } = await supabase
        .from('teams')
        .select(
          'id, name, display_name, logo_url, rank, points, played, goals_scored, goals_against, league_group'
        )

      const { data: matchesData } = await supabase
        .from('matches')
        .select(
          'id, date, home_team_id, away_team_id, home_team_name, away_team_name, home_goals, away_goals, status'
        )
        .eq('status', 'FT')
        .or(`home_team_id.eq.${AUSTRIA_ID},away_team_id.eq.${AUSTRIA_ID}`)
        .order('date', { ascending: false })
        .limit(5)

      setTeams(((teamsData ?? []) as Team[]).sort((a, b) => a.rank - b.rank))
      setMatches((matchesData ?? []) as Match[])
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return <p className="text-slate-400">Dashboard wird geladen...</p>
  }

  const austria = teams.find((team) => team.id === AUSTRIA_ID)

  const isRegularSeason = (austria?.played ?? 0) <= 22

  const championshipTeams = teams.filter(
    (team) => team.league_group === 'championship'
  )

  const relegationTeams = teams.filter(
    (team) => team.league_group === 'relegation'
  )

  const austriaGroup =
    austria?.league_group === 'championship'
      ? championshipTeams
      : relegationTeams

  const visibleTeams = isRegularSeason ? teams : austriaGroup

  const visibleTableTitle = isRegularSeason
    ? 'Bundesliga Tabelle'
    : austria?.league_group === 'championship'
      ? 'Meistergruppe'
      : 'Qualifikationsgruppe'

  const austriaRank = austria?.rank ?? '-'

  const formPoints = matches
    .slice()
    .reverse()
    .map((match) => getPoints(match))

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-sm text-violet-300">Saison 2024/25</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Austria Wien Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Überblick über Tabelle, Rohdaten und aktuelle Form.
        </p>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <p className="text-xs uppercase text-slate-400">Platzierung</p>
          <p className="mt-3 text-3xl font-bold">{austriaRank}.</p>
          <p className="mt-1 text-xs text-slate-500">
            {isRegularSeason
              ? 'Grunddurchgang'
              : austria?.league_group === 'championship'
                ? 'Meistergruppe'
                : 'Qualifikationsgruppe'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <p className="text-xs uppercase text-slate-400">Punkte</p>
          <p className="mt-3 text-3xl font-bold">{austria?.points ?? '-'}</p>
          <p className="mt-1 text-xs text-green-400">Aktueller Stand</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <p className="text-xs uppercase text-slate-400">Tore</p>
          <p className="mt-3 text-3xl font-bold">
            {austria ? `${austria.goals_scored}:${austria.goals_against}` : '-'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tore / Gegentore laut Tabelle
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <p className="text-xs uppercase text-slate-400">Form</p>
          <FormPointChart points={formPoints} />
          <p className="mt-3 text-xs text-slate-500">Letzte 5 Spiele</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
        <div className="space-y-6">
          <TableBlock title={visibleTableTitle} teams={visibleTeams} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <h2 className="font-semibold">Letzte Spiele</h2>
          <p className="mt-1 text-xs text-slate-400">
            Ergebnisse aus Austria-Sicht.
          </p>

          <div className="mt-5 space-y-3">
            {matches.map((match) => {
              const result = getResult(match)

              return (
                <div
                  key={match.id}
                  className="rounded-xl border border-white/10 bg-[#0B1020] p-4"
                >
                  <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(match.date).toLocaleDateString('de-AT')}</span>
                    <span
                      className={`rounded-full border px-2 py-1 font-bold ${resultClass(
                        result
                      )}`}
                    >
                      {result}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Austria Wien</p>
                      <p className="text-sm text-slate-400">
                        vs. {getOpponent(match, teams)}
                      </p>
                    </div>

                    <p className="text-xl font-bold text-violet-300">
                      {getScore(match)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
