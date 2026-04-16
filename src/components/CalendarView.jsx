import { useState, useEffect, useRef, useCallback } from 'react'

const DAYS        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const MONTHS_S    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const URGENCY_COLOR = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }
const EVENT_COLORS  = ['#58A6FF','#BC8CFF','#F78166','#E3B341','#3FB950','#FF6B9D']
const DURATIONS     = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
]

// ── Time grid constants ───────────────────────────────────────────────────────
const HOUR_H     = 60   // px per hour
const GRID_START = 7    // 7 AM
const GRID_END   = 24   // midnight
const TOTAL_HRS  = GRID_END - GRID_START
const TOTAL_PX   = TOTAL_HRS * HOUR_H
const HOURS_GRID = Array.from({ length: TOTAL_HRS }, (_, i) => i + GRID_START)

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function getWeekDays(anyDate) {
  const d = new Date(anyDate)
  d.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d); x.setDate(d.getDate() + i); return x
  })
}
function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}
function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
}
function timeToY(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (h < GRID_START || h >= GRID_END) return null
  return (h - GRID_START + m / 60) * HOUR_H
}
function clickToTime(relY) {
  const raw = relY / HOUR_H + GRID_START
  const h   = Math.max(GRID_START, Math.min(GRID_END - 1, Math.floor(raw)))
  const m   = Math.round(((raw - Math.floor(raw)) * 60) / 15) * 15
  const hh  = m >= 60 ? h + 1 : h
  const mm  = m >= 60 ? 0 : m
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}
function getCurrentTimeY() {
  const now = new Date()
  const h = now.getHours(); const m = now.getMinutes()
  if (h < GRID_START || h >= GRID_END) return null
  return (h - GRID_START + m / 60) * HOUR_H
}
function buildMonthCells(year, month) {
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const daysInPrevMo = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrevMo - i, current: false, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ day: d, current: true, dateStr })
  }
  let nd = 1
  while (cells.length < 42) cells.push({ day: nd++, current: false, dateStr: null })
  return cells
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CalendarView({
  assignments = [], selectedAssignment, onSelect,
  customEvents = [], onAddCustomEvent, onDeleteCustomEvent,
}) {
  const today    = new Date()
  const todayStr = toDateStr(today)

  const [viewMode, setViewMode] = useState('month')
  const [cursor,   setCursor]   = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dayDate,  setDayDate]  = useState(today)
  const [animDir,  setAnimDir]  = useState(null)
  const [animKey,  setAnimKey]  = useState(0)

  // current-time y — refreshes every minute
  const [nowY, setNowY] = useState(getCurrentTimeY)
  useEffect(() => {
    const id = setInterval(() => setNowY(getCurrentTimeY()), 60_000)
    return () => clearInterval(id)
  }, [])

  // modal
  const [modal,   setModal]   = useState(null)
  const [mTitle,  setMTitle]  = useState('')
  const [mColor,  setMColor]  = useState(EVENT_COLORS[0])
  const [mTime,   setMTime]   = useState('')
  const [mDur,    setMDur]    = useState(60)
  const [mAllDay, setMAllDay] = useState(true)
  const [mDesc,   setMDesc]   = useState('')
  const inputRef = useRef(null)

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()

  // indexed data
  const byDate = {}
  assignments.forEach(a => { if (!byDate[a.dueDate]) byDate[a.dueDate]=[]; byDate[a.dueDate].push(a) })
  const custByDate = {}
  customEvents.forEach(e => { if (!custByDate[e.date]) custByDate[e.date]=[]; custByDate[e.date].push(e) })

  function nav(delta) {
    setAnimDir(delta > 0 ? 'left' : 'right')
    setAnimKey(k => k + 1)
    if (viewMode === 'month') {
      setCursor(new Date(year, month + delta, 1))
    } else if (viewMode === 'week') {
      const d = new Date(cursor); d.setDate(d.getDate() + delta * 7); setCursor(d)
    } else {
      const d = new Date(dayDate); d.setDate(d.getDate() + delta); setDayDate(d)
    }
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setDayDate(new Date(today))
  }
  function switchDay(date) { setDayDate(date); setViewMode('day') }

  function openModal(dateStr, prefillTime = '') {
    const [y, m, d] = dateStr.split('-')
    const label = `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`
    setMTitle(''); setMColor(EVENT_COLORS[0]); setMDesc('')
    setMTime(prefillTime); setMDur(60); setMAllDay(!prefillTime)
    setModal({ dateStr, label })
  }
  function closeModal() { setModal(null) }
  function saveModal() {
    const t = mTitle.trim(); if (!t) return
    onAddCustomEvent?.({
      id: `ce-${Date.now()}`,
      date: modal.dateStr,
      title: t,
      color: mColor,
      time: mAllDay ? '' : mTime,
      duration: mAllDay ? 0 : mDur,
      desc: mDesc.trim(),
    })
    closeModal()
  }

  useEffect(() => { if (modal) setTimeout(() => inputRef.current?.focus(), 60) }, [modal])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  let navLabel = ''
  if (viewMode === 'month') navLabel = `${MONTHS[month]} ${year}`
  else if (viewMode === 'week') {
    const wk = getWeekDays(cursor)
    navLabel = `${MONTHS_S[wk[0].getMonth()]} ${wk[0].getDate()} – ${MONTHS_S[wk[6].getMonth()]} ${wk[6].getDate()}, ${wk[6].getFullYear()}`
  } else {
    navLabel = `${DAYS[dayDate.getDay()]}, ${MONTHS[dayDate.getMonth()]} ${dayDate.getDate()}, ${dayDate.getFullYear()}`
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={s.wrap}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.navGroup}>
            <NavBtn onClick={() => nav(-1)}>←</NavBtn>
            <button style={s.todayBtn} onClick={goToday}>Today</button>
            <NavBtn onClick={() => nav(1)}>→</NavBtn>
          </div>
          <span style={s.navLabel}>{navLabel}</span>
          <div style={s.viewSwitcher}>
            {['month','week','day'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                ...s.viewBtn,
                backgroundColor: viewMode===v ? '#58A6FF' : 'var(--bg-elevated)',
                color:           viewMode===v ? '#fff'    : 'var(--text-muted)',
                border:          viewMode===v ? '1px solid #58A6FF' : '1px solid var(--border)',
              }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Views */}
        <div key={`${viewMode}-${animKey}`} style={{
          flex:1, overflow:'hidden',
          animation: animDir==='left'  ? 'calSlideLeft  .28s cubic-bezier(.16,1,.3,1) both'
                   : animDir==='right' ? 'calSlideRight .28s cubic-bezier(.16,1,.3,1) both'
                   : 'none',
        }}>
          {viewMode === 'month' && (
            <MonthView year={year} month={month} todayStr={todayStr}
              byDate={byDate} custByDate={custByDate}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect} onAddClick={openModal}
              onDeleteCustom={onDeleteCustomEvent} onDayClick={switchDay} />
          )}
          {viewMode === 'week' && (
            <WeekView weekDays={getWeekDays(cursor)} todayStr={todayStr} nowY={nowY}
              byDate={byDate} custByDate={custByDate}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect} onAddClick={openModal}
              onDeleteCustom={onDeleteCustomEvent} onDayClick={switchDay} />
          )}
          {viewMode === 'day' && (
            <DayView date={dayDate} todayStr={todayStr} nowY={nowY}
              asgns={byDate[toDateStr(dayDate)]??[]}
              customEvts={custByDate[toDateStr(dayDate)]??[]}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={(time) => openModal(toDateStr(dayDate), time)}
              onDeleteCustom={onDeleteCustomEvent} />
          )}
        </div>
      </div>

      {/* ── Add Event Modal ────────────────────────────────────────────── */}
      {modal && (
        <div style={s.backdrop} onClick={closeModal}>
          <div style={s.modalCard} className="animate-popIn" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={s.modalHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', backgroundColor:mColor, flexShrink:0, boxShadow:`0 0 8px ${mColor}88` }} />
                <div>
                  <p style={s.modalTitle}>New Event</p>
                  <p style={s.modalDate}>{modal.label}</p>
                </div>
              </div>
              <button style={s.modalClose} onClick={closeModal}>✕</button>
            </div>

            {/* Title */}
            <input ref={inputRef} style={s.titleInput} placeholder="Add title…"
              value={mTitle} onChange={e => setMTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveModal()} maxLength={60} />

            {/* Time row */}
            <div style={s.fieldRow}>
              <span style={s.fieldIcon}>🕐</span>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', flex:1 }}>
                <label style={s.toggleLabel}>
                  <div onClick={() => setMAllDay(v => !v)} style={{
                    ...s.toggleTrack,
                    backgroundColor: mAllDay ? 'var(--bg-elevated)' : '#58A6FF',
                  }}>
                    <div style={{ ...s.toggleThumb, left: mAllDay ? '2px' : '18px',
                      backgroundColor: mAllDay ? 'var(--text-muted)' : '#fff' }} />
                  </div>
                  <span style={s.toggleTxt}>{mAllDay ? 'All day' : 'Timed'}</span>
                </label>
                {!mAllDay && (
                  <>
                    <input type="time" value={mTime} onChange={e => setMTime(e.target.value)}
                      style={{ ...s.inlineInput, width:'120px' }} />
                    <select value={mDur} onChange={e => setMDur(Number(e.target.value))}
                      style={{ ...s.inlineInput, width:'110px' }}>
                      {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={s.fieldRow}>
              <span style={s.fieldIcon}>☰</span>
              <textarea
                style={{ ...s.titleInput, marginBottom:0, resize:'none', height:'60px', fontSize:'0.83rem' }}
                placeholder="Add description (optional)"
                value={mDesc} onChange={e => setMDesc(e.target.value)} maxLength={200}
              />
            </div>

            {/* Color */}
            <div style={{ ...s.fieldRow, alignItems:'center' }}>
              <span style={s.fieldIcon}>🎨</span>
              <div style={{ display:'flex', gap:'8px' }}>
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setMColor(c)} style={{
                    width:'22px', height:'22px', borderRadius:'50%', border:'none',
                    backgroundColor:c, cursor:'pointer',
                    transform:  mColor===c ? 'scale(1.3)' : 'scale(1)',
                    boxShadow:  mColor===c ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${c}` : 'none',
                    transition:'transform .15s, box-shadow .15s',
                  }}/>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeModal}>Cancel</button>
              <button style={{ ...s.saveBtn, opacity: mTitle.trim() ? 1 : 0.45 }}
                onClick={saveModal} disabled={!mTitle.trim()}>
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Week View (time grid) ─────────────────────────────────────────────────────
function WeekView({ weekDays, todayStr, nowY, byDate, custByDate, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  const scrollRef = useRef(null)

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_H
  }, [])

  const todayInWeek = weekDays.find(d => toDateStr(d) === todayStr)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', overflow:'hidden' }}>

      {/* ── Sticky all-day header ────────────────────────────────────── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`54px repeat(7, 1fr)`,
        borderBottom:'2px solid var(--border)',
        flexShrink:0,
        backgroundColor:'var(--bg-surface)',
      }}>
        {/* gutter */}
        <div style={{ padding:'8px 6px 4px', borderRight:'1px solid var(--border)' }} />

        {/* Day headers */}
        {weekDays.map((date, i) => {
          const ds      = toDateStr(date)
          const isToday = ds === todayStr
          const asgns   = byDate[ds] ?? []
          const custEvts = (custByDate[ds] ?? []).filter(e => !e.time)
          return (
            <div key={i} style={{
              borderRight: i<6 ? '1px solid var(--border)' : 'none',
              backgroundColor: isToday ? 'color-mix(in srgb, #58A6FF 8%, var(--bg-surface))' : 'transparent',
            }}>
              {/* Day name + number */}
              <div style={{ textAlign:'center', padding:'8px 4px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                <span style={{ fontSize:'0.6rem', fontWeight:700, color: isToday ? '#58A6FF' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {DAYS[date.getDay()]}
                </span>
                <div
                  onClick={() => onDayClick(date)}
                  style={{
                    width:'30px', height:'30px', borderRadius:'50%', cursor:'pointer',
                    backgroundColor: isToday ? '#58A6FF' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.95rem', fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#fff' : 'var(--text-primary)',
                    transition:'background-color .15s',
                  }}
                  title="View day"
                >
                  {date.getDate()}
                </div>
              </div>
              {/* All-day items */}
              <div style={{ padding:'0 4px 6px', display:'flex', flexDirection:'column', gap:'2px', minHeight:'8px' }}>
                {asgns.map(a => {
                  const c = URGENCY_COLOR[a.urgency] ?? '#8B949E'
                  return (
                    <div key={a.id}
                      onClick={() => onSelect(a.id)}
                      title={`${a.course}: ${a.title} — Due by end of day`}
                      style={{
                        fontSize:'0.6rem', fontWeight:600, padding:'2px 5px', borderRadius:'3px',
                        backgroundColor: a.status==='completed' ? 'var(--bg-elevated)' : c+'28',
                        color: a.status==='completed' ? 'var(--text-muted)' : c,
                        border:`1px solid ${c}44`,
                        cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        textDecoration: a.status==='completed' ? 'line-through' : 'none',
                        opacity: a.status==='completed' ? 0.6 : 1,
                      }}
                    >
                      {a.title}
                    </div>
                  )
                })}
                {custEvts.map(ev => (
                  <AllDayChip key={ev.id} ev={ev} onDelete={onDeleteCustom} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Scrollable time grid ──────────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        <div style={{
          display:'grid',
          gridTemplateColumns:`54px repeat(7, 1fr)`,
          height:`${TOTAL_PX}px`,
          position:'relative',
        }}>
          {/* Time labels column */}
          <div style={{ borderRight:'1px solid var(--border)', position:'relative' }}>
            {HOURS_GRID.map(h => (
              <div key={h} style={{
                position:'absolute', top:`${(h - GRID_START) * HOUR_H - 9}px`,
                width:'100%', padding:'0 8px 0 0',
                textAlign:'right', fontSize:'0.6rem', fontWeight:500, color:'var(--text-muted)',
                userSelect:'none',
              }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((date, colIdx) => {
            const ds       = toDateStr(date)
            const isToday  = ds === todayStr
            const timedEvts = (custByDate[ds] ?? []).filter(e => e.time)

            return (
              <WeekTimeCol key={colIdx}
                date={date} dateStr={ds} isToday={isToday}
                timedEvts={timedEvts} nowY={nowY}
                isLast={colIdx===6}
                onAddClick={(time) => onAddClick(ds, time)}
                onDeleteCustom={onDeleteCustom}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeekTimeCol({ date, dateStr, isToday, timedEvts, nowY, isLast, onAddClick, onDeleteCustom }) {
  const colRef = useRef(null)
  const [hovY, setHovY] = useState(null)
  const [hovEv, setHovEv] = useState(null)

  function handleMouseMove(e) {
    const rect = colRef.current?.getBoundingClientRect()
    if (!rect) return
    setHovY(e.clientY - rect.top)
  }

  return (
    <div
      ref={colRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovY(null)}
      onClick={e => {
        const rect = colRef.current?.getBoundingClientRect()
        if (!rect) return
        const relY = e.clientY - rect.top
        onAddClick(clickToTime(relY))
      }}
      style={{
        position:'relative', height:`${TOTAL_PX}px`, cursor:'pointer',
        borderRight: isLast ? 'none' : '1px solid var(--border)',
        backgroundColor: isToday ? 'color-mix(in srgb, #58A6FF 5%, transparent)' : 'transparent',
      }}
    >
      {/* Hour lines */}
      {HOURS_GRID.map(h => (
        <div key={h} style={{
          position:'absolute', top:`${(h - GRID_START) * HOUR_H}px`,
          left:0, right:0, borderTop:'1px solid var(--bg-elevated)',
          pointerEvents:'none',
        }} />
      ))}
      {/* Half-hour lines */}
      {HOURS_GRID.map(h => (
        <div key={`h-${h}`} style={{
          position:'absolute', top:`${(h - GRID_START) * HOUR_H + HOUR_H/2}px`,
          left:0, right:0, borderTop:'1px dashed var(--bg-elevated)',
          opacity:0.5, pointerEvents:'none',
        }} />
      ))}

      {/* Hover time indicator */}
      {hovY !== null && (
        <div style={{
          position:'absolute', top:`${hovY}px`, left:0, right:0,
          borderTop:'1px solid #58A6FF66', pointerEvents:'none', zIndex:1,
        }}>
          <span style={{
            position:'absolute', left:'4px', top:'-9px',
            fontSize:'0.58rem', color:'#58A6FF', fontWeight:600,
            backgroundColor:'var(--bg-surface)', padding:'0 3px', borderRadius:'3px',
          }}>
            {formatTime(clickToTime(hovY))}
          </span>
        </div>
      )}

      {/* Current time line (today only) */}
      {isToday && nowY !== null && (
        <div style={{
          position:'absolute', top:`${nowY}px`, left:0, right:0,
          borderTop:'2px solid #F85149', pointerEvents:'none', zIndex:3,
        }}>
          <div style={{
            position:'absolute', left:'-5px', top:'-5px',
            width:'9px', height:'9px', borderRadius:'50%', backgroundColor:'#F85149',
          }} />
        </div>
      )}

      {/* Timed events */}
      {timedEvts.map(ev => {
        const y   = timeToY(ev.time)
        if (y === null) return null
        const dur = ev.duration || 60
        const h   = Math.max(28, (dur / 60) * HOUR_H)
        return (
          <div
            key={ev.id}
            onMouseEnter={e => { e.stopPropagation(); setHovEv(ev.id) }}
            onMouseLeave={() => setHovEv(null)}
            onClick={e => e.stopPropagation()}
            style={{
              position:'absolute', top:`${y + 2}px`, left:'3px', right:'3px',
              height:`${h - 4}px`, borderRadius:'6px', zIndex:2,
              backgroundColor: ev.color+'33', border:`1.5px solid ${ev.color}88`,
              borderLeft:`3px solid ${ev.color}`,
              padding:'3px 6px', overflow:'hidden', cursor:'default',
              boxShadow: hovEv===ev.id ? `0 4px 16px ${ev.color}44` : 'none',
              transition:'box-shadow .15s',
            }}
          >
            <div style={{ fontSize:'0.65rem', fontWeight:700, color:ev.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {ev.title}
            </div>
            {h > 36 && (
              <div style={{ fontSize:'0.57rem', color:ev.color, opacity:0.8, marginTop:'2px' }}>
                {formatTime(ev.time)}{ev.duration ? ` · ${ev.duration < 60 ? ev.duration+'m' : ev.duration/60+'h'}` : ''}
              </div>
            )}
            {hovEv===ev.id && (
              <div
                onClick={() => onDeleteCustom?.(ev.id)}
                style={{
                  position:'absolute', top:'3px', right:'4px',
                  fontSize:'0.7rem', fontWeight:700, color:ev.color,
                  cursor:'pointer', lineHeight:1, opacity:0.9,
                }}
                title="Remove"
              >×</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ date, todayStr, nowY, asgns, customEvts, selectedAssignment, onSelect, onAddClick, onDeleteCustom }) {
  const ds        = toDateStr(date)
  const isToday   = ds === todayStr
  const allDayEvts = customEvts.filter(e => !e.time)
  const timedEvts  = customEvts.filter(e => e.time)
  const scrollRef  = useRef(null)
  const colRef     = useRef(null)
  const [hovY, setHovY]   = useState(null)
  const [hovEv, setHovEv] = useState(null)

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = HOUR_H }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', overflow:'hidden' }}>

      {/* Day header */}
      <div style={{
        padding:'10px 16px 0',
        borderBottom:'2px solid var(--border)',
        flexShrink:0,
        backgroundColor:'var(--bg-surface)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px', paddingBottom:'8px' }}>
          <div style={{
            width:'50px', height:'50px', borderRadius:'50%',
            backgroundColor: isToday ? '#58A6FF' : 'var(--bg-elevated)',
            border: `2px solid ${isToday ? '#58A6FF' : 'var(--border)'}`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize:'1.3rem', fontWeight:800, color: isToday ? '#fff' : 'var(--text-primary)', lineHeight:1 }}>{date.getDate()}</span>
            <span style={{ fontSize:'0.48rem', fontWeight:700, color: isToday ? '#ffffffaa' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{DAYS[date.getDay()]}</span>
          </div>
          <div>
            <div style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--text-primary)' }}>
              {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'2px' }}>
              {asgns.length} assignment{asgns.length!==1?'s':''} due · {customEvts.length} personal event{customEvts.length!==1?'s':''}
            </div>
          </div>
        </div>

        {/* All-day row */}
        {(asgns.length > 0 || allDayEvts.length > 0) && (
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', paddingBottom:'8px', alignItems:'center' }}>
            <span style={{ fontSize:'0.58rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', flexShrink:0 }}>All day</span>
            {asgns.map(a => {
              const c = URGENCY_COLOR[a.urgency] ?? '#8B949E'
              const isSel = a.id === selectedAssignment
              return (
                <div key={a.id} onClick={() => onSelect(a.id)} style={{
                  fontSize:'0.72rem', fontWeight:600, padding:'4px 10px', borderRadius:'6px',
                  backgroundColor: c+'22', color:c, border: isSel ? `1px solid ${c}` : `1px solid ${c}44`,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:'5px',
                }}>
                  <span>{a.course}: {a.title}</span>
                  <span style={{ fontSize:'0.62rem', opacity:0.7 }}>· Due 11:59 PM</span>
                </div>
              )
            })}
            {allDayEvts.map(ev => <AllDayChip key={ev.id} ev={ev} onDelete={onDeleteCustom} large />)}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'54px 1fr', height:`${TOTAL_PX}px`, position:'relative' }}>
          {/* Time labels */}
          <div style={{ borderRight:'1px solid var(--border)', position:'relative' }}>
            {HOURS_GRID.map(h => (
              <div key={h} style={{
                position:'absolute', top:`${(h-GRID_START)*HOUR_H - 9}px`,
                width:'100%', padding:'0 8px 0 0',
                textAlign:'right', fontSize:'0.6rem', fontWeight:500, color:'var(--text-muted)', userSelect:'none',
              }}>{formatHour(h)}</div>
            ))}
          </div>

          {/* Events column */}
          <div
            ref={colRef}
            onMouseMove={e => { const r=colRef.current?.getBoundingClientRect(); r && setHovY(e.clientY-r.top) }}
            onMouseLeave={() => setHovY(null)}
            onClick={e => { const r=colRef.current?.getBoundingClientRect(); r && onAddClick(clickToTime(e.clientY-r.top)) }}
            style={{ position:'relative', height:`${TOTAL_PX}px`, cursor:'pointer' }}
          >
            {HOURS_GRID.map(h => (
              <div key={h} style={{ position:'absolute', top:`${(h-GRID_START)*HOUR_H}px`, left:0, right:0, borderTop:'1px solid var(--bg-elevated)', pointerEvents:'none' }} />
            ))}
            {HOURS_GRID.map(h => (
              <div key={`hf-${h}`} style={{ position:'absolute', top:`${(h-GRID_START)*HOUR_H+HOUR_H/2}px`, left:0, right:0, borderTop:'1px dashed var(--bg-elevated)', opacity:0.5, pointerEvents:'none' }} />
            ))}

            {/* Hover line */}
            {hovY !== null && (
              <div style={{ position:'absolute', top:`${hovY}px`, left:0, right:0, borderTop:'1px solid #58A6FF55', pointerEvents:'none', zIndex:1 }}>
                <span style={{ position:'absolute', left:'8px', top:'-9px', fontSize:'0.6rem', color:'#58A6FF', fontWeight:600, backgroundColor:'var(--bg-surface)', padding:'0 4px', borderRadius:'3px' }}>
                  {formatTime(clickToTime(hovY))}
                </span>
              </div>
            )}

            {/* Current time */}
            {isToday && nowY !== null && (
              <div style={{ position:'absolute', top:`${nowY}px`, left:0, right:0, borderTop:'2px solid #F85149', pointerEvents:'none', zIndex:3 }}>
                <div style={{ position:'absolute', left:'-5px', top:'-5px', width:'9px', height:'9px', borderRadius:'50%', backgroundColor:'#F85149' }} />
              </div>
            )}

            {/* Event blocks */}
            {timedEvts.map(ev => {
              const y = timeToY(ev.time); if (y===null) return null
              const dur = ev.duration||60
              const h   = Math.max(36,(dur/60)*HOUR_H)
              return (
                <div key={ev.id}
                  onMouseEnter={e => { e.stopPropagation(); setHovEv(ev.id) }}
                  onMouseLeave={() => setHovEv(null)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position:'absolute', top:`${y+2}px`, left:'8px', right:'8px', height:`${h-4}px`,
                    borderRadius:'8px', zIndex:2, overflow:'hidden',
                    backgroundColor: ev.color+'28', border:`1.5px solid ${ev.color}88`,
                    borderLeft:`4px solid ${ev.color}`, padding:'5px 10px',
                    boxShadow: hovEv===ev.id ? `0 4px 20px ${ev.color}44` : 'none',
                    transition:'box-shadow .15s', cursor:'default',
                  }}
                >
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:ev.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</div>
                  <div style={{ fontSize:'0.65rem', color:ev.color, opacity:0.85, marginTop:'2px' }}>
                    {formatTime(ev.time)}{dur ? ` – ${formatTime(addMinutes(ev.time, dur))}` : ''}
                  </div>
                  {ev.desc && h > 60 && (
                    <div style={{ fontSize:'0.62rem', color:ev.color, opacity:0.7, marginTop:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.desc}</div>
                  )}
                  {hovEv===ev.id && (
                    <div onClick={() => onDeleteCustom?.(ev.id)}
                      style={{ position:'absolute', top:'5px', right:'7px', fontSize:'0.75rem', fontWeight:700, color:ev.color, cursor:'pointer', opacity:0.9 }}
                      title="Remove">×</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ year, month, todayStr, byDate, custByDate, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  const cells = buildMonthCells(year, month)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
      <div style={s.legend}>
        {Object.entries(URGENCY_COLOR).map(([k,c]) => (
          <span key={k} style={s.legendItem}>
            <span style={{ ...s.legendDot, backgroundColor:c, boxShadow:`0 0 4px ${c}` }} />
            <span style={s.legendTxt}>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
          </span>
        ))}
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, backgroundColor:'#F8514966', border:'1px solid #F85149' }} />
          <span style={s.legendTxt}>Overdue</span>
        </span>
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, backgroundColor:'#58A6FF44', border:'1px dashed #58A6FF' }} />
          <span style={s.legendTxt}>My Event</span>
        </span>
        <span style={{ marginLeft:'auto', fontSize:'0.67rem', color:'var(--text-muted)' }}>
          Click date to add · Click number to view day
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {DAYS.map(d => <div key={d} style={s.dayLabel}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((cell,i) => (
          <MonthCell key={i} cell={cell}
            asgns={cell.dateStr ? (byDate[cell.dateStr]??[]) : []}
            customEvts={cell.dateStr ? (custByDate[cell.dateStr]??[]) : []}
            isToday={cell.dateStr===todayStr}
            isPast={cell.dateStr ? cell.dateStr<todayStr : false}
            selectedAssignment={selectedAssignment}
            onSelect={onSelect}
            onAddClick={() => cell.current && cell.dateStr && onAddClick(cell.dateStr)}
            onDeleteCustom={onDeleteCustom}
            onDayClick={() => { if(cell.current&&cell.dateStr){const [y,m,d]=cell.dateStr.split('-'); onDayClick(new Date(+y,+m-1,+d))} }}
          />
        ))}
      </div>
    </div>
  )
}

function MonthCell({ cell, asgns, customEvts, isToday, isPast, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  const [hov, setHov] = useState(false)
  const [hovCE, setHovCE] = useState(null)
  const hasOverdue = isPast && asgns.some(a => a.status !== 'completed')
  const hasContent = asgns.length > 0 || customEvts.length > 0

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => cell.current && onAddClick()}
      style={{
        ...s.cell, opacity: cell.current?1:0.25, position:'relative', cursor: cell.current?'pointer':'default',
        backgroundColor: isToday ? 'color-mix(in srgb, #58A6FF 15%, var(--bg-surface))' : hasOverdue ? 'var(--wrong-bg)' : hov&&cell.current ? 'var(--bg-hover)' : 'var(--bg-surface)',
        border: isToday ? '1px solid #58A6FF' : hasOverdue ? '1px solid #F8514944' : hov&&cell.current ? '1px solid var(--border-strong)' : '1px solid var(--bg-elevated)',
        boxShadow: isToday ? '0 0 0 2px #58A6FF33' : 'none',
        transition:'background-color .15s, border-color .15s',
      }}
    >
      <span onClick={e=>{e.stopPropagation();onDayClick()}} style={{
        ...s.dayNum, cursor:cell.current?'pointer':'default',
        color: isToday?'#58A6FF':hasOverdue?'#F85149':cell.current?'var(--text-primary)':'var(--border-strong)',
        fontWeight: isToday||hasOverdue?700:400,
      }}>
        {cell.day}
        {hasOverdue && <span style={s.warnDot} title="Overdue">●</span>}
      </span>
      {hov && cell.current && !hasContent && <div style={s.addHint}>+</div>}
      <div style={s.chips}>
        {asgns.slice(0,2).map(a => {
          const c = URGENCY_COLOR[a.urgency]??'#8B949E'; const isSel = a.id===selectedAssignment
          return (
            <div key={a.id} title={`${a.title} — Due by end of day`}
              onClick={e=>{e.stopPropagation();onSelect(a.id)}}
              style={{ ...s.chip, backgroundColor:a.status==='completed'?'var(--bg-elevated)':c+'22', color:a.status==='completed'?'var(--text-muted)':c, border:isSel?`1px solid ${c}`:`1px solid ${c}44`, textDecoration:a.status==='completed'?'line-through':'none', opacity:a.status==='completed'?0.5:1 }}>
              {a.title.length>13?a.title.slice(0,12)+'…':a.title}
            </div>
          )
        })}
        {customEvts.slice(0,2).map(ev => (
          <div key={ev.id}
            title={ev.time?`${ev.title} at ${formatTime(ev.time)}`:ev.title}
            onMouseEnter={e=>{e.stopPropagation();setHovCE(ev.id)}}
            onMouseLeave={()=>setHovCE(null)}
            onClick={e=>e.stopPropagation()}
            style={{ ...s.chip, ...s.customChip, backgroundColor:ev.color+'20', color:ev.color, border:`1px dashed ${ev.color}88`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2px' }}
          >
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {ev.time?`${formatTime(ev.time)} `:''}✦ {ev.title.length>9?ev.title.slice(0,8)+'…':ev.title}
            </span>
            {hovCE===ev.id && <span onClick={e=>{e.stopPropagation();onDeleteCustom?.(ev.id)}} style={s.deleteX} title="Remove">×</span>}
          </div>
        ))}
        {(asgns.length+customEvts.length)>4 && <span style={s.more}>+{asgns.length+customEvts.length-4} more</span>}
      </div>
    </div>
  )
}

function AllDayChip({ ev, onDelete, large=false }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={e=>e.stopPropagation()}
      style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:large?'0.72rem':'0.6rem',
        fontWeight:500, padding:large?'4px 8px':'2px 5px', borderRadius:'4px', fontStyle:'italic',
        backgroundColor:ev.color+'20', color:ev.color, border:`1px dashed ${ev.color}88`, whiteSpace:'nowrap', cursor:'default' }}>
      ✦ {ev.title.length>(large?28:10)?ev.title.slice(0,large?27:9)+'…':ev.title}
      {hov && <span onClick={()=>onDelete?.(ev.id)} style={{ fontStyle:'normal', fontWeight:700, cursor:'pointer', opacity:0.8, marginLeft:'2px' }} title="Remove">×</span>}
    </div>
  )
}

function NavBtn({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      ...s.navBtn, backgroundColor:hov?'var(--bg-elevated)':'var(--bg-surface)',
      transform:hov?'scale(1.08)':'scale(1)', boxShadow:hov?'0 0 12px rgba(88,166,255,.2)':'none',
    }}>{children}</button>
  )
}

const CSS = `
  @keyframes calSlideLeft  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes calSlideRight { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
`

const s = {
  wrap: {
    backgroundColor:'var(--bg-main)', minHeight:'100vh',
    padding:'14px 0 0', fontFamily:"'Inter',system-ui,sans-serif",
    color:'var(--text-primary)', display:'flex', flexDirection:'column',
    gap:'10px', transition:'background-color 0.25s ease', overflow:'hidden',
  },
  topBar: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    gap:'12px', flexWrap:'wrap', padding:'0 16px',
  },
  navGroup: { display:'flex', alignItems:'center', gap:'6px' },
  navBtn: {
    border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)',
    padding:'6px 14px', fontSize:'1rem', cursor:'pointer', fontFamily:'inherit',
    transition:'background-color .15s, transform .15s, box-shadow .15s',
  },
  todayBtn: {
    border:'1px solid var(--border)', borderRadius:'8px', backgroundColor:'var(--bg-surface)',
    color:'var(--text-muted)', padding:'6px 14px', fontSize:'0.78rem', fontWeight:600,
    cursor:'pointer', fontFamily:'inherit', transition:'background-color .15s',
  },
  navLabel: { fontSize:'1rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'0.01em' },
  viewSwitcher: { display:'flex', gap:'4px' },
  viewBtn: {
    padding:'6px 14px', borderRadius:'8px', fontSize:'0.78rem', fontWeight:600,
    cursor:'pointer', fontFamily:'inherit', transition:'background-color .15s, color .15s',
  },
  legend: { display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap', padding:'0 16px' },
  legendItem: { display:'flex', alignItems:'center', gap:'5px' },
  legendDot: { display:'inline-block', width:'8px', height:'8px', borderRadius:'50%' },
  legendTxt: { fontSize:'0.7rem', color:'var(--text-muted)' },
  dayLabel: {
    fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)',
    textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center', padding:'4px 0',
  },
  cell: { borderRadius:'8px', padding:'6px 6px 8px', minHeight:'80px' },
  dayNum: { fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'3px', marginBottom:'5px' },
  warnDot: { fontSize:'0.4rem', color:'#F85149', lineHeight:1 },
  addHint: { position:'absolute', bottom:'6px', right:'7px', fontSize:'0.9rem', color:'var(--text-muted)', opacity:0.5, lineHeight:1, pointerEvents:'none' },
  chips: { display:'flex', flexDirection:'column', gap:'3px' },
  chip: { fontSize:'0.6rem', fontWeight:500, padding:'2px 5px', borderRadius:'4px', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  customChip: { borderRadius:'4px', fontStyle:'italic', cursor:'default' },
  deleteX: { fontStyle:'normal', fontSize:'0.75rem', fontWeight:700, lineHeight:1, cursor:'pointer', flexShrink:0, opacity:0.8 },
  more: { fontSize:'0.58rem', color:'var(--text-muted)', paddingLeft:'3px' },

  // modal
  backdrop: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:700, padding:'24px' },
  modalCard: {
    backgroundColor:'var(--bg-surface)', border:'1px solid var(--border)',
    borderRadius:'18px', padding:'24px', width:'100%', maxWidth:'420px',
    boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
    fontFamily:"'Inter',system-ui,sans-serif",
  },
  modalHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' },
  modalTitle: { margin:'0 0 2px', fontSize:'1.05rem', fontWeight:700, color:'var(--text-primary)' },
  modalDate: { margin:0, fontSize:'0.73rem', color:'var(--text-muted)' },
  modalClose: {
    background:'none', border:'1px solid var(--border)', borderRadius:'6px',
    color:'var(--text-muted)', width:'28px', height:'28px', cursor:'pointer',
    fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'Inter',system-ui,sans-serif", flexShrink:0,
  },
  titleInput: {
    width:'100%', backgroundColor:'var(--bg-elevated)', border:'1px solid var(--border)',
    borderRadius:'8px', color:'var(--text-primary)', fontSize:'0.95rem',
    padding:'10px 12px', fontFamily:"'Inter',system-ui,sans-serif",
    outline:'none', marginBottom:'14px', boxSizing:'border-box',
    transition:'border-color .15s',
  },
  fieldRow: { display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'14px' },
  fieldIcon: { fontSize:'0.9rem', marginTop:'2px', flexShrink:0, width:'20px', textAlign:'center' },
  toggleLabel: { display:'flex', alignItems:'center', gap:'7px', cursor:'pointer', userSelect:'none', flexShrink:0 },
  toggleTrack: { width:'36px', height:'20px', borderRadius:'10px', position:'relative', cursor:'pointer', border:'1px solid var(--border)', transition:'background-color .2s', flexShrink:0 },
  toggleThumb: { position:'absolute', top:'2px', width:'14px', height:'14px', borderRadius:'50%', transition:'left .2s' },
  toggleTxt: { fontSize:'0.78rem', color:'var(--text-muted)', whiteSpace:'nowrap' },
  inlineInput: {
    backgroundColor:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'6px',
    color:'var(--text-primary)', fontSize:'0.8rem', padding:'6px 10px',
    fontFamily:"'Inter',system-ui,sans-serif", outline:'none',
  },
  colorLabel: { margin:'0 0 8px', fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' },
  modalFooter: { display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'6px' },
  cancelBtn: { background:'none', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-muted)', padding:'9px 18px', fontSize:'0.83rem', fontWeight:600, cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif" },
  saveBtn: {
    backgroundColor:'#238636', border:'1px solid #2EA043', borderRadius:'8px',
    color:'#fff', padding:'9px 20px', fontSize:'0.83rem', fontWeight:600,
    cursor:'pointer', fontFamily:"'Inter',system-ui,sans-serif", transition:'opacity .15s',
  },
}
