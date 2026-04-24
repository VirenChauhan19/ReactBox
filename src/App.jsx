import { useState, useEffect, useRef, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { LayoutDashboard, CalendarDays, BookOpen, HeartPulse, Crosshair } from 'lucide-react'

// Only rendered inside GoogleOAuthProvider — safely exposes the login fn via ref
function GoogleFitBridge({ loginRef, onSuccess }) {
  const login = useGoogleLogin({
    onSuccess,
    scope: [
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
      'https://www.googleapis.com/auth/fitness.activity.read',
    ].join(' '),
  })
  useEffect(() => { loginRef.current = login }, [login])
  return null
}
import Browser from './components/Browser.jsx'
import DetailView from './components/DetailView.jsx'
import Controller from './components/Controller.jsx'
import UploadScreen from './components/UploadScreen.jsx'
import CalendarView from './components/CalendarView.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import ParticleCanvas from './components/ParticleCanvas.jsx'
import ChatBot from './components/ChatBot.jsx'
import ChapterNotes from './components/ChapterNotes.jsx'
import BiometricPanel from './components/BiometricPanel.jsx'
import FocusHub from './components/FocusHub.jsx'
import { syncAllAssignments } from './utils/googleCalendar.js'
import {
  exchangeWhoopCode, fetchWhoopData, fetchGoogleFitData,
  initiateWhoopAuth, initiateGarminAuth, exchangeGarminCode, fetchGarminData,
  computeReadiness, getStudyMode, STUDY_MODE_META,
} from './utils/wearableApi.js'

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

// ── Up Next panel (shown in calendar sidebar) ────────────────────────────────
const URGENCY_DOT = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }

function UpNextPanel({ assignments }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const upcoming = (assignments ?? [])
    .filter(a => a.status !== 'completed' && a.dueDate)
    .map(a => ({ ...a, _d: new Date(a.dueDate + 'T00:00:00') }))
    .filter(a => a._d >= today)
    .sort((a, b) => a._d - b._d)
    .slice(0, 6)

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>📌 Up Next</span>
      {upcoming.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '10px 0' }}>
          🎉 Nothing due soon!
        </div>
      ) : upcoming.map(a => {
        const diff = Math.round((a._d - today) / 86_400_000)
        const urgentColor = diff === 0 ? '#F85149' : diff === 1 ? '#E3B341' : 'var(--border)'
        const labelColor  = diff === 0 ? '#F85149' : diff === 1 ? '#E3B341' : 'var(--text-muted)'
        const badge       = diff === 0 ? 'TODAY' : diff === 1 ? 'TMR' : a._d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              minWidth: '44px', textAlign: 'center', padding: '4px 4px',
              borderRadius: '8px', border: `1px solid ${urgentColor}`,
              backgroundColor: diff <= 1 ? urgentColor + '18' : 'var(--bg-elevated)',
            }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: labelColor, letterSpacing: '0.04em' }}>{badge}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{a.course}</div>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: URGENCY_DOT[a.urgency] ?? '#8B949E', flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}

export default function App({ googleEnabled = true }) {
  const [screen, setScreen] = useState('auth') // 'auth' | 'upload' | 'dashboard'
  const [view,   setView]   = useState('dashboard') // 'dashboard' | 'calendar' | 'chapters' | 'vitals'
  const [theme,  setTheme]  = useState('dark') // 'dark' | 'light'
  const [isDemoData, setIsDemoData] = useState(true)
  const [mobileDashPanel, setMobileDashPanel] = useState('list')
  const [calSideTab,     setCalSideTab]     = useState('details') // 'details' | 'upnext' | 'filter'

  // Apply theme to <html> so ALL screens (auth, upload, dashboard) inherit CSS vars
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const [googleToken,  setGoogleToken]  = useState(null)
  const [googleProfile, setGoogleProfile] = useState(null)
  const [calEventIds,  setCalEventIds]  = useState({}) // { assignmentId -> gcal eventId }
  const [syncStatus,   setSyncStatus]   = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'

  // ── Biometrics ────────────────────────────────────────────────────────────────
  const [biometricData,    setBiometricData]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('scc_biometric') ?? 'null') } catch { return null }
  })
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [whoopToken,  setWhoopToken]  = useState(() => localStorage.getItem('scc_whoop_token'))
  const [garminToken, setGarminToken] = useState(() => localStorage.getItem('scc_garmin_token'))

  // Persist biometric data
  useEffect(() => {
    if (biometricData) localStorage.setItem('scc_biometric', JSON.stringify(biometricData))
    else localStorage.removeItem('scc_biometric')
  }, [biometricData])

  // Handle Whoop / Garmin OAuth callbacks (code + state in URL params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const state  = params.get('state')
    if (!code) return

    window.history.replaceState({}, '', window.location.pathname)
    setBiometricLoading(true)

    const isGarmin = state?.endsWith('_garmin')

    if (isGarmin) {
      exchangeGarminCode(code, state)
        .then(tokens => {
          const token = tokens.access_token
          localStorage.setItem('scc_garmin_token', token)
          setGarminToken(token)
          return fetchGarminData(token)
        })
        .then(data => { setBiometricData(data); setView('vitals') })
        .catch(err  => console.error('Garmin auth error:', err))
        .finally(()  => setBiometricLoading(false))
    } else {
      exchangeWhoopCode(code, state)
        .then(tokens => {
          const token = tokens.access_token
          localStorage.setItem('scc_whoop_token', token)
          setWhoopToken(token)
          return fetchWhoopData(token)
        })
        .then(data => { setBiometricData(data); setView('vitals') })
        .catch(err  => console.error('Whoop auth error:', err))
        .finally(()  => setBiometricLoading(false))
    }
  }, [])

  async function handleRefreshBiometrics() {
    setBiometricLoading(true)
    try {
      if (biometricData?.source === 'garmin' && garminToken) {
        setBiometricData(await fetchGarminData(garminToken))
      } else if (whoopToken) {
        setBiometricData(await fetchWhoopData(whoopToken))
      }
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setBiometricLoading(false)
    }
  }

  function handleDisconnectBiometrics() {
    setBiometricData(null)
    setWhoopToken(null)
    setGarminToken(null)
    localStorage.removeItem('scc_biometric')
    localStorage.removeItem('scc_whoop_token')
    localStorage.removeItem('scc_garmin_token')
  }

  // Google Fit login function (populated by GoogleFitBridge when googleEnabled=true)
  const googleFitLoginRef = useRef(null)

  async function handleGoogleFitSuccess(res) {
    setBiometricLoading(true)
    try {
      const data = await fetchGoogleFitData(res.access_token)
      setBiometricData(data)
      setView('vitals')
    } catch (err) { console.error('Google Fit error:', err) }
    finally { setBiometricLoading(false) }
  }

  const readiness = computeReadiness(biometricData)
  const studyMode = getStudyMode(readiness)
  const studyMeta = studyMode ? STUDY_MODE_META[studyMode] : null

  // ── Assignments ───────────────────────────────────────────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState(INITIAL_STATE.selectedAssignment)
  const [assignments,        setAssignments]        = useState(INITIAL_STATE.assignments)
  const [filterCourse,       setFilterCourse]       = useState(INITIAL_STATE.filterCourse)
  const [filterStatus,       setFilterStatus]       = useState(INITIAL_STATE.filterStatus)
  const [sortBy,             setSortBy]             = useState(INITIAL_STATE.sortBy)

  // ── Custom calendar events ────────────────────────────────────────────────
  const [customEvents, setCustomEvents] = useState(() => {
    // Try to restore from localStorage on first render
    try {
      const raw = localStorage.getItem('scc_custom_events')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('scc_custom_events', JSON.stringify(customEvents))
  }, [customEvents])

  function handleAddCustomEvent(event) {
    setCustomEvents((prev) => [...prev, event])
  }

  function handleDeleteCustomEvent(id) {
    setCustomEvents((prev) => prev.filter((e) => e.id !== id))
  }

  // ── Persist assignments to localStorage keyed by Google account ───────────────
  const storageKey = googleProfile ? `scc_data_${googleProfile.sub}` : null

  // Save whenever assignments change (only for logged-in users with real data)
  useEffect(() => {
    if (!storageKey || isDemoData) return
    localStorage.setItem(storageKey, JSON.stringify(assignments))
  }, [assignments, storageKey, isDemoData])

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

    // Restore saved assignments for this Google account
    const key = `scc_data_${profile.sub}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssignments(parsed)
          setSelectedAssignment(parsed[0].id)
          setIsDemoData(false)
          setScreen('dashboard') // skip upload screen — data already exists
          return
        }
      } catch { /* ignore corrupt data */ }
    }

    setScreen('upload')
  }

  const [showUpload,   setShowUpload]   = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const profileRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showProfile) return
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showProfile])

  function handleGuestLogin() {
    const guestProfile = { name: 'Guest', email: 'No account — local only', picture: null, sub: 'guest' }
    setGoogleProfile(guestProfile)

    // Restore any previously saved guest data
    const key = 'scc_data_guest'
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssignments(parsed)
          setSelectedAssignment(parsed[0].id)
          setIsDemoData(false)
          setScreen('dashboard')
          return
        }
      } catch { /* ignore */ }
    }
    setScreen('upload')
  }

  function handleSignOut() {
    setShowProfile(false)
    setGoogleToken(null)
    setGoogleProfile(null)
    setAssignments(INITIAL_STATE.assignments)
    setSelectedAssignment(INITIAL_STATE.selectedAssignment)
    setIsDemoData(true)
    setScreen('auth')
  }

  // ── Upload callback ───────────────────────────────────────────────────────────
  function handleAssignmentsLoaded(newAssignments) {
    setAssignments(newAssignments)
    setSelectedAssignment(newAssignments[0]?.id ?? '')
    setScreen('dashboard')
    setShowUpload(false)
    setIsDemoData(false)
    // Immediately persist for logged-in users
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newAssignments))
    }
  }

  // ── Assignment mutations ──────────────────────────────────────────────────────
  function handleMarkComplete(id) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a)))
  }

  function handleToggleComplete(id) {
    setAssignments((prev) => prev.map((a) =>
      a.id === id ? { ...a, status: a.status === 'completed' ? 'in-progress' : 'completed' } : a
    ))
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
        onSkip={handleGuestLogin}
        theme={theme}
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

      {/* ── Star field + orbs — fixed behind everything ───────────── */}
      <ParticleCanvas style={{ position: 'fixed', zIndex: 0 }} theme={theme} />
      <div style={{ ...styles.orb1, backgroundColor: theme === 'light' ? '#93c5fd55' : '#1E4A8866' }} aria-hidden />
      <div style={{ ...styles.orb2, backgroundColor: theme === 'light' ? '#86efac44' : '#0D3A2244' }} aria-hidden />
      <div style={{ ...styles.orb3, backgroundColor: theme === 'light' ? '#d8b4fe44' : '#3D1E7744' }} aria-hidden />
      <div style={{ ...styles.orb4, backgroundColor: theme === 'light' ? '#fde68a33' : '#4A1B3833' }} aria-hidden />

      {/* ── Top nav bar ──────────────────────────────────────────────── */}
      <div style={styles.topBar} className="glass-panel scc-topbar">
        <div style={styles.brand}>
          <span style={styles.brandDot} className="brand-dot-pulse" />
          <span style={styles.brandText}>Study Command Center</span>
        </div>

        <div style={styles.tabs} className="scc-tabs">
          {[
            { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, accentColor: '#58A6FF' },
            { id: 'calendar',  label: 'Calendar',  Icon: CalendarDays,     accentColor: '#58A6FF' },
            { id: 'chapters',  label: 'Chapters',  Icon: BookOpen,         accentColor: '#BC8CFF' },
            { id: 'vitals',    label: 'Vitals',    Icon: HeartPulse,       accentColor: studyMeta?.color ?? '#F85149', dotColor: studyMeta?.color },
            { id: 'focus',     label: 'Focus Hub', Icon: Crosshair,        accentColor: '#E3B341' },
          ].map(({ id, label, Icon, accentColor, dotColor }) => {
            const isActive = view === id
            return (
              <button
                key={id}
                className="nav-tab"
                data-active={isActive ? 'true' : 'false'}
                onClick={() => setView(id)}
                style={{
                  ...styles.tab,
                  color:           isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom:    isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  position:        'relative',
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '6px',
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{
                    color:      isActive ? accentColor : 'inherit',
                    flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                />
                {label}
                {id === 'vitals' && biometricData && studyMeta && (
                  <span style={{
                    display:         'inline-block',
                    width:           '7px',
                    height:          '7px',
                    borderRadius:    '50%',
                    backgroundColor: studyMeta.color,
                    marginLeft:      '2px',
                    boxShadow:       `0 0 6px ${studyMeta.color}`,
                    animation:       'brand-dot-pulse 2s ease-in-out infinite',
                    verticalAlign:   'middle',
                    marginBottom:    '1px',
                  }} />
                )}
              </button>
            )
          })}
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
            <span className="scc-theme-text" style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '5px' }}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
          <button style={styles.uploadBtn} className="scc-upload-btn" onClick={() => setShowUpload(true)}>
            <span className="scc-upload-icon">+</span><span className="scc-upload-text"> Upload</span>
          </button>
          {googleProfile && (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                style={styles.avatarBtn}
                onClick={() => setShowProfile(v => !v)}
                title="Account"
              >
                {googleProfile.picture
                  ? <img src={googleProfile.picture} alt={googleProfile.name} style={styles.avatar} />
                  : <div style={styles.avatarGuest}>{googleProfile.name[0]}</div>
                }
                <span style={styles.avatarChevron}>{showProfile ? '▲' : '▼'}</span>
              </button>

              {showProfile && (
                <div style={styles.dropdown} className="animate-slideDown">
                  {/* User info */}
                  <div style={styles.dropdownHeader}>
                    {googleProfile.picture
                      ? <img src={googleProfile.picture} alt="" style={styles.dropdownAvatar} />
                      : <div style={{ ...styles.dropdownAvatar, backgroundColor: '#58A6FF22', border: '2px solid #58A6FF55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#58A6FF' }}>{googleProfile.name[0]}</div>
                    }
                    <div style={styles.dropdownUserInfo}>
                      <p style={styles.dropdownName}>{googleProfile.name}</p>
                      <p style={styles.dropdownEmail}>{googleProfile.email}</p>
                    </div>
                  </div>

                  <div style={styles.dropdownDivider} />

                  {/* Menu items */}
                  <DropdownItem icon="⚙" label="Settings" onClick={() => { setShowProfile(false); setShowSettings(true) }} />
                  <DropdownItem icon="+ " label="Upload Syllabus" onClick={() => { setShowProfile(false); setShowUpload(true) }} />
                  <DropdownItem icon="🗑" label="Clear My Data" danger onClick={() => {
                    if (storageKey) localStorage.removeItem(storageKey)
                    setAssignments(INITIAL_STATE.assignments)
                    setSelectedAssignment(INITIAL_STATE.selectedAssignment)
                    setIsDemoData(true)
                    setShowProfile(false)
                  }} />

                  <div style={styles.dropdownDivider} />

                  <DropdownItem icon="⎋" label="Sign Out" danger onClick={handleSignOut} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Demo banner ──────────────────────────────────────────────── */}
      {isDemoData && (
        <div style={styles.demoBanner}>
          <span>🧪 <strong>Demo data</strong> — these are sample assignments. Upload your syllabus to load your real ones.</span>
          <button style={styles.demoDismiss} onClick={() => setIsDemoData(false)}>✕</button>
        </div>
      )}

      {/* ── Views ────────────────────────────────────────────────────── */}
      {view === 'dashboard' ? (
        <div key="dashboard" style={styles.layout} className="scc-dashboard-layout" data-panel={mobileDashPanel}>
          <div style={{ ...styles.panel, '--pd': '0ms' }} className="panel-from-left dash-list">
            <Browser
              assignments={visibleAssignments}
              selectedAssignment={selectedAssignment}
              onSelect={(id) => { setSelectedAssignment(id); setMobileDashPanel('detail') }}
            />
          </div>
          <div style={{ ...styles.panel, borderLeft: '1px solid var(--border)', '--pd': '60ms' }} className="panel-from-center dash-detail">
            <DetailView
              selectedAssignment={selectedAssignmentObj}
              onNotesGenerated={handleNotesGenerated}
              onQuizGenerated={handleQuizGenerated}
              biometricData={biometricData}
              studyMode={studyMode}
            />
          </div>
          <div style={{ ...styles.panel, borderLeft: '1px solid var(--border)', '--pd': '120ms' }} className="panel-from-right dash-control">
            <Controller
              assignments={assignments}
              filteredAssignments={visibleAssignments}
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
              customEvents={customEvents}
              onAddCustomEvent={handleAddCustomEvent}
              onDeleteCustomEvent={handleDeleteCustomEvent}
              onMarkComplete={handleToggleComplete}
            />
          </div>
          <div style={styles.calSide} className="scc-cal-side">
            {/* ── Sidebar tab bar ─────────────────────────────────── */}
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border)',
              flexShrink: 0, backgroundColor: 'var(--bg-surface)',
              position: 'sticky', top: 0, zIndex: 5,
            }}>
              {[
                { id: 'details', label: '📄 Details' },
                { id: 'upnext',  label: '📌 Up Next' },
                { id: 'filter',  label: '⚙ Filter'   },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setCalSideTab(id)} style={{
                  flex: 1, padding: '10px 6px', background: 'none',
                  border: 'none', borderBottom: calSideTab === id ? '2px solid #58A6FF' : '2px solid transparent',
                  color: calSideTab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginBottom: '-1px', transition: 'color .15s',
                }}>{label}</button>
              ))}
            </div>

            {/* ── Tab content ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {calSideTab === 'details' && (
                <DetailView
                  compact
                  selectedAssignment={selectedAssignmentObj}
                  onNotesGenerated={handleNotesGenerated}
                  onQuizGenerated={handleQuizGenerated}
                  biometricData={biometricData}
                  studyMode={studyMode}
                />
              )}
              {calSideTab === 'upnext' && (
                <div style={{ padding: '14px' }}>
                  <UpNextPanel assignments={visibleAssignments} />
                </div>
              )}
              {calSideTab === 'filter' && (
                <Controller
                  assignments={assignments}
                  filteredAssignments={visibleAssignments}
                  filterCourse={filterCourse}
                  filterStatus={filterStatus}
                  sortBy={sortBy}
                  selectedAssignment={selectedAssignment}
                  onFilterCourse={setFilterCourse}
                  onFilterStatus={setFilterStatus}
                  onSortBy={setSortBy}
                  onMarkComplete={handleMarkComplete}
                />
              )}
            </div>
          </div>
        </div>
      ) : view === 'chapters' ? (
        <div key="chapters" style={styles.chaptersLayout} className="animate-fadeIn">
          <ChapterNotes />
        </div>
      ) : view === 'focus' ? (
        <div key="focus" style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: 'transparent' }} className="animate-fadeIn">
          <FocusHub />
        </div>
      ) : (
        <div key="vitals" style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: 'transparent' }} className="animate-fadeIn">
          <BiometricPanel
            biometricData={biometricData}
            biometricLoading={biometricLoading}
            assignments={assignments}
            onConnectWhoop={initiateWhoopAuth}
            onConnectGarmin={data => { setBiometricData(data); setView('vitals'); localStorage.setItem('scc_biometric', JSON.stringify(data)) }}
            onConnectGoogleFit={googleEnabled ? () => googleFitLoginRef.current?.() : null}
            onRefresh={handleRefreshBiometrics}
            onDisconnect={handleDisconnectBiometrics}
            googleEnabled={googleEnabled}
            onGoFocus={mins => {
              if (mins) {
                try {
                  const curr = JSON.parse(localStorage.getItem('scc_pomo_mins') ?? '{}')
                  localStorage.setItem('scc_pomo_mins', JSON.stringify({ ...curr, work: mins }))
                  localStorage.setItem('scc_pomo_mode', JSON.stringify('work'))
                } catch {}
              }
              setView('focus')
            }}
          />
        </div>
      )}

      {/* ── Mobile dashboard panel switcher ─────────────────────── */}
      {view === 'dashboard' && (
        <nav className="mobile-dash-switcher" aria-label="Dashboard panels">
          {[
            { id: 'list',    icon: '📋', label: 'List' },
            { id: 'detail',  icon: '📄', label: 'Detail' },
            { id: 'control', icon: '⚙',  label: 'Filter' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={'mobile-dash-tab' + (mobileDashPanel === id ? ' active' : '')}
              onClick={() => setMobileDashPanel(id)}
            >
              <span style={{ fontSize: '1.15rem', display: 'block', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.03em', marginTop: '3px', display: 'block' }}>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Upload modal overlay ─────────────────────────────────── */}
      {showUpload && (
        <UploadScreen
          onAssignmentsLoaded={handleAssignmentsLoaded}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* ── Google Fit bridge (hook safe-guard — only when provider present) ─ */}
      {googleEnabled && (
        <GoogleFitBridge loginRef={googleFitLoginRef} onSuccess={handleGoogleFitSuccess} />
      )}

      {/* ── AI Chatbot ───────────────────────────────────────────── */}
      <ChatBot
        assignments={assignments}
        userName={googleProfile?.name ?? null}
      />

      {/* ── Settings modal ───────────────────────────────────────── */}
      {showSettings && (
        <div style={styles.modalBackdrop} onClick={() => setShowSettings(false)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()} className="animate-popIn">
            <div style={styles.modalHeader}>
              <p style={styles.modalTitle}>⚙ Settings</p>
              <button style={styles.modalClose} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            {/* Appearance */}
            <p style={styles.settingsSection}>Appearance</p>
            <div style={styles.settingsRow}>
              <div>
                <p style={styles.settingsLabel}>Theme</p>
                <p style={styles.settingsSub}>Switch between dark and light mode</p>
              </div>
              <div style={styles.themeToggleGroup}>
                {['dark', 'light'].map(t => (
                  <button
                    key={t}
                    style={{
                      ...styles.themeOption,
                      backgroundColor: theme === t ? '#58A6FF' : 'var(--bg-elevated)',
                      color: theme === t ? '#fff' : 'var(--text-muted)',
                      border: theme === t ? '1px solid #58A6FF' : '1px solid var(--border)',
                    }}
                    onClick={() => setTheme(t)}
                  >
                    {t === 'dark' ? '☾ Dark' : '☀ Light'}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.modalDivider} />

            {/* Account */}
            <p style={styles.settingsSection}>Account</p>
            {googleProfile && (
              <div style={styles.settingsRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {googleProfile.picture
                    ? <img src={googleProfile.picture} alt="" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border)' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #58A6FF55', backgroundColor: '#58A6FF22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#58A6FF' }}>{googleProfile.name[0]}</div>
                  }
                  <div>
                    <p style={styles.settingsLabel}>{googleProfile.name}</p>
                    <p style={styles.settingsSub}>{googleProfile.email}</p>
                  </div>
                </div>
                <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
              </div>
            )}

            <div style={styles.modalDivider} />

            {/* Data */}
            <p style={styles.settingsSection}>Data</p>
            <div style={styles.settingsRow}>
              <div>
                <p style={styles.settingsLabel}>Saved assignments</p>
                <p style={styles.settingsSub}>{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} stored{isDemoData ? ' (demo)' : ' locally'}</p>
              </div>
              <button style={styles.dangerBtn} onClick={() => {
                if (storageKey) localStorage.removeItem(storageKey)
                setAssignments(INITIAL_STATE.assignments)
                setSelectedAssignment(INITIAL_STATE.selectedAssignment)
                setIsDemoData(true)
                setShowSettings(false)
              }}>
                Clear Data
              </button>
            </div>

            <div style={styles.modalDivider} />

            {/* About */}
            <p style={styles.settingsSection}>About</p>
            <div style={{ padding: '0 0 4px' }}>
              <p style={styles.settingsLabel}>Study Command Center</p>
              <p style={styles.settingsSub}>v1.0 · Powered by Gemini · Built with React + Vite</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({ icon, label, onClick, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '9px 14px',
        background: hov ? 'var(--bg-elevated)' : 'none',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.83rem',
        fontWeight: 500,
        color: danger ? '#F85149' : 'var(--text-primary)',
        cursor: 'pointer',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      <span style={{ fontSize: '0.9rem', width: '16px', textAlign: 'center' }}>{icon}</span>
      {label}
    </button>
  )
}

const styles = {
  root: {
    position:      'relative',
    display:       'flex',
    flexDirection: 'column',
    minHeight:     '100vh',
    backgroundColor: 'transparent',
    fontFamily:    "'Inter', 'system-ui', sans-serif",
  },
  orb1: {
    position:        'fixed',
    width:           '750px',
    height:          '750px',
    borderRadius:    '50%',
    backgroundColor: '#1E4A8866',
    filter:          'blur(100px)',
    top:             '-200px',
    left:            '-220px',
    pointerEvents:   'none',
    zIndex:          0,
    animation:       'orb1 14s ease-in-out infinite',
  },
  orb2: {
    position:        'fixed',
    width:           '650px',
    height:          '650px',
    borderRadius:    '50%',
    backgroundColor: '#0D3A2244',
    filter:          'blur(100px)',
    bottom:          '-160px',
    right:           '-160px',
    pointerEvents:   'none',
    zIndex:          0,
    animation:       'orb2 16s ease-in-out infinite',
  },
  orb3: {
    position:        'fixed',
    width:           '480px',
    height:          '480px',
    borderRadius:    '50%',
    backgroundColor: '#3D1E7744',
    filter:          'blur(90px)',
    top:             '38%',
    right:           '10%',
    pointerEvents:   'none',
    zIndex:          0,
    animation:       'orb3 18s ease-in-out infinite',
  },
  orb4: {
    position:        'fixed',
    width:           '400px',
    height:          '400px',
    borderRadius:    '50%',
    backgroundColor: '#4A1B3833',
    filter:          'blur(90px)',
    bottom:          '10%',
    left:            '18%',
    pointerEvents:   'none',
    zIndex:          0,
    animation:       'orb4 20s ease-in-out infinite',
  },
  topBar: {
    position:        'relative',
    zIndex:          10,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '0 20px',
    height:          '54px',
    background:      'linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface))',
    borderBottom:    '1px solid var(--border)',
    flexShrink:      0,
    boxShadow:       '0 4px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandDot: {
    display:         'inline-block',
    width:           '9px',
    height:          '9px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF',
    boxShadow:       '0 0 10px rgba(88,166,255,0.7), 0 0 22px rgba(88,166,255,0.3)',
  },
  brandText: {
    fontSize:      '0.78rem',
    fontWeight:    700,
    color:         'var(--text-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
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
    position:            'relative',
    zIndex:              1,
    display:             'grid',
    gridTemplateColumns: '280px 1fr 220px',
    flex:                1,
    backgroundColor:     'transparent',
  },
  panel: {
    borderRight: '1px solid var(--border)',
  },
  calLayout: {
    position:        'relative',
    zIndex:          1,
    display:         'flex',
    flex:            1,
    overflow:        'hidden',
    backgroundColor: 'transparent',
  },
  calSide: {
    width:      '340px',
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    overflowY:  'auto',
    display:    'flex',
    flexDirection: 'column',
  },
  chaptersLayout: {
    position:        'relative',
    zIndex:          1,
    display:         'flex',
    flex:            1,
    overflow:        'hidden',
    backgroundColor: 'transparent',
  },
  demoBanner: {
    position:        'relative',
    zIndex:          2,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    gap:             '12px',
    padding:         '8px 20px',
    backgroundColor: 'rgba(227, 179, 65, 0.10)',
    backdropFilter:  'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom:    '1px solid rgba(227, 179, 65, 0.30)',
    fontSize:        '0.8rem',
    color:           '#E3B341',
    flexShrink:      0,
  },
  demoDismiss: {
    background: 'none',
    border: 'none',
    color: '#E3B341',
    cursor: 'pointer',
    fontSize: '0.8rem',
    opacity: 0.7,
    padding: '2px 6px',
    flexShrink: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  // ── Avatar / dropdown ──────────────────────────────────────────────────────
  avatarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '3px 8px 3px 3px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  },
  avatarGuest: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#58A6FF22',
    border: '1px solid #58A6FF55',
    color: '#58A6FF',
    fontSize: '0.8rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  avatarChevron: {
    fontSize: '0.5rem',
    color: 'var(--text-muted)',
  },
  dropdown: {
    position:              'absolute',
    top:                   'calc(100% + 10px)',
    right:                 0,
    width:                 '248px',
    backgroundColor:       'var(--bg-elevated)',
    backdropFilter:        'blur(32px) saturate(200%)',
    WebkitBackdropFilter:  'blur(32px) saturate(200%)',
    border:                '1px solid rgba(255,255,255,0.10)',
    borderRadius:          '14px',
    boxShadow:             '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(88,166,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
    padding:               '8px',
    zIndex:                500,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px 10px',
  },
  dropdownAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: '2px solid var(--border)',
    flexShrink: 0,
  },
  dropdownUserInfo: {
    minWidth: 0,
  },
  dropdownName: {
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownEmail: {
    margin: 0,
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '6px 0',
  },

  // ── Settings modal ─────────────────────────────────────────────────────────
  modalBackdrop: {
    position:        'fixed',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    backdropFilter:  'blur(8px) saturate(160%)',
    WebkitBackdropFilter: 'blur(8px) saturate(160%)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          600,
    padding:         '24px',
  },
  modalCard: {
    backgroundColor:      'var(--bg-elevated)',
    backdropFilter:       'blur(36px) saturate(200%)',
    WebkitBackdropFilter: 'blur(36px) saturate(200%)',
    border:               '1px solid rgba(255,255,255,0.11)',
    borderRadius:         '18px',
    padding:              '28px',
    width:                '100%',
    maxWidth:             '460px',
    boxShadow:            '0 32px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(88,166,255,0.06), inset 0 1px 0 rgba(255,255,255,0.09)',
    fontFamily:           "'Inter', system-ui, sans-serif",
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '22px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  modalClose: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-muted)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modalDivider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '16px 0',
  },
  settingsSection: {
    margin: '0 0 12px',
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '4px',
  },
  settingsLabel: {
    margin: '0 0 2px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  settingsSub: {
    margin: 0,
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  themeToggleGroup: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  themeOption: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'all 0.15s ease',
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #F85149',
    borderRadius: '7px',
    color: '#F85149',
    padding: '7px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    flexShrink: 0,
    transition: 'background-color 0.15s',
  },
  dangerBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    color: 'var(--text-muted)',
    padding: '7px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    flexShrink: 0,
    transition: 'border-color 0.15s, color 0.15s',
  },
}
