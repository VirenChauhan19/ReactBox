import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import ParticleCanvas from './ParticleCanvas.jsx'

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

const STATS = [
  { value: '4',       label: 'AI Tools' },
  { value: '3',       label: 'Dashboard Views' },
  { value: '10,000+', label: 'Automatic Assignments' },
  { value: '0',       label: 'Manual Entry Required' },
]

// ── SVG Illustrations ──────────────────────────────────────────────────────────

function PDFIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pdfBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A1628" />
          <stop offset="100%" stopColor="#0D2A4A" />
        </linearGradient>
        <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="100%" stopColor="#2A4D7A" />
        </linearGradient>
        <filter id="glow1">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" fill="url(#pdfBg)" />
      {/* Background glow */}
      <ellipse cx="100" cy="80" rx="70" ry="50" fill="#1A5FB488" filter="url(#glow1)" />
      {/* Main document */}
      <rect x="55" y="25" width="70" height="90" rx="6" fill="url(#docGrad)" stroke="#3A7BD5" strokeWidth="1.5" />
      {/* Doc lines */}
      <rect x="65" y="42" width="50" height="4" rx="2" fill="#5A9EE8" opacity="0.7" />
      <rect x="65" y="52" width="40" height="3" rx="2" fill="#5A9EE8" opacity="0.5" />
      <rect x="65" y="60" width="45" height="3" rx="2" fill="#5A9EE8" opacity="0.5" />
      <rect x="65" y="68" width="35" height="3" rx="2" fill="#5A9EE8" opacity="0.4" />
      <rect x="65" y="76" width="42" height="3" rx="2" fill="#5A9EE8" opacity="0.4" />
      <rect x="65" y="84" width="30" height="3" rx="2" fill="#5A9EE8" opacity="0.3" />
      {/* AI badge on doc */}
      <rect x="62" y="95" width="24" height="14" rx="4" fill="#1A5FB4" stroke="#58A6FF" strokeWidth="1" />
      <text x="74" y="106" textAnchor="middle" fill="#58A6FF" fontSize="8" fontWeight="bold">AI</text>
      {/* Scan beam */}
      <rect x="55" y="63" width="70" height="2" fill="#58A6FF" opacity="0.6" />
      <rect x="55" y="63" width="70" height="8" fill="url(#scanGrad)" opacity="0.2" />
      {/* Second doc behind */}
      <rect x="78" y="20" width="65" height="85" rx="6" fill="#142035" stroke="#2A5080" strokeWidth="1" opacity="0.7" />
      <rect x="88" y="35" width="45" height="3" rx="2" fill="#3A7BD5" opacity="0.5" />
      <rect x="88" y="42" width="35" height="3" rx="2" fill="#3A7BD5" opacity="0.4" />
      {/* AI label on second doc */}
      <rect x="85" y="85" width="24" height="14" rx="4" fill="#0D2A4A" stroke="#3A7BD5" strokeWidth="1" />
      <text x="97" y="96" textAnchor="middle" fill="#3A7BD5" fontSize="8" fontWeight="bold">AI</text>
      {/* Glowing dots */}
      <circle cx="145" cy="40" r="3" fill="#58A6FF" opacity="0.8" />
      <circle cx="150" cy="55" r="2" fill="#58A6FF" opacity="0.5" />
      <circle cx="40" cy="70" r="2" fill="#58A6FF" opacity="0.4" />
      <circle cx="35" cy="50" r="3" fill="#1A5FB4" opacity="0.6" />
    </svg>
  )
}

function RobotIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="roboBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0E0E1A" />
          <stop offset="100%" stopColor="#1A1A2E" />
        </linearGradient>
        <linearGradient id="roboBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2A4A" />
          <stop offset="100%" stopColor="#1A1A30" />
        </linearGradient>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" fill="url(#roboBg)" />
      {/* Background glow */}
      <ellipse cx="100" cy="110" rx="60" ry="30" fill="#6B48FF22" />
      {/* Robot body */}
      <rect x="75" y="80" width="50" height="55" rx="10" fill="url(#roboBody)" stroke="#4A3A8A" strokeWidth="1.5" />
      {/* Robot head */}
      <rect x="72" y="45" width="56" height="42" rx="12" fill="url(#roboBody)" stroke="#5A4A9A" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="88" cy="62" r="8" fill="#1A1A3A" stroke="#6B48FF" strokeWidth="1.5" />
      <circle cx="112" cy="62" r="8" fill="#1A1A3A" stroke="#6B48FF" strokeWidth="1.5" />
      <circle cx="88" cy="62" r="4" fill="#6B48FF" filter="url(#glow2)" />
      <circle cx="112" cy="62" r="4" fill="#6B48FF" filter="url(#glow2)" />
      <circle cx="90" cy="60" r="1.5" fill="#A78BFA" />
      <circle cx="114" cy="60" r="1.5" fill="#A78BFA" />
      {/* Mouth */}
      <rect x="87" y="76" width="26" height="5" rx="2.5" fill="#2A2A5A" stroke="#4A3A8A" strokeWidth="1" />
      <rect x="90" y="77" width="4" height="3" rx="1" fill="#6B48FF" opacity="0.8" />
      <rect x="96" y="77" width="4" height="3" rx="1" fill="#6B48FF" opacity="0.8" />
      <rect x="102" y="77" width="4" height="3" rx="1" fill="#6B48FF" opacity="0.8" />
      {/* Antenna */}
      <line x1="100" y1="45" x2="100" y2="30" stroke="#5A4A9A" strokeWidth="2" />
      <circle cx="100" cy="27" r="5" fill="#6B48FF" filter="url(#glow2)" />
      {/* Arms */}
      <rect x="50" y="85" width="25" height="12" rx="6" fill="url(#roboBody)" stroke="#4A3A8A" strokeWidth="1.5" />
      <rect x="125" y="85" width="25" height="12" rx="6" fill="url(#roboBody)" stroke="#4A3A8A" strokeWidth="1.5" />
      {/* Chest panel */}
      <rect x="82" y="90" width="36" height="28" rx="5" fill="#12122A" stroke="#3A2A7A" strokeWidth="1" />
      <circle cx="92" cy="100" r="4" fill="#6B48FF" opacity="0.6" />
      <circle cx="108" cy="100" r="4" fill="#3FB950" opacity="0.6" />
      <rect x="85" y="110" width="30" height="3" rx="1.5" fill="#4A3A8A" opacity="0.7" />
      {/* Floating UI elements */}
      <rect x="145" y="50" width="35" height="20" rx="5" fill="#1A1A2E" stroke="#4A3A8A" strokeWidth="1" opacity="0.8" />
      <rect x="150" y="55" width="25" height="3" rx="1.5" fill="#6B48FF" opacity="0.6" />
      <rect x="150" y="62" width="18" height="2" rx="1" fill="#A78BFA" opacity="0.5" />
      <rect x="20" y="55" width="35" height="20" rx="5" fill="#1A1A2E" stroke="#4A3A8A" strokeWidth="1" opacity="0.8" />
      <rect x="25" y="60" width="25" height="3" rx="1.5" fill="#6B48FF" opacity="0.6" />
      <rect x="25" y="67" width="18" height="2" rx="1" fill="#A78BFA" opacity="0.5" />
    </svg>
  )
}

function CalendarIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="calBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0E1628" />
          <stop offset="100%" stopColor="#1A1A3A" />
        </linearGradient>
        <linearGradient id="browserGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E2A3A" />
          <stop offset="100%" stopColor="#141E2E" />
        </linearGradient>
        <filter id="glow3">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" fill="url(#calBg)" />
      {/* Background glow */}
      <ellipse cx="100" cy="80" rx="70" ry="45" fill="#7C3AED22" />
      {/* Browser window */}
      <rect x="25" y="25" width="150" height="110" rx="8" fill="url(#browserGrad)" stroke="#3A3A6A" strokeWidth="1.5" />
      {/* Browser toolbar */}
      <rect x="25" y="25" width="150" height="20" rx="8" fill="#1A2030" />
      <rect x="25" y="37" width="150" height="8" fill="#1A2030" />
      {/* Traffic lights */}
      <circle cx="40" cy="35" r="4" fill="#FF5F57" />
      <circle cx="54" cy="35" r="4" fill="#FEBC2E" />
      <circle cx="68" cy="35" r="4" fill="#28C840" />
      {/* URL bar */}
      <rect x="80" y="30" width="75" height="10" rx="5" fill="#0D1422" />
      {/* Sync icon */}
      <circle cx="162" cy="35" r="5" fill="none" stroke="#7C3AED" strokeWidth="1.5" />
      <path d="M159 33 A4 4 0 0 1 165 33" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M165 37 A4 4 0 0 1 159 37" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Dashboard content */}
      {/* Left panel */}
      <rect x="32" y="50" width="55" height="78" rx="5" fill="#0D1628" stroke="#2A2A5A" strokeWidth="1" />
      <rect x="37" y="56" width="45" height="8" rx="3" fill="#7C3AED" opacity="0.7" />
      <rect x="37" y="70" width="35" height="4" rx="2" fill="#5A5A9A" opacity="0.6" />
      <rect x="37" y="78" width="40" height="4" rx="2" fill="#5A5A9A" opacity="0.5" />
      <rect x="37" y="86" width="30" height="4" rx="2" fill="#5A5A9A" opacity="0.4" />
      <rect x="37" y="94" width="38" height="4" rx="2" fill="#3FB950" opacity="0.7" />
      <rect x="37" y="104" width="25" height="4" rx="2" fill="#58A6FF" opacity="0.6" />
      <rect x="37" y="112" width="33" height="4" rx="2" fill="#E3B341" opacity="0.5" />
      {/* Right panel - calendar grid */}
      <rect x="93" y="50" width="80" height="78" rx="5" fill="#0D1628" stroke="#2A2A5A" strokeWidth="1" />
      <rect x="98" y="56" width="70" height="8" rx="3" fill="#1E2A3A" />
      <text x="133" y="63" textAnchor="middle" fill="#A78BFA" fontSize="7" fontWeight="600">APRIL 2026</text>
      {/* Cal grid */}
      {[0,1,2,3,4,5,6].map(i => (
        <text key={i} x={102 + i*10} y="76" fill="#5A5A8A" fontSize="6" textAnchor="middle">
          {['M','T','W','T','F','S','S'][i]}
        </text>
      ))}
      {[[1,2,3,4,5,6,7],[8,9,10,11,12,13,14],[15,16,17,18,19,20,21],[22,23,24,25,26,27,28]].map((week, wi) =>
        week.map((day, di) => (
          <g key={`${wi}-${di}`}>
            {day === 18 ? (
              <circle cx={102 + di*10} cy={85 + wi*10} r="5" fill="#7C3AED" />
            ) : null}
            <text
              x={102 + di*10} y={88 + wi*10}
              textAnchor="middle" fill={day === 18 ? '#FFF' : day === 29 ? '#E3B341' : '#8888AA'}
              fontSize="6" fontWeight={day === 18 ? 'bold' : 'normal'}
            >
              {day}
            </text>
            {day === 29 ? <circle cx={102 + di*10} cy={87 + wi*10} r="5" fill="none" stroke="#E3B341" strokeWidth="1" /> : null}
          </g>
        ))
      )}
      {/* Sync arrows */}
      <path d="M88 75 L93 75" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="2,2" markerEnd="url(#arr)" />
      <path d="M88 90 L93 90" stroke="#3FB950" strokeWidth="1.5" strokeDasharray="2,2" />
      {/* Glowing dots */}
      <circle cx="170" cy="30" r="2" fill="#7C3AED" filter="url(#glow3)" />
      <circle cx="30" cy="140" r="3" fill="#58A6FF" opacity="0.4" />
    </svg>
  )
}

function AssistantIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="asstBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A1A28" />
          <stop offset="100%" stopColor="#101A30" />
        </linearGradient>
        <filter id="glow4">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" fill="url(#asstBg)" />
      {/* Glow */}
      <ellipse cx="100" cy="90" rx="65" ry="40" fill="#1A5FB422" />
      {/* Robot body */}
      <rect x="75" y="80" width="50" height="50" rx="10" fill="#1A2535" stroke="#2A4560" strokeWidth="1.5" />
      {/* Robot head */}
      <rect x="72" y="45" width="56" height="42" rx="14" fill="#1A2535" stroke="#2A4560" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="89" cy="62" r="8" fill="#0D1928" stroke="#58A6FF" strokeWidth="1.5" />
      <circle cx="111" cy="62" r="8" fill="#0D1928" stroke="#58A6FF" strokeWidth="1.5" />
      <circle cx="89" cy="62" r="3.5" fill="#58A6FF" filter="url(#glow4)" />
      <circle cx="111" cy="62" r="3.5" fill="#58A6FF" filter="url(#glow4)" />
      <circle cx="90.5" cy="60.5" r="1.5" fill="#A8D4FF" />
      <circle cx="112.5" cy="60.5" r="1.5" fill="#A8D4FF" />
      {/* Smile */}
      <path d="M88 76 Q100 83 112 76" stroke="#58A6FF" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Antenna */}
      <line x1="100" y1="45" x2="100" y2="32" stroke="#2A4560" strokeWidth="2" />
      <circle cx="100" cy="29" r="5" fill="#58A6FF" filter="url(#glow4)" />
      {/* Arms */}
      <rect x="48" y="83" width="27" height="12" rx="6" fill="#1A2535" stroke="#2A4560" strokeWidth="1.5" />
      <rect x="125" y="83" width="27" height="12" rx="6" fill="#1A2535" stroke="#2A4560" strokeWidth="1.5" />
      {/* Chest */}
      <rect x="83" y="90" width="34" height="28" rx="5" fill="#0D1928" stroke="#1E3A5A" strokeWidth="1" />
      <circle cx="100" cy="103" r="6" fill="none" stroke="#58A6FF" strokeWidth="1.5" opacity="0.7" />
      <circle cx="100" cy="103" r="3" fill="#58A6FF" opacity="0.5" />
      <rect x="86" y="113" width="28" height="2.5" rx="1.25" fill="#2A4560" />
      {/* Chat bubbles */}
      <rect x="125" y="42" width="55" height="22" rx="8" fill="#1E2A3A" stroke="#2A4A6A" strokeWidth="1" />
      <rect x="130" y="48" width="40" height="3" rx="1.5" fill="#58A6FF" opacity="0.7" />
      <rect x="130" y="55" width="28" height="3" rx="1.5" fill="#58A6FF" opacity="0.5" />
      <polygon points="125,60 118,55 125,50" fill="#1E2A3A" stroke="#2A4A6A" strokeWidth="1" />
      <rect x="20" y="65" width="50" height="20" rx="8" fill="#1E2A3A" stroke="#2A4A6A" strokeWidth="1" />
      <rect x="26" y="71" width="38" height="3" rx="1.5" fill="#3FB950" opacity="0.7" />
      <rect x="26" y="78" width="28" height="3" rx="1.5" fill="#3FB950" opacity="0.5" />
      <polygon points="70,78 77,73 70,68" fill="#1E2A3A" stroke="#2A4A6A" strokeWidth="1" />
    </svg>
  )
}

const FEATURES = [
  {
    title:       'Smart PDF Parsing',
    desc:        'Syllabus, assignments, deadlines, weight extracted.',
    Illustration: PDFIllustration,
    accentColor: '#58A6FF',
  },
  {
    title:       'AI Notes & Quizzes',
    desc:        'Structured study notes, practice quizzes generated instantly.',
    Illustration: RobotIllustration,
    accentColor: '#A78BFA',
  },
  {
    title:       'Calendar Sync',
    desc:        'Sync all academic commitments and deadlines automatically.',
    Illustration: CalendarIllustration,
    accentColor: '#7C3AED',
  },
  {
    title:       'Study Assistant',
    desc:        'Personal AI tutor for instant question-answering and guidance.',
    Illustration: AssistantIllustration,
    accentColor: '#58A6FF',
  },
]

// 0 → blank | 1 → typing | 2 → subtitle | 3 → card | 4 → features
export default function AuthScreen({ googleEnabled, onAuth, onSkip, theme = 'dark' }) {
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

        {/* ── Particle star field ────────────────────────────────── */}
        <ParticleCanvas theme={theme} />

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
              opacity:   stage >= 2 ? 1 : 0,
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
                opacity:   stage >= 1 ? 1 : 0,
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
              opacity:    stage >= 2 ? 1 : 0,
              transform:  stage >= 2 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}>
              {SUBTITLE}
            </p>

            {/* Animated divider */}
            <div style={{
              ...s.divider,
              width:      stage >= 2 ? '100px' : '0px',
              transition: 'width 0.9s cubic-bezier(.16,1,.3,1) 0.3s',
            }} />

            {/* Stats row */}
            <div style={{
              ...s.statsRow,
              opacity:    stage >= 3 ? 1 : 0,
              transform:  stage >= 3 ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}>
              {STATS.map((stat, i) => (
                <div key={i} style={{
                  ...s.statItem,
                  borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={s.statValue}>{stat.value}</span>
                  <span style={s.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main content: features + sign-in ──────────────────── */}
          <div style={s.mainRow}>

            {/* Feature cards — 4-in-a-row */}
            {FEATURES.map((f, i) => (
              <FeatureCard
                key={i}
                feature={f}
                index={i}
                visible={stage >= 4}
              />
            ))}

            {/* Sign-in card */}
            <div className="auth-signin-card" style={{
              ...s.card,
              opacity:    stage >= 3 ? 1 : 0,
              transform:  stage >= 3 ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
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
            </div>
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <span style={s.footerLink}>Terms</span>
            <span style={s.footerLink}>Privacy</span>
            <span style={s.footerLink}>Contact</span>
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
  const { Illustration, accentColor } = feature
  return (
    <div
      style={{
        ...s.featureCard,
        opacity:     visible ? 1 : 0,
        transform:   visible ? 'translateY(0)' : 'translateY(20px)',
        transition:  `opacity 0.5s ease ${index * 100 + 200}ms, transform 0.5s cubic-bezier(.16,1,.3,1) ${index * 100 + 200}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
        boxShadow:   hov ? `0 8px 32px ${accentColor}22, 0 0 0 1px ${accentColor}44` : '0 2px 12px rgba(0,0,0,0.25)',
        borderColor: hov ? `${accentColor}55` : 'var(--border)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Illustration area */}
      <div style={{
        ...s.illustrationWrap,
        boxShadow: hov ? `inset 0 0 40px ${accentColor}22` : 'none',
        transition: 'box-shadow 0.3s ease',
      }}>
        <Illustration />
      </div>

      {/* Text below */}
      <div style={s.cardText}>
        <p style={{
          ...s.featureTitle,
          color: hov ? accentColor : 'var(--text-primary)',
          transition: 'color 0.2s ease',
        }}>
          {feature.title}
        </p>
        <p style={s.featureDesc}>{feature.desc}</p>
      </div>
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
    padding:        '52px 24px 60px',
    gap:            '40px',
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
    marginBottom:    '18px',
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
    marginBottom:    '24px',
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
    maxWidth:        '520px',
  },
  statItem: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '14px 10px',
    gap:           '3px',
  },
  statValue: {
    fontSize:   '1.4rem',
    fontWeight: 800,
    color:      '#58A6FF',
    lineHeight: 1,
  },
  statLabel: {
    fontSize:      '0.58rem',
    fontWeight:    600,
    color:         'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign:     'center',
    lineHeight:    1.3,
  },

  // ── Main row — 4 feature cards + sign-in card ──
  mainRow: {
    display:        'flex',
    gap:            '16px',
    alignItems:     'stretch',
    width:          '100%',
    maxWidth:       '1200px',
    flexWrap:       'wrap',
    justifyContent: 'center',
  },

  // ── Feature card ──
  featureCard: {
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '16px',
    overflow:        'hidden',
    cursor:          'default',
    display:         'flex',
    flexDirection:   'column',
    flex:            '1 1 180px',
    minWidth:        '160px',
    maxWidth:        '220px',
    transition:      'background-color 0.25s ease',
  },
  illustrationWrap: {
    width:    '100%',
    height:   '160px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardText: {
    padding: '16px 16px 18px',
  },
  featureTitle: {
    margin:     '0 0 6px',
    fontSize:   '0.88rem',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  featureDesc: {
    margin:     0,
    fontSize:   '0.73rem',
    color:      'var(--text-muted)',
    lineHeight: 1.55,
  },

  // ── Sign-in card ──
  card: {
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '16px',
    padding:         '28px 26px',
    width:           '100%',
    maxWidth:        '280px',
    minWidth:        '240px',
    flexShrink:      0,
    boxShadow:       '0 8px 40px rgba(0,0,0,0.25)',
    transition:      'background-color 0.25s ease, border-color 0.25s ease',
    display:         'flex',
    flexDirection:   'column',
  },
  cardTopRow: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    marginBottom: '18px',
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
    fontSize:      '0.72rem',
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
    padding:         '12px 16px',
    backgroundColor: '#FFFFFF',
    border:          'none',
    borderRadius:    '10px',
    fontSize:        '0.88rem',
    fontWeight:      600,
    color:           '#1F1F1F',
    cursor:          'pointer',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    marginBottom:    '12px',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.12)',
  },
  orDivider: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    margin:     '12px 0',
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
    padding:         '11px 16px',
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '10px',
    fontSize:        '0.88rem',
    fontWeight:      600,
    color:           'var(--text-primary)',
    cursor:          'pointer',
    fontFamily:      "'Inter', 'system-ui', sans-serif",
    marginBottom:    '14px',
    transition:      'background-color 0.15s, border-color 0.15s, transform 0.15s',
  },
  guestIcon: { fontSize: '1rem' },
  fine: {
    margin:     0,
    fontSize:   '0.67rem',
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

  footer: {
    display: 'flex',
    gap:     '20px',
  },
  footerLink: {
    fontSize:      '0.72rem',
    color:         'var(--text-muted)',
    cursor:        'pointer',
    letterSpacing: '0.02em',
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
