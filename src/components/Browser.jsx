import { useState } from 'react'

const URGENCY = {
  high:   { color: '#F85149', label: 'High' },
  medium: { color: '#E3B341', label: 'Med'  },
  low:    { color: '#3FB950', label: 'Low'  },
}

function isPastDue(dueDate) {
  return new Date(dueDate + 'T23:59:59').getTime() < Date.now()
}
function isWithin48Hours(dueDate) {
  const now = Date.now()
  const due = new Date(dueDate + 'T23:59:59').getTime()
  return due - now <= 48 * 60 * 60 * 1000 && due >= now
}

export default function Browser({ assignments, selectedAssignment, onSelect }) {
  const done   = assignments.filter((a) => a.status === 'completed').length
  const total  = assignments.length
  const pct    = total ? Math.round((done / total) * 100) : 0

  return (
    <div style={s.container} className="glass-panel">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={s.header}>
        <p style={s.panelLabel}>Assignments</p>
        <span style={s.countBadge}>{total}</span>
      </div>

      {/* ── Progress bar ────────────────────────────────────────── */}
      {total > 0 && (
        <div style={s.progressWrap}>
          <div style={s.progressMeta}>
            <span style={s.progressText}>{done}/{total} complete</span>
            <span style={s.progressPct}>{pct}%</span>
          </div>
          <div style={s.progressTrack}>
            <div
              style={{
                ...s.progressFill,
                width:       `${pct}%`,
                backgroundColor: pct === 100 ? '#3FB950' : '#58A6FF',
                boxShadow:   pct === 100
                  ? '0 0 10px #3FB95088'
                  : '0 0 10px #58A6FF66',
              }}
            />
          </div>
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────── */}
      <div style={s.list}>
        {assignments.length === 0 && (
          <p style={s.empty}>No assignments match the current filters.</p>
        )}

        {assignments.map((asgn, i) => (
          <AssignmentCard
            key={asgn.id}
            asgn={asgn}
            index={i}
            selected={asgn.id === selectedAssignment}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function AssignmentCard({ asgn, index, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const overdue  = isPastDue(asgn.dueDate) && asgn.status !== 'completed'
  const urgent   = isWithin48Hours(asgn.dueDate) && !overdue
  const urg      = URGENCY[asgn.urgency] ?? URGENCY.low
  const done     = asgn.status === 'completed'

  const pillColor = overdue ? '#F85149' : urg.color
  const pillLabel = overdue ? 'Overdue' : urg.label

  return (
    <div
      className="card-enter"
      style={{ '--i': index }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(asgn.id)}
    >
      <div
        style={{
          ...s.card,
          opacity:    done ? 0.55 : 1,
          outline:    selected ? '2px solid #58A6FF' : '2px solid transparent',
          transform:  hovered && !selected ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow:  selected
            ? '0 0 0 2px #58A6FF44, 0 8px 24px #58A6FF22'
            : hovered
            ? `0 6px 24px rgba(0,0,0,.45), 0 0 0 1px ${pillColor}33`
            : urgent
            ? `0 0 0 2px ${urg.color}33, 0 0 12px ${urg.color}22`
            : 'none',
          animation: urgent ? 'urgentPulse 2s ease-in-out infinite' : 'none',
          transition: 'transform .18s ease, box-shadow .18s ease, outline .15s ease, opacity .2s',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            ...s.accentBar,
            backgroundColor: overdue ? '#F85149' : selected ? '#58A6FF' : urg.color,
            opacity: selected || overdue || hovered ? 1 : 0.4,
          }}
        />

        <div style={s.cardInner}>
          <div style={s.cardTop}>
            <span style={s.course}>{asgn.course}</span>
            <span
              style={{
                ...s.pill,
                backgroundColor: pillColor + '22',
                color:           pillColor,
                border:          `1px solid ${pillColor}55`,
              }}
            >
              {pillLabel}
            </span>
          </div>

          <p
            style={{
              ...s.title,
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'var(--text-muted)' : 'var(--text-primary)',
            }}
          >
            {asgn.title}
          </p>

          <div style={s.cardBottom}>
            <span
              style={{
                ...s.dueDate,
                color: overdue ? '#F85149' : 'var(--text-muted)',
              }}
            >
              {overdue ? `⚠ Past due ${asgn.dueDate}` : `Due ${asgn.dueDate}`}
            </span>
            {done && <span style={s.doneBadge}>✓ Done</span>}
            {asgn.weight > 0 && !done && (
              <span style={s.weightBadge}>{asgn.weight}%</span>
            )}
          </div>
        </div>
      </div>
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
  panelLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  countBadge: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '99px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    padding: '1px 8px',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  progressMeta: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  progressPct: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#58A6FF',
  },
  progressTrack: {
    height: '4px',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width .6s cubic-bezier(.16,1,.3,1), background-color .4s ease',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  empty: {
    fontSize: '0.83rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '20px',
  },
  card: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  accentBar: {
    width: '3px',
    flexShrink: 0,
    transition: 'background-color .2s, opacity .2s',
  },
  cardInner: {
    padding: '13px 14px',
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  course: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  pill: {
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '99px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  title: {
    margin: '0 0 8px',
    fontSize: '0.9rem',
    fontWeight: 500,
    lineHeight: 1.35,
    transition: 'color .2s',
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
  },
  dueDate: {
    fontSize: '0.72rem',
    transition: 'color .2s',
  },
  doneBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#3FB950',
  },
  weightBadge: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-elevated)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
}
