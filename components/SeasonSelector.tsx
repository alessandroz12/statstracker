import { seasons } from '@/lib/seasons'

type SeasonSelectorProps = {
  selectedSeason: number
  setSelectedSeason: (season: number) => void
}

export default function SeasonSelector({
  selectedSeason,
  setSelectedSeason,
}: SeasonSelectorProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-400">
      Saison
      <select
        value={selectedSeason}
        onChange={(event) => setSelectedSeason(Number(event.target.value))}
        className="rounded-lg border border-white/10 bg-[#0B1020] px-3 py-2 text-sm font-medium text-slate-100 outline-none focus:border-violet-400"
      >
        {seasons.map((season) => (
          <option key={season.value} value={season.value}>
            {season.label}
          </option>
        ))}
      </select>
    </label>
  )
}
