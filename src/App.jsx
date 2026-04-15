import { useState, useEffect, useRef } from 'react'
import Browser from './components/Browser.jsx'
import DetailView from './components/DetailView.jsx'
import Controller from './components/Controller.jsx'
import UploadScreen from './components/UploadScreen.jsx'
import CalendarView from './components/CalendarView.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import { syncAllAssignments } from './utils/googleCalendar.js'

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
  const [screen, setScreen] = useState('auth')     // 'auth' | 'upload' | 'dashboard'
  const [view,   setView]   = useState('dashboard') // 'dashboard' | 'calendar'

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const [googleToken,  setGoogleToken]  = useState(null)
  const [googleProfile, setGoogleProfile] = useState(null)
  const [calEventIds,  setCalEventIds]  = useState({}) // { assignmentId -> gcal eventId }
  const [syncStatus,   setSyncStatus]   = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'

  // ── Assignments ───────────────────────────────────────────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState(INITIAL_STATE.selectedAssignment)
  const [assignments,        setAssignments]        = useState(INITIAL_STATE.assignments)
  const [filterCourse,       setFilterCourse]       = useState(INITIAL_STATE.filterCourse)
  const [filterStatus,       setFilterStatus]       = useState(INITIAL_STATE.filterStatus)
  const [sortBy,             setSortBy]             = useState(INITIAL_STATE.sortBy)

  // ── Sync to Google Calendar whenever assignments change ───────────────────────
  const syncTimeout = useRef(null)

  useEffect(() => {
    if (!googleToken || assignments.length === 0) return
    // debounce — wait 1.5s after last change before syncing
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(async () => {
      setSyncStatus('syncing')
      try {
        await syncAllAssignments(googleToken, assignments, calEventIds, setCalEventIds)
        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 3000)
      } catch {
        setSyncStatus('error')
      }
    }, 1500)
    return () => clearTimeout(syncTimeout.current)
  }, [assignments, googleToken])

  // ── Auth callback ─────────────────────────────────────────────────────────────
  function handleAuth(token, profile) {
    setGoogleToken(token)
    setGoogleProfile(profile)
    setScreen('upload')
  }

  // ── Upload callback ───────────────────────────────────────────────────────────
  function handleAssignmentsLoaded(newAssignments) {
    setAssignments(newAssignments)
    setSelectedAssignment(newAssignments[0]?.id ?? '')
    setScreen('dashboard')
  }

  // ── Assignment mutations ──────────────────────────────────────────────────────
  function handleMarkComplete(id) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a)))
  }

  function handleNotesGenerated(id, notes) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, notes } : a)))
  }

  function handleQuizGenerated(id, quiz) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, quiz } : a)))
  }

  // ── Derived state ─────────────────────────────────────────────────────────────
  const selectedAssignmentObj = assignments.find((a) => a.id === selectedAssignment) ?? null

  const visibleAssignments = assignments
    .filter((a) => filterCourse === 'all' || a.course === filterCourse)
    .filter((a) => filterStatus === 'all' || a.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate)
      if (sortBy === 'weight')  return b.weight - a.weight
      return 0
    })

  // ── Screens ───────────────────────────────────────────────────────────────────
  if (screen === 'auth') {
    return <AuthScreen onAuth={handleAuth} />
  }

  if (screen === 'upload') {
    return <UploadScreen onAssignmentsLoaded={handleAssignmentsLoaded} />
  }

  const syncLabel = { idle: '', syncing: '⟳ Syncing…', synced: '✓ Synced', error: '⚠ Sync error' }[syncStatus]
  const syncColor = { idle: 'transparent', syncing: '#8B949E', synced: '#3FB950', error: '#F85149' }[syncStatus]

  return (
    <div style={styles.root}>
      {/* ── Top nav bar ──────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Study Command Center</span>
        </div>

        <div style={styles.tabs}>
          {[{ id: 'dashboard', label: '⊞ Dashboard' }, { id: 'calendar', label: '📅 Calendar' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                ...styles.tab,
                color:           view === id ? '#E6EDF3' : '#8B949E',
                borderBottom:    view === id ? '2px solid #58A6FF' : '2px solid transparent',
                backgroundColor: view === id ? '#21262D' : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={styles.rightGroup}>
          {syncStatus !== 'idle' && (
            <span style={{ ...styles.syncBadge, color: syncColor }}>{syncLabel}</span>
          )}
          <button style={styles.uploadBtn} onClick={() => setScreen('upload')}>
            + Upload
          </button>
          {googleProfile && (
            <img
              src={googleProfile.picture}
              alt={googleProfile.name}
              title={googleProfile.name}
              style={styles.avatar}
            />
          )}
        </div>
      </div>

      {/* ── Views ────────────────────────────────────────────────────── */}
      {view === 'dashboard' ? (
        <div key="dashboard" style={styles.layout} className="animate-fadeIn">
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
        <div key="calendar" style={styles.calLayout} className="animate-fadeIn">
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
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: '6px 6px 0 0',
    color: '#8B949E',
    padding: '6px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'color 0.15s, background-color 0.15s, border-color 0.15s',
    marginBottom: '-1px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  syncBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
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
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '2px solid #30363D',
    objectFit: 'cover',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 220px',
    flex: 1,
    backgroundColor: '#0D1117',
  },
  panel: {
    borderRight: '1px solid #21262D',
  },
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
