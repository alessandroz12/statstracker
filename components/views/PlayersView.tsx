'use client'

import { useEffect, useState } from 'react'
import SeasonSelector from '@/components/SeasonSelector'
import { supabase } from '@/lib/supabase'
import { getSeasonLabel } from '@/lib/seasons'

const AUSTRIA_ID = 601
const LEAGUE_ID = 218

type Player = {
  id: number
  name: string
  photo_url: string | null
}

type PlayerSeasonStats = {
  player_id: number
  appearances: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
}

type PlayerRow = Player & PlayerSeasonStats

type LoadState = {
  loading: boolean
  error: string | null
  players: PlayerRow[]
}

function StatCell({ value }: { value: number }) {
  return <td className="px-5 py-4 text-right tabular-nums">{value}</td>
}

type PlayersViewProps = {
  selectedSeason: number
  setSelectedSeason: (season: number) => void
}

export default function PlayersView({
  selectedSeason,
  setSelectedSeason,
}: PlayersViewProps) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    players: [],
  })

  useEffect(() => {
    async function loadData() {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, photo_url')

      const { data: statsData, error: statsError } = await supabase
        .from('player_season_stats')
        .select('player_id, appearances, goals, assists, yellow_cards, red_cards')
        .eq('team_id', AUSTRIA_ID)
        .eq('league_id', LEAGUE_ID)
        .eq('season', selectedSeason)

      const error = playersError || statsError

      if (error) {
        setState({
          loading: false,
          error: error.message,
          players: [],
        })
        return
      }

      const playersById = new Map(
        ((playersData ?? []) as Player[]).map((player) => [player.id, player])
      )

      const rows = ((statsData ?? []) as PlayerSeasonStats[])
        .map((stats) => {
          const player = playersById.get(stats.player_id)

          if (!player) return null

          return {
            ...player,
            ...stats,
          }
        })
        .filter((row): row is PlayerRow => Boolean(row))
        .filter((row) => row.appearances >= 1)
        .sort(
          (a, b) =>
            b.goals - a.goals ||
            b.assists - a.assists ||
            b.appearances - a.appearances ||
            a.name.localeCompare(b.name)
        )

      setState({
        loading: false,
        error: null,
        players: rows,
      })
    }

    loadData()
  }, [selectedSeason])

  if (state.loading) {
    return <p className="text-slate-400">Spieler werden geladen...</p>
  }

  if (state.error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Spieler konnten nicht geladen werden: {state.error}
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
        <h1 className="text-3xl font-bold tracking-tight">Spieler</h1>
        <p className="mt-2 text-sm text-slate-400">
          Kaderstatistiken fuer Austria Wien in der Saison{' '}
          {getSeasonLabel(selectedSeason)}.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-black/20">
        <div className="border-b border-white/10 p-5">
          <h2 className="font-semibold">Kader</h2>
          <p className="mt-1 text-xs text-slate-400">
            Spieler mit mindestens einem Einsatz, sortiert nach Toren.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Spieler</th>
                <th className="px-5 py-3 text-right">Spiele</th>
                <th className="px-5 py-3 text-right">Tore</th>
                <th className="px-5 py-3 text-right">Assists</th>
                <th className="px-5 py-3 text-right">Gelb</th>
                <th className="px-5 py-3 text-right">Rot</th>
              </tr>
            </thead>

            <tbody>
              {state.players.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                    Noch keine Spielerstatistiken vorhanden.
                  </td>
                </tr>
              ) : (
                state.players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-t border-white/5 text-slate-300 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={`${player.name} Foto`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {player.name.slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-slate-100">
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <StatCell value={player.appearances} />
                    <StatCell value={player.goals} />
                    <StatCell value={player.assists} />
                    <StatCell value={player.yellow_cards} />
                    <StatCell value={player.red_cards} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
