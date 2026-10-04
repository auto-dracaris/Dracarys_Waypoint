import { useEffect, useId, useRef, useState } from 'react'
import type { DemandForecast, DemandWeek } from '../../demand-forecast-mock'
import '@/styles/store-manager/demand-forecast.css'

const series: { key: Exclude<keyof DemandWeek, 'week'>; label: string; className: string; dashed?: boolean }[] = [
  { key: 'freshTotal', label: 'Fresh · total', className: 'store-demand-fresh' },
  { key: 'freshChilled', label: 'Fresh · chilled', className: 'store-demand-chilled', dashed: true },
  { key: 'styleTotal', label: 'Style · total', className: 'store-demand-style' },
  { key: 'techTotal', label: 'Tech · total', className: 'store-demand-tech' },
]

export function DemandForecastSection({ forecast }: { forecast: DemandForecast }) {
  const id = useId()
  const canvas = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1336)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const { weeks } = forecast
  // Chart geometry matches the editable graph in Figma, with a responsive x-axis.
  const left = 56
  const right = width - 116
  const max = Math.max(160, Math.ceil(Math.max(0, ...weeks.map((week) => week.freshTotal), ...weeks.map((week) => week.styleTotal), ...weeks.map((week) => week.techTotal)) / 40) * 40)
  const x = (index: number) => left + (index * (right - left)) / Math.max(1, weeks.length - 1)
  const y = (value: number) => 240 - (value / max) * 220
  const ticks = Array.from({ length: max / 40 + 1 }, (_, index) => index * 40)
  const latest = weeks.at(-1)
  return <section className="store-demand-forecast" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="type-display-md-medium">Upcoming demand · {forecast.depot} depot</h2>
    <p className="store-demand-caption type-text-sm-regular">Forecast preview · Example values · Volume in m³ · Chilled is included in total</p>
    <ul className="store-demand-legend" aria-label="Demand series">
      {series.map(({ key, label, className, dashed }) => <li key={key} className={`${className} type-text-xs-regular`}><span className={dashed ? 'store-demand-swatch--dashed' : ''} aria-hidden="true" />{label}</li>)}
    </ul>
    <div className="store-demand-chart-scroll" role="region" aria-label="Weekly demand chart" tabIndex={0}>
      <div ref={canvas} className="store-demand-chart-canvas">
        <svg className="store-demand-chart" viewBox={`0 0 ${width} 280`} role="img" aria-labelledby={`${id}-chart-title ${id}-chart-description`}>
          <title id={`${id}-chart-title`}>{forecast.year} demand forecast, ISO weeks {weeks[0]?.week}–{latest?.week}</title>
          <desc id={`${id}-chart-description`}>Example volumes in cubic metres. Fresh chilled is part of Fresh total. The data table following the chart contains every weekly value.</desc>
          {ticks.map((value) => <g key={value} className="store-demand-axis"><line x1={left} x2={right} y1={y(value)} y2={y(value)} /><text x="0" y={y(value) + 4}>{value}</text></g>)}
          {weeks.map((week, index) => <text key={week.week} className="store-demand-week" x={x(index)} y="264" textAnchor="middle">W{week.week}</text>)}
          {series.map(({ key, label, className, dashed }) => <g key={key} className={className}>
            <polyline className={`store-demand-line ${dashed ? 'store-demand-line--dashed' : ''}`} points={weeks.map((week, index) => `${x(index)},${y(week[key])}`).join(' ')} />
            {weeks.map((week, index) => <circle className="store-demand-point" key={week.week} cx={x(index)} cy={y(week[key])} r="3.5"><title>{`W${week.week} · ${label}: ${week[key]} m³`}</title></circle>)}
            {latest && <text className="store-demand-end-value" x={right + 12} y={y(latest[key]) + 4}>{latest[key]}</text>}
          </g>)}
        </svg>
      </div>
    </div>
    <table className="sr-only"><caption>Example demand forecast, volume in m³</caption><thead><tr><th scope="col">ISO week</th>{series.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody>{weeks.map((week) => <tr key={week.week}><th scope="row">{forecast.year} W{week.week}</th>{series.map(({ key }) => <td key={key}>{week[key]}</td>)}</tr>)}</tbody></table>
    <p className="store-demand-caption type-text-sm-regular">{forecast.year} ISO weeks {weeks[0]?.week}–{latest?.week} · Style and Tech chilled volume: 0 m³. Use the forecast to prepare capacity; it does not assign vehicles or drivers.</p>
  </section>
}
