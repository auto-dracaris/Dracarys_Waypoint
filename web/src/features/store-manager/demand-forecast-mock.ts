export interface DemandWeek {
  week: number
  freshTotal: number
  freshChilled: number
  styleTotal: number
  techTotal: number
}

export interface DemandForecast {
  depot: string
  year: number
  weeks: DemandWeek[]
}

// Preview fixture matching Figma 1493:14354. Replace with forecast API data later.
export const mockDemandForecast: DemandForecast = {
  depot: 'Peliyagoda',
  year: 2026,
  weeks: [
    { week: 40, freshTotal: 120, freshChilled: 72, styleTotal: 48, techTotal: 32 },
    { week: 41, freshTotal: 132, freshChilled: 80, styleTotal: 50, techTotal: 35 },
    { week: 42, freshTotal: 145, freshChilled: 89, styleTotal: 55, techTotal: 34 },
    { week: 43, freshTotal: 138, freshChilled: 84, styleTotal: 52, techTotal: 38 },
    { week: 44, freshTotal: 126, freshChilled: 76, styleTotal: 49, techTotal: 36 },
    { week: 45, freshTotal: 130, freshChilled: 78, styleTotal: 51, techTotal: 37 },
    { week: 46, freshTotal: 142, freshChilled: 86, styleTotal: 54, techTotal: 40 },
    { week: 47, freshTotal: 148, freshChilled: 90, styleTotal: 57, techTotal: 42 },
    { week: 48, freshTotal: 136, freshChilled: 82, styleTotal: 55, techTotal: 39 },
    { week: 49, freshTotal: 140, freshChilled: 85, styleTotal: 60, techTotal: 41 },
  ],
}
