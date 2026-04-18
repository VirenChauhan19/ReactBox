import { useState } from 'react'

const CSS = `
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
@keyframes backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.mbm-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  transition: opacity 0.15s;
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
  transform: scale(1.25);
  box-shadow: 0 0 14px var(--thumb-c, #58A6FF);
}
.mbm-close-btn:hover { opacity: 0.7; }
.mbm-save-btn:hover  { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.4)!important; }
.mbm-save-btn:active { transform: translateY(0); }
`

function sliderTrack(value, max, color) {
  const pct = (value / max) * 100
  return `linear-gradient(to right, ${color} ${pct}%, var(--bg-elevated) ${pct}%)`
}

function SliderRow({ label, icon, value, min, max, step = 1, unit, color, hint, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>{icon}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
          {hint && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({hint})</span>}
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color, minWidth: '60px', textAlign: 'right' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        className="mbm-slider"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          background:  sliderTrack(value - min, max - min, color),
          '--thumb-c': color,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function modeFromRecovery(r) {
  if (r >= 67) return { label: 'Peak Focus', color: '#3FB950', icon: '⚡' }
  if (r >= 34) return { label: 'Review Mode', color: '#E3B341', icon: '📖' }
  return { label: 'Rest Recommended', color: '#F85149', icon: '😴' }
}

export default function ManualBiometricModal({ onSave, onClose }) {
  const [bodyBattery, setBodyBattery] = useState(70)
  const [restingHR,   setRestingHR]   = useState(62)
  const [sleepHours,  setSleepHours]  = useState(7)
  const [sleepMins,   setSleepMins]   = useState(30)
  const [hrv,         setHrv]         = useState(55)
  const [stress,      setStress]      = useState(30)

  const mode = modeFromRecovery(bodyBattery)

  function handleSave() {
    const sleepDuration = (sleepHours * 60 + sleepMins) * 60 * 1000
    onSave({
      source:        'garmin-manual',
      recoveryScore: bodyBattery,
      hrv:           hrv || null,
      restingHR:     restingHR,
      sleepScore:    null,
      sleepDuration,
      strain:        null,
      stressLevel:   stress,
      fetchedAt:     new Date().toISOString(),
    })
  }

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter:  'blur(6px)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          1000,
        animation:       'backdropIn 0.2s ease both',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{CSS}</style>
      <div style={{
        width:           '100%',
        maxWidth:        '520px',
        backgroundColor: 'var(--bg-surface)',
        border:          '1px solid var(--border)',
        borderRadius:    '16px',
        boxShadow:       '0 24px 64px rgba(0,0,0,0.5)',
        padding:         '28px',
        display:         'flex',
        flexDirection:   'column',
        gap:             '24px',
        animation:       'modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight:       '90vh',
        overflowY:       'auto',
        margin:          '0 16px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.4rem' }}>⌚</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Enter Garmin Stats
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Open Garmin Connect on your phone and enter today's numbers below.
            </p>
          </div>
          <button
            className="mbm-close-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0 }}
            onClick={onClose}
          >✕</button>
        </div>

        {/* Live mode preview */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             '10px',
          padding:         '12px 16px',
          borderRadius:    '10px',
          backgroundColor: mode.color + '15',
          border:          `1px solid ${mode.color}44`,
        }}>
          <span style={{ fontSize: '1.4rem' }}>{mode.icon}</span>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: mode.color }}>{mode.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Body Battery {bodyBattery}% → {bodyBattery >= 67 ? 'tackle hard assignments' : bodyBattery >= 34 ? 'review existing material' : 'rest and recover'}
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SliderRow
            label="Body Battery" icon="🔋" unit="%" hint="in Garmin Connect app"
            value={bodyBattery} min={0} max={100} color={mode.color}
            onChange={setBodyBattery}
          />
          <SliderRow
            label="Resting Heart Rate" icon="❤️" unit=" bpm"
            value={restingHR} min={35} max={110} color="#F85149"
            onChange={setRestingHR}
          />

          {/* Sleep: hours + minutes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1rem' }}>💤</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)' }}>Sleep Last Night</span>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#BC8CFF' }}>
                {sleepHours}h {sleepMins}m
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="range" className="mbm-slider"
                  min={0} max={12} step={1} value={sleepHours}
                  onChange={e => setSleepHours(Number(e.target.value))}
                  style={{ background: sliderTrack(sleepHours, 12, '#BC8CFF'), '--thumb-c': '#BC8CFF' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>0h</span><span>12h</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="range" className="mbm-slider"
                  min={0} max={55} step={5} value={sleepMins}
                  onChange={e => setSleepMins(Number(e.target.value))}
                  style={{ background: sliderTrack(sleepMins, 55, '#BC8CFF'), '--thumb-c': '#BC8CFF' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>0m</span><span>55m</span>
                </div>
              </div>
            </div>
          </div>

          <SliderRow
            label="Stress Level" icon="🧠" unit="" hint="from Garmin Connect"
            value={stress} min={0} max={100}
            color={stress > 66 ? '#F85149' : stress > 33 ? '#E3B341' : '#3FB950'}
            onChange={setStress}
          />

          <SliderRow
            label="HRV" icon="〽️" unit=" ms" hint="optional"
            value={hrv} min={0} max={150}
            color="#58A6FF"
            onChange={setHrv}
          />
        </div>

        {/* Where to find these */}
        <div style={{
          padding:         '12px 14px',
          borderRadius:    '8px',
          backgroundColor: 'var(--bg-elevated)',
          border:          '1px solid var(--border)',
          fontSize:        '0.75rem',
          color:           'var(--text-muted)',
          lineHeight:      1.6,
        }}>
          <strong style={{ color: 'var(--text-body)' }}>Where to find these in Garmin Connect:</strong><br />
          🔋 Body Battery → Today's Overview card<br />
          ❤️ Resting HR → Heart Rate widget → Today<br />
          💤 Sleep → Sleep widget → Last night<br />
          🧠 Stress → Stress widget → Today's average
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            style={{
              padding:      '10px 20px',
              borderRadius: '8px',
              border:       '1px solid var(--border)',
              background:   'none',
              color:        'var(--text-muted)',
              fontSize:     '0.85rem',
              cursor:       'pointer',
              fontFamily:   "'Inter', system-ui, sans-serif",
            }}
            onClick={onClose}
          >Cancel</button>
          <button
            className="mbm-save-btn"
            style={{
              padding:       '10px 28px',
              borderRadius:  '8px',
              border:        'none',
              background:    `linear-gradient(135deg, ${mode.color}cc, ${mode.color})`,
              color:         '#fff',
              fontSize:      '0.88rem',
              fontWeight:    700,
              cursor:        'pointer',
              fontFamily:    "'Inter', system-ui, sans-serif",
              transition:    'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
              boxShadow:     `0 4px 16px ${mode.color}44`,
            }}
            onClick={handleSave}
          >Save & Connect ⌚</button>
        </div>
      </div>
    </div>
  )
}
