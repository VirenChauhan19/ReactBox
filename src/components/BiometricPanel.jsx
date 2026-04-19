import { useState, useEffect, useRef } from 'react'
import {
  computeReadiness, getStudyMode, STUDY_MODE_META, rankAssignments,
  formatSleepDuration,
} from '../utils/wearableApi.js'
import ManualBiometricModal from './ManualBiometricModal.jsx'

// ── Animation keyframes ────────────────────────────────────────────────────────
const CSS = `
@keyframes ringDraw {
  from { stroke-dashoffset: 440; }
}
@keyframes bioHeartbeat {
  0%, 100% { transform: scale(1); }
  14%       { transform: scale(1.15); }
  28%       { transform: scale(1); }
  42%       { transform: scale(1.1); }
  56%       { transform: scale(1); }
}
@keyframes bioGlowPulse {
  0%, 100% { box-shadow: 0 0 18px var(--glow-c, transparent); }
  50%       { box-shadow: 0 0 36px var(--glow-c, transparent); }
}
@keyframes bioCardIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes bioCountUp {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1);   }
}
@keyframes bioConnectFloat {
  0%, 100% { transform: translateY(0px);  }
  50%       { transform: translateY(-5px); }
}
@keyframes bioShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
@keyframes bioTagSlide {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0);     }
}
@keyframes bioBreathe {
  0%, 100% { transform: scale(1);    opacity: 1;   }
  50%       { transform: scale(1.03); opacity: 0.9; }
}
@keyframes bioInsightIn {
  from { opacity: 0; max-height: 0;   }
  to   { opacity: 1; max-height: 300px; }
}
@keyframes bioSpinRefresh {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}

.bio-connect-btn:hover  { opacity: 0.9; transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.3)!important; }
.bio-connect-btn:active { transform: translateY(0) scale(0.98); }
.bio-card-hover:hover   { border-color: var(--hover-border, var(--border))!important; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.2)!important; }
.bio-rec-row:hover      { background: var(--bg-elevated)!important; }
.bio-refresh-btn:hover  { opacity: 0.8; }
.bio-refresh-btn.spinning { animation: bioSpinRefresh 0.8s linear; }
`

// ── Sub-components ────────────────────────────────────────────────────────────
function ReadinessRing({ readiness, mode, animDelay = 0 }) {
  const [displayed, setDisplayed] = useState(0)
  const meta = mode ? STUDY_MODE_META[mode] : null
  const color = meta?.color ?? '#58A6FF'

  const R = 70
  const circumference = 2 * Math.PI * R
  const offset = circumference * (1 - (readiness ?? 0) / 100)

  useEffect(() => {
    if (readiness === null) return
    let frame
    const start  = performance.now()
    const dur    = 1400
    const from   = 0
    const to     = readiness

    function tick(now) {
      const t = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out-cubic
      setDisplayed(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [readiness])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width={180} height={180} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Track */}
          <circle cx={90} cy={90} r={R} fill="none"
            stroke="var(--border)" strokeWidth={10} />
          {/* Progress */}
          {readiness !== null && (
            <circle cx={90} cy={90} r={R} fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              filter="url(#ringGlow)"
              style={{
                animation: `ringDraw 1.4s cubic-bezier(0.22,1,0.36,1) ${animDelay}ms both`,
                transition: 'stroke-dashoffset 0.6s ease',
              }}
            />
          )}
        </svg>
        {/* Center text */}
        <div style={{
          position:  'absolute',
          inset:     0,
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
        }}>
          {readiness !== null ? (
            <>
              <span style={{
                fontSize:   '2.4rem',
                fontWeight: 800,
                color,
                lineHeight: 1,
                animation:  `bioCountUp 0.5s ${animDelay + 600}ms ease both`,
              }}>{displayed}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                readiness
              </span>
            </>
          ) : (
            <span style={{ fontSize: '1.6rem', color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      </div>

      {/* Mode badge */}
      {meta && (
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             '6px',
          padding:         '6px 16px',
          borderRadius:    '20px',
          backgroundColor: meta.color + '20',
          border:          `1px solid ${meta.color}55`,
          animation:       `bioCardIn 0.4s ${animDelay + 800}ms ease both`,
          '--glow-c':      meta.glow,
          animationName:   'bioCardIn, bioGlowPulse',
          animationDuration: `0.4s, 2.4s`,
          animationDelay:  `${animDelay + 800}ms, ${animDelay + 1200}ms`,
          animationFillMode: 'both, none',
          animationTimingFunction: 'ease, ease-in-out',
          animationIterationCount: '1, infinite',
        }}>
          <span style={{ fontSize: '0.95rem' }}>{meta.icon}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: meta.color, letterSpacing: '0.04em' }}>
            {meta.label}
          </span>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color = '#58A6FF', pulse = false, delay = 0 }) {
  return (
    <div
      className="bio-card-hover"
      style={{
        flex:            1,
        minWidth:        '110px',
        padding:         '14px 16px',
        borderRadius:    '12px',
        backgroundColor: 'var(--bg-surface)',
        border:          '1px solid var(--border)',
        display:         'flex',
        flexDirection:   'column',
        gap:             '6px',
        animation:       `bioCardIn 0.5s ${delay}ms ease both`,
        cursor:          'default',
        transition:      'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        '--hover-border': color + '66',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize:  '1.2rem',
          display:   'block',
          animation: pulse ? 'bioHeartbeat 1.2s ease-in-out infinite' : 'none',
        }}>{icon}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function RecommendationRow({ assignment, tag, tagColor, tagBg, delay = 0 }) {
  const urgencyDot = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }[assignment.urgency] ?? '#8B949E'
  return (
    <div
      className="bio-rec-row"
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             '10px',
        padding:         '10px 12px',
        borderRadius:    '8px',
        cursor:          'default',
        transition:      'background 0.15s ease',
        animation:       `bioTagSlide 0.4s ${delay}ms ease both`,
      }}
    >
      <span style={{
        fontSize:        '0.72rem',
        fontWeight:      700,
        color:           tagColor,
        backgroundColor: tagBg,
        border:          `1px solid ${tagColor}44`,
        padding:         '2px 8px',
        borderRadius:    '20px',
        whiteSpace:      'nowrap',
        flexShrink:      0,
      }}>{tag}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {assignment.title}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{assignment.course}</span>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: urgencyDot, flexShrink: 0 }} />
    </div>
  )
}

function ShimmerCard() {
  return (
    <div style={{
      flex:         1,
      minWidth:     '110px',
      height:       '90px',
      borderRadius: '12px',
      background:   'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%)',
      backgroundSize: '400px 100%',
      animation:    'bioShimmer 1.4s infinite linear',
    }} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BiometricPanel({
  biometricData,
  biometricLoading,
  assignments,
  onConnectWhoop,
  onConnectGarmin,
  onConnectGoogleFit,
  onRefresh,
  onDisconnect,
  googleEnabled,
}) {
  const [insightText, setInsightText]             = useState('')
  const [insightLoading, setInsightLoading]       = useState(false)
  const [refreshing, setRefreshing]               = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [manualDevice, setManualDevice]           = useState(null) // null = hidden, else 'whoop'|'garmin'|etc.
  const refreshBtnRef = useRef(null)

  const readiness  = computeReadiness(biometricData)
  const mode       = getStudyMode(readiness)
  const meta       = mode ? STUDY_MODE_META[mode] : null
  const { now: tackleNow, later } = rankAssignments(assignments, mode)

  const connected = !!biometricData

  async function handleRefresh() {
    if (refreshBtnRef.current) {
      refreshBtnRef.current.classList.add('spinning')
      setTimeout(() => refreshBtnRef.current?.classList.remove('spinning'), 800)
    }
    setRefreshing(true)
    await onRefresh?.()
    setRefreshing(false)
  }

  async function handleGenerateInsight() {
    if (!biometricData || !assignments?.length) return
    setInsightLoading(true); setInsightText('')
    const key = import.meta.env.VITE_GEMINI_API_KEY ?? ''
    const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`

    const sleepStr   = formatSleepDuration(biometricData.sleepDuration) ?? 'unknown'
    const hrStr      = biometricData.restingHR ? `${biometricData.restingHR} bpm` : 'unknown'
    const hrvStr     = biometricData.hrv ? `${Math.round(biometricData.hrv)} ms` : 'unknown'
    const recStr     = biometricData.recoveryScore ? `${Math.round(biometricData.recoveryScore)}%` : `${readiness}% (estimated)`
    const assignList = assignments.slice(0, 5).map(a => `${a.title} (${a.course}, due ${a.dueDate}, weight ${a.weight}%, ${a.urgency} urgency)`).join('\n')

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: 'You are a performance coach. Give sharp, actionable study advice based on biometric data and workload. 2–3 sentences max. Be specific and motivating.' }] },
          contents: [{ parts: [{ text: `Biometrics:\n- Recovery: ${recStr}\n- Sleep: ${sleepStr}\n- Resting HR: ${hrStr}\n- HRV: ${hrvStr}\n- Mode: ${meta?.label ?? 'unknown'}\n\nAssignments due soon:\n${assignList}\n\nGive personalized study advice for today.` }] }],
        }),
      })
      const data = await res.json()
      setInsightText((data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim())
    } catch { setInsightText('Could not generate insight. Check your Gemini API key.') }
    finally { setInsightLoading(false) }
  }

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!connected && !biometricLoading) {
    return (
      <div style={s.page}>
        <style>{CSS}</style>
        <div style={s.connectCard} className="animate-fadeIn">
          <div style={s.connectHero}>
            <div style={{ fontSize: '3.5rem', animation: 'bioConnectFloat 3s ease-in-out infinite' }}>💓</div>
            <h2 style={s.connectTitle}>Biometric Readiness</h2>
            <p style={s.connectSub}>Connect your wearable to unlock personalized study timing — know exactly when your brain is primed to learn.</p>
          </div>

          <div style={s.connectBtnRow}>
            <button
              className="bio-connect-btn"
              style={{ ...s.connectBtn, background: 'linear-gradient(135deg, #7B3FDB, #A855F7)', border: '1px solid #A855F766' }}
              onClick={() => setManualDevice('whoop')}
            >
              <span style={{ fontSize: '1.3rem' }}>💪</span>
              <div>
                <div style={s.connectBtnLabel}>Connect Whoop</div>
                <div style={s.connectBtnSub}>Recovery · HRV · Sleep · Strain</div>
              </div>
            </button>

            <button
              className="bio-connect-btn"
              style={{ ...s.connectBtn, background: 'linear-gradient(135deg, #0A2B4E, #007DC5)', border: '1px solid #007DC566' }}
              onClick={() => setManualDevice('garmin')}
            >
              <span style={{ fontSize: '1.3rem' }}>⌚</span>
              <div>
                <div style={s.connectBtnLabel}>Connect Garmin</div>
                <div style={s.connectBtnSub}>Body Battery · HR · Sleep · Stress</div>
              </div>
            </button>

            {googleEnabled && (
              <button
                className="bio-connect-btn"
                style={{ ...s.connectBtn, background: 'linear-gradient(135deg, #1A73E8, #34A853)', border: '1px solid #1A73E866' }}
                onClick={onConnectGoogleFit}
              >
                <span style={{ fontSize: '1.3rem' }}>🏃</span>
                <div>
                  <div style={s.connectBtnLabel}>Connect Google Fit</div>
                  <div style={s.connectBtnSub}>Heart Rate · Sleep · Activity</div>
                </div>
              </button>
            )}
          </div>

          <div style={s.deviceRow}>
            <span style={s.deviceLabel}>Tap to connect</span>
            {[
              { label: '🍎 Apple Watch', key: 'apple'  },
              { label: '⌚ Garmin',       key: 'garmin' },
              { label: '⚡ Coros',        key: 'coros'  },
              { label: '💪 Whoop',        key: 'whoop'  },
              { label: '🔴 Polar',        key: 'polar'  },
              { label: '📈 Fitbit',       key: 'fitbit' },
            ].map(({ label, key }) => (
              <button
                key={key}
                className="bio-card-hover"
                style={{ ...s.deviceChip, cursor: 'pointer', background: 'none', fontFamily: "'Inter', system-ui, sans-serif" }}
                onClick={() => setManualDevice(key)}
              >{label}</button>
            ))}
          </div>
        </div>

        {manualDevice && (
          <ManualBiometricModal
            initialDevice={manualDevice}
            onSave={data => { onConnectGarmin?.(data); setManualDevice(null) }}
            onClose={() => setManualDevice(null)}
          />
        )}
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (biometricLoading) {
    return (
      <div style={s.page}>
        <style>{CSS}</style>
        <div style={s.loadingCard}>
          <div style={{ fontSize: '2rem', animation: 'bioHeartbeat 1.2s ease-in-out infinite' }}>💓</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '12px' }}>Fetching your biometric data…</p>
          <div style={s.shimmerRow}>
            <ShimmerCard /><ShimmerCard /><ShimmerCard /><ShimmerCard />
          </div>
        </div>
      </div>
    )
  }

  // ── Connected ────────────────────────────────────────────────────────────────
  const sleepLabel   = biometricData.sleepScore
    ? `${Math.round(biometricData.sleepScore)}/100`
    : formatSleepDuration(biometricData.sleepDuration) ?? '—'
  const sleepSub = biometricData.sleepScore
    ? formatSleepDuration(biometricData.sleepDuration)
    : 'duration'
  const sourceLabel = {
    whoop: 'Whoop', 'whoop-manual': 'Whoop',
    garmin: 'Garmin', 'garmin-manual': 'Garmin',
    apple: 'Apple Watch', 'apple-manual': 'Apple Watch',
    coros: 'Coros', 'coros-manual': 'Coros',
    'google-fit': 'Google Fit',
    'other-manual': 'Wearable',
  }[biometricData.source] ?? biometricData.source
  const syncedAgo = biometricData.fetchedAt
    ? (() => {
        const mins = Math.round((Date.now() - new Date(biometricData.fetchedAt)) / 60000)
        return mins < 1 ? 'just now' : `${mins}m ago`
      })()
    : null

  return (
    <div style={s.page}>
      <style>{CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: '1.1rem' }}>💓</span>
          <span style={s.headerTitle}>Biometric Readiness</span>
          {syncedAgo && (
            <span style={s.syncTag}>via {sourceLabel} · {syncedAgo}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {biometricData?.source?.endsWith('-manual') && (
            <button
              style={{ ...s.iconBtn, fontSize: '0.75rem', padding: '4px 10px', color: '#58A6FF', borderColor: '#58A6FF55' }}
              onClick={() => setManualDevice(biometricData.source.replace('-manual', ''))}
              title="Update stats"
            >✏️ Update</button>
          )}
          <button
            ref={refreshBtnRef}
            className="bio-refresh-btn"
            style={s.iconBtn}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh biometric data"
          >↻</button>
          {confirmDisconnect ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', animation: 'bioCardIn 0.2s ease both' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disconnect?</span>
              <button
                style={{ ...s.iconBtn, color: '#F85149', borderColor: '#F8514966', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                onClick={() => { onDisconnect?.(); setConfirmDisconnect(false) }}
              >Yes</button>
              <button
                style={{ ...s.iconBtn, padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => setConfirmDisconnect(false)}
              >No</button>
            </div>
          ) : (
            <button
              style={{ ...s.iconBtn, fontSize: '0.75rem', padding: '4px 10px', color: 'var(--text-muted)' }}
              onClick={() => setConfirmDisconnect(true)}
              title={`Disconnect ${sourceLabel}`}
            >Disconnect</button>
          )}
        </div>
      </div>

      {/* ── Main metrics row ────────────────────────────────────────────────── */}
      <div style={s.mainRow}>
        {/* Readiness ring */}
        <div style={s.ringSection}>
          <ReadinessRing readiness={readiness} mode={mode} />
          {meta && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '160px', lineHeight: 1.5, marginTop: '4px' }}>
              {meta.short}
            </p>
          )}
        </div>

        {/* Metric cards */}
        <div style={s.metricsGrid}>
          <MetricCard
            icon="💤" label="Sleep" delay={100}
            value={sleepLabel}
            sub={sleepSub}
            color="#BC8CFF"
          />
          <MetricCard
            icon="❤️" label="Resting HR" delay={200}
            value={biometricData.restingHR ? `${biometricData.restingHR}` : null}
            sub="bpm"
            color="#F85149"
            pulse
          />
          <MetricCard
            icon="〽️" label="HRV" delay={300}
            value={biometricData.hrv ? `${Math.round(biometricData.hrv)}` : null}
            sub="ms"
            color="#58A6FF"
          />
          {biometricData.strain !== null && (
            <MetricCard
              icon="🔥" label="Strain" delay={400}
              value={biometricData.strain?.toFixed(1)}
              sub="/ 21"
              color="#E3B341"
            />
          )}
          {biometricData.stressLevel !== null && biometricData.stressLevel !== undefined && (
            <MetricCard
              icon="🧠" label="Stress" delay={450}
              value={biometricData.stressLevel}
              sub="/ 100"
              color={biometricData.stressLevel > 66 ? '#F85149' : biometricData.stressLevel > 33 ? '#E3B341' : '#3FB950'}
            />
          )}
        </div>
      </div>

      {/* ── Smart recommendations ────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Smart Recommendations</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>based on your readiness</span>
        </div>

        {mode === 'rest' && !tackleNow.length && (
          <div style={s.restBanner} className="animate-fadeIn">
            <span style={{ fontSize: '1.5rem', animation: 'bioBreathe 3s ease-in-out infinite' }}>😴</span>
            <p style={{ color: '#F85149', fontSize: '0.85rem', fontWeight: 600 }}>Your body is in recovery mode. Avoid heavy studying today.</p>
          </div>
        )}

        {tackleNow.length > 0 && (
          <div style={s.recGroup}>
            <span style={s.recGroupLabel}>⚡ Tackle Now</span>
            {tackleNow.map((a, i) => (
              <RecommendationRow
                key={a.id} assignment={a}
                tag="Focus" tagColor={meta?.color ?? '#58A6FF'} tagBg={(meta?.color ?? '#58A6FF') + '18'}
                delay={i * 80}
              />
            ))}
          </div>
        )}

        {later.length > 0 && (
          <div style={s.recGroup}>
            <span style={s.recGroupLabel}>📅 Schedule Later</span>
            {later.map((a, i) => (
              <RecommendationRow
                key={a.id} assignment={a}
                tag="Later" tagColor="#8B949E" tagBg="var(--bg-elevated)"
                delay={tackleNow.length * 80 + i * 60}
              />
            ))}
          </div>
        )}

        {assignments.filter(a => a.status === 'completed').length > 0 && (
          <div style={s.recGroup}>
            <span style={s.recGroupLabel}>✓ Completed</span>
            {assignments.filter(a => a.status === 'completed').map((a, i) => (
              <RecommendationRow
                key={a.id} assignment={a}
                tag="Done" tagColor="#3FB950" tagBg="#3FB95018"
                delay={200 + i * 60}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── AI Insight ───────────────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>AI Coach Insight</span>
          <button
            style={s.insightBtn}
            onClick={handleGenerateInsight}
            disabled={insightLoading}
          >
            {insightLoading ? 'Thinking…' : insightText ? '↻ Refresh' : '✨ Generate'}
          </button>
        </div>

        {insightLoading && (
          <div style={{ ...s.insightBox, background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%)', backgroundSize: '400px 100%', animation: 'bioShimmer 1.4s infinite linear', minHeight: '60px' }} />
        )}

        {insightText && !insightLoading && (
          <div style={s.insightBox} className="animate-fadeIn">
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🤖</span>
            <p style={{ color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{insightText}</p>
          </div>
        )}

        {!insightText && !insightLoading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '8px 0' }}>
            Get a personalized study plan based on your biometrics and deadlines.
          </p>
        )}
      </div>

      {manualDevice && (
        <ManualBiometricModal
          initialDevice={manualDevice}
          onSave={data => { onConnectGarmin?.(data); setManualDevice(null) }}
          onClose={() => setManualDevice(null)}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    flex:           1,
    overflowY:      'auto',
    padding:        '24px',
    display:        'flex',
    flexDirection:  'column',
    gap:            '20px',
    backgroundColor: 'var(--bg-main)',
  },

  // Not-connected
  connectCard: {
    maxWidth:        '640px',
    margin:          '40px auto',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '28px',
    textAlign:       'center',
  },
  connectHero: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '12px',
  },
  connectTitle: {
    fontSize:   '1.6rem',
    fontWeight: 800,
    color:      'var(--text-primary)',
    margin:     0,
  },
  connectSub: {
    fontSize:   '0.9rem',
    color:      'var(--text-muted)',
    maxWidth:   '480px',
    lineHeight: 1.6,
    margin:     0,
  },
  connectBtnRow: {
    display:   'flex',
    gap:       '14px',
    flexWrap:  'wrap',
    justifyContent: 'center',
  },
  connectBtn: {
    display:       'flex',
    alignItems:    'center',
    gap:           '12px',
    padding:       '14px 22px',
    borderRadius:  '14px',
    color:         '#fff',
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    textAlign:     'left',
    transition:    'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease',
    minWidth:      '200px',
    boxShadow:     '0 4px 16px rgba(0,0,0,0.25)',
  },
  connectBtnLabel: { fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' },
  connectBtnSub:   { fontSize: '0.72rem', opacity: 0.8 },
  deviceRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    flexWrap:   'wrap',
    justifyContent: 'center',
  },
  deviceLabel: { fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 },
  deviceChip: {
    fontSize:        '0.78rem',
    color:           'var(--text-body)',
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    padding:         '3px 10px',
    borderRadius:    '20px',
  },
  connectNote: {
    fontSize:   '0.75rem',
    color:      'var(--text-muted)',
    maxWidth:   '440px',
    lineHeight: 1.5,
    margin:     0,
  },

  // Loading
  loadingCard: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    flex:           1,
    minHeight:      '300px',
    gap:            '12px',
  },
  shimmerRow: {
    display:   'flex',
    gap:       '12px',
    width:     '100%',
    maxWidth:  '600px',
    marginTop: '20px',
  },

  // Connected layout
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingBottom:  '16px',
    borderBottom:   '1px solid var(--border)',
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
  },
  headerTitle: {
    fontSize:   '1rem',
    fontWeight: 700,
    color:      'var(--text-primary)',
  },
  syncTag: {
    fontSize:        '0.72rem',
    color:           'var(--text-muted)',
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '20px',
    padding:         '2px 8px',
  },
  iconBtn: {
    background:   'none',
    border:       '1px solid var(--border)',
    borderRadius: '6px',
    color:        'var(--text-muted)',
    cursor:       'pointer',
    fontSize:     '1rem',
    padding:      '4px 8px',
    fontFamily:   "'Inter', system-ui, sans-serif",
    transition:   'opacity 0.15s ease',
  },
  mainRow: {
    display:     'flex',
    gap:         '24px',
    alignItems:  'flex-start',
    flexWrap:    'wrap',
  },
  ringSection: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '8px',
    flexShrink:     0,
  },
  metricsGrid: {
    display:   'flex',
    gap:       '12px',
    flex:      1,
    flexWrap:  'wrap',
    alignContent: 'flex-start',
  },

  // Sections
  section: {
    borderTop:     '1px solid var(--border)',
    paddingTop:    '16px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
  },
  sectionHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   '4px',
  },
  sectionTitle: {
    fontSize:   '0.82rem',
    fontWeight: 700,
    color:      'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  recGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },
  recGroupLabel: {
    fontSize:      '0.75rem',
    fontWeight:    600,
    color:         'var(--text-muted)',
    padding:       '4px 12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  restBanner: {
    display:         'flex',
    alignItems:      'center',
    gap:             '12px',
    padding:         '14px 16px',
    borderRadius:    '10px',
    backgroundColor: '#F8514918',
    border:          '1px solid #F8514944',
  },
  insightBtn: {
    fontSize:        '0.78rem',
    fontWeight:      600,
    color:           '#58A6FF',
    backgroundColor: '#58A6FF18',
    border:          '1px solid #58A6FF44',
    borderRadius:    '6px',
    padding:         '4px 10px',
    cursor:          'pointer',
    fontFamily:      "'Inter', system-ui, sans-serif",
    transition:      'opacity 0.15s ease',
  },
  insightBox: {
    display:         'flex',
    gap:             '12px',
    alignItems:      'flex-start',
    padding:         '14px 16px',
    borderRadius:    '10px',
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
  },
}
