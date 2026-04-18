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
  box-shadow: 0 0 16px var(--thumb-c, #58A6FF);
}
.mbm-device-btn { transition: all 0.15s ease; }
.mbm-device-btn:hover { transform: translateY(-2px); }
.mbm-close-btn:hover  { opacity: 0.7; }
.mbm-save-btn:hover   { opacity: 0.88; transform: translateY(-1px); }
.mbm-save-btn:active  { transform: translateY(0); }
`

// Device configs — labels adapt per device
const DEVICES = {
  whoop:   { label: 'Whoop',        icon: '💪', color: '#A855F7', recoveryLabel: 'Recovery Score',  recoveryHint: 'from Whoop app → Today',       hasStrain: true,  hasStress: false, hasSleepScore: true  },
  garmin:  { label: 'Garmin',       icon: '⌚', color: '#007DC5', recoveryLabel: 'Body Battery',     recoveryHint: "Today's Overview in Garmin Connect", hasStrain: false, hasStress: true,  hasSleepScore: false },
  apple:   { label: 'Apple Watch',  icon: '🍎', color: '#888888', recoveryLabel: 'Readiness (est.)', recoveryHint: 'estimate based on HR & sleep',   hasStrain: false, hasStress: false, hasSleepScore: false },
  coros:   { label: 'Coros',        icon: '⚡', color: '#E3B341', recoveryLabel: 'Body Battery',     recoveryHint: 'from Coros app → Today',         hasStrain: false, hasStress: true,  hasSleepScore: false },
  other:   { label: 'Other',        icon: '📊', color: '#58A6FF', recoveryLabel: 'Readiness (0–100)',recoveryHint: 'your estimate of how recovered you feel', hasStrain: false, hasStress: false, hasSleepScore: false },
}

function sliderBg(value, min, max, color) {
  const pct = ((value - min) / (max - min)) * 100
  return `linear-gradient(to right, ${color} ${pct}%, var(--bg-elevated) ${pct}%)`
}

function modeFromRecovery(r) {
  if (r >= 67) return { label: 'Peak Focus',        color: '#3FB950', icon: '⚡', desc: 'Great time to tackle the hardest assignments.' }
  if (r >= 34) return { label: 'Review Mode',       color: '#E3B341', icon: '📖', desc: 'Good for reviewing and lighter material.'       }
  return               { label: 'Rest Recommended', color: '#F85149', icon: '😴', desc: 'Your body needs recovery. Keep it light.'        }
}

function Slider({ label, icon, hint, value, min, max, step = 1, unit, color, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
          {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {hint}</span>}
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color, flexShrink: 0, marginLeft: '8px' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" className="mbm-slider"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: sliderBg(value, min, max, color), '--thumb-c': color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function ManualBiometricModal({ initialDevice = 'whoop', onSave, onClose }) {
  const [deviceKey,   setDeviceKey]   = useState(initialDevice)
  const [recovery,    setRecovery]    = useState(70)
  const [restingHR,   setRestingHR]   = useState(62)
  const [sleepHours,  setSleepHours]  = useState(7)
  const [sleepMins,   setSleepMins]   = useState(30)
  const [hrv,         setHrv]         = useState(55)
  const [strain,      setStrain]      = useState(10)
  const [stress,      setStress]      = useState(30)
  const [sleepScore,  setSleepScore]  = useState(80)

  const device = DEVICES[deviceKey]
  const mode   = modeFromRecovery(recovery)

  function handleSave() {
    const sleepDuration = (sleepHours * 60 + sleepMins) * 60 * 1000
    onSave({
      source:        deviceKey + '-manual',
      recoveryScore: recovery,
      hrv:           hrv > 0 ? hrv : null,
      restingHR,
      sleepScore:    device.hasSleepScore ? sleepScore : null,
      sleepDuration,
      strain:        device.hasStrain  ? strain  : null,
      stressLevel:   device.hasStress  ? stress  : null,
      fetchedAt:     new Date().toISOString(),
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'backdropIn 0.2s ease both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{CSS}</style>
      <div style={{
        width: '100%', maxWidth: '540px', margin: '0 16px',
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px',
        animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight: '92vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Enter Health Stats
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Open your wearable app and enter today's numbers.
            </p>
          </div>
          <button className="mbm-close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>

        {/* Device picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Device</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(DEVICES).map(([key, d]) => (
              <button
                key={key}
                className="mbm-device-btn"
                onClick={() => setDeviceKey(key)}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '6px',
                  padding:         '7px 14px',
                  borderRadius:    '20px',
                  border:          `1px solid ${deviceKey === key ? d.color + '88' : 'var(--border)'}`,
                  backgroundColor: deviceKey === key ? d.color + '18' : 'var(--bg-elevated)',
                  color:           deviceKey === key ? d.color : 'var(--text-muted)',
                  fontSize:        '0.8rem',
                  fontWeight:      deviceKey === key ? 700 : 500,
                  cursor:          'pointer',
                  fontFamily:      "'Inter', system-ui, sans-serif",
                  boxShadow:       deviceKey === key ? `0 0 12px ${d.color}30` : 'none',
                }}
              >
                <span>{d.icon}</span>{d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live mode preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '13px 16px', borderRadius: '10px',
          backgroundColor: mode.color + '15', border: `1px solid ${mode.color}44`,
        }}>
          <span style={{ fontSize: '1.6rem' }}>{mode.icon}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: mode.color }}>{mode.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{mode.desc}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '1.4rem', fontWeight: 800, color: mode.color }}>{recovery}%</div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Slider
            label={device.recoveryLabel} icon={deviceKey === 'whoop' ? '💚' : '🔋'}
            hint={device.recoveryHint} unit="%" color={mode.color}
            value={recovery} min={0} max={100} onChange={setRecovery}
          />

          {device.hasSleepScore && (
            <Slider label="Sleep Performance" icon="💤" hint="from Whoop app" unit="%" color="#BC8CFF"
              value={sleepScore} min={0} max={100} onChange={setSleepScore} />
          )}

          <Slider label="Resting Heart Rate" icon="❤️" unit=" bpm" color="#F85149"
            value={restingHR} min={35} max={110} onChange={setRestingHR} />

          {/* Sleep duration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💤</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-body)' }}>Sleep Last Night</span>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#BC8CFF' }}>{sleepHours}h {sleepMins}m</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <input type="range" className="mbm-slider" min={0} max={12} step={1} value={sleepHours}
                  onChange={e => setSleepHours(Number(e.target.value))}
                  style={{ background: sliderBg(sleepHours, 0, 12, '#BC8CFF'), '--thumb-c': '#BC8CFF' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>0h</span><span>12h</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <input type="range" className="mbm-slider" min={0} max={55} step={5} value={sleepMins}
                  onChange={e => setSleepMins(Number(e.target.value))}
                  style={{ background: sliderBg(sleepMins, 0, 55, '#BC8CFF'), '--thumb-c': '#BC8CFF' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>0m</span><span>55m</span>
                </div>
              </div>
            </div>
          </div>

          <Slider label="HRV" icon="〽️" hint="optional" unit=" ms" color="#58A6FF"
            value={hrv} min={0} max={150} onChange={setHrv} />

          {device.hasStrain && (
            <Slider label="Strain" icon="🔥" hint="from Whoop app" unit="" color="#E3B341"
              value={strain} min={0} max={21} step={0.1} onChange={setStrain} />
          )}

          {device.hasStress && (
            <Slider label="Stress Level" icon="🧠" hint="from your wearable app" unit=""
              color={stress > 66 ? '#F85149' : stress > 33 ? '#E3B341' : '#3FB950'}
              value={stress} min={0} max={100} onChange={setStress} />
          )}
        </div>

        {/* Where to find guide */}
        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-body)' }}>Where to find these in {device.label}:</strong><br />
          {deviceKey === 'whoop' && <>💚 Recovery → Whoop app home screen<br />💤 Sleep Performance → Sleep tab → Last night<br />🔥 Strain → Strain tab → Today</>}
          {deviceKey === 'garmin' && <>🔋 Body Battery → Today's Overview or Body Battery widget<br />❤️ Resting HR → Heart Rate widget → Today<br />🧠 Stress → Stress widget → Today's average</>}
          {deviceKey === 'apple' && <>❤️ Resting HR → Health app → Heart Rate → Resting<br />💤 Sleep → Health app → Sleep → Last night</>}
          {deviceKey === 'coros' && <>🔋 Body Battery → COROS app → Vitality → Body Battery<br />🧠 Stress → COROS app → Vitality → Stress</>}
          {deviceKey === 'other' && <>Enter your best estimates. The readiness % is what matters most.</>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={onClose}
          >Cancel</button>
          <button
            className="mbm-save-btn"
            style={{
              padding: '10px 28px', borderRadius: '8px', border: 'none',
              background: `linear-gradient(135deg, ${mode.color}cc, ${mode.color})`,
              color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              boxShadow: `0 4px 16px ${mode.color}44`,
            }}
            onClick={handleSave}
          >{device.icon} Save & Connect</button>
        </div>
      </div>
    </div>
  )
}
