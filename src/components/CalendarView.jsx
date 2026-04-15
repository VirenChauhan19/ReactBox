import { useState } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const URGENCY_COLOR = {
  high:   '#F85149',
  medium: '#E3B341',
  low:    '#3FB950',
}

export default function CalendarView({ assignments, selectedAssignment, onSelect }) {
  const today    = new Date()
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay      = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const daysInPrevMo  = new Date(year, month, 0).getDate()

  // index assignments by dueDate string
  const byDate = {}
  assignments.forEach((a) => {
    if (!byDate[a.dueDate]) byDate[a.dueDate] = []
    byDate[a.dueDate].push(a)
  })

  // build 42-cell grid
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrevMo - i, current: false, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ day: d, current: true, dateStr })
  }
  while (cells.length < 42)
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false, dateStr: null })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div style={s.wrap}>
      {/* Month nav */}
      <div style={s.header}>
        <button style={s.navBtn} onClick={() => setViewDate(new Date(year, month - 1, 1))}>←</button>
        <span style={s.monthTitle}>{MONTHS[month]} {year}</span>
        <button style={s.navBtn} onClick={() => setViewDate(new Date(year, month + 1, 1))}>→</button>
      </div>

      {/* Legend */}
      <div style={s.legend}>
        {Object.entries(URGENCY_COLOR).map(([k, c]) => (
          <span key={k} style={{ ...s.legendDot, backgroundColor: c }} />
        ))}
        <span style={s.legendText}>High / Medium / Low urgency</span>
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {DAYS.map((d) => (
          <div key={d} style={s.dayLabel}>{d}</div>
        ))}

        {cells.map((cell, i) => {
          const asgns   = cell.dateStr ? (byDate[cell.dateStr] ?? []) : []
          const isToday = cell.dateStr === todayStr

          return (
            <div
              key={i}
              style={{
                ...s.cell,
                opacity:         cell.current ? 1 : 0.3,
                backgroundColor: isToday ? '#1C2A3A' : '#161B22',
                border:          isToday ? '1px solid #58A6FF' : '1px solid #21262D',
              }}
            >
              <span style={{
                ...s.dayNum,
                color:      isToday ? '#58A6FF' : '#E6EDF3',
                fontWeight: isToday ? 700 : 400,
              }}>
                {cell.day}
              </span>

              <div style={s.chips}>
                {asgns.slice(0, 3).map((a) => {
                  const c       = URGENCY_COLOR[a.urgency] ?? '#8B949E'
                  const isSelec = a.id === selectedAssignment
                  return (
                    <div
                      key={a.id}
                      title={a.title}
                      onClick={() => cell.current && onSelect(a.id)}
                      style={{
                        ...s.chip,
                        backgroundColor: c + '22',
                        color:           c,
                        border:          isSelec ? `1px solid ${c}` : `1px solid ${c}44`,
                        boxShadow:       isSelec ? `0 0 0 1px ${c}` : 'none',
                        opacity:         a.status === 'completed' ? 0.45 : 1,
                        textDecoration:  a.status === 'completed' ? 'line-through' : 'none',
                      }}
                    >
                      {a.title.length > 13 ? a.title.slice(0, 12) + '…' : a.title}
                    </div>
                  )
                })}
                {asgns.length > 3 && (
                  <span style={s.more}>+{asgns.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  wrap: {
    backgroundColor: '#0D1117',
    minHeight: '100vh',
    padding: '28px 20px',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    color: '#E6EDF3',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  navBtn: {
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '6px',
    color: '#E6EDF3',
    padding: '6px 16px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s',
  },
  monthTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#E6EDF3',
    letterSpacing: '0.02em',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '16px',
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendText: {
    fontSize: '0.72rem',
    color: '#8B949E',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
    padding: '6px 0',
  },
  cell: {
    borderRadius: '6px',
    padding: '6px 7px 8px',
    minHeight: '82px',
    cursor: 'default',
  },
  dayNum: {
    fontSize: '0.78rem',
    display: 'block',
    marginBottom: '5px',
  },
  chips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  chip: {
    fontSize: '0.62rem',
    fontWeight: 500,
    padding: '2px 5px',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'box-shadow 0.1s',
  },
  more: {
    fontSize: '0.6rem',
    color: '#8B949E',
    paddingLeft: '3px',
  },
}
