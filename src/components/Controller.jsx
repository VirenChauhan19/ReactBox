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
  const uniqueCourses = [...new Set(assignments.map((a) => a.course))]
  const selected = assignments.find((a) => a.id === selectedAssignment)
  const alreadyDone = selected?.status === 'completed'

  return (
    <div style={s.container}>
      <p style={s.panelLabel}>Controls</p>

      <FilterGroup
        id="filter-course"
        label="Course"
        value={filterCourse}
        onChange={onFilterCourse}
      >
        <option value="all">All Courses</option>
        {uniqueCourses.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </FilterGroup>

      <FilterGroup
        id="filter-status"
        label="Status"
        value={filterStatus}
        onChange={onFilterStatus}
      >
        <option value="all">All Statuses</option>
        <option value="not-started">Not Started</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </FilterGroup>

      <FilterGroup
        id="sort-by"
        label="Sort By"
        value={sortBy}
        onChange={onSortBy}
      >
        <option value="dueDate">Due Date</option>
        <option value="weight">Weight</option>
      </FilterGroup>

      <div style={s.divider} />

      <button
        style={{
          ...s.markBtn,
          ...(alreadyDone ? s.markBtnDone : {}),
          opacity: !selectedAssignment ? 0.4 : 1,
          cursor: !selectedAssignment ? 'default' : 'pointer',
        }}
        onClick={() => selectedAssignment && !alreadyDone && onMarkComplete(selectedAssignment)}
        disabled={!selectedAssignment || alreadyDone}
      >
        {alreadyDone ? '✓ Completed' : 'Mark Complete'}
      </button>

      {selected && (
        <div style={s.selectedInfo}>
          <p style={s.selectedLabel}>Selected</p>
          <p style={s.selectedTitle}>{selected.title}</p>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ id, label, value, onChange, children }) {
  return (
    <div style={s.group}>
      <label htmlFor={id} style={s.label}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={s.select}
      >
        {children}
      </select>
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
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  panelLabel: {
    margin: 0,
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  select: {
    backgroundColor: '#161B22',
    color: '#E6EDF3',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '0.875rem',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    cursor: 'pointer',
    appearance: 'auto',
    outline: 'none',
  },
  divider: {
    height: '1px',
    backgroundColor: '#21262D',
    margin: '4px 0',
  },
  markBtn: {
    backgroundColor: '#238636',
    color: '#FFFFFF',
    border: '1px solid #2EA043',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'background-color 0.15s, opacity 0.15s',
  },
  markBtnDone: {
    backgroundColor: '#161B22',
    color: '#3FB950',
    border: '1px solid #3FB950',
    cursor: 'default',
  },
  selectedInfo: {
    marginTop: '4px',
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  selectedLabel: {
    margin: '0 0 4px',
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  selectedTitle: {
    margin: 0,
    fontSize: '0.83rem',
    fontWeight: 500,
    color: '#E6EDF3',
  },
}
