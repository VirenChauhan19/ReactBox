# Study Command Center

**Live App:** https://virenchauhan19.github.io/ReactBox/

A React-based academic dashboard that uses AI to help students manage assignments, generate study notes, create quizzes, and sync deadlines to Google Calendar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| AI | OpenRouter (GPT-4o-mini) |
| Auth | Google OAuth 2.0 (`@react-oauth/google`) |
| PDF Parsing | `pdfjs-dist` |
| Calendar Sync | Google Calendar API |
| Persistence | Browser `localStorage` |
| Styling | Inline CSS with CSS custom properties (no external library) |

---

## Design Intent

> Written before AI coding began. This is the spec against which all AI output was evaluated.

### Domain

Academic assignment tracker. Target user: a university student managing 4–6 courses, each with a PDF syllabus. The core frustration is that deadlines live in PDFs, not calendars - and students miss them.

### Data Model

Each assignment object holds these fields (defined before any code was written):

```
{
  id: string,           // uuid
  title: string,
  course: string,
  dueDate: string,      // ISO 8601
  weight: number,       // percentage of final grade
  type: string,         // "assignment" | "exam" | "quiz" | "project"
  urgency: "low" | "medium" | "high" | "overdue" | "complete",
  description: string,
  notes: string,        // AI-generated study notes
  quiz: Question[],     // AI-generated MCQ array
  calEventId: string    // Google Calendar event ID, null if not synced
}
```

### Three-Panel Layout

| Panel | Role | State it reads | State it writes |
|---|---|---|---|
| **Browser** (left) | Assignment list, search, urgency badges | `assignments`, `selectedId`, `filter` | `selectedId` |
| **DetailView** (center) | Full content, AI notes, AI quiz | `assignments[selectedId]` | `assignments[selectedId].notes`, `.quiz` |
| **Controller** (right) | Filters, sort, progress ring, bulk actions | `assignments`, `filter`, `sort` | `filter`, `sort`, `assignments[*].urgency` |

All three panels share a single `assignments` array lifted to `App.jsx`. No panel owns its own copy. Clicking an item in Browser sets `selectedId`; DetailView re-renders to match; Controller's progress ring recalculates from the same array.

### Visual Rules (defined pre-coding)

**Mood:** Command center. Dense but not cluttered. Dark-first. Feels like a tool a student actually opens at midnight, not a marketing page.

**Colour palette (dark mode):**
- Background surface: `#0f1117`
- Panel background: `#1a1d27`
- Card background: `#22263a`
- Primary accent: `#6c8aff`
- Text primary: `#e8eaf6`
- Text secondary: `#8b92b0`
- Urgency - overdue: `#ff4d4d` (red)
- Urgency - high: `#ffaa00` (amber)
- Urgency - medium: `#4d94ff` (blue)
- Urgency - low: `#4caf89` (green)
- Urgency - complete: `#2e7d52` (dark green, muted)

**Typography:**
- Font: system-ui, -apple-system stack (no web font load)
- Panel headings: 13px, `#8b92b0`, uppercase, letter-spacing 0.08em
- Assignment title: 15px, `#e8eaf6`, font-weight 600
- Body / description: 13px, `#8b92b0`, line-height 1.6

**Layout rules:**
- Three panels always visible side-by-side on desktop (no tabs, no collapse)
- Panel widths: Browser 28%, DetailView 44%, Controller 28%
- Card left border: 3px solid urgency colour - the only colour on a card in resting state
- Hover state: card background lifts to `#2a2f45`, no border change
- Selected state: card background `#2d3350`, left border thickens to 4px
- Entrance animation: cards stagger in using `opacity 0→1`, `translateY 12px→0`, delay = `index × 40ms`

### State Flow

```
App.jsx owns: assignments[], selectedId, filter, sort, googleToken, userProfile
     │
     ├── Browser  ← reads assignments[], selectedId, filter
     │            → sets selectedId on click
     │            → sets filter via search input
     │
     ├── DetailView ← reads assignments[selectedId]
     │              → calls setAssignments to update .notes and .quiz fields
     │              → calls OpenRouter API (side effect, no shared state)
     │
     └── Controller ← reads assignments[], filter, sort
                    → sets filter, sort
                    → sets assignments[*].urgency on bulk complete
                    → triggers localStorage write via useEffect on assignments change
                    → triggers Google Calendar sync via useEffect on assignments + googleToken change
```

---

## AI Direction Log

Every major direction given to AI during the build - what was asked, what was produced, and what I decided to keep, change, or reject.

| # | Date | What I Asked | What AI Produced | What I Decided & Why |
|---|---|---|---|---|
| 1 | Apr 15 | Build a three-panel dashboard with shared assignment state - Browser (list), DetailView (notes/quiz), Controller (filters/progress) | Single-file component with three divs, all state local to each panel, no cross-panel reactivity | **Rejected structure, kept layout.** Lifted all state to `App.jsx` and passed down via props. A panel owning its own state cannot respond when another panel changes selection - breaks the core requirement. |
| 2 | Apr 15 | Parse a syllabus PDF using `pdfjs-dist`, send extracted text to Gemini as a strict JSON prompt | Working extraction, but Gemini returned free-form text mixed with JSON, no retry on rate limit errors | **Kept extraction, rewrote prompt and added retry logic.** Wrapped Gemini in exponential backoff loop. Changed prompt to require a JSON array only - no prose - so `JSON.parse()` worked without regex cleanup. |
| 3 | Apr 15 | Generate AI study notes and a 5-question multiple-choice quiz from each assignment's metadata | Notes were generic summaries with no course context. Quiz questions were shallow and repeated the assignment title verbatim | **Rewrote both prompts.** Injected `course`, `type`, and `weight` into the notes prompt so output was course-specific. Forced the quiz prompt to produce distractors that were plausible, not obviously wrong. |
| 4 | Apr 15 | Google OAuth login, fetch user profile, gate Calendar sync behind token presence | OAuth worked but the token was stored in component state - lost on any re-render. Calendar sync fired immediately on login before assignments were loaded | **Kept OAuth, changed token storage and sync trigger.** Moved token to `App.jsx` state so it persisted across panel re-renders. Changed sync trigger to a `useEffect` on `[assignments, googleToken]` so it only fires once assignments exist. |
| 5 | Apr 15 | Push assignments to Google Calendar, keep events in sync as assignments change | Always created new events on every sync call - marking complete and changing a filter produced duplicate calendar entries | **Rejected create-only approach.** Added `calEventIds` map keyed by assignment ID. First sync POSTs and stores the returned `eventId`; subsequent syncs PATCH that event. Manually cleaned 11 duplicate events from test calendar before this fix. |
| 6 | Apr 16 | Add guest mode - full feature access without Google login, persist data locally | Single `scc_data` localStorage key shared by all users with no account scoping | **Rejected the key scheme.** Switched to `scc_data_${profile.sub}` for Google users and `scc_data_guest` as a fixed separate key. Without this, guest upload overwrites Google user's data on next load - silent data loss. |
| 7 | Apr 16 | Monthly calendar grid showing assignment chips per day, urgency-coloured, animated month transitions | Grid rendered correctly but used a flat array with no week-row structure. Chips were all the same colour. Month transition had no animation - just instant swap | **Kept grid logic, rewrote rendering and added transitions.** Chunked days into week rows using `Array.slice`. Applied urgency colour from assignment object. Added `opacity + translateX` CSS transition keyed to a `direction` state variable (forward/back). |
| 8 | Apr 16 | Refactor CalendarView - the AI-generated version had 1400+ lines with duplicated render logic for each urgency level | AI attempted to extract urgency into a helper but duplicated the helper three times in different files | **Rejected the extraction, did it manually.** Collapsed the urgency chip renderer into a single `renderChip(assignment)` function that reads `assignment.urgency` - one place, one rule. Cut the file from 1438 lines to ~750. |
| 9 | Apr 18 | Add a biometric readiness panel - pull heart rate variability and sleep data to show whether the student is ready to study | Built `BiometricPanel.jsx` with live Garmin Connect API calls. Garmin requires OAuth + HTTPS server-side proxy - impossible to call directly from a browser | **Rejected the Garmin direct-API approach.** Garmin's API is not browser-accessible. Switched to a simulated HRV/sleep data model with realistic ranges, plus a manual entry modal so users can input their own wearable data. Kept the panel and readiness score logic. |
| 10 | Apr 18 | Add `ManualBiometricModal` - form for users to enter HRV, sleep hours, resting HR manually when no wearable is connected | Modal had no validation - users could submit negative HRV or 25 hours of sleep, which broke the readiness score formula | **Added input clamping.** HRV clamped to 20–120 ms, sleep to 0–12 hours, resting HR to 30–120 bpm. Readiness score formula uses these ranges as expected bounds so invalid inputs no longer produce scores above 100% or below 0. |
| 11 | Apr 18 | Add a FocusHub panel - Pomodoro timer, ambient sound selector, distraction blocker | Timer worked but reset to 25 minutes on every re-render because interval state was local to the component. Sound selector had no actual audio - just labelled buttons | **Fixed timer with `useRef` for interval ID and `useEffect` cleanup.** Timer now survives re-renders. For audio, used the Web Audio API to generate ambient tones (brown noise, binaural beats) procedurally - no audio files required, no hosting issue. |
| 12 | Apr 18 | Add `ParticleCanvas` animated background to the AuthScreen | Canvas re-initialized on every render because the particle array was created inside the component function body, not in a ref | **Moved particle state to `useRef`.** Array and animation frame ID live in refs - initialized once on mount, cleaned up on unmount. Canvas now runs at stable 60fps without accumulating ghost particles on re-render. |
| 13 | Apr 18 | Overhaul AuthScreen - particle background, new layout, feature showcase cards, dark/light mode support | Feature cards were hardcoded strings. AuthScreen had no `data-theme` awareness - always rendered dark regardless of system preference | **Kept layout, added theme awareness and dynamic feature list.** Passed `theme` prop down from `App.jsx`. Feature cards pulled from an array so adding a new feature means one array entry, not six JSX changes. |
| 14 | Apr 18 | Add chapter-level lecture notes - separate PDF upload for lecture slides, AI notes and quiz per chapter, sidebar navigation | AI generated one monolithic notes block for the entire PDF regardless of chapter breaks | **Rejected single-block output.** Changed the Gemini prompt to identify chapter headings from the extracted text and return one notes object per chapter. Sidebar navigation maps over the chapters array - selecting one swaps the DetailView content. |
| 15 | Apr 18 | Add a context-aware AI chat assistant loaded with the student's full assignment list | Chatbot had no system context - responses were generic study tips with no knowledge of the student's actual courses or deadlines | **Injected full assignment context into system prompt.** Serialized `assignments[]` as a JSON block prepended to every API request. Responses now reference specific course names, due dates, and weights from the student's real data. |
| 16 | Apr 25 | Switch AI provider from Gemini to OpenRouter after rate limit and reliability issues during real testing | Gemini's free tier was throwing 429 errors frequently during PDF parsing and occasionally returning malformed JSON instead of the required array format, breaking the upload flow entirely | **Switched to OpenRouter routing to GPT-4o-mini.** All prompt logic stayed identical - only the API endpoint, auth header, and model ID changed. Rate limit issues stopped. JSON parsing reliability improved. Using a shared paid API key resolved the free-tier constraints entirely. |

---

## Records of Resistance

These are the moments where the build pushed back - either the AI produced something that had to be corrected, or a design decision turned out to be wrong in practice.

**1. Gemini rate limits and unreliable JSON during PDF parsing**

The first implementation called Gemini once per file with no retry logic. On the free tier, uploading multiple PDFs simultaneously triggered `429` errors immediately. Adding exponential backoff retry helped temporarily but Gemini's free tier limits were still too aggressive for real use, and it kept returning free-form text mixed in with the JSON array instead of clean parseable output. The real fix was switching the entire AI layer to OpenRouter using GPT-4o-mini through a paid API key. Rate limit errors stopped completely and JSON parsing became reliable.

**2. CSS variables do not inherit across separate React trees**

The theme toggle applied `data-theme` to the root dashboard `<div>`. This worked perfectly for the dashboard - but the AuthScreen and standalone UploadScreen rendered as their own top-level returns in App.jsx, outside that wrapper. They stayed hardcoded dark regardless of the toggle. The fix was to apply the theme attribute to `document.documentElement` via a `useEffect` so the entire page, across every render path, inherited the variables.

**3. Inline styles resist theming**

The original codebase used JavaScript inline style objects with hardcoded hex values throughout. CSS custom properties only work if the inline styles reference `var(--name)` - they cannot override hardcoded hex. This meant every colour in every component had to be individually replaced. There was no shortcut: eight component files, four style object groups each, changed one by one.

**4. Google Calendar duplicate events**

The initial sync function always created new calendar events. Marking an assignment complete and then changing filters triggered the sync again, which created duplicate events in Google Calendar. Tracking `eventId` per assignment in a `calEventIds` state map and switching to PATCH requests for existing events resolved it - but only after the issue appeared in a live calendar and had to be manually cleaned up.

**5. `pdfjs-dist` worker path in Vite**

`pdfjs-dist` requires a web worker for PDF rendering. Importing the worker URL directly with `?url` in Vite worked, but only after discovering that the wrong worker file was being referenced (`pdf.worker.js` vs `pdf.worker.min.mjs`). The mismatch caused silent failures where the PDF appeared to load but `getTextContent()` returned empty items.

**6. Guest persistence key collision**

The first guest implementation used a generic `scc_data` key in localStorage, with no account identifier. If a Google user and a guest user shared the same browser, the guest's upload would overwrite the Google user's saved assignments on next load. Switching to `scc_data_${profile.sub}` for Google users and `scc_data_guest` as a separate fixed key resolved the collision.

---

## Five Questions Reflection

**1. What did the AI do well that surprised you?**

Honestly the syllabus parsing surprised me the most. I started with Gemini but it kept giving me issues, rate limiting me constantly and sometimes just returning garbage instead of the JSON I needed. I ended up switching to OpenRouter and using my friend's API key since he actually pays for it and has way better rate limits. Once I got that working, the parsing was way more reliable than I expected. I'd throw it a syllabus PDF that was honestly a mess, like tables that came out as flat text with weird spacing and random date formats, and it would still pull out the right assignment names, due dates, and weights. I thought I'd be fixing wrong outputs all the time but it actually just worked most of the time.

**2. Where did directing the AI feel like real authorship?**

Definitely the visual side of things. The AI would build whatever feature I asked for and it would technically work but it looked so generic. Every visual decision I actually cared about I had to spell out myself. The color system for urgency, red for overdue, amber for high, green for low. The little accent bar on the left side of each card. The confetti that pops when you mark something done. The way cards pulse when a deadline is less than 48 hours away. None of that came from the AI, I told it exactly what I wanted and it just wrote the code. It felt like I was the designer and the AI was just the person executing it.

**3. What would you do differently if you started over?**

I would set up the color and theme system before writing a single component. I built everything with hardcoded hex values because it was just faster in the moment and I kept telling myself I'd clean it up later. When I finally added dark and light mode I had to go through every single file and replace every color one by one. It took so long and it was so tedious. If I had just used CSS variables from the start that whole thing would have been easy. It's one of those things where the shortcut at the beginning cost me way more time at the end.

**4. What does this project reveal about AI-assisted development?**

The AI will never tell you that you're building things in the wrong order. That's the big thing I took away from this. It just does whatever you ask it to do and it does it pretty well but it has no sense of the bigger picture. I built the entire UI first with hardcoded everything and the AI never once said hey you might want to think about theming before you go further. It doesn't think about what decisions are going to make your life harder in two days. That's still completely on you as the developer. The AI is good at the task in front of it and blind to everything else.

**5. What is the gap between what the AI built and what you intended?**

The features all work but some of it still feels a little rough around the edges. The loading state when you upload a PDF isn't great, you're just sitting there waiting and it doesn't really tell you what's happening. The settings modal does its job but it feels kind of empty. Some of the transitions are a bit abrupt. None of it is broken, it's more that the AI builds each thing in its own little bubble and doesn't think about how it connects to everything else. Getting the whole thing to feel cohesive and polished is something you have to do yourself because the AI doesn't step back and look at the full picture.

---

## Architecture

```mermaid
flowchart TD
    subgraph AUTH["Auth Layer"]
        A([User opens app]) --> B[AuthScreen]
        B -->|Google OAuth token| C{localStorage\nhas saved data?}
        B -->|Continue as Guest| C
        C -->|Yes → restore assignments| APP
        C -->|No| E[UploadScreen]
        E -->|PDF bytes| F[pdfjs-dist\nextracts raw text]
        F -->|raw text string| G[OpenRouter / GPT-4o-mini\nreturns JSON array]
        G -->|setAssignments call| APP
    end

    subgraph APP["App.jsx - Centralized State"]
        STATE["STATE LIVES HERE\nassignments[]\nselectedId\nfilter · sort\ngoogleToken\nuserProfile"]
    end

    subgraph PANELS["Three Reactive Panels - all read from App.jsx state"]
        H["Browser Panel\nreads: assignments, selectedId, filter\nwrites: selectedId on click\nwrites: filter on search"]
        I["DetailView Panel\nreads: assignments-selectedId\nwrites: assignments-selectedId-.notes\nwrites: assignments-selectedId-.quiz"]
        J["Controller Panel\nreads: assignments, filter, sort\nwrites: filter, sort\nwrites: assignments urgency on bulk actions"]
    end

    APP -->|props| H
    APP -->|props| I
    APP -->|props| J
    H -->|setSelectedId| APP
    I -->|setAssignments patch| APP
    J -->|setFilter · setSort · setAssignments| APP

    subgraph SIDE["Side Effects triggered by App.jsx state changes"]
        K["useEffect on assignments + googleToken\n→ Google Calendar API\nPATCH existing event or POST new\nstores calEventId back in state"]
        L["useEffect on assignments\n→ localStorage.setItem\nkey: scc_data_-profile.sub- or scc_data_guest"]
        M["OpenRouter calls - on demand\nNotes: course + description → markdown\nQuiz: course + description → MCQ JSON\nChat: full assignments context + message → reply"]
    end

    APP -->|assignments change| K
    APP -->|assignments change| L
    I -->|button click| M
    M -->|setAssignments patch| APP
```

---

## Setup

```bash
# 1. Clone
git clone https://github.com/VirenChauhan19/ReactBox.git
cd ReactBox

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env
# Fill in:
#   VITE_GOOGLE_CLIENT_ID=...
#   VITE_OPENROUTER_API_KEY=...

# 4. Run
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Optional | Enables Google login and Calendar sync |
| `VITE_OPENROUTER_API_KEY` | Required | Powers PDF parsing, notes, quizzes, and chat via OpenRouter |

The app runs in guest mode without `VITE_GOOGLE_CLIENT_ID`. It will not run without `VITE_OPENROUTER_API_KEY`.

---

## Features at a Glance

- **Syllabus PDF upload** - drag-and-drop, multi-file, AI extracts all assignments automatically
- **AI study notes** - generated per assignment from course + description context
- **AI quiz** - 5 multiple-choice questions, instant feedback, score card
- **AI chat assistant** - context-aware chatbot loaded with all your assignments
- **Google Calendar sync** - automatic, debounced, updates existing events rather than duplicating
- **Chapter Notes** - upload lecture PDFs, generate notes and quizzes per chapter
- **Monthly calendar view** - urgency-coloured assignment chips per day
- **Dark / light mode** - full theme system, persists across all screens
- **Guest mode** - full feature access without Google account
- **Cross-session persistence** - localStorage keyed per account, restores on login
- **Demo data** - pre-loaded sample assignments with dismissible banner
