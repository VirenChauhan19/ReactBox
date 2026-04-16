import { useState, useEffect, useRef } from 'react'

const DAYS        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const MONTHS_S    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const URGENCY_COLOR = { high: '#F85149', medium: '#E3B341', low: '#3FB950' }
const EVENT_COLORS  = ['#58A6FF','#BC8CFF','#F78166','#E3B341','#3FB950','#FF6B9D']
const HOURS         = Array.from({ length: 17 }, (_, i) => i + 7) // 7 AM – 11 PM

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  while (cells.length < 42)
    cells.push({ day: nd++, current: false, dateStr: null })
  return cells
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CalendarView({
  assignments = [],
  selectedAssignment,
  onSelect,
  customEvents = [],
  onAddCustomEvent,
  onDeleteCustomEvent,
}) {
  const today = new Date()
  const todayStr = toDateStr(today)

  const [viewMode,  setViewMode]  = useState('month') // 'month' | 'week' | 'day'
  const [cursor,    setCursor]    = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dayDate,   setDayDate]   = useState(today)
  const [animDir,   setAnimDir]   = useState(null)
  const [animKey,   setAnimKey]   = useState(0)

  // modal
  const [modal,     setModal]     = useState(null) // { dateStr, label, prefillTime? }
  const [mTitle,    setMTitle]    = useState('')
  const [mColor,    setMColor]    = useState(EVENT_COLORS[0])
  const [mTime,     setMTime]     = useState('')
  const [mAllDay,   setMAllDay]   = useState(true)
  const inputRef = useRef(null)

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()

  // index structures
  const byDate = {}
  assignments.forEach(a => {
    if (!byDate[a.dueDate]) byDate[a.dueDate] = []
    byDate[a.dueDate].push(a)
  })
  const custByDate = {}
  customEvents.forEach(e => {
    if (!custByDate[e.date]) custByDate[e.date] = []
    custByDate[e.date].push(e)
  })

  // navigation
  function nav(delta) {
    setAnimDir(delta > 0 ? 'left' : 'right')
    setAnimKey(k => k + 1)
    if (viewMode === 'month') {
      setCursor(new Date(year, month + delta, 1))
    } else if (viewMode === 'week') {
      const d = new Date(cursor)
      d.setDate(d.getDate() + delta * 7)
      setCursor(d)
    } else {
      const d = new Date(dayDate)
      d.setDate(d.getDate() + delta)
      setDayDate(d)
    }
  }

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setDayDate(new Date(today))
  }

  function switchDay(date) {
    setDayDate(date)
    setViewMode('day')
  }

  // modal
  function openModal(dateStr, prefillTime = '') {
    const [y, m, d] = dateStr.split('-')
    const label = `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`
    setMTitle(''); setMColor(EVENT_COLORS[0])
    setMTime(prefillTime)
    setMAllDay(!prefillTime)
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
    })
    closeModal()
  }

  useEffect(() => { if (modal) setTimeout(() => inputRef.current?.focus(), 60) }, [modal])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // view label
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

        {/* ── Top bar ───────────────────────────────────────── */}
        <div style={s.topBar}>
          <div style={s.navGroup}>
            <NavBtn onClick={() => nav(-1)}>←</NavBtn>
            <button style={s.todayBtn} onClick={goToday}>Today</button>
            <NavBtn onClick={() => nav(1)}>→</NavBtn>
          </div>

          <span style={s.navLabel}>{navLabel}</span>

          <div style={s.viewSwitcher}>
            {['month','week','day'].map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  ...s.viewBtn,
                  backgroundColor: viewMode === v ? '#58A6FF' : 'var(--bg-elevated)',
                  color:           viewMode === v ? '#fff'    : 'var(--text-muted)',
                  border:          viewMode === v ? '1px solid #58A6FF' : '1px solid var(--border)',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Views ─────────────────────────────────────────── */}
        <div
          key={`${viewMode}-${animKey}`}
          style={{
            flex: 1,
            animation: animDir === 'left'  ? 'calSlideLeft  .3s cubic-bezier(.16,1,.3,1) both'
                     : animDir === 'right' ? 'calSlideRight .3s cubic-bezier(.16,1,.3,1) both'
                     : 'none',
          }}
        >
          {viewMode === 'month' && (
            <MonthView
              year={year} month={month}
              todayStr={todayStr}
              byDate={byDate} custByDate={custByDate}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={openModal}
              onDeleteCustom={onDeleteCustomEvent}
              onDayClick={switchDay}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              weekDays={getWeekDays(cursor)}
              todayStr={todayStr}
              byDate={byDate} custByDate={custByDate}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={openModal}
              onDeleteCustom={onDeleteCustomEvent}
              onDayClick={switchDay}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              date={dayDate}
              todayStr={todayStr}
              asgns={byDate[toDateStr(dayDate)] ?? []}
              customEvts={custByDate[toDateStr(dayDate)] ?? []}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={(time) => openModal(toDateStr(dayDate), time)}
              onDeleteCustom={onDeleteCustomEvent}
            />
          )}
        </div>
      </div>

      {/* ── Add Event Modal ────────────────────────────────── */}
      {modal && (
        <div style={s.backdrop} onClick={closeModal}>
          <div style={s.modalCard} className="animate-popIn" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalTitle}>Add Event</p>
                <p style={s.modalDate}>{modal.label}</p>
              </div>
              <button style={s.modalClose} onClick={closeModal}>✕</button>
            </div>

            <input
              ref={inputRef}
              style={s.titleInput}
              placeholder="Event title…"
              value={mTitle}
              onChange={e => setMTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveModal()}
              maxLength={60}
            />

            {/* Time toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'7px', cursor:'pointer', userSelect:'none' }}>
                <div
                  onClick={() => setMAllDay(v => !v)}
                  style={{
                    width:'36px', height:'20px', borderRadius:'10px', position:'relative', cursor:'pointer',
                    backgroundColor: mAllDay ? 'var(--bg-elevated)' : '#58A6FF',
                    border: '1px solid var(--border)',
                    transition: 'background-color .2s',
                  }}
                >
                  <div style={{
                    position:'absolute', top:'2px',
                    left: mAllDay ? '2px' : '16px',
                    width:'14px', height:'14px', borderRadius:'50%',
                    backgroundColor: mAllDay ? 'var(--text-muted)' : '#fff',
                    transition: 'left .2s',
                  }}/>
                </div>
                <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                  {mAllDay ? 'All day' : 'Specific time'}
                </span>
              </label>
              {!mAllDay && (
                <input
                  type="time"
                  value={mTime}
                  onChange={e => setMTime(e.target.value)}
                  style={{
                    ...s.titleInput,
                    width:'auto', margin:0, padding:'6px 10px', fontSize:'0.83rem',
                  }}
                />
              )}
            </div>

            <p style={s.colorLabel}>Color</p>
            <div style={s.colorRow}>
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setMColor(c)} style={{
                  ...s.colorSwatch, backgroundColor: c,
                  transform:  mColor === c ? 'scale(1.25)' : 'scale(1)',
                  boxShadow:  mColor === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : 'none',
                }}/>
              ))}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeModal}>Cancel</button>
              <button
                style={{ ...s.saveBtn, opacity: mTitle.trim() ? 1 : 0.45 }}
                onClick={saveModal}
                disabled={!mTitle.trim()}
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ year, month, todayStr, byDate, custByDate, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  const cells = buildMonthCells(year, month)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
      {/* Legend */}
      <div style={s.legend}>
        {Object.entries(URGENCY_COLOR).map(([k,c]) => (
          <span key={k} style={s.legendItem}>
            <span style={{ ...s.legendDot, backgroundColor:c, boxShadow:`0 0 4px ${c}` }}/>
            <span style={s.legendTxt}>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
          </span>
        ))}
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, backgroundColor:'#F8514966', border:'1px solid #F85149' }}/>
          <span style={s.legendTxt}>Overdue</span>
        </span>
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, backgroundColor:'#58A6FF44', border:'1px dashed #58A6FF' }}/>
          <span style={s.legendTxt}>My Event</span>
        </span>
        <span style={{ ...s.legendItem, marginLeft:'auto', fontSize:'0.68rem', color:'var(--text-muted)' }}>
          Click date to add event · Click number to see day
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {DAYS.map(d => <div key={d} style={s.dayLabel}>{d}</div>)}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((cell,i) => (
          <MonthCell
            key={i} cell={cell}
            asgns={cell.dateStr ? (byDate[cell.dateStr]??[]) : []}
            customEvts={cell.dateStr ? (custByDate[cell.dateStr]??[]) : []}
            isToday={cell.dateStr===todayStr}
            isPast={cell.dateStr ? cell.dateStr<todayStr : false}
            selectedAssignment={selectedAssignment}
            onSelect={onSelect}
            onAddClick={() => cell.current && cell.dateStr && onAddClick(cell.dateStr)}
            onDeleteCustom={onDeleteCustom}
            onDayClick={() => { if (cell.current && cell.dateStr) { const [y,m,d]=cell.dateStr.split('-'); onDayClick(new Date(+y,+m-1,+d)) } }}
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
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => cell.current && onAddClick()}
      style={{
        ...s.cell,
        opacity:         cell.current ? 1 : 0.25,
        backgroundColor: isToday    ? 'color-mix(in srgb, #58A6FF 15%, var(--bg-surface))'
                       : hasOverdue  ? 'var(--wrong-bg)'
                       : hov && cell.current ? 'var(--bg-hover)'
                       : 'var(--bg-surface)',
        border: isToday    ? '1px solid #58A6FF'
              : hasOverdue ? '1px solid #F8514944'
              : hov && cell.current ? '1px solid var(--border-strong)'
              : '1px solid var(--bg-elevated)',
        boxShadow: isToday ? '0 0 0 2px #58A6FF33' : 'none',
        cursor: cell.current ? 'pointer' : 'default',
        transition: 'background-color .15s, border-color .15s',
        position: 'relative',
      }}
    >
      <span
        onClick={e => { e.stopPropagation(); onDayClick() }}
        style={{
          ...s.dayNum,
          color:      isToday ? '#58A6FF' : hasOverdue ? '#F85149' : cell.current ? 'var(--text-primary)' : 'var(--border-strong)',
          fontWeight: isToday || hasOverdue ? 700 : 400,
          cursor: cell.current ? 'pointer' : 'default',
          borderRadius: '50%',
          padding: '0 2px',
          transition: 'background-color .12s',
        }}
        title={cell.current ? 'View day' : undefined}
      >
        {cell.day}
        {hasOverdue && <span style={s.warnDot} title="Overdue">●</span>}
      </span>

      {hov && cell.current && !hasContent && (
        <div style={s.addHint}>+</div>
      )}

      <div style={s.chips}>
        {asgns.slice(0,2).map(a => {
          const c = URGENCY_COLOR[a.urgency] ?? '#8B949E'
          const isSel = a.id === selectedAssignment
          return (
            <div key={a.id} title={`${a.title} — Due: End of day`}
              onClick={e => { e.stopPropagation(); onSelect(a.id) }}
              style={{
                ...s.chip,
                backgroundColor: a.status==='completed' ? 'var(--bg-elevated)' : c+'22',
                color:           a.status==='completed' ? 'var(--text-muted)' : c,
                border:          isSel ? `1px solid ${c}` : `1px solid ${c}44`,
                boxShadow:       isSel ? `0 0 6px ${c}66` : 'none',
                textDecoration:  a.status==='completed' ? 'line-through' : 'none',
                opacity:         a.status==='completed' ? 0.5 : 1,
                transform:       isSel ? 'scale(1.03)' : 'none',
                transition:      'transform .15s, box-shadow .15s',
              }}
            >
              {a.title.length>13 ? a.title.slice(0,12)+'…' : a.title}
            </div>
          )
        })}
        {customEvts.slice(0,2).map(ev => (
          <div key={ev.id} title={ev.time ? `${ev.title} at ${formatTime(ev.time)}` : ev.title}
            onMouseEnter={e => { e.stopPropagation(); setHovCE(ev.id) }}
            onMouseLeave={() => setHovCE(null)}
            onClick={e => e.stopPropagation()}
            style={{
              ...s.chip, ...s.customChip,
              backgroundColor: ev.color+'20', color: ev.color,
              border: `1px dashed ${ev.color}88`,
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2px',
            }}
          >
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {ev.time ? `${formatTime(ev.time)} ` : ''}✦ {ev.title.length>9 ? ev.title.slice(0,8)+'…' : ev.title}
            </span>
            {hovCE===ev.id && (
              <span onClick={e => { e.stopPropagation(); onDeleteCustom?.(ev.id) }} style={s.deleteX} title="Remove">×</span>
            )}
          </div>
        ))}
        {(asgns.length>2 || customEvts.length>2) && (
          <span style={s.more}>+{Math.max(0,asgns.length-2)+Math.max(0,customEvts.length-2)} more</span>
        )}
      </div>
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekDays, todayStr, byDate, custByDate, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      <div style={s.legend}>
        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
          Click a day column to add an event · Click the date number to view that day
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'6px' }}>
        {weekDays.map((date, i) => {
          const ds       = toDateStr(date)
          const isToday  = ds === todayStr
          const asgns    = byDate[ds] ?? []
          const customEvts = custByDate[ds] ?? []
          const isPast   = ds < todayStr
          const hasOverdue = isPast && asgns.some(a => a.status !== 'completed')

          return (
            <WeekDayCol
              key={i}
              date={date} dateStr={ds}
              isToday={isToday} hasOverdue={hasOverdue}
              asgns={asgns} customEvts={customEvts}
              selectedAssignment={selectedAssignment}
              onSelect={onSelect}
              onAddClick={() => onAddClick(ds)}
              onDeleteCustom={onDeleteCustom}
              onDayClick={() => onDayClick(date)}
            />
          )
        })}
      </div>
    </div>
  )
}

function WeekDayCol({ date, dateStr, isToday, hasOverdue, asgns, customEvts, selectedAssignment, onSelect, onAddClick, onDeleteCustom, onDayClick }) {
  const [hov, setHov] = useState(false)
  const [hovCE, setHovCE] = useState(null)
  const hasContent = asgns.length > 0 || customEvts.length > 0

  // separate timed vs all-day custom events
  const timedEvts   = customEvts.filter(e => e.time)
  const allDayEvts  = customEvts.filter(e => !e.time)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !hov || onAddClick()}
      style={{
        borderRadius:'10px',
        backgroundColor: isToday    ? 'color-mix(in srgb, #58A6FF 12%, var(--bg-surface))'
                       : hasOverdue  ? 'var(--wrong-bg)'
                       : hov         ? 'var(--bg-hover)'
                       : 'var(--bg-surface)',
        border: isToday    ? '1px solid #58A6FF'
              : hasOverdue ? '1px solid #F8514944'
              : hov         ? '1px solid var(--border-strong)'
              : '1px solid var(--bg-elevated)',
        boxShadow: isToday ? '0 0 0 2px #58A6FF22' : 'none',
        padding:'8px 6px',
        cursor:'pointer',
        transition:'background-color .15s, border-color .15s',
        minHeight:'120px',
        display:'flex', flexDirection:'column', gap:'5px',
      }}
    >
      {/* Day header */}
      <div style={{ textAlign:'center', marginBottom:'4px' }}>
        <div style={{ fontSize:'0.6rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {DAYS[date.getDay()]}
        </div>
        <div
          onClick={e => { e.stopPropagation(); onDayClick() }}
          style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'26px', height:'26px', borderRadius:'50%', margin:'2px auto 0',
            backgroundColor: isToday ? '#58A6FF' : 'transparent',
            color: isToday ? '#fff' : hasOverdue ? '#F85149' : 'var(--text-primary)',
            fontWeight: isToday ? 700 : 400,
            fontSize:'0.85rem',
            cursor:'pointer',
            transition:'background-color .15s',
          }}
          title="View day"
        >
          {date.getDate()}
        </div>
      </div>

      {/* Assignment chips */}
      {asgns.map(a => {
        const c = URGENCY_COLOR[a.urgency] ?? '#8B949E'
        const isSel = a.id === selectedAssignment
        return (
          <div key={a.id}
            title={`${a.title} — Due: End of day`}
            onClick={e => { e.stopPropagation(); onSelect(a.id) }}
            style={{
              fontSize:'0.6rem', fontWeight:500, padding:'3px 6px', borderRadius:'4px',
              backgroundColor: a.status==='completed' ? 'var(--bg-elevated)' : c+'22',
              color:           a.status==='completed' ? 'var(--text-muted)' : c,
              border:          isSel ? `1px solid ${c}` : `1px solid ${c}44`,
              textDecoration:  a.status==='completed' ? 'line-through' : 'none',
              opacity:         a.status==='completed' ? 0.55 : 1,
              cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              transition:'box-shadow .15s',
            }}
          >
            <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</div>
            <div style={{ fontSize:'0.55rem', opacity:0.8 }}>
              {a.course} · End of day
            </div>
          </div>
        )
      })}

      {/* All-day custom events */}
      {allDayEvts.map(ev => (
        <CustomChip key={ev.id} ev={ev} onDelete={onDeleteCustom}
          hovCE={hovCE} setHovCE={setHovCE} />
      ))}

      {/* Timed custom events */}
      {timedEvts.sort((a,b) => a.time.localeCompare(b.time)).map(ev => (
        <CustomChip key={ev.id} ev={ev} onDelete={onDeleteCustom}
          hovCE={hovCE} setHovCE={setHovCE} showTime />
      ))}

      {!hasContent && hov && (
        <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'1rem', opacity:0.4, marginTop:'auto' }}>+</div>
      )}
    </div>
  )
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ date, todayStr, asgns, customEvts, selectedAssignment, onSelect, onAddClick, onDeleteCustom }) {
  const ds       = toDateStr(date)
  const isToday  = ds === todayStr
  const allDayEvts = customEvts.filter(e => !e.time)
  const timedEvts  = customEvts.filter(e => e.time)
  const [hovCE, setHovCE] = useState(null)
  const [hovSlot, setHovSlot] = useState(null)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
      {/* Day header */}
      <div style={{
        padding:'10px 16px 12px',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:'12px',
      }}>
        <div style={{
          width:'48px', height:'48px', borderRadius:'50%',
          backgroundColor: isToday ? '#58A6FF' : 'var(--bg-elevated)',
          border: isToday ? '2px solid #58A6FF' : '2px solid var(--border)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          <span style={{ fontSize:'1.2rem', fontWeight:800, color: isToday ? '#fff' : 'var(--text-primary)', lineHeight:1 }}>
            {date.getDate()}
          </span>
          <span style={{ fontSize:'0.5rem', fontWeight:700, color: isToday ? '#ffffffcc' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {DAYS[date.getDay()]}
          </span>
        </div>
        <div>
          <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>
            {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
          </div>
          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
            {asgns.length} assignment{asgns.length!==1?'s':''} due · {customEvts.length} personal event{customEvts.length!==1?'s':''}
          </div>
        </div>
      </div>

      {/* All day section */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', minHeight:'42px' }}>
        <span style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0 }}>All day</span>
        {asgns.map(a => {
          const c = URGENCY_COLOR[a.urgency] ?? '#8B949E'
          const isSel = a.id === selectedAssignment
          return (
            <div key={a.id}
              onClick={() => onSelect(a.id)}
              style={{
                fontSize:'0.75rem', fontWeight:600, padding:'4px 10px', borderRadius:'6px',
                backgroundColor: a.status==='completed' ? 'var(--bg-elevated)' : c+'22',
                color:           a.status==='completed' ? 'var(--text-muted)' : c,
                border:          isSel ? `1px solid ${c}` : `1px solid ${c}44`,
                cursor:'pointer',
                textDecoration:  a.status==='completed' ? 'line-through' : 'none',
              }}
            >
              {a.course}: {a.title}
              <span style={{ fontSize:'0.65rem', opacity:0.75, marginLeft:'6px' }}>Due by 11:59 PM</span>
            </div>
          )
        })}
        {allDayEvts.map(ev => (
          <CustomChip key={ev.id} ev={ev} onDelete={onDeleteCustom}
            hovCE={hovCE} setHovCE={setHovCE} large />
        ))}
        {asgns.length===0 && allDayEvts.length===0 && (
          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontStyle:'italic' }}>No all-day events</span>
        )}
      </div>

      {/* Time grid */}
      <div style={{ overflowY:'auto', flex:1 }}>
        {HOURS.map(h => {
          const timeStr = `${String(h).padStart(2,'0')}:00`
          const slotEvts = timedEvts.filter(e => e.time && parseInt(e.time.split(':')[0],10) === h)
          const isHovSlot = hovSlot === h

          return (
            <div
              key={h}
              onMouseEnter={() => setHovSlot(h)}
              onMouseLeave={() => setHovSlot(null)}
              onClick={() => { if (slotEvts.length===0) onAddClick(timeStr) }}
              style={{
                display:'grid', gridTemplateColumns:'64px 1fr',
                borderBottom:'1px solid var(--bg-elevated)',
                minHeight:'52px',
                backgroundColor: isHovSlot && slotEvts.length===0 ? 'var(--bg-hover)' : 'transparent',
                cursor: slotEvts.length===0 ? 'pointer' : 'default',
                transition:'background-color .12s',
              }}
            >
              <div style={{
                padding:'6px 10px 0',
                fontSize:'0.65rem', fontWeight:500, color:'var(--text-muted)',
                borderRight:'1px solid var(--bg-elevated)',
                textAlign:'right', flexShrink:0,
              }}>
                {formatHour(h)}
              </div>
              <div style={{ padding:'4px 10px', display:'flex', flexWrap:'wrap', gap:'5px', alignItems:'flex-start' }}>
                {slotEvts.map(ev => (
                  <CustomChip key={ev.id} ev={ev} onDelete={onDeleteCustom}
                    hovCE={hovCE} setHovCE={setHovCE} showTime large />
                ))}
                {isHovSlot && slotEvts.length===0 && (
                  <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', opacity:0.6 }}>+ Add event</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared custom event chip ──────────────────────────────────────────────────
function CustomChip({ ev, onDelete, hovCE, setHovCE, showTime = false, large = false }) {
  return (
    <div
      onMouseEnter={() => setHovCE(ev.id)}
      onMouseLeave={() => setHovCE(null)}
      onClick={e => e.stopPropagation()}
      title={ev.time ? `${ev.title} at ${formatTime(ev.time)}` : ev.title}
      style={{
        display:'inline-flex', alignItems:'center', gap:'4px',
        fontSize: large ? '0.75rem' : '0.6rem',
        fontWeight:500, padding: large ? '4px 8px' : '2px 5px',
        borderRadius:'4px', fontStyle:'italic',
        backgroundColor: ev.color+'20', color:ev.color,
        border:`1px dashed ${ev.color}88`,
        cursor:'default', whiteSpace:'nowrap',
      }}
    >
      {showTime && ev.time && (
        <span style={{ fontStyle:'normal', fontSize: large ? '0.7rem' : '0.55rem', opacity:0.85 }}>
          {formatTime(ev.time)}
        </span>
      )}
      <span>✦ {ev.title.length>(large?28:10) ? ev.title.slice(0,large?27:9)+'…' : ev.title}</span>
      {hovCE===ev.id && (
        <span
          onClick={e => { e.stopPropagation(); onDelete?.(ev.id) }}
          style={{ fontStyle:'normal', fontSize: large ? '0.85rem' : '0.75rem', fontWeight:700, cursor:'pointer', opacity:0.8 }}
          title="Remove"
        >×</span>
      )}
    </div>
  )
}

function NavBtn({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...s.navBtn,
        backgroundColor: hov ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        transform:       hov ? 'scale(1.08)' : 'scale(1)',
        boxShadow:       hov ? '0 0 12px rgba(88,166,255,.2)' : 'none',
      }}
    >{children}</button>
  )
}

const CSS = `
  @keyframes calSlideLeft  { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
  @keyframes calSlideRight { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:translateX(0); } }
`

const s = {
  wrap: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    padding: '16px 18px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'background-color 0.25s ease',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  navBtn: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    padding: '6px 16px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color .15s, transform .15s, box-shadow .15s',
  },
  todayBtn: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-muted)',
    padding: '6px 14px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color .15s',
  },
  navLabel: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  viewSwitcher: {
    display: 'flex',
    gap: '4px',
  },
  viewBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color .15s, color .15s',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '2px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendTxt: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  dayLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
    padding: '4px 0',
  },
  cell: {
    borderRadius: '8px',
    padding: '6px 6px 8px',
    minHeight: '80px',
  },
  dayNum: {
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    marginBottom: '5px',
  },
  warnDot: {
    fontSize: '0.4rem',
    color: '#F85149',
    lineHeight: 1,
  },
  addHint: {
    position: 'absolute',
    bottom: '6px', right: '7px',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    opacity: 0.5,
    lineHeight: 1,
    pointerEvents: 'none',
  },
  chips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  chip: {
    fontSize: '0.6rem',
    fontWeight: 500,
    padding: '2px 5px',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  customChip: {
    borderRadius: '4px',
    fontStyle: 'italic',
    cursor: 'default',
  },
  deleteX: {
    fontStyle: 'normal',
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    opacity: 0.8,
  },
  more: {
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    paddingLeft: '3px',
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  backdrop: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 700, padding: '24px',
  },
  modalCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px', padding: '24px',
    width: '100%', maxWidth: '400px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px',
  },
  modalTitle: {
    margin: '0 0 2px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)',
  },
  modalDate: {
    margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)',
  },
  modalClose: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
    color: 'var(--text-muted)', width: '28px', height: '28px',
    cursor: 'pointer', fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0,
  },
  titleInput: {
    width: '100%', backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    padding: '10px 12px',
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none', marginBottom: '16px',
    boxSizing: 'border-box', transition: 'border-color .15s',
  },
  colorLabel: {
    margin: '0 0 8px', fontSize: '0.68rem', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  colorRow: {
    display: 'flex', gap: '10px', marginBottom: '22px',
  },
  colorSwatch: {
    width: '24px', height: '24px', borderRadius: '50%',
    border: 'none', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
  },
  modalFooter: {
    display: 'flex', gap: '10px', justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text-muted)', padding: '8px 16px', fontSize: '0.83rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
  },
  saveBtn: {
    backgroundColor: '#238636', border: '1px solid #2EA043', borderRadius: '8px',
    color: '#fff', padding: '8px 18px', fontSize: '0.83rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'opacity .15s',
  },
}
