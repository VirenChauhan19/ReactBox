const URGENCY = {
  high:   { color: '#F85149', label: 'High' },
  medium: { color: '#E3B341', label: 'Med'  },
  low:    { color: '#3FB950', label: 'Low'  },
}

function isWithin48Hours(dueDate) {
  const now = Date.now()
  const due = new Date(dueDate + 'T23:59:59').getTime()
  return due - now <= 48 * 60 * 60 * 1000 && due >= now
}

export default function Browser({ assignments, selectedAssignment, onSelect }) {
  return (
    <div style={s.container}>
      <p style={s.panelLabel}>Assignments</p>
      <div style={s.list}>
        {assignments.length === 0 && (
          <p style={s.empty}>No assignments match the current filters.</p>
        )}
        {assignments.map((asgn) => {
          const urgent = isWithin48Hours(asgn.dueDate)
          const selected = asgn.id === selectedAssignment
          const urg = URGENCY[asgn.urgency] ?? URGENCY.low

          return (
            <div
              key={asgn.id}
              onClick={() => onSelect(asgn.id)}
              style={{
                ...s.card,
                outline: selected ? '2px solid #58A6FF' : '2px solid transparent',
                boxShadow: urgent
                  ? `0 0 0 2px ${urg.color}33, 0 0 12px ${urg.color}22`
                  : 'none',
                animation: urgent ? 'urgentPulse 2s ease-in-out infinite' : 'none',
              }}
            >
              <div style={s.cardTop}>
                <span style={s.course}>{asgn.course}</span>
                <span
                  style={{
                    ...s.urgencyPill,
                    backgroundColor: urg.color + '22',
                    color: urg.color,
                    border: `1px solid ${urg.color}55`,
                  }}
                >
                  {urg.label}
                </span>
              </div>

              <p style={s.title}>{asgn.title}</p>

              <div style={s.cardBottom}>
                <span style={s.dueDate}>Due {asgn.dueDate}</span>
                {asgn.status === 'completed' && (
                  <span style={s.completedBadge}>✓ Done</span>
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
  container: {
    backgroundColor: '#0D1117',
    minHeight: '100vh',
    padding: '28px 16px',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    color: '#FFFFFF',
    overflowY: 'auto',
  },
  panelLabel: {
    margin: '0 0 16px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  empty: {
    fontSize: '0.83rem',
    color: '#8B949E',
    fontStyle: 'italic',
    marginTop: '8px',
  },
  card: {
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '8px',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'outline 0.15s, transform 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '7px',
  },
  course: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  urgencyPill: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '99px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '0.93rem',
    fontWeight: 500,
    color: '#E6EDF3',
    lineHeight: 1.35,
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: '0.75rem',
    color: '#8B949E',
  },
  completedBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#3FB950',
  },
}
