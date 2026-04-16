import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

function GoogleLoginButton({ onAuth }) {
  const login = useGoogleLogin({
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    onSuccess: async (tokenResponse) => {
      const res     = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = await res.json()
      onAuth(tokenResponse.access_token, profile)
    },
    onError: (err) => console.error('Google login failed', err),
  })
  return (
    <button className="google-btn" style={s.googleBtn} onClick={() => login()}>
      <GoogleIcon />
      Continue with Google
    </button>
  )
}

const TITLE    = 'STUDY COMMAND CENTER'
const SUBTITLE = 'Your AI-powered academic dashboard'

const FEATURES = [
  {
    icon: '📄',
    title: 'Smart PDF Parsing',
    desc: 'Drop any syllabus PDF and every assignment, deadline, and weight is extracted automatically.',
    color: '#58A6FF',
  },
  {
    icon: '🤖',
    title: 'AI Notes & Quizzes',
    desc: 'Generate structured study notes and practice quizzes for any assignment in seconds.',
    color: '#BC8CFF',
  },
  {
    icon: '📅',
    title: 'Calendar Sync',
    desc: 'Every deadline auto-syncs to your Google Calendar. No manual entry, ever.',
    color: '#3FB950',
  },
  {
    icon: '💬',
    title: 'Study Assistant',
    desc: 'An AI tutor loaded with all your assignments — ask anything, get focused answers.',
    color: '#E3B341',
  },
]

const STATS = [
  { value: '4', label: 'AI Tools' },
  { value: '3', label: 'Views' },
  { value: '∞', label: 'Assignments' },
  { value: '0', label: 'Manual entry' },
]

// 0 → blank | 1 → typing | 2 → subtitle | 3 → card | 4 → features
export default function AuthScreen({ googleEnabled, onAuth, onSkip }) {
  const [stage,      setStage]      = useState(0)
  const [typed,      setTyped]      = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setStage(1), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (stage !== 1) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(TITLE.slice(0, i))
      if (i >= TITLE.length) {
        clearInterval(id)
        setTimeout(() => setStage(2), 250)
      }
    }, 48)
    return () => clearInterval(id)
  }, [stage])

  useEffect(() => {
    if (stage === 2) setTimeout(() => setStage(3), 700)
    if (stage === 3) setTimeout(() => setStage(4), 400)
  }, [stage])

  return (
    <>
      <style>{CSS}</style>
      <div style={s.page}>

        {/* ── Animated dot grid ──────────────────────────────────── */}
        <div style={s.grid} aria-hidden />

        {/* ── Glowing orbs ───────────────────────────────────────── */}
        <div style={{ ...s.orb, ...s.orb1 }} aria-hidden />
        <div style={{ ...s.orb, ...s.orb2 }} aria-hidden />
        <div style={{ ...s.orb, ...s.orb3 }} aria-hidden />

        {/* ── Scrollable content ─────────────────────────────────── */}
        <div style={s.scroll}>

          {/* ── Hero ───────────────────────────────────────────────── */}
          <div style={s.hero}>

            {/* Badge */}
            <div style={{
              ...s.badge,
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}>
              <span style={s.badgeDot} />
              AI-Powered · Gemini 2.5 Flash
            </div>

            {/* Title */}
            <div style={s.titleRow}>
              <span style={{
                ...s.dot,
                opacity: stage >= 1 ? 1 : 0,
                animation: stage >= 1 ? 'dotPulse 2s ease-in-out infinite' : 'none',
              }} />
              <h1 style={s.title}>
                {typed}
                <span style={{ opacity: showCursor ? 1 : 0, color: '#58A6FF' }}>|</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p style={{
              ...s.subtitle,
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}>
              {SUBTITLE}
            </p>

            {/* Animated divider */}
            <div style={{
              ...s.divider,
              width: stage >= 2 ? '100px' : '0px',
              transition: 'width 0.9s cubic-bezier(.16,1,.3,1) 0.3s',
            }} />

            {/* Stats row */}
            <div style={{
              ...s.statsRow,
              opacity: stage >= 3 ? 1 : 0,
              transform: stage >= 3 ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}>
              {STATS.map((stat, i) => (
                <div key={i} style={s.statItem}>
                  <span style={s.statValue}>{stat.value}</span>
                  <span style={s.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main content: features + sign-in ──────────────────── */}
          <div style={s.mainRow}>

            {/* Feature cards grid */}
            <div style={s.featureGrid}>
              {FEATURES.map((f, i) => (
                <FeatureCard
                  key={i}
                  feature={f}
                  index={i}
                  visible={stage >= 4}
                />
              ))}
            </div>

            {/* Sign-in card */}
            <div style={{
              ...s.card,
              opacity: stage >= 3 ? 1 : 0,
              transform: stage >= 3 ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
              transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(.16,1,.3,1)',
            }}>
              <div style={s.cardTopRow}>
                <span style={s.cardDot} />
                <p style={s.cardLabel}>Get started in seconds</p>
              </div>

              {googleEnabled ? (
                <GoogleLoginButton onAuth={onAuth} />
              ) : (
                <>
                  <button className="google-btn" style={{ ...s.googleBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled>
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <p style={s.noKeyWarning}>
                    ⚠ <code>VITE_GOOGLE_CLIENT_ID</code> not set in <code>.env</code>
                  </p>
                </>
              )}

              <div style={s.orDivider}>
                <div style={s.orLine} />
                <span style={s.orText}>or</span>
                <div style={s.orLine} />
              </div>

              <button style={s.guestBtn} onClick={onSkip}>
                <span style={s.guestIcon}>👤</span>
                Continue as Guest
              </button>

              <p style={s.fine}>
                {googleEnabled
                  ? 'Google login enables Calendar sync. Guest mode saves data locally only.'
                  : 'Google Calendar sync requires a Client ID in .env.'}
              </p>

              {/* Feature checklist */}
              <div style={s.checkList}>
                {['PDF syllabus parsing', 'AI notes & quiz generator', 'Cross-session data save'].map((item, i) => (
                  <div key={i} style={s.checkItem}>
                    <span style={s.checkIcon}>✓</span>
                    <span style={s.checkText}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <span style={s.buildTag}>v1.0 · Study Command Center</span>
      </div>
    </>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ feature, index, visible }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        ...s.featureCard,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${index * 100 + 200}ms, transform 0.5s cubic-bezier(.16,1,.3,1) ${index * 100 + 200}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
        boxShadow: hov ? `0 8px 32px ${feature.color}22, 0 0 0 1px ${feature.color}44` : '0 2px 12px rgba(0,0,0,0.2)',
        borderColor: hov ? `${feature.color}55` : 'var(--border)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        ...s.featureIconWrap,
        backgroundColor: feature.color + '18',
        border: `1px solid ${feature.color}33`,
        boxShadow: hov ? `0 0 16px ${feature.color}33` : 'none',
        transition: 'box-shadow 0.2s ease',
      }}>
        <span style={s.featureIcon}>{feature.icon}</span>
      </div>
      <p style={{ ...s.featureTitle, color: hov ? feature.color : 'var(--text-primary)' }}>
        {feature.title}
      </p>
      <p style={s.featureDesc}>{feature.desc}</p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dotPulse {
    0%, 100% { box-shadow: 0 0 0 0 #58A6FF55, 0 0 12px 2px #58A6FF44; }
    50%       { box-shadow: 0 0 0 6px #58A6FF00, 0 0 20px 6px #58A6FF22; }
  }
  @keyframes gridDrift {
    from { background-position: 0 0; }
    to   { background-position: 40px 40px; }
  }
  @keyframes orb1Float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%       { transform: translate(30px, -40px) scale(1.08); }
  }
  @keyframes orb2Float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%       { transform: translate(-25px, 35px) scale(1.05); }
  }
  @keyframes orb3Float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%       { transform: translate(20px, 30px) scale(1.06); }
  }
  @keyframes badgeDotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.4); }
  }
  .google-btn:hover {
    opacity: 0.88 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 24px rgba(255,255,255,0.15) !important;
  }
  .google-btn { transition: opacity 0.15s, transform 0.2s, box-shadow 0.2s !important; }
`

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    position:        'relative',
    minHeight:       '100vh',
    backgroundColor: 'var(--bg-main)',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    overflow:        'hidden',
    transition:      'background-color 0.25s ease',
  },
  grid: {
    position:        'absolute',
    inset:           0,
    backgroundImage: 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)',
    backgroundSize:  '40px 40px',
    animation:       'gridDrift 8s linear infinite',
    opacity:         0.3,
    pointerEvents:   'none',
  },
  orb: {
    position:      'absolute',
    borderRadius:  '50%',
    filter:        'blur(80px)',
    pointerEvents: 'none',
  },
  orb1: {
    width: '500px', height: '500px',
    backgroundColor: 'var(--orb1-color)',
    top: '-120px', left: '-140px',
    animation: 'orb1Float 9s ease-in-out infinite',
  },
  orb2: {
    width: '400px', height: '400px',
    backgroundColor: 'var(--orb2-color)',
    bottom: '-80px', right: '-100px',
    animation: 'orb2Float 11s ease-in-out infinite',
  },
  orb3: {
    width: '300px', height: '300px',
    backgroundColor: '#2D1B6933',
    top: '40%', right: '10%',
    animation: 'orb3Float 13s ease-in-out infinite',
  },

  scroll: {
    position:       'relative',
    zIndex:         1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    padding:        '60px 24px 80px',
    gap:            '52px',
    minHeight:      '100vh',
  },

  // ── Hero ──
  hero: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    textAlign:     'center',
    gap:           '0px',
    maxWidth:      '700px',
    width:         '100%',
  },

  badge: {
    display:         'inline-flex',
    alignItems:      'center',
    gap:             '7px',
    backgroundColor: '#58A6FF18',
    border:          '1px solid #58A6FF33',
    borderRadius:    '99px',
    padding:         '5px 14px',
    fontSize:        '0.72rem',
    fontWeight:      600,
    color:           '#58A6FF',
    letterSpacing:   '0.04em',
    marginBottom:    '20px',
  },
  badgeDot: {
    display:         'inline-block',
    width:           '6px',
    height:          '6px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF',
    animation:       'badgeDotPulse 2s ease-in-out infinite',
  },

  titleRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          '14px',
    marginBottom: '14px',
  },
  dot: {
    display:         'inline-block',
    width:           '12px',
    height:          '12px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF',
    transition:      'opacity 0.4s',
    flexShrink:      0,
  },
  title: {
    margin:        0,
    fontSize:      'clamp(1.7rem, 4.5vw, 3rem)',
    fontWeight:    800,
    color:         'var(--text-primary)',
    letterSpacing: '0.1em',
    textShadow:    '0 0 60px #58A6FF22',
    fontFamily:    "'Inter', 'system-ui', sans-serif",
    minHeight:     '1.2em',
    lineHeight:    1.1,
  },
  subtitle: {
    margin:        '0 0 16px',
    fontSize:      '1.05rem',
    color:         'var(--text-muted)',
    letterSpacing: '0.02em',
    lineHeight:    1.5,
  },
  divider: {
    height:          '2px',
    backgroundColor: '#58A6FF',
    borderRadius:    '2px',
    marginBottom:    '28px',
    boxShadow:       '0 0 14px #58A6FF88',
  },

  statsRow: {
    display:         'flex',
    gap:             '0px',
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '14px',
    overflow:        'hidden',
    width:           '100%',
    maxWidth:        '420px',
  },
  statItem: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '14px 8px',
    borderRight:   '1px solid var(--border)',
    gap:           '3px',
  },
  statValue: {
    fontSize:   '1.4rem',
    fontWeight: 800,
    color:      '#58A6FF',
    lineHeight: 1,
  },
  statLabel: {
    fontSize:      '0.62rem',
    fontWeight:    600,
    color:         'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  // ── Main row ──
  mainRow: {
    display:       'flex',
    gap:           '28px',
    alignItems:    'flex-start',
    width:         '100%',
    maxWidth:      '960px',
    flexWrap:      'wrap',
    justifyContent:'center',
  },

  // ── Feature grid ──
  featureGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap:                 '14px',
    flex:                1,
    minWidth:            '280px',
    maxWidth:            '520px',
  },
  featureCard: {
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '14px',
    padding:         '20px 18px',
    cursor:          'default',
    transition:      'background-color 0.25s ease',
  },
  featureIconWrap: {
    width:         '42px',
    height:        '42px',
    borderRadius:  '10px',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    marginBottom:  '12px',
    transition:    'background-color 0.2s',
  },
  featureIcon:  { fontSize: '1.2rem' },
  featureTitle: {
    margin:      '0 0 6px',
    fontSize:    '0.88rem',
    fontWeight:  700,
    transition:  'color 0.2s ease',
    lineHeight:  1.3,
  },
  featureDesc: {
    margin:     0,
    fontSize:   '0.75rem',
    color:      'var(--text-muted)',
    lineHeight: 1.6,
  },

  // ── Sign-in card ──
  card: {
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '16px',
    padding:         '32px 30px',
    width:           '100%',
    maxWidth:        '360px',
    flexShrink:      0,
    boxShadow:       '0 8px 40px rgba(0,0,0,0.25)',
    transition:      'background-color 0.25s ease, border-color 0.25s ease',
  },
  cardTopRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    marginBottom: '20px',
  },
  cardDot: {
    display:         'inline-block',
    width:           '8px',
    height:          '8px',
    borderRadius:    '50%',
    backgroundColor: '#3FB950',
    boxShadow:       '0 0 8px #3FB95088',
    animation:       'badgeDotPulse 2.5s ease-in-out infinite',
    flexShrink:      0,
  },
  cardLabel: {
    margin:        0,
    fontSize:      '0.78rem',
    fontWeight:    700,
    color:         'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
  },
  googleBtn: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             '10px',
    width:           '100%',
    padding:         '13px 20px',
    backgroundColor: '#FFFFFF',
    border:          'none',
    borderRadius:    '10px',
    fontSize:        '0.92rem',
    fontWeight:      600,
    color:           '#1F1F1F',
    cursor:          'pointer',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    marginBottom:    '14px',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.12)',
  },
  orDivider: {
    display:     'flex',
    alignItems:  'center',
    gap:         '10px',
    margin:      '14px 0',
  },
  orLine: {
    flex:            1,
    height:          '1px',
    backgroundColor: 'var(--border)',
  },
  orText: {
    fontSize:      '0.7rem',
    fontWeight:    600,
    color:         'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  guestBtn: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             '10px',
    width:           '100%',
    padding:         '12px 20px',
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '10px',
    fontSize:        '0.92rem',
    fontWeight:      600,
    color:           'var(--text-primary)',
    cursor:          'pointer',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    marginBottom:    '16px',
    transition:      'background-color 0.15s, border-color 0.15s, transform 0.15s',
  },
  guestIcon: { fontSize: '1rem' },
  fine: {
    margin:     '0 0 14px',
    fontSize:   '0.7rem',
    color:      'var(--text-muted)',
    lineHeight: 1.55,
    textAlign:  'center',
  },
  noKeyWarning: {
    margin:     '0 0 12px',
    fontSize:   '0.72rem',
    color:      '#E3B341',
    lineHeight: 1.5,
  },

  checkList: {
    display:        'flex',
    flexDirection:  'column',
    gap:            '7px',
    borderTop:      '1px solid var(--border)',
    paddingTop:     '14px',
    marginTop:      '2px',
  },
  checkItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
  },
  checkIcon: {
    color:      '#3FB950',
    fontWeight: 700,
    fontSize:   '0.78rem',
    flexShrink: 0,
  },
  checkText: {
    fontSize:   '0.75rem',
    color:      'var(--text-muted)',
    lineHeight: 1.4,
  },

  // ── Tech badges ──
  techRow: {
    display:        'flex',
    gap:            '8px',
    flexWrap:       'wrap',
    justifyContent: 'center',
  },
  techBadge: {
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '99px',
    fontSize:        '0.68rem',
    fontWeight:      600,
    color:           'var(--text-muted)',
    padding:         '4px 12px',
    letterSpacing:   '0.04em',
  },

  buildTag: {
    position:      'absolute',
    bottom:        '16px',
    right:         '20px',
    fontSize:      '0.65rem',
    color:         'var(--border)',
    letterSpacing: '0.06em',
  },
}
