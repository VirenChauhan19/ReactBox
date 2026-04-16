import { useState, useRef } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const URGENCY_COLOR = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }

function buildCells(year, month) {
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const daysInPrevMo = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrevMo - i, current: false, dateStr: null })

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr })
  }

  let nextDay = 1
  while (cells.length < 42)
    cells.push({ day: nextDay++, current: false, dateStr: null })

  return cells
}

export default function CalendarView({ assignments, selectedAssignment, onSelect }) {
  const today    = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dir,     setDir]      = useState(null) // 'left' | 'right'
  const [animKey, setAnimKey]  = useState(0)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  function changeMonth(delta) {
    setDir(delta > 0 ? 'left' : 'right')
    setAnimKey((k) => k + 1)
    setViewDate(new Date(year, month + delta, 1))
  }

  const byDate = {}
  assignments.forEach((a) => {
    if (!byDate[a.dueDate]) byDate[a.dueDate] = []
    byDate[a.dueDate].push(a)
  })

  const cells = buildCells(year, month)

  return (
    <>
      <style>{CSS}</style>
      <div style={s.wrap}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={s.header}>
          <NavBtn onClick={() => changeMonth(-1)}>←</NavBtn>
          <div style={s.monthWrap}>
            <span style={s.monthTitle}>{MONTHS[month]}</span>
            <span style={s.yearLabel}>{year}</span>
          </div>
          <NavBtn onClick={() => changeMonth(1)}>→</NavBtn>
        </div>

        {/* ── Legend ────────────────────────────────────────── */}
        <div style={s.legend}>
          {Object.entries(URGENCY_COLOR).map(([k, c]) => (
            <span key={k} style={s.legendItem}>
              <span style={{ ...s.legendDot, backgroundColor: c, boxShadow: `0 0 4px ${c}` }} />
              <span style={s.legendTxt}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
            </span>
          ))}
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, backgroundColor: '#F8514966', border: '1px solid #F85149' }} />
            <span style={s.legendTxt}>Overdue</span>
          </span>
        </div>

        {/* ── Grid ──────────────────────────────────────────── */}
        <div style={s.dayLabels}>
          {DAYS.map((d) => <div key={d} style={s.dayLabel}>{d}</div>)}
        </div>

        <div
          key={animKey}
          style={{
            ...s.grid,
            animation: dir === 'left'
              ? 'calSlideLeft .35s cubic-bezier(.16,1,.3,1) both'
              : dir === 'right'
              ? 'calSlideRight .35s cubic-bezier(.16,1,.3,1) both'
              : 'none',
          }}
        >
          {cells.map((cell, i) => (
            <CalCell
              key={i}
              cell={cell}
              asgns={cell.dateStr ? (byDate[cell.dateStr] ?? []) : []}
              isToday={cell.dateStr === todayStr}
              isPast={cell.dateStr ? cell.dateStr < todayStr : false}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function CalCell({ cell, asgns, isToday, isPast, selectedAssignment, onSelect }) {
  const [hov, setHov] = useState(false)

  const hasOverdue = isPast && asgns.some((a) => a.status !== 'completed')
  const hasAsgns   = asgns.length > 0

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.cell,
        opacity:         cell.current ? 1 : 0.25,
        backgroundColor: isToday   ? 'color-mix(in srgb, #58A6FF 15%, var(--bg-surface))'
                       : hasOverdue ? 'var(--wrong-bg)'
                       : hov && hasAsgns ? 'var(--bg-hover)'
                       : 'var(--bg-surface)',
        border: isToday    ? '1px solid #58A6FF'
              : hasOverdue ? '1px solid #F8514944'
              : hov && hasAsgns ? '1px solid var(--border-strong)'
              : '1px solid var(--bg-elevated)',
        boxShadow: isToday ? '0 0 0 2px #58A6FF33' : 'none',
        transition: 'background-color .15s, border-color .15s, box-shadow .15s',
      }}
    >
      <span
        style={{
          ...s.dayNum,
          color:      isToday ? '#58A6FF' : hasOverdue ? '#F85149' : cell.current ? 'var(--text-primary)' : 'var(--border-strong)',
          fontWeight: isToday || hasOverdue ? 700 : 400,
        }}
      >
        {cell.day}
        {hasOverdue && <span style={s.warnDot} title="Overdue">●</span>}
      </span>

      <div style={s.chips}>
        {asgns.slice(0, 3).map((a) => {
          const c      = URGENCY_COLOR[a.urgency] ?? '#8B949E'
          const isSel  = a.id === selectedAssignment
          return (
            <div
              key={a.id}
              title={a.title}
              onClick={(e) => { e.stopPropagation(); cell.current && onSelect(a.id) }}
              style={{
                ...s.chip,
                backgroundColor: a.status === 'completed' ? 'var(--bg-elevated)' : c + '22',
                color:           a.status === 'completed' ? 'var(--text-muted)' : c,
                border:          isSel ? `1px solid ${c}` : `1px solid ${c}44`,
                boxShadow:       isSel ? `0 0 6px ${c}66` : 'none',
                textDecoration:  a.status === 'completed' ? 'line-through' : 'none',
                opacity:         a.status === 'completed' ? 0.5 : 1,
                transform:       isSel ? 'scale(1.03)' : 'none',
                transition:      'transform .15s, box-shadow .15s',
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
}

function NavBtn({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.navBtn,
        backgroundColor: hov ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        transform:       hov ? 'scale(1.08)' : 'scale(1)',
        boxShadow:       hov ? '0 0 12px rgba(88,166,255,.2)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

const CSS = `
  @keyframes calSlideLeft {
    from { opacity:0; transform: translateX(30px); }
    to   { opacity:1; transform: translateX(0); }
  }
  @keyframes calSlideRight {
    from { opacity:0; transform: translateX(-30px); }
    to   { opacity:1; transform: translateX(0); }
  }
`

const s = {
  wrap: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    padding: '24px 18px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'background-color 0.25s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    padding: '7px 18px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color .15s, transform .15s, box-shadow .15s',
  },
  monthWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
  },
  monthTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  yearLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendTxt: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  dayLabels: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
    padding: '4px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  cell: {
    borderRadius: '8px',
    padding: '6px 6px 8px',
    minHeight: '80px',
    cursor: 'default',
  },
  dayNum: {
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    marginBottom: '5px',
  },
  warnDot: {
    fontSize: '0.4rem',
    color: '#F85149',
    lineHeight: 1,
  },
  chips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  chip: {
    fontSize: '0.6rem',
    fontWeight: 500,
    padding: '2px 5px',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  more: {
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    paddingLeft: '3px',
  },
}
