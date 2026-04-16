import { useState, useEffect, useRef, useMemo } from 'react'

const R   = 36
const CIRC = 2 * Math.PI * R

// ── Confetti particle ───────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#58A6FF', '#3FB950', '#E3B341', '#F78166', '#BC8CFF']

function Confetti({ active }) {
  if (!active) return null
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle  = (i / 18) * 360
    const dist   = 38 + Math.random() * 28
    const tx     = `${Math.cos((angle * Math.PI) / 180) * dist}px`
    const ty     = `${Math.sin((angle * Math.PI) / 180) * dist}px`
    const color  = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const size   = 4 + Math.random() * 4
    return { tx, ty, color, size, r: `${Math.random() * 360}deg` }
  })

  return (
    <div style={cf.wrap} aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            ...cf.dot,
            '--tx': p.tx,
            '--ty': p.ty,
            '--r':  p.r,
            backgroundColor: p.color,
            width:  p.size,
            height: p.size,
            animationDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </div>
  )
}

const cf = {
  wrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  dot: {
    position: 'absolute',
    borderRadius: '50%',
    top: 0,
    left: 0,
    animation: 'confettiFly .65s cubic-bezier(.16,1,.3,1) both forwards',
  },
}

// ── Progress ring ───────────────────────────────────────────────────────────
function ProgressRing({ pct }) {
  const [displayed, setDisplayed] = useState(0)
  const [bump, setBump] = useState(false)
  const prevPct = useRef(0)

  useEffect(() => {
    if (pct === prevPct.current) return
    prevPct.current = pct

    // Animate the number up/down
    const start     = displayed
    const end       = pct
    const duration  = 600
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayed(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else {
        setBump(true)
        setTimeout(() => setBump(false), 400)
      }
    }
    requestAnimationFrame(tick)
  }, [pct])

  const offset = CIRC * (1 - pct / 100)
  const color  = pct === 100 ? '#3FB950' : pct > 50 ? '#58A6FF' : '#E3B341'

  return (
    <svg width={R * 2 + 10} height={R * 2 + 10} style={{ display: 'block' }}>
      <circle
        cx={R + 5} cy={R + 5} r={R}
        fill="none" stroke="var(--bg-elevated)" strokeWidth="5"
      />
      <circle
        cx={R + 5} cy={R + 5} r={R}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${R + 5} ${R + 5})`}
        style={{
          transition: 'stroke-dashoffset .7s cubic-bezier(.16,1,.3,1), stroke .4s ease',
          filter: `drop-shadow(0 0 4px ${color}88)`,
        }}
      />
      <text
        x={R + 5} y={R + 5}
        textAnchor="middle" dominantBaseline="central"
        style={{
          fill: color,
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: 'Inter, system-ui',
          animation: bump ? 'countBump .35s cubic-bezier(.16,1,.3,1)' : 'none',
        }}
      >
        {displayed}%
      </text>
    </svg>
  )
}

// ── Status selector ──────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started', color: '#8B949E' },
  { value: 'in-progress', label: 'In Progress', color: '#E3B341' },
  { value: 'completed',   label: 'Completed',   color: '#3FB950' },
]

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Controller({
  assignments,
  filterCourse,
  filterStatus,
  sortBy,
  selectedAssignment,
  onFilterCourse,
  onFilterStatus,
  onSortBy,
  onMarkComplete,
}) {
  const [burst,     setBurst]     = useState(false)
  const [justDone,  setJustDone]  = useState(false)
  const burstTimer = useRef(null)

  const uniqueCourses = [...new Set(assignments.map((a) => a.course))]
  const selected      = assignments.find((a) => a.id === selectedAssignment)
  const alreadyDone   = selected?.status === 'completed'

  const done = assignments.filter((a) => a.status === 'completed').length
  const pct  = assignments.length ? Math.round((done / assignments.length) * 100) : 0

  function handleComplete() {
    if (!selectedAssignment || alreadyDone) return
    onMarkComplete(selectedAssignment)
    setBurst(true)
    setJustDone(true)
    clearTimeout(burstTimer.current)
    burstTimer.current = setTimeout(() => {
      setBurst(false)
      setJustDone(false)
    }, 900)
  }

  return (
    <div style={s.container}>
      <p style={s.panelLabel}>Controls</p>

      {/* ── Progress ring ──────────────────────────────────── */}
      <div style={s.ringWrap}>
        <ProgressRing pct={pct} />
        <div style={s.ringMeta}>
          <span style={s.ringDone}>{done} done</span>
          <span style={s.ringTotal}>of {assignments.length}</span>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <FilterGroup id="fc" label="Course" value={filterCourse} onChange={onFilterCourse}>
        <option value="all">All Courses</option>
        {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
      </FilterGroup>

      <FilterGroup id="fs" label="Status" value={filterStatus} onChange={onFilterStatus}>
        <option value="all">All Statuses</option>
        <option value="not-started">Not Started</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </FilterGroup>

      <FilterGroup id="sb" label="Sort By" value={sortBy} onChange={onSortBy}>
        <option value="dueDate">Due Date</option>
        <option value="weight">Weight</option>
      </FilterGroup>

      <div style={s.divider} />

      {/* ── Mark Complete ──────────────────────────────────── */}
      <div style={s.btnWrap}>
        <Confetti active={burst} />
        <button
          className="mark-complete-glow"
          data-done={alreadyDone ? 'true' : 'false'}
          style={{
            ...s.markBtn,
            ...(alreadyDone ? s.markDone : {}),
            ...(justDone ? { animation: 'successPop .35s ease' } : {}),
            opacity: !selectedAssignment ? 0.4 : 1,
            cursor:  !selectedAssignment || alreadyDone ? 'default' : 'pointer',
          }}
          onClick={handleComplete}
          disabled={!selectedAssignment || alreadyDone}
        >
          {alreadyDone ? '✓ Completed' : 'Mark Complete'}
        </button>
      </div>

      {/* ── Selected info ──────────────────────────────────── */}
      {selected && (
        <div style={s.selectedCard} className="animate-slideDown">
          <p style={s.selLabel}>Selected</p>
          <p style={s.selTitle}>{selected.title}</p>
          <div style={s.selMeta}>
            {STATUS_OPTIONS.map(({ value, label, color }) => (
              <span
                key={value}
                style={{
                  ...s.statusDot,
                  backgroundColor: selected.status === value ? color : 'var(--border)',
                  boxShadow: selected.status === value ? `0 0 6px ${color}88` : 'none',
                }}
                title={label}
              />
            ))}
            <span style={s.selStatus}>
              {STATUS_OPTIONS.find(o => o.value === selected.status)?.label ?? selected.status}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ id, label, value, onChange, children }) {
  return (
    <div style={s.group}>
      <label htmlFor={id} style={s.filterLabel}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={s.select}>
        {children}
      </select>
    </div>
  )
}

const s = {
  container: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    padding: '22px 14px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'background-color 0.25s ease',
  },
  panelLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  ringWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  ringMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ringDone: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  ringTotal: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  filterLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  select: {
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '0.83rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color .15s, background-color 0.25s ease',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--bg-elevated)',
  },
  btnWrap: {
    position: 'relative',
  },
  markBtn: {
    width: '100%',
    backgroundColor: '#238636',
    color: '#fff',
    border: '1px solid #2EA043',
    borderRadius: '8px',
    padding: '11px 16px',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    cursor: 'pointer',
    transition: 'background-color .15s, transform .15s, box-shadow .15s',
    boxShadow: '0 2px 8px rgba(46,160,67,.25)',
  },
  markDone: {
    backgroundColor: 'var(--bg-surface)',
    color: '#3FB950',
    border: '1px solid #3FB950',
    boxShadow: '0 0 8px rgba(63,185,80,.15)',
  },
  selectedCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '11px 13px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  selLabel: {
    fontSize: '0.62rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '4px',
  },
  selTitle: {
    fontSize: '0.83rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: '8px',
    lineHeight: 1.35,
  },
  selMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background-color .3s, box-shadow .3s',
  },
  selStatus: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
}
