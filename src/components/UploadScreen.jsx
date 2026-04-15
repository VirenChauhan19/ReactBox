import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const SYSTEM_PROMPT = `You are a syllabus parser. Extract every graded assignment and deadline from the syllabus text.
Return ONLY a valid JSON array — no markdown, no code fences, no explanation before or after.
Each element must match this exact shape:
{"id":"asgn-01","course":"COURSE NAME","title":"Assignment Title","dueDate":"YYYY-MM-DD","weight":10,"status":"not-started","description":"brief description","notes":"","quiz":[],"urgency":"high"}
Rules:
- id: sequential strings "asgn-01", "asgn-02", etc.
- dueDate: ISO 8601 YYYY-MM-DD; if only month/day given assume the current or next occurrence
- weight: integer percentage; use 0 if not stated
- status: always "not-started"
- urgency: "high" if due within 14 days of today, "medium" within 30 days, "low" otherwise
- Return ONLY the JSON array.`

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

async function callGemini(userText) {
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? ''

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userText }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
  const assignments = JSON.parse(raw)
  if (!Array.isArray(assignments)) throw new Error('API did not return a JSON array')
  return assignments
}

export default function UploadScreen({ onAssignmentsLoaded }) {
  const [phase, setPhase] = useState('idle') // idle | reading | parsing | error
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef()

  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError('')

    try {
      setPhase('reading')
      const text = await extractPdfText(file)

      setPhase('parsing')
      const assignments = await callGemini(text)

      onAssignmentsLoaded(assignments)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setPhase('error')
    }
  }

  const isLoading = phase === 'reading' || phase === 'parsing'

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <span style={s.logoDot} />
          <span style={s.logoText}>Study Command Center</span>
        </div>

        <h1 style={s.heading}>Upload Your Syllabus</h1>
        <p style={s.sub}>
          Drop a PDF syllabus and Gemini will extract all your assignments
          automatically.
        </p>

        <label
          style={{
            ...s.dropzone,
            ...(isLoading ? s.dropzoneLoading : {}),
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) {
              inputRef.current.files = e.dataTransfer.files
              handleChange({ target: { files: e.dataTransfer.files } })
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleChange}
            disabled={isLoading}
          />

          {isLoading ? (
            <div style={s.loadingInner}>
              <div style={s.spinner} />
              <p style={s.loadingLabel}>
                {phase === 'reading' ? 'Reading PDF…' : 'Parsing with Gemini…'}
              </p>
              {fileName && <p style={s.fileName}>{fileName}</p>}
            </div>
          ) : (
            <div style={s.idleInner}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#58A6FF" strokeWidth="1.5">
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={s.dropLabel}>Click to upload or drag & drop</p>
              <p style={s.dropSub}>PDF files only</p>
            </div>
          )}
        </label>

        {phase === 'error' && (
          <div style={s.errorBox}>
            <strong>Error:</strong> {error}
            <br />
            <span style={s.errorHint}>
              Make sure VITE_GEMINI_API_KEY is set in your .env file.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0D1117',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    padding: '24px',
  },
  card: {
    backgroundColor: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '12px',
    padding: '40px 44px',
    width: '100%',
    maxWidth: '480px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '28px',
  },
  logoDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#58A6FF',
  },
  logoText: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#8B949E',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  heading: {
    margin: '0 0 8px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#E6EDF3',
  },
  sub: {
    margin: '0 0 28px',
    fontSize: '0.875rem',
    color: '#8B949E',
    lineHeight: 1.5,
  },
  dropzone: {
    display: 'block',
    border: '2px dashed #30363D',
    borderRadius: '8px',
    padding: '36px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    backgroundColor: '#0D1117',
  },
  dropzoneLoading: {
    cursor: 'default',
    borderColor: '#58A6FF',
  },
  idleInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  dropLabel: {
    margin: '4px 0 0',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#E6EDF3',
  },
  dropSub: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#8B949E',
  },
  loadingInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #30363D',
    borderTopColor: '#58A6FF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingLabel: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#58A6FF',
  },
  fileName: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#8B949E',
  },
  errorBox: {
    marginTop: '16px',
    backgroundColor: '#1C0A0A',
    border: '1px solid #F85149',
    borderRadius: '6px',
    padding: '12px 14px',
    fontSize: '0.83rem',
    color: '#F85149',
    lineHeight: 1.5,
  },
  errorHint: {
    color: '#8B949E',
    fontSize: '0.78rem',
  },
}
