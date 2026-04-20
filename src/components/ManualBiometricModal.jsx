import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const CSS = `
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
@keyframes backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes fieldIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}
.mbm-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}
.mbm-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--thumb-c, #58A6FF);
  box-shadow: 0 0 8px var(--thumb-c, #58A6FF);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mbm-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 0 18px var(--thumb-c, #58A6FF);
}
.mbm-device-pill { transition: all 0.15s ease; cursor: pointer; }
.mbm-device-pill:hover { transform: translateY(-2px); }
.mbm-close-btn:hover  { opacity: 0.65; }
.mbm-save-btn:hover   { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.4)!important; }
.mbm-save-btn:active  { transform: translateY(0); }
`

// ── Accurate per-device data specs ─────────────────────────────────────────────
// Based on each platform's actual available metrics
const DEVICES = {
  whoop: {
    label: 'Whoop', icon: '💪', color: '#A855F7',
    // Whoop 4.0 / 5.0 — primary wearable for recovery athletes
    recoveryLabel: 'Recovery Score',
    recoveryHint:  'Whoop app → home screen ring (0–100%)',
    fields: {
      sleepScore:  { show: true,  label: 'Sleep Performance', hint: 'Whoop app → Sleep → Performance %',      unit: '%',  icon: '💤' },
      hrv:         { show: true,  label: 'HRV (RMSSD)',       hint: 'Whoop app → Recovery → HRV',            unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate',hint: 'Whoop app → Recovery → Resting HR',     unit: ' bpm',icon: '❤️' },
      strain:      { show: true,  label: 'Day Strain',        hint: 'Whoop app → Strain tab → today (0–21)',  unit: '',   icon: '🔥', min: 0, max: 21, step: 0.1 },
      stress:      { show: false },
    },
    guide: [
      '💚 Recovery % → Whoop home screen ring',
      '💤 Sleep Performance → Sleep tab → last night',
      '〽️ HRV → Recovery tab → scroll down',
      '🔥 Strain → Strain tab → today',
    ],
    note: 'Whoop does NOT have GPS or a stress score. HRV is RMSSD measured during sleep.',
  },

  garmin: {
    label: 'Garmin', icon: '⌚', color: '#007DC5',
    // Fenix, Forerunner, Vivoactive, Venu series — Firstbeat Analytics
    recoveryLabel: 'Body Battery',
    recoveryHint:  "Garmin Connect → Today's Overview → Body Battery (0–100)",
    fields: {
      sleepScore:  { show: true,  label: 'Sleep Score',       hint: 'Garmin Connect → Sleep → score (0–100)', unit: '',   icon: '💤' },
      hrv:         { show: true,  label: 'HRV Status',        hint: 'Garmin Connect → Health Stats → HRV Status (weekly avg ms)', unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate',hint: 'Garmin Connect → Heart Rate widget → Today', unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: true,  label: 'Stress Level',      hint: 'Garmin Connect → Stress widget → avg (0–100)', unit: '',  icon: '🧠' },
    },
    guide: [
      '🔋 Body Battery → Today Overview or Body Battery widget',
      '💤 Sleep Score → Sleep widget → last night',
      '🧠 Stress → Stress widget → today avg',
      '〽️ HRV → Health Stats → HRV Status',
    ],
    note: 'Body Battery drains through the day — check it first thing in the morning for the best readiness reading.',
  },

  apple: {
    label: 'Apple Watch', icon: '🍎', color: '#636366',
    // Series 4–9, Ultra. No native readiness score — estimated from HRV + HR + sleep.
    recoveryLabel: 'How Rested You Feel',
    recoveryHint:  'Apple Watch has no readiness score — set your own 0–100 estimate',
    fields: {
      sleepScore:  { show: false }, // Apple gives duration + stages, no score
      hrv:         { show: true,  label: 'HRV (SDNN)',         hint: 'Health app → Browse → Heart → Heart Rate Variability', unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate', hint: 'Health app → Browse → Heart → Resting Heart Rate',    unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: false }, // Apple Watch has no stress score
    },
    guide: [
      '❤️ Resting HR → iPhone Health app → Heart → Resting Heart Rate',
      '〽️ HRV → iPhone Health app → Heart → Heart Rate Variability',
      '💤 Sleep → iPhone Health app → Sleep → last night',
      '⚠️ Apple Watch has no recovery score — estimate 0–100 based on how you feel',
    ],
    note: 'Apple Watch measures HRV (SDNN), resting HR, sleep, and SpO2 (S6+) but has NO built-in readiness/recovery score. Estimate your own.',
  },

  coros: {
    label: 'Coros', icon: '⚡', color: '#D4A017',
    // Pace 3, Apex 2 Pro, Vertix 2S — EvoLab analytics
    recoveryLabel: 'Body Battery (Energy Score)',
    recoveryHint:  'COROS app → Vitality → Body Battery (0–100)',
    fields: {
      sleepScore:  { show: false }, // Coros tracks sleep stages/duration but no score
      hrv:         { show: true,  label: 'HRV (RMSSD)',        hint: 'COROS app → EvoLab → HRV Status',         unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate', hint: 'COROS app → Health → Resting HR',         unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: false }, // Coros Pace 3 has stress but it's not a main metric
    },
    guide: [
      '⚡ Body Battery → COROS app → Vitality tab → Body Battery',
      '〽️ HRV → COROS app → EvoLab → HRV Status',
      '❤️ Resting HR → COROS app → Health → Heart Rate',
      '💤 Sleep → COROS app → Health → Sleep → last night',
    ],
    note: 'COROS EvoLab tracks HRV and recovery. Body Battery (Energy Score) is only available on Pace 3, Apex 2, and Vertix 2S+.',
  },

  polar: {
    label: 'Polar', icon: '🔴', color: '#D50000',
    // Vantage V3/M2, Grit X2 Pro, Ignite 3 — Nightly Recharge
    recoveryLabel: 'Nightly Recharge',
    recoveryHint:  'Polar Flow app → Nightly Recharge → ANS Charge % (0–100)',
    fields: {
      sleepScore:  { show: true,  label: 'Sleep Score',        hint: 'Polar Flow → Sleep → Sleep Score (0–100)', unit: '',   icon: '💤' },
      hrv:         { show: true,  label: 'HRV (RMSSD)',        hint: 'Polar Flow → Nightly Recharge → HRV',     unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate', hint: 'Polar Flow → Heart Rate → Resting HR',    unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: false }, // Polar has stress & recovery via training balance, not a simple 0-100
    },
    guide: [
      '🔴 Nightly Recharge → Polar Flow → today → Nightly Recharge card',
      '💤 Sleep Score → Polar Flow → Sleep → last night score',
      '〽️ HRV → Polar Flow → Nightly Recharge → ANS Charge → HRV',
      '❤️ Resting HR → Polar Flow → Heart Rate → resting',
    ],
    note: 'Nightly Recharge ANS Charge (0–100%) is the best readiness metric on Polar. HRV is measured the first few minutes after waking.',
  },

  fitbit: {
    label: 'Fitbit', icon: '📈', color: '#00B0B9',
    // Sense 2, Versa 4, Charge 6 — Fitbit Premium metrics
    recoveryLabel: 'Daily Readiness Score',
    recoveryHint:  'Fitbit app → Today tab → Daily Readiness (0–100, Premium required)',
    fields: {
      sleepScore:  { show: true,  label: 'Sleep Score',         hint: 'Fitbit app → Today → Sleep → score (0–100)', unit: '',   icon: '💤' },
      hrv:         { show: true,  label: 'HRV (RMSSD)',         hint: 'Fitbit app → Health Metrics → HRV (ms)',     unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate',  hint: 'Fitbit app → Today → Heart Rate → Resting', unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: true,  label: 'Stress Mgmt Score',   hint: 'Fitbit app → Today → Stress → score (0–100, Sense/Versa 3+)', unit: '', icon: '🧠' },
    },
    guide: [
      '📈 Daily Readiness → Fitbit app → Today tab → Readiness tile (Premium)',
      '💤 Sleep Score → Fitbit app → Today → Sleep tile',
      '🧠 Stress → Fitbit app → Stress Management Score (Sense 2 / Versa 4)',
      '〽️ HRV → Fitbit app → Health Metrics dashboard',
    ],
    note: 'Daily Readiness Score requires Fitbit Premium. Stress Management Score is only on Sense 2, Versa 3, and Versa 4.',
  },

  other: {
    label: 'Other / Manual', icon: '📊', color: '#58A6FF',
    recoveryLabel: 'Readiness (your estimate)',
    recoveryHint:  'How recovered you feel today — set 0–100',
    fields: {
      sleepScore:  { show: false },
      hrv:         { show: true,  label: 'HRV',                hint: 'if your device shows it (ms)', unit: ' ms', icon: '〽️' },
      restingHR:   { show: true,  label: 'Resting Heart Rate', hint: 'from your device or app',     unit: ' bpm',icon: '❤️' },
      strain:      { show: false },
      stress:      { show: false },
    },
    guide: ['Enter what you know — even just resting HR and sleep hours will give useful recommendations.'],
    note: null,
  },
}

function sliderBg(value, min, max, color) {
  const pct = ((value - min) / (max - min)) * 100
  return `linear-gradient(to right, ${color} ${pct}%, var(--bg-elevated) ${pct}%)`
}

function modeFromRecovery(r) {
  if (r >= 67) return { label: 'Peak Focus',        color: '#3FB950', icon: '⚡', desc: 'Great time to tackle the hardest assignments.' }
  if (r >= 34) return { label: 'Review Mode',       color: '#E3B341', icon: '📖', desc: 'Good for reviewing and consolidating knowledge.' }
  return               { label: 'Rest Recommended', color: '#F85149', icon: '😴', desc: 'Your body needs recovery. Keep it very light.' }
}

// Devices where we calculate readiness ourselves instead of asking for it
const COMPUTED_READINESS_DEVICES = new Set(['garmin', 'coros'])

function computeReadinessFromInputs(sleepHours, sleepMins, restingHR, hrv, stress, hasStress) {
  let score = 0, totalWeight = 0

  // Sleep: 4h→0, 8h→100
  const sleepHrs = sleepHours + sleepMins / 60
  const sleepScore = Math.max(0, Math.min(100, (sleepHrs - 4) * 25))
  score += sleepScore * 3; totalWeight += 3

  // Resting HR: 50bpm→100, 80bpm→0
  const hrScore = Math.max(0, Math.min(100, 150 - restingHR * 1.25))
  score += hrScore * 2; totalWeight += 2

  // HRV: 20ms→0, 80ms→100
  if (hrv > 0) {
    const hrvScore = Math.max(0, Math.min(100, (hrv - 20) * (100 / 60)))
    score += hrvScore * 2; totalWeight += 2
  }

  // Stress (inverted): 0→100, 100→0
  if (hasStress) {
    score += (100 - stress) * 1; totalWeight += 1
  }

  return totalWeight > 0 ? Math.round(score / totalWeight) : 60
}

function Slider({ label, icon, hint, value, min, max, step = 1, unit, color, onChange, animDelay = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: `fieldIn 0.3s ${animDelay}ms ease both` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color, flexShrink: 0, marginLeft: '8px' }}>
          {typeof value === 'number' && step < 1 ? value.toFixed(1) : value}{unit}
        </span>
      </div>
      {hint && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-4px' }}>📍 {hint}</div>}
      <input
        type="range" className="mbm-slider"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : Number(e.target.value))}
        style={{ background: sliderBg(value, min, max, color), '--thumb-c': color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function ManualBiometricModal({ initialDevice = 'garmin', onSave, onClose }) {
  const [deviceKey,  setDeviceKey]  = useState(initialDevice)
  const [recovery,   setRecovery]   = useState(70)
  const [restingHR,  setRestingHR]  = useState(62)
  const [sleepHours, setSleepHours] = useState(7)
  const [sleepMins,  setSleepMins]  = useState(30)
  const [hrv,        setHrv]        = useState(55)
  const [strain,     setStrain]     = useState(10.0)
  const [stress,     setStress]     = useState(30)
  const [sleepScore, setSleepScore] = useState(80)

  const device = DEVICES[deviceKey]
  const useComputed = COMPUTED_READINESS_DEVICES.has(deviceKey)
  const computedReadiness = computeReadinessFromInputs(
    sleepHours, sleepMins, restingHR, hrv, stress, device.fields.stress?.show ?? false
  )
  const effectiveRecovery = useComputed ? computedReadiness : recovery
  const mode = modeFromRecovery(effectiveRecovery)

  // Reset fields when switching device to avoid confusing carry-over values
  useEffect(() => {
    setRecovery(70); setRestingHR(62); setSleepHours(7)
    setSleepMins(30); setHrv(55); setStrain(10); setStress(30); setSleepScore(80)
  }, [deviceKey])

  function handleSave() {
    const sleepDuration = (sleepHours * 60 + sleepMins) * 60 * 1000
    onSave({
      source:        deviceKey + '-manual',
      recoveryScore: effectiveRecovery,
      hrv:           device.fields.hrv?.show && hrv > 0 ? hrv : null,
      restingHR,
      sleepScore:    device.fields.sleepScore?.show ? sleepScore : null,
      sleepDuration,
      strain:        device.fields.strain?.show ? strain : null,
      stressLevel:   device.fields.stress?.show ? stress : null,
      fetchedAt:     new Date().toISOString(),
    })
  }

  const deviceOrder = ['whoop', 'garmin', 'apple', 'coros', 'polar', 'fitbit', 'other']
  let fieldDelay = 0

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'backdropIn 0.2s ease both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{CSS}</style>
      <div style={{
        width: '100%', maxWidth: '560px', margin: '0 16px',
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '18px', boxShadow: '0 28px 80px rgba(0,0,0,0.6)',
        padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px',
        animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight: '94vh', overflowY: 'auto',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Enter Health Stats
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Open your wearable app and dial in today's numbers below.
            </p>
          </div>
          <button className="mbm-close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '2px 6px', lineHeight: 1, flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>

        {/* ── Device picker ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your Device</span>
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {deviceOrder.map(key => {
              const d = DEVICES[key]
              const active = deviceKey === key
              return (
                <button
                  key={key}
                  className="mbm-device-pill"
                  onClick={() => setDeviceKey(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 13px', borderRadius: '20px',
                    border: `1px solid ${active ? d.color + '99' : 'var(--border)'}`,
                    backgroundColor: active ? d.color + '1A' : 'var(--bg-elevated)',
                    color: active ? d.color : 'var(--text-muted)',
                    fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                    boxShadow: active ? `0 0 14px ${d.color}25` : 'none',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <span>{d.icon}</span>{d.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Live mode preview ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 18px', borderRadius: '12px',
          backgroundColor: mode.color + '12', border: `1px solid ${mode.color}40`,
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}>
          <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{mode.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: mode.color }}>{mode.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{mode.desc}</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: mode.color, lineHeight: 1 }}>{effectiveRecovery}%</div>
        </div>

        {/* ── Sliders ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Primary: recovery/readiness — hidden for devices where we compute it */}
          {!useComputed && (
            <Slider
              label={device.recoveryLabel} icon={deviceKey === 'whoop' ? '💚' : deviceKey === 'polar' ? '🔴' : deviceKey === 'fitbit' ? '📈' : '🔋'}
              hint={device.recoveryHint} unit="%" color={mode.color}
              value={recovery} min={0} max={100} animDelay={0}
              onChange={setRecovery}
            />
          )}
          {useComputed && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              ⚙️ Readiness is calculated automatically from your sleep, heart rate, HRV, and stress below.
            </div>
          )}

          {/* Sleep score (Whoop Performance%, Garmin score, Polar score, Fitbit score) */}
          {device.fields.sleepScore?.show && (() => { fieldDelay += 60; return (
            <Slider key="ss" label={device.fields.sleepScore.label} icon={device.fields.sleepScore.icon}
              hint={device.fields.sleepScore.hint}
              unit={device.fields.sleepScore.unit} color="#BC8CFF"
              value={sleepScore} min={0} max={100} animDelay={fieldDelay}
              onChange={setSleepScore} />
          )})()}

          {/* Resting HR — all devices */}
          {(() => { fieldDelay += 60; return (
            <Slider key="hr" label={device.fields.restingHR.label} icon={device.fields.restingHR.icon}
              hint={device.fields.restingHR.hint}
              unit={device.fields.restingHR.unit} color="#F85149"
              value={restingHR} min={35} max={110} animDelay={fieldDelay}
              onChange={setRestingHR} />
          )})()}

          {/* Sleep duration — all devices */}
          {(() => { fieldDelay += 60; return (
            <div key="slp" style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: `fieldIn 0.3s ${fieldDelay}ms ease both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💤</span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-body)' }}>Sleep Last Night</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#BC8CFF' }}>{sleepHours}h {sleepMins}m</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-4px' }}>
                📍 {deviceKey === 'apple' ? 'Health app → Sleep → last night' : deviceKey === 'fitbit' ? 'Fitbit app → Today → Sleep tile' : `${device.label} app → Sleep → last night`}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <input type="range" className="mbm-slider" min={0} max={12} step={1} value={sleepHours}
                    onChange={e => setSleepHours(Number(e.target.value))}
                    style={{ background: sliderBg(sleepHours, 0, 12, '#BC8CFF'), '--thumb-c': '#BC8CFF' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-muted)' }}><span>0h</span><span>12h</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <input type="range" className="mbm-slider" min={0} max={55} step={5} value={sleepMins}
                    onChange={e => setSleepMins(Number(e.target.value))}
                    style={{ background: sliderBg(sleepMins, 0, 55, '#BC8CFF'), '--thumb-c': '#BC8CFF' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-muted)' }}><span>0m</span><span>55m</span></div>
                </div>
              </div>
            </div>
          )})()}

          {/* HRV */}
          {device.fields.hrv?.show && (() => { fieldDelay += 60; return (
            <Slider key="hrv" label={device.fields.hrv.label} icon={device.fields.hrv.icon}
              hint={device.fields.hrv.hint}
              unit={device.fields.hrv.unit} color="#58A6FF"
              value={hrv} min={0} max={150} animDelay={fieldDelay}
              onChange={setHrv} />
          )})()}

          {/* Strain (Whoop only) */}
          {device.fields.strain?.show && (() => { fieldDelay += 60; return (
            <Slider key="strain"
              label={device.fields.strain.label} icon={device.fields.strain.icon}
              hint={device.fields.strain.hint}
              unit={device.fields.strain.unit} color="#E3B341"
              value={strain} min={device.fields.strain.min} max={device.fields.strain.max} step={device.fields.strain.step}
              animDelay={fieldDelay}
              onChange={setStrain} />
          )})()}

          {/* Stress (Garmin, Fitbit) */}
          {device.fields.stress?.show && (() => { fieldDelay += 60; return (
            <Slider key="stress" label={device.fields.stress.label} icon={device.fields.stress.icon}
              hint={device.fields.stress.hint}
              unit={device.fields.stress.unit}
              color={stress > 66 ? '#F85149' : stress > 33 ? '#E3B341' : '#3FB950'}
              value={stress} min={0} max={100} animDelay={fieldDelay}
              onChange={setStress} />
          )})()}
        </div>

        {/* ── Where to find guide ─────────────────────────────────────────────── */}
        <div style={{ borderRadius: '10px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-body)' }}>
            📖 Where to find these in {device.label}
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {device.guide.map((g, i) => (
              <div key={i} style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{g}</div>
            ))}
          </div>
          {device.note && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: '0.71rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', fontStyle: 'italic' }}>
              ℹ️ {device.note}
            </div>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={onClose}
          >Cancel</button>
          <button
            className="mbm-save-btn"
            style={{
              padding: '10px 28px', borderRadius: '8px', border: 'none',
              background: `linear-gradient(135deg, ${mode.color}bb, ${mode.color})`,
              color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
              boxShadow: `0 4px 18px ${mode.color}44`,
            }}
            onClick={handleSave}
          >{device.icon} Save & Connect</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
