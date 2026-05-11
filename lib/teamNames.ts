const displayNames: Record<string, string> = {
  'Austria Vienna': 'Austria Wien',
  'Rapid Vienna': 'Rapid Wien',
  'Red Bull Salzburg': 'Red Bull Salzburg',
  'Sturm Graz': 'Sturm Graz',
  LASK: 'LASK',
  Hartberg: 'Hartberg',
  'SCR Altach': 'Altach',
  'Wolfsberger AC': 'WAC',
  'WSG Wattens': 'WSG Tirol',
  'FC BW Linz': 'BW Linz',
  'Grazer AK': 'Grazer AK',
  Ried: 'Ried',
}

export function getDisplayName(apiName: string) {
  return displayNames[apiName] ?? apiName
}
