import { useState, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

async function callOpenRouter(system, userContent) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text
}

// ── Quiz component ────────────────────────────────────────────────────────────
function QuizView({ questions }) {
  const [answers, setAnswers] = useState({})
  const answered = Object.keys(answers).length
  const score = Object.entries(answers).filter(([qi, ci]) => questions[+qi]?.correct === ci).length
  const allDone = answered === questions.length

  function pick(qi, ci) {
    if (answers[qi] !== undefined) return
    setAnswers((p) => ({ ...p, [qi]: ci }))
  }

  return (
    <div style={qs.wrap}>
      {questions.map((q, qi) => {
        const sel = answers[qi]
        return (
          <div key={qi} style={{ ...qs.question, animationDelay: `${qi * 70}ms` }} className="chapter-slide-up">
            <p style={qs.qText}>
              <span style={qs.qNum}>{qi + 1}</span>
              {q.question}
            </p>
            <div style={qs.choices}>
              {q.choices.map((choice, ci) => {
                const isCorrect = ci === q.correct
                const isSelected = ci === sel
                const revealed = sel !== undefined
                let bg = 'var(--bg-main)', border = 'var(--border)', color = 'var(--text-body)', icon = ''
                if (revealed) {
                  if (isCorrect) { bg = 'var(--correct-bg)'; border = '#3FB950'; color = '#3FB950'; icon = '✓ ' }
                  else if (isSelected) { bg = 'var(--wrong-bg)'; border = '#F85149'; color = '#F85149'; icon = '✗ ' }
                }
                return (
                  <button
                    key={ci}
                    className={!revealed ? 'ch-choice-btn' : ''}
                    style={{ ...qs.choice, backgroundColor: bg, border: `1px solid ${border}`, color, cursor: revealed ? 'default' : 'pointer' }}
                    onClick={() => pick(qi, ci)}
                  >
                    <span style={qs.letter}>{String.fromCharCode(65 + ci)}.</span>
                    {icon}{choice}
                  </button>
                )
              })}
            </div>
            {sel !== undefined && (
              <p style={{ ...qs.feedback, color: sel === q.correct ? '#3FB950' : '#F85149' }}>
                {sel === q.correct ? '✓ Correct!' : `✗ Answer: ${String.fromCharCode(65 + q.correct)}`}
              </p>
            )}
          </div>
        )
      })}
      {allDone && (
        <div style={qs.scoreCard} className="chapter-pop-in">
          <div style={qs.scoreEmoji}>{score === questions.length ? '🏆' : score >= questions.length * 0.6 ? '🎉' : '📚'}</div>
          <p style={qs.scoreNum}>
            <span style={{ color: score === questions.length ? '#3FB950' : score >= questions.length * 0.6 ? '#E3B341' : '#F85149' }}>
              {score}
            </span>/{questions.length}
          </p>
          <p style={qs.scoreLabel}>
            {score === questions.length ? 'Perfect score!' : score >= questions.length * 0.6 ? 'Good work!' : 'Keep studying!'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Chapter detail panel ──────────────────────────────────────────────────────
function ChapterDetail({ chapter, onNotesGenerated, onQuizGenerated }) {
  const [notesLoading, setNotesLoading] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [notesError, setNotesError] = useState('')
  const [quizError, setQuizError] = useState('')
  const [activeTab, setActiveTab] = useState('notes')
  const [notesHov, setNotesHov] = useState(false)
  const [quizHov, setQuizHov] = useState(false)

  if (!chapter) {
    return (
      <div style={d.empty}>
        <div style={d.emptyIconWrap} className="chapter-float">
          <span style={d.emptyIcon}>📖</span>
        </div>
        <p style={d.emptyTitle}>Select a chapter</p>
        <p style={d.emptySub}>Upload class notes or chapter PDFs to get started</p>
      </div>
    )
  }

  async function handleGenerateNotes() {
    setNotesLoading(true); setNotesError('')
    try {
      const result = await callOpenRouter(
        'You are an expert academic note-taker. Generate comprehensive, well-structured study notes from the provided text. Use ## headers, bullet points (•), bold key terms, and clear sections. Make the notes concise yet thorough. Return plain text — no JSON.',
        `Chapter/Class: ${chapter.name}\nCourse: ${chapter.course || 'General'}\n\nContent:\n${chapter.text.slice(0, 12000)}`
      )
      onNotesGenerated(chapter.id, result)
      setActiveTab('notes')
    } catch (err) { setNotesError(err.message) }
    finally { setNotesLoading(false) }
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true); setQuizError('')
    try {
      const raw = await callOpenRouter(
        `You are a study assistant. Generate exactly 6 multiple-choice questions based on the provided text.
Return ONLY a valid JSON array, no markdown, no explanation:
[{"question":"...","choices":["A text","B text","C text","D text"],"correct":0}]
"correct" is the zero-based index of the right answer.`,
        `Chapter/Class: ${chapter.name}\nCourse: ${chapter.course || 'General'}\n\nContent:\n${chapter.text.slice(0, 12000)}`
      )
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(clean)
      if (!Array.isArray(parsed)) throw new Error('Response was not a JSON array')
      onQuizGenerated(chapter.id, parsed)
      setActiveTab('quiz')
    } catch (err) { setQuizError(err.message) }
    finally { setQuizLoading(false) }
  }

  const previewText = chapter.text.slice(0, 280).trim()

  return (
    <div key={chapter.id} style={d.panel} className="chapter-fade-in">
      <style>{CSS}</style>

      {/* Header */}
      <div style={d.header}>
        <div>
          {chapter.course && <p style={d.courseLabel}>{chapter.course}</p>}
          <h2 style={d.chapterTitle}>{chapter.name}</h2>
          <p style={d.fileName}>{chapter.fileName}</p>
        </div>
        <div style={d.headerBadge}>
          <span style={d.pagesBadge}>{chapter.pages} {chapter.pages === 1 ? 'page' : 'pages'}</span>
        </div>
      </div>

      {/* Text preview */}
      {previewText && (
        <div style={d.preview}>
          <p style={d.previewLabel}>Preview</p>
          <p style={d.previewText}>{previewText}…</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={d.actions}>
        <button
          style={{
            ...d.actionBtn,
            borderColor: notesHov ? '#58A6FF' : '#58A6FF55',
            boxShadow: notesHov ? '0 0 20px #58A6FF33, 0 4px 12px rgba(0,0,0,.3)' : '0 2px 8px rgba(0,0,0,.2)',
            transform: notesHov ? 'translateY(-3px) scale(1.02)' : 'none',
            opacity: notesLoading || quizLoading ? 0.55 : 1,
          }}
          onClick={handleGenerateNotes}
          disabled={notesLoading || quizLoading}
          onMouseEnter={() => setNotesHov(true)}
          onMouseLeave={() => setNotesHov(false)}
        >
          <span style={d.btnGlow} className={notesLoading ? '' : 'btn-glow-blue'} />
          {notesLoading
            ? <><span style={{ ...d.spinner, borderTopColor: '#58A6FF' }} /> Generating…</>
            : <><span style={d.btnIcon}>📝</span> Generate Notes</>
          }
        </button>

        <button
          style={{
            ...d.actionBtn,
            borderColor: quizHov ? '#BC8CFF' : '#BC8CFF55',
            boxShadow: quizHov ? '0 0 20px #BC8CFF33, 0 4px 12px rgba(0,0,0,.3)' : '0 2px 8px rgba(0,0,0,.2)',
            transform: quizHov ? 'translateY(-3px) scale(1.02)' : 'none',
            opacity: notesLoading || quizLoading ? 0.55 : 1,
          }}
          onClick={handleGenerateQuiz}
          disabled={notesLoading || quizLoading}
          onMouseEnter={() => setQuizHov(true)}
          onMouseLeave={() => setQuizHov(false)}
        >
          <span style={d.btnGlow} className={quizLoading ? '' : 'btn-glow-purple'} />
          {quizLoading
            ? <><span style={{ ...d.spinner, borderTopColor: '#BC8CFF' }} /> Generating…</>
            : <><span style={d.btnIcon}>🎯</span> Generate Quiz</>
          }
        </button>
      </div>

      {notesError && <div style={d.errorBox} className="chapter-slide-down">⚠ {notesError}</div>}
      {quizError && <div style={d.errorBox} className="chapter-slide-down">⚠ {quizError}</div>}

      {/* Tabs */}
      {(chapter.notes || (chapter.quiz && chapter.quiz.length > 0)) && (
        <div style={d.tabBar}>
          {chapter.notes && (
            <button
              style={{ ...d.tabBtn, color: activeTab === 'notes' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'notes' ? '2px solid #58A6FF' : '2px solid transparent', backgroundColor: activeTab === 'notes' ? 'var(--bg-elevated)' : 'transparent' }}
              onClick={() => setActiveTab('notes')}
            >📝 Notes</button>
          )}
          {chapter.quiz && chapter.quiz.length > 0 && (
            <button
              style={{ ...d.tabBtn, color: activeTab === 'quiz' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'quiz' ? '2px solid #BC8CFF' : '2px solid transparent', backgroundColor: activeTab === 'quiz' ? 'var(--bg-elevated)' : 'transparent' }}
              onClick={() => setActiveTab('quiz')}
            >🎯 Quiz</button>
          )}
        </div>
      )}

      {activeTab === 'notes' && chapter.notes && (
        <div key="notes" style={d.notesBlock} className="chapter-fade-in">
          {chapter.notes}
        </div>
      )}
      {activeTab === 'quiz' && chapter.quiz && chapter.quiz.length > 0 && (
        <div key="quiz" className="chapter-slide-up">
          <QuizView questions={chapter.quiz} />
        </div>
      )}
    </div>
  )
}

// ── Chapter card (sidebar) ────────────────────────────────────────────────────
function ChapterCard({ chapter, index, selected, onSelect, onDelete }) {
  const [hov, setHov] = useState(false)
  const [delHov, setDelHov] = useState(false)

  const hasNotes = !!chapter.notes
  const hasQuiz = chapter.quiz && chapter.quiz.length > 0

  return (
    <div
      className="chapter-card-enter"
      style={{ '--ci': index }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div
        style={{
          ...cc.card,
          outline: selected ? '2px solid #58A6FF' : '2px solid transparent',
          boxShadow: selected
            ? '0 0 0 2px #58A6FF44, 0 8px 24px #58A6FF22'
            : hov ? '0 6px 24px rgba(0,0,0,.45)' : 'none',
          transform: hov && !selected ? 'translateY(-2px)' : 'none',
        }}
        onClick={() => onSelect(chapter.id)}
      >
        <div style={{ ...cc.accentBar, backgroundColor: selected ? '#58A6FF' : '#BC8CFF', opacity: selected || hov ? 1 : 0.4 }} />
        <div style={cc.inner}>
          <div style={cc.top}>
            <span style={cc.courseTag}>{chapter.course || '—'}</span>
            <div style={cc.badges}>
              {hasNotes && <span style={cc.badge} title="Notes generated">📝</span>}
              {hasQuiz && <span style={cc.badge} title="Quiz available">🎯</span>}
            </div>
          </div>
          <p style={{ ...cc.name, color: selected ? 'var(--text-primary)' : hov ? 'var(--text-body)' : 'var(--text-muted)' }}>{chapter.name}</p>
          <div style={cc.bottom}>
            <span style={cc.meta}>{chapter.pages}p · {chapter.fileName.slice(0, 18)}{chapter.fileName.length > 18 ? '…' : ''}</span>
          </div>
        </div>
        <button
          style={{
            ...cc.deleteBtn,
            opacity: hov ? 1 : 0,
            backgroundColor: delHov ? '#F8514933' : 'transparent',
            color: delHov ? '#F85149' : '#8B949E',
          }}
          onClick={(e) => { e.stopPropagation(); onDelete(chapter.id) }}
          onMouseEnter={() => setDelHov(true)}
          onMouseLeave={() => setDelHov(false)}
          title="Remove chapter"
        >✕</button>
      </div>
    </div>
  )
}

// ── Upload dropzone ───────────────────────────────────────────────────────────
function UploadZone({ onChaptersAdded }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [formData, setFormData] = useState([]) // [{name, course}]
  const inputRef = useRef()

  function handleDragOver(e) { e.preventDefault(); setDragging(true) }
  function handleDragLeave() { setDragging(false) }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (files.length) openForm(files)
  }

  function handleFileInput(e) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type === 'application/pdf')
    if (files.length) openForm(files)
    e.target.value = ''
  }

  function openForm(files) {
    setPendingFiles(files)
    setFormData(files.map(f => ({
      name: f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      course: '',
    })))
    setShowForm(true)
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const results = []
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i]
        const text = await extractPdfText(file)
        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        results.push({
          id: `ch-${Date.now()}-${i}`,
          name: formData[i].name || file.name.replace(/\.pdf$/i, ''),
          course: formData[i].course,
          fileName: file.name,
          text,
          pages: pdf.numPages,
          notes: '',
          quiz: [],
          addedAt: new Date().toISOString(),
        })
      }
      onChaptersAdded(results)
      setShowForm(false)
      setPendingFiles([])
    } finally {
      setLoading(false)
    }
  }

  if (showForm) {
    return (
      <div style={uz.formWrap} className="chapter-pop-in">
        <p style={uz.formTitle}>Name your uploads</p>
        {pendingFiles.map((file, i) => (
          <div key={i} style={uz.formRow}>
            <p style={uz.fileLabel}>{file.name}</p>
            <input
              style={uz.input}
              placeholder="Chapter / Class name"
              value={formData[i]?.name ?? ''}
              onChange={e => setFormData(fd => fd.map((d, j) => j === i ? { ...d, name: e.target.value } : d))}
            />
            <input
              style={uz.input}
              placeholder="Course (optional)"
              value={formData[i]?.course ?? ''}
              onChange={e => setFormData(fd => fd.map((d, j) => j === i ? { ...d, course: e.target.value } : d))}
            />
          </div>
        ))}
        <div style={uz.formBtns}>
          <button style={uz.cancelBtn} onClick={() => setShowForm(false)} disabled={loading}>Cancel</button>
          <button style={uz.confirmBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? <><span style={uz.spinner} /> Processing…</> : 'Add Chapters'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        ...uz.zone,
        borderColor: dragging ? '#58A6FF' : '#30363D',
        backgroundColor: dragging ? '#58A6FF11' : '#0D1117',
        transform: dragging ? 'scale(1.01)' : 'scale(1)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={handleFileInput} />
      <div style={uz.inner}>
        <div style={{ ...uz.iconWrap, borderColor: dragging ? '#58A6FF' : '#30363D' }} className="chapter-float">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#58A6FF' : '#8B949E'} strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ ...uz.label, color: dragging ? '#58A6FF' : '#C9D1D9' }}>
          {dragging ? 'Drop PDFs here' : 'Upload chapter notes'}
        </p>
        <p style={uz.sub}>Click or drag & drop · PDF only</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChapterNotes() {
  const [chapters, setChapters] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const selected = chapters.find(c => c.id === selectedId) ?? null

  function handleChaptersAdded(newChapters) {
    setChapters(prev => [...prev, ...newChapters])
    if (newChapters.length) setSelectedId(newChapters[0].id)
  }

  function handleDelete(id) {
    setChapters(prev => prev.filter(c => c.id !== id))
    if (selectedId === id) setSelectedId(chapters.find(c => c.id !== id)?.id ?? null)
  }

  function handleNotesGenerated(id, notes) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, notes } : c))
  }

  function handleQuizGenerated(id, quiz) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, quiz } : c))
  }

  return (
    <div style={m.root} className="glass-panel">
      <style>{CSS}</style>

      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <div style={m.sidebar}>
        <div style={m.sideHeader}>
          <p style={m.sideLabel}>Chapters</p>
          <span style={m.countBadge}>{chapters.length}</span>
        </div>

        <UploadZone onChaptersAdded={handleChaptersAdded} />

        {chapters.length === 0 && (
          <div style={m.noChapters} className="chapter-fade-in">
            <p style={m.noChaptersText}>No chapters yet</p>
            <p style={m.noChaptersSub}>Upload a PDF to begin</p>
          </div>
        )}

        <div style={m.chapterList}>
          {chapters.map((ch, i) => (
            <ChapterCard
              key={ch.id}
              chapter={ch}
              index={i}
              selected={ch.id === selectedId}
              onSelect={setSelectedId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────── */}
      <div style={m.detail}>
        <ChapterDetail
          chapter={selected}
          onNotesGenerated={handleNotesGenerated}
          onQuizGenerated={handleQuizGenerated}
        />
      </div>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes chapterFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chapterSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chapterSlideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chapterPopIn {
    0%   { opacity: 0; transform: scale(0.92); }
    70%  { transform: scale(1.03); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes chapterCardEnter {
    from { opacity: 0; transform: translateX(-14px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes chapterFloat {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes btnGlowBlue {
    0%, 100% { opacity: 0; }
    50%      { opacity: 1; }
  }
  @keyframes btnGlowPurple {
    0%, 100% { opacity: 0; }
    50%      { opacity: 1; }
  }

  .chapter-fade-in    { animation: chapterFadeIn .3s ease both; }
  .chapter-slide-up   { animation: chapterSlideUp .35s ease both; }
  .chapter-slide-down { animation: chapterSlideDown .25s ease both; }
  .chapter-pop-in     { animation: chapterPopIn .35s cubic-bezier(.16,1,.3,1) both; }
  .chapter-float      { animation: chapterFloat 3s ease-in-out infinite; }

  .chapter-card-enter {
    animation: chapterCardEnter .3s ease both;
    animation-delay: calc(var(--ci) * 50ms);
    opacity: 0;
    animation-fill-mode: both;
  }

  .btn-glow-blue {
    position: absolute; inset: 0; border-radius: 8px;
    background: radial-gradient(ellipse at 50% 100%, #58A6FF44 0%, transparent 70%);
    animation: btnGlowBlue 2.5s ease-in-out infinite;
    pointer-events: none;
  }
  .btn-glow-purple {
    position: absolute; inset: 0; border-radius: 8px;
    background: radial-gradient(ellipse at 50% 100%, #BC8CFF44 0%, transparent 70%);
    animation: btnGlowPurple 2.5s ease-in-out infinite;
    pointer-events: none;
  }

  .ch-choice-btn:hover {
    background-color: var(--bg-hover) !important;
    border-color: var(--border-strong) !important;
    transform: translateX(4px);
    transition: all .15s ease;
  }
`

// ── Styles ────────────────────────────────────────────────────────────────────
const m = {
  root: {
    display: 'flex',
    flex: 1,
    backgroundColor: 'var(--bg-main)',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
    minHeight: 0,
    transition: 'background-color 0.25s ease',
  },
  sidebar: {
    width: '300px',
    flexShrink: 0,
    borderRight: '1px solid var(--bg-elevated)',
    backgroundColor: 'var(--bg-main)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '18px 14px',
    overflowY: 'auto',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  sideHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  sideLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: 0,
  },
  countBadge: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '99px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    padding: '1px 8px',
  },
  chapterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  noChapters: {
    textAlign: 'center',
    paddingTop: '8px',
  },
  noChaptersText: {
    margin: '0 0 4px',
    fontSize: '0.83rem',
    color: 'var(--text-muted)',
  },
  noChaptersSub: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--border-strong)',
  },
  detail: {
    flex: 1,
    overflowY: 'auto',
    minWidth: 0,
  },
}

const d = {
  panel: {
    padding: '28px 28px 40px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text-primary)',
    minHeight: '100%',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '70vh',
    gap: '14px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  emptyIconWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: { fontSize: '2.2rem' },
  emptyTitle: { margin: '0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-body)' },
  emptySub:   { margin: '0', fontSize: '0.83rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  courseLabel: {
    margin: '0 0 4px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#58A6FF',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  chapterTitle: {
    margin: '0 0 4px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  fileName: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--border-strong)',
  },
  headerBadge: {
    flexShrink: 0,
    marginTop: '4px',
  },
  pagesBadge: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    padding: '4px 10px',
  },
  preview: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--bg-elevated)',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
    transition: 'background-color 0.25s ease',
  },
  previewLabel: {
    margin: '0 0 6px',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'var(--border-strong)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  previewText: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: 1.65,
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  actionBtn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '11px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    cursor: 'pointer',
    transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease, opacity .15s, background-color 0.25s ease',
    overflow: 'hidden',
  },
  btnGlow: {
    position: 'absolute', inset: 0, borderRadius: '8px',
    pointerEvents: 'none',
  },
  btnIcon: { fontSize: '1rem', flexShrink: 0 },
  spinner: {
    display: 'inline-block',
    width: '13px',
    height: '13px',
    border: '2px solid var(--border)',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
    flexShrink: 0,
  },
  errorBox: {
    backgroundColor: 'var(--overdue-bg)',
    border: '1px solid #F85149',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '0.8rem',
    color: '#F85149',
    marginTop: '8px',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  tabBar: {
    display: 'flex',
    gap: '2px',
    marginTop: '24px',
    marginBottom: '16px',
    borderBottom: '1px solid var(--bg-elevated)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: '6px 6px 0 0',
    transition: 'color .15s, background-color .15s',
    marginBottom: '-1px',
  },
  notesBlock: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '20px',
    fontSize: '0.85rem',
    color: 'var(--text-body)',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
}

const cc = {
  card: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    transition: 'transform .18s ease, box-shadow .18s ease, outline .15s ease, background-color 0.25s ease',
  },
  accentBar: {
    width: '3px',
    flexShrink: 0,
    transition: 'background-color .2s, opacity .2s',
  },
  inner: {
    padding: '12px 12px 12px 10px',
    flex: 1,
    minWidth: 0,
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  courseTag: {
    fontSize: '0.62rem',
    fontWeight: 700,
    color: '#BC8CFF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '120px',
  },
  badges: { display: 'flex', gap: '2px' },
  badge: { fontSize: '0.7rem' },
  name: {
    margin: '0 0 6px',
    fontSize: '0.88rem',
    fontWeight: 500,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'color .15s',
  },
  bottom: { display: 'flex', alignItems: 'center' },
  meta: { fontSize: '0.68rem', color: 'var(--border-strong)' },
  deleteBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '22px',
    height: '22px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'opacity .15s, background-color .15s, color .15s',
    padding: 0,
  },
}

const uz = {
  zone: {
    border: '2px dashed var(--border)',
    borderRadius: '10px',
    padding: '22px 16px',
    cursor: 'pointer',
    transition: 'border-color .2s, background-color .2s, transform .2s',
    textAlign: 'center',
  },
  inner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  iconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
    transition: 'border-color .2s, background-color 0.25s ease',
  },
  label: {
    margin: 0,
    fontSize: '0.88rem',
    fontWeight: 600,
    transition: 'color .2s',
  },
  sub: {
    margin: 0,
    fontSize: '0.72rem',
    color: 'var(--border-strong)',
  },
  formWrap: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  formTitle: {
    margin: '0 0 12px',
    fontSize: '0.83rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--bg-elevated)',
  },
  fileLabel: {
    margin: 0,
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  input: {
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: '7px 10px',
    outline: 'none',
    transition: 'border-color .15s, background-color 0.25s ease',
    width: '100%',
    boxSizing: 'border-box',
  },
  formBtns: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '7px 14px',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  confirmBtn: {
    backgroundColor: '#238636',
    border: '1px solid #2EA043',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '7px 14px',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  spinner: {
    display: 'inline-block',
    width: '11px',
    height: '11px',
    border: '2px solid #2EA04355',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
  },
}

const qs = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  question: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  qText: {
    margin: '0 0 12px',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    display: 'flex',
    gap: '8px',
  },
  qNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: '#BC8CFF22',
    color: '#BC8CFF',
    borderRadius: '50%',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  choices: { display: 'flex', flexDirection: 'column', gap: '6px' },
  choice: {
    textAlign: 'left',
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '0.83rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    transition: 'border-color .15s, background-color .15s, transform .1s',
  },
  letter: { fontWeight: 700, flexShrink: 0, width: '18px' },
  feedback: { margin: '10px 0 0', fontSize: '0.78rem', fontWeight: 600 },
  scoreCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '28px',
    marginTop: '8px',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  },
  scoreEmoji: { fontSize: '2.5rem' },
  scoreNum: { fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0' },
  scoreLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, margin: '0' },
}
