import { useState, useEffect, useRef } from 'react'
import Browser from './components/Browser.jsx'
import DetailView from './components/DetailView.jsx'
import Controller from './components/Controller.jsx'
import UploadScreen from './components/UploadScreen.jsx'
import CalendarView from './components/CalendarView.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import ChatBot from './components/ChatBot.jsx'
import ChapterNotes from './components/ChapterNotes.jsx'
import { syncAllAssignments } from './utils/googleCalendar.js'

const INITIAL_STATE = {
  selectedAssignment: '',
  assignments: [],
  filterCourse: 'all',
  filterStatus: 'all',
  sortBy: 'dueDate',
}

export default function App({ googleEnabled = true }) {
  const [screen, setScreen] = useState('auth') // 'auth' | 'upload' | 'dashboard'
  const [view,   setView]   = useState('dashboard') // 'dashboard' | 'calendar' | 'chapters'
  const [theme,  setTheme]  = useState('dark') // 'dark' | 'light'

  // Apply theme to <html> so ALL screens (auth, upload, dashboard) inherit CSS vars
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  const [showUpload, setShowUpload] = useState(false)

  // ── Upload callback ───────────────────────────────────────────────────────────
  function handleAssignmentsLoaded(newAssignments) {
    setAssignments(newAssignments)
    setSelectedAssignment(newAssignments[0]?.id ?? '')
    setScreen('dashboard')
    setShowUpload(false)
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
    return (
      <AuthScreen
        googleEnabled={googleEnabled}
        onAuth={handleAuth}
        onSkip={() => setScreen('upload')}
      />
    )
  }

  if (screen === 'upload') {
    return (
      <UploadScreen
        onAssignmentsLoaded={handleAssignmentsLoaded}
        onClose={() => setScreen(assignments.length > 0 ? 'dashboard' : 'auth')}
      />
    )
  }

  const syncLabel = { idle: '', syncing: '⟳ Syncing…', synced: '✓ Synced', error: '⚠ Sync error' }[syncStatus]
  const syncColor = { idle: 'transparent', syncing: 'var(--text-muted)', synced: '#3FB950', error: '#F85149' }[syncStatus]

  return (
    <div style={styles.root} data-theme={theme}>
      {/* ── Top nav bar ──────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Study Command Center</span>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'dashboard', label: '⊞ Dashboard' },
            { id: 'calendar',  label: '📅 Calendar'  },
            { id: 'chapters',  label: '📚 Chapters'  },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                ...styles.tab,
                color:           view === id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom:    view === id
                  ? `2px solid ${id === 'chapters' ? '#BC8CFF' : '#58A6FF'}`
                  : '2px solid transparent',
                backgroundColor: view === id ? 'var(--bg-elevated)' : 'transparent',
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
          <button
            style={{
              ...styles.themeBtn,
              backgroundColor: theme === 'dark' ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
              color: theme === 'dark' ? '#E3B341' : '#636C76',
              border: '1px solid var(--border)',
            }}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
            <span style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '5px' }}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
          <button style={styles.uploadBtn} onClick={() => setShowUpload(true)}>
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
          <div style={{ ...styles.panel, borderLeft: '1px solid var(--border)' }}>
            <DetailView
              selectedAssignment={selectedAssignmentObj}
              onNotesGenerated={handleNotesGenerated}
              onQuizGenerated={handleQuizGenerated}
            />
          </div>
          <div style={{ ...styles.panel, borderLeft: '1px solid var(--border)' }}>
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
      ) : view === 'calendar' ? (
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
            <div style={{ borderTop: '1px solid var(--border)' }}>
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
      ) : (
        <div key="chapters" style={styles.chaptersLayout} className="animate-fadeIn">
          <ChapterNotes />
        </div>
      )}

      {/* ── Upload modal overlay ─────────────────────────────────── */}
      {showUpload && (
        <UploadScreen
          onAssignmentsLoaded={handleAssignmentsLoaded}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* ── AI Chatbot ───────────────────────────────────────────── */}
      <ChatBot
        assignments={assignments}
        userName={googleProfile?.name ?? null}
      />
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-main)',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'background-color 0.25s ease',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: '52px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
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
    color: 'var(--text-muted)',
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
    color: 'var(--text-muted)',
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
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
    fontWeight: 600,
    lineHeight: 1,
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
    transition: 'opacity 0.15s ease',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '2px solid var(--border)',
    objectFit: 'cover',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 220px',
    flex: 1,
    backgroundColor: 'var(--bg-main)',
  },
  panel: {
    borderRight: '1px solid var(--border)',
  },
  calLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  calSide: {
    width: '340px',
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  chaptersLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
}
