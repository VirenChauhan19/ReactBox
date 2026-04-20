import { useState, useRef, useEffect } from 'react'

function buildSystemPrompt(assignments, userName) {
  const today = new Date().toISOString().split('T')[0]
  const name  = userName ? `The student's name is ${userName}.` : ''

  const asgnList = assignments.length === 0
    ? 'No assignments loaded yet.'
    : assignments.map((a) =>
        `- [${a.id}] "${a.title}" | Course: ${a.course} | Due: ${a.dueDate} | Weight: ${a.weight}% | Status: ${a.status} | Urgency: ${a.urgency} | Description: ${a.description}${a.notes ? ` | Notes: ${a.notes}` : ''}`
      ).join('\n')

  return `You are a friendly, helpful study assistant embedded in "Study Command Center", an AI-powered academic dashboard.
${name}
Today's date is ${today}.

Here are all the student's current assignments:
${asgnList}

Your job:
- Answer questions about assignments, deadlines, priorities, and study strategies
- Help the student plan their time and understand what to focus on
- Be encouraging and concise — keep responses under 150 words unless a detailed breakdown is asked for
- You can reference specific assignments by name
- If asked something unrelated to studying, gently redirect
- Never make up assignment details that aren't listed above`
}

async function askOpenRouter(systemPrompt, history, newMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: newMessage },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY ?? ''}`,
    },
    body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <>
      <style>{`
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); opacity:.4; }
          40%          { transform: translateY(-5px); opacity:1; }
        }
      `}</style>
      <div style={ts.wrap}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ ...ts.dot, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </>
  )
}
const ts = {
  wrap: { display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' },
  dot: {
    display: 'inline-block',
    width: '7px', height: '7px',
    borderRadius: '50%',
    backgroundColor: '#58A6FF',
    animation: 'dotBounce 1.2s ease-in-out infinite',
  },
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ ...b.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}
         className="animate-slideUp">
      {!isUser && <div style={b.avatar}>AI</div>}
      <div style={{
        ...b.bubble,
        backgroundColor: isUser ? '#1D4ED8' : 'var(--bg-hover)',
        border:          isUser ? '1px solid #2563EB' : '1px solid var(--border)',
        borderRadius:    isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        alignSelf:       isUser ? 'flex-end' : 'flex-start',
      }}>
        <p style={b.text}>{msg.text}</p>
        <span style={b.time}>{msg.time}</span>
      </div>
    </div>
  )
}
const b = {
  row:    { display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px' },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    backgroundColor: '#58A6FF22', border: '1px solid #58A6FF55',
    color: '#58A6FF', fontSize: '0.6rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '82%',
    padding: '10px 13px',
  },
  text: {
    margin: 0,
    fontSize: '0.83rem',
    color: 'var(--text-primary)',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  time: {
    display: 'block',
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    textAlign: 'right',
  },
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's due this week?",
  "What should I focus on today?",
  "Which assignment has the highest weight?",
  "Am I on track to finish everything?",
]

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatBot({ assignments, userName }) {
  const [open,    setOpen]    = useState(false)
  const [input,   setInput]   = useState('')
  const [history, setHistory] = useState([])   // { role, text, time }
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [unread,  setUnread]  = useState(0)

  const bottomRef  = useRef()
  const inputRef   = useRef()
  const systemPrompt = buildSystemPrompt(assignments, userName)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  // Greet on first open
  useEffect(() => {
    if (open && history.length === 0) {
      const greeting = userName
        ? `Hi ${userName.split(' ')[0]}! 👋 I can see all your assignments. Ask me anything — deadlines, priorities, study tips!`
        : `Hi! 👋 I can see all your assignments. Ask me anything — deadlines, priorities, study tips!`
      setHistory([{ role: 'ai', text: greeting, time: now() }])
    }
  }, [open])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    const userMsg = { role: 'user', text: msg, time: now() }
    setHistory((h) => [...h, userMsg])
    setLoading(true)

    try {
      const reply = await askOpenRouter(systemPrompt, history, msg)
      const aiMsg = { role: 'ai', text: reply, time: now() }
      setHistory((h) => [...h, aiMsg])
      if (!open) setUnread((n) => n + 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── Panel ──────────────────────────────────────────────────── */}
      {open && (
        <div style={s.panel} className="chat-open">

          {/* Header */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.headerDot} />
              <div>
                <p style={s.headerTitle}>Study Assistant</p>
                <p style={s.headerSub}>Powered by OpenRouter · {assignments.length} assignments loaded</p>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {history.map((msg, i) => <Bubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px' }}>
                <div style={b.avatar}>AI</div>
                <div style={{ ...b.bubble, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            {error && <p style={s.errorTxt}>⚠ {error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only before any user message) */}
          {history.filter(m => m.role === 'user').length === 0 && (
            <div style={s.suggestions}>
              {SUGGESTIONS.map((q) => (
                <button key={q} style={s.suggestion} onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={s.inputRow}>
            <textarea
              ref={inputRef}
              style={s.textarea}
              placeholder="Ask anything about your assignments…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              style={{
                ...s.sendBtn,
                opacity: (!input.trim() || loading) ? 0.4 : 1,
                cursor:  (!input.trim() || loading) ? 'default' : 'pointer',
              }}
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── FAB button ─────────────────────────────────────────────── */}
      <button
        style={{ ...s.fab, ...(open ? s.fabOpen : {}) }}
        onClick={() => setOpen((v) => !v)}
        title="Study Assistant"
      >
        {open ? '✕' : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <span style={s.unreadBadge}>{unread}</span>
        )}
      </button>
    </>
  )
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const CSS = `
  @keyframes chatOpen {
    from { opacity:0; transform: scale(.95) translateY(16px); }
    to   { opacity:1; transform: scale(1)  translateY(0); }
  }
  .chat-open {
    animation: chatOpen .25s cubic-bezier(.16,1,.3,1) both;
  }
  textarea::-webkit-scrollbar { width: 4px; }
`

const s = {
  panel: {
    position:        'fixed',
    bottom:          '84px',
    right:           '24px',
    width:           '360px',
    height:          '520px',
    backgroundColor: 'var(--bg-surface)',
    border:          '1px solid var(--border)',
    borderRadius:    '16px',
    boxShadow:       '0 24px 60px rgba(0,0,0,.5)',
    display:         'flex',
    flexDirection:   'column',
    zIndex:           200,
    overflow:        'hidden',
    fontFamily:      "'Inter', system-ui, sans-serif",
    transition:      'background-color 0.25s ease, border-color 0.25s ease',
  },
  header: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '14px 16px',
    borderBottom:    '1px solid var(--bg-elevated)',
    flexShrink:       0,
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  headerDot: {
    width:           '32px',
    height:          '32px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF22',
    border:          '1px solid #58A6FF55',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:       0,
    backgroundImage: 'radial-gradient(circle at 30% 30%, #58A6FF44, transparent)',
  },
  headerTitle: {
    margin:     0,
    fontSize:   '0.88rem',
    fontWeight: 700,
    color:      'var(--text-primary)',
  },
  headerSub: {
    margin:   0,
    fontSize: '0.65rem',
    color:    'var(--text-muted)',
  },
  closeBtn: {
    background:   'none',
    border:       '1px solid var(--border)',
    borderRadius: '6px',
    color:        'var(--text-muted)',
    fontSize:     '0.8rem',
    width:        '26px',
    height:       '26px',
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    flexShrink:    0,
    transition:   'color .15s, background-color .15s',
  },
  messages: {
    flex:       1,
    overflowY:  'auto',
    padding:    '14px 14px 0',
  },
  suggestions: {
    padding:    '8px 12px',
    display:    'flex',
    flexWrap:   'wrap',
    gap:        '6px',
    borderTop:  '1px solid var(--bg-elevated)',
    flexShrink:  0,
  },
  suggestion: {
    backgroundColor: 'var(--bg-elevated)',
    border:          '1px solid var(--border)',
    borderRadius:    '99px',
    color:           'var(--text-muted)',
    fontSize:        '0.72rem',
    padding:         '4px 10px',
    cursor:          'pointer',
    fontFamily:      "'Inter', system-ui, sans-serif",
    transition:      'color .15s, border-color .15s, background-color 0.25s ease',
    whiteSpace:      'nowrap',
  },
  inputRow: {
    display:      'flex',
    gap:          '8px',
    padding:      '10px 12px',
    borderTop:    '1px solid var(--bg-elevated)',
    alignItems:   'flex-end',
    flexShrink:    0,
  },
  textarea: {
    flex:            1,
    backgroundColor: 'var(--bg-main)',
    border:          '1px solid var(--border)',
    borderRadius:    '10px',
    color:           'var(--text-primary)',
    fontSize:        '0.83rem',
    padding:         '9px 12px',
    fontFamily:      "'Inter', system-ui, sans-serif",
    resize:          'none',
    outline:         'none',
    lineHeight:      1.5,
    maxHeight:       '100px',
    overflowY:       'auto',
    transition:      'border-color .15s, background-color 0.25s ease',
  },
  sendBtn: {
    backgroundColor: '#58A6FF',
    border:          'none',
    borderRadius:    '10px',
    color:           '#fff',
    fontSize:        '1.1rem',
    fontWeight:      700,
    width:           '36px',
    height:          '36px',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    cursor:          'pointer',
    flexShrink:       0,
    transition:      'opacity .15s, transform .15s',
  },
  errorTxt: {
    fontSize:  '0.75rem',
    color:     '#F85149',
    margin:    '0 0 8px',
    textAlign: 'center',
  },
  fab: {
    position:        'fixed',
    bottom:          '24px',
    right:           '24px',
    width:           '52px',
    height:          '52px',
    borderRadius:    '50%',
    backgroundColor: '#58A6FF',
    border:          'none',
    color:           '#fff',
    fontSize:        '1.2rem',
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       '0 4px 20px rgba(88,166,255,.45)',
    zIndex:           200,
    transition:      'transform .2s, background-color .2s, box-shadow .2s',
    animation:       'glowPulse 3s ease-in-out infinite',
  },
  fabOpen: {
    backgroundColor: 'var(--border)',
    boxShadow:       '0 4px 12px rgba(0,0,0,.4)',
    animation:       'none',
  },
  unreadBadge: {
    position:        'absolute',
    top:             '-4px',
    right:           '-4px',
    backgroundColor: '#F85149',
    color:           '#fff',
    fontSize:        '0.6rem',
    fontWeight:      700,
    borderRadius:    '99px',
    minWidth:        '18px',
    height:          '18px',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '0 4px',
    border:          '2px solid var(--badge-border)',
  },
}
