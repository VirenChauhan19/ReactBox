import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

// Safe wrapper — only calls useGoogleLogin when Google OAuth is available
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

// ─── Animation stages ────────────────────────────────────────────────────────
// 0 → blank hold
// 1 → typing title
// 2 → subtitle fades in
// 3 → sign-in card slides up

export default function AuthScreen({ googleEnabled, onAuth, onSkip }) {
  const [stage,      setStage]      = useState(0)
  const [typed,      setTyped]      = useState('')
  const [showCursor, setShowCursor] = useState(true)

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530)
    return () => clearInterval(id)
  }, [])

  // Sequence controller
  useEffect(() => {
    const t0 = setTimeout(() => setStage(1), 600)
    return () => clearTimeout(t0)
  }, [])

  // Typewriter
  useEffect(() => {
    if (stage !== 1) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(TITLE.slice(0, i))
      if (i >= TITLE.length) {
        clearInterval(id)
        setTimeout(() => setStage(2), 300)
      }
    }, 55)
    return () => clearInterval(id)
  }, [stage])

  // Stage 2 → 3
  useEffect(() => {
    if (stage !== 2) return
    const t = setTimeout(() => setStage(3), 900)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <>
      <style>{CSS}</style>
      <div style={s.page}>

        {/* ── Animated grid background ────────────────────────────── */}
        <div style={s.grid} aria-hidden />

        {/* ── Floating orbs ───────────────────────────────────────── */}
        <div style={{ ...s.orb, ...s.orb1 }} aria-hidden />
        <div style={{ ...s.orb, ...s.orb2 }} aria-hidden />

        {/* ── Center content ──────────────────────────────────────── */}
        <div style={s.center}>

          {/* Dot + title */}
          <div style={s.titleRow}>
            <span
              style={{
                ...s.dot,
                opacity:   stage >= 1 ? 1 : 0,
                animation: stage >= 1 ? 'dotPulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <h1 style={s.title}>
              {typed}
              <span style={{ opacity: showCursor ? 1 : 0, color: '#58A6FF' }}>|</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p
            style={{
              ...s.subtitle,
              opacity:   stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {SUBTITLE}
          </p>

          {/* Divider */}
          <div
            style={{
              ...s.divider,
              width:      stage >= 2 ? '120px' : '0px',
              transition: 'width 0.8s ease 0.2s',
            }}
          />

          {/* Sign-in card */}
          <div
            style={{
              ...s.card,
              opacity:   stage >= 3 ? 1 : 0,
              transform: stage >= 3 ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.65s ease, transform 0.65s ease',
            }}
          >
            <p style={s.cardLabel}>Get started in seconds</p>

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
                <button style={s.skipBtn} onClick={onSkip}>
                  Continue without Google →
                </button>
              </>
            )}

            <p style={s.fine}>
              {googleEnabled
                ? 'Grants access to create events in your Google Calendar only. No data is stored on any server.'
                : 'Google Calendar sync will be unavailable until a Client ID is configured.'}
            </p>
          </div>
        </div>

        {/* ── Corner build tag ────────────────────────────────────── */}
        <span style={s.buildTag}>v1.0 · Powered by Gemini</span>
      </div>
    </>
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

// ─── Keyframes ────────────────────────────────────────────────────────────────
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
  .google-btn:hover {
    opacity: 0.88 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(255,255,255,0.12) !important;
  }
  .google-btn {
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s !important;
  }
`

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    position:        'relative',
    minHeight:       '100vh',
    backgroundColor: 'var(--bg-main)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    overflow:        'hidden',
    transition:      'background-color 0.25s ease',
  },

  // Dot grid
  grid: {
    position:   'absolute',
    inset:       0,
    backgroundImage:
      'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    animation:  'gridDrift 8s linear infinite',
    opacity:    0.35,
    pointerEvents: 'none',
  },

  // Glowing orbs
  orb: {
    position:     'absolute',
    borderRadius: '50%',
    filter:       'blur(80px)',
    pointerEvents: 'none',
  },
  orb1: {
    width:           '420px',
    height:          '420px',
    backgroundColor: 'var(--orb1-color)',
    top:             '-80px',
    left:            '-100px',
    animation:       'orb1Float 9s ease-in-out infinite',
  },
  orb2: {
    width:           '360px',
    height:          '360px',
    backgroundColor: 'var(--orb2-color)',
    bottom:          '-60px',
    right:           '-80px',
    animation:       'orb2Float 11s ease-in-out infinite',
  },

  center: {
    position:   'relative',
    zIndex:      1,
    display:    'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign:  'center',
    padding:    '0 24px',
    gap:        '0px',
  },

  titleRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '14px',
    marginBottom: '18px',
  },
  dot: {
    display:         'inline-block',
    width:           '12px',
    height:          '12px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF',
    transition:      'opacity 0.4s',
    flexShrink:       0,
  },
  title: {
    margin:      0,
    fontSize:    'clamp(1.6rem, 4vw, 2.8rem)',
    fontWeight:  800,
    color:       'var(--text-primary)',
    letterSpacing: '0.12em',
    textShadow:  '0 0 40px #58A6FF33',
    fontFamily:  "'Inter', 'system-ui', sans-serif",
    minHeight:   '1.2em',
  },

  subtitle: {
    margin:   '0 0 22px',
    fontSize: '1rem',
    color:    'var(--text-muted)',
    letterSpacing: '0.02em',
  },

  divider: {
    height:          '2px',
    backgroundColor: '#58A6FF',
    borderRadius:    '2px',
    marginBottom:    '36px',
    boxShadow:       '0 0 12px #58A6FF88',
  },

  card: {
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '14px',
    padding:         '36px 40px',
    width:           '100%',
    maxWidth:        '380px',
    transition:      'background-color 0.25s ease, border-color 0.25s ease',
  },
  cardLabel: {
    margin:       '0 0 20px',
    fontSize:     '0.8rem',
    fontWeight:   700,
    color:        'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
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
    borderRadius:    '8px',
    fontSize:        '0.95rem',
    fontWeight:      600,
    color:           '#1F1F1F',
    cursor:          'pointer',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    marginBottom:    '18px',
  },
  fine: {
    margin:     0,
    fontSize:   '0.72rem',
    color:      'var(--text-muted)',
    lineHeight: 1.6,
  },
  noKeyWarning: {
    margin:     '0 0 12px',
    fontSize:   '0.72rem',
    color:      '#E3B341',
    lineHeight: 1.5,
  },
  skipBtn: {
    width:           '100%',
    padding:         '11px',
    marginBottom:    '16px',
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '8px',
    color:           'var(--text-primary)',
    fontSize:        '0.88rem',
    fontWeight:      600,
    cursor:          'pointer',
    fontFamily:      "'Inter', system-ui, sans-serif",
    transition:      'background-color .15s',
  },

  buildTag: {
    position:   'absolute',
    bottom:     '16px',
    right:      '20px',
    fontSize:   '0.68rem',
    color:      'var(--border)',
    letterSpacing: '0.06em',
  },
}
