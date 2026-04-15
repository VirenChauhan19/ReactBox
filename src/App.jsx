import { useState } from 'react'
import Browser from './components/Browser.jsx'
import DetailView from './components/DetailView.jsx'
import Controller from './components/Controller.jsx'
import UploadScreen from './components/UploadScreen.jsx'
import CalendarView from './components/CalendarView.jsx'

const INITIAL_STATE = {
  selectedAssignment: 'asgn-01',
  assignments: [
    {
      id: 'asgn-01',
      course: 'AI 201',
      title: 'Project 2',
      dueDate: '2026-04-29',
      weight: 25,
      status: 'in-progress',
      description: 'Three-panel React app with shared state',
      notes: '',
      quiz: [],
      urgency: 'high',
    },
    {
      id: 'asgn-02',
      course: 'GAME 366',
      title: 'Ice Surface Material',
      dueDate: '2026-05-01',
      weight: 20,
      status: 'not-started',
      description: 'UE5 Substrate material with Niagara',
      notes: '',
      quiz: [],
      urgency: 'high',
    },
    {
      id: 'asgn-03',
      course: 'ITGM 336',
      title: 'Modular Kit Final',
      dueDate: '2026-05-10',
      weight: 30,
      status: 'not-started',
      description: 'Medieval dungeon modular kit',
      notes: '',
      quiz: [],
      urgency: 'medium',
    },
  ],
  filterCourse: 'all',
  filterStatus: 'all',
  sortBy: 'dueDate',
}

export default function App() {
  const [screen, setScreen] = useState('upload') // 'upload' | 'dashboard'
  const [view, setView]     = useState('dashboard') // 'dashboard' | 'calendar'

  const [selectedAssignment, setSelectedAssignment] = useState(
    INITIAL_STATE.selectedAssignment
  )
  const [assignments, setAssignments] = useState(INITIAL_STATE.assignments)
  const [filterCourse, setFilterCourse] = useState(INITIAL_STATE.filterCourse)
  const [filterStatus, setFilterStatus] = useState(INITIAL_STATE.filterStatus)
  const [sortBy, setSortBy] = useState(INITIAL_STATE.sortBy)

  console.log('Study Command Center — App State:', {
    screen,
    selectedAssignment,
    assignments,
    filterCourse,
    filterStatus,
    sortBy,
  })

  // ── Upload screen ────────────────────────────────────────────────────────────

  function handleAssignmentsLoaded(newAssignments) {
    setAssignments(newAssignments)
    setSelectedAssignment(newAssignments[0]?.id ?? '')
    setScreen('dashboard')
  }

  // ── Controller callbacks ─────────────────────────────────────────────────────

  function handleMarkComplete(id) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    )
  }

  // ── DetailView callbacks ─────────────────────────────────────────────────────

  function handleNotesGenerated(id, notes) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes } : a))
    )
  }

  function handleQuizGenerated(id, quiz) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, quiz } : a))
    )
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedAssignmentObj =
    assignments.find((a) => a.id === selectedAssignment) ?? null

  const visibleAssignments = assignments
    .filter((a) => filterCourse === 'all' || a.course === filterCourse)
    .filter((a) => filterStatus === 'all' || a.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate)
      if (sortBy === 'weight') return b.weight - a.weight
      return 0
    })

  // ── Render ───────────────────────────────────────────────────────────────────

  if (screen === 'upload') {
    return <UploadScreen onAssignmentsLoaded={handleAssignmentsLoaded} />
  }

  return (
    <div style={styles.root}>
      {/* ── Top nav bar ─────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Study Command Center</span>
        </div>
        <div style={styles.tabs}>
          {['dashboard', 'calendar'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...styles.tab,
                ...(view === v ? styles.tabActive : {}),
              }}
            >
              {v === 'dashboard' ? '⊞ Dashboard' : '📅 Calendar'}
            </button>
          ))}
        </div>
        <button style={styles.uploadBtn} onClick={() => setScreen('upload')}>
          + Upload
        </button>
      </div>

      {/* ── Views ───────────────────────────────────────────────────── */}
      {view === 'dashboard' ? (
        <div style={styles.layout}>
          <div style={styles.panel}>
            <Browser
              assignments={visibleAssignments}
              selectedAssignment={selectedAssignment}
              onSelect={setSelectedAssignment}
            />
          </div>

          <div style={{ ...styles.panel, borderLeft: '1px solid #21262D' }}>
            <DetailView
              selectedAssignment={selectedAssignmentObj}
              onNotesGenerated={handleNotesGenerated}
              onQuizGenerated={handleQuizGenerated}
            />
          </div>

          <div style={{ ...styles.panel, borderLeft: '1px solid #21262D' }}>
            <Controller
              assignments={assignments}
              filterCourse={filterCourse}
              filterStatus={filterStatus}
              sortBy={sortBy}
              selectedAssignment={selectedAssignment}
              onFilterCourse={setFilterCourse}
              onFilterStatus={setFilterStatus}
              onSortBy={setSortBy}
              onMarkComplete={handleMarkComplete}
            />
          </div>
        </div>
      ) : (
        <div style={styles.calLayout}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CalendarView
              assignments={visibleAssignments}
              selectedAssignment={selectedAssignment}
              onSelect={setSelectedAssignment}
            />
          </div>
          <div style={styles.calSide}>
            <DetailView
              selectedAssignment={selectedAssignmentObj}
              onNotesGenerated={handleNotesGenerated}
              onQuizGenerated={handleQuizGenerated}
            />
            <div style={{ borderTop: '1px solid #21262D' }}>
              <Controller
                assignments={assignments}
                filterCourse={filterCourse}
                filterStatus={filterStatus}
                sortBy={sortBy}
                selectedAssignment={selectedAssignment}
                onFilterCourse={setFilterCourse}
                onFilterStatus={setFilterStatus}
                onSortBy={setSortBy}
                onMarkComplete={handleMarkComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#0D1117',
    fontFamily: "'Inter', 'system-ui', sans-serif",
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: '52px',
    backgroundColor: '#161B22',
    borderBottom: '1px solid #21262D',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandDot: {
    display: 'inline-block',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#58A6FF',
  },
  brandText: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
  },
  tab: {
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: '#8B949E',
    padding: '5px 14px',
    fontSize: '0.83rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: '#E6EDF3',
    backgroundColor: '#0D1117',
    border: '1px solid #30363D',
  },
  uploadBtn: {
    backgroundColor: '#238636',
    border: '1px solid #2EA043',
    borderRadius: '6px',
    color: '#fff',
    padding: '5px 14px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', 'system-ui', sans-serif",
  },
  // ── Dashboard layout ──────────────────────────────────────────────
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 220px',
    flex: 1,
    backgroundColor: '#0D1117',
  },
  panel: {
    borderRight: '1px solid #21262D',
  },
  // ── Calendar layout ───────────────────────────────────────────────
  calLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  calSide: {
    width: '340px',
    flexShrink: 0,
    borderLeft: '1px solid #21262D',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
}
