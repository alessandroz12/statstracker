export const seasons = [
  { value: 2024, label: '2024/25' },
  { value: 2025, label: '2025/26' },
]

export function getSeasonLabel(season: number) {
  return seasons.find((item) => item.value === season)?.label ?? String(season)
}
