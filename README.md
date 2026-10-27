# Back in Time — Personal Memory & History Archive

> An open-source, privacy-first local AI archive for preserving family memories, personal histories, and oral traditions—powered exclusively by LM Studio on your own machine.

---

## 1. Project Overview

**Back in Time** helps individuals and families preserve stories about ancestors, relatives, places, and historical events. Rather than chatting with a generic chatbot, users explore a museum-grade archival interface that:

- Catalogues memories with strict evidence classifications (**Documented Fact**, **Family Recollection**, **Possible Interpretation**, and **Uncertain Lore**).
- Builds an authentic chronological **Timeline**, marking approximate dates clearly and preserving undated records in a separate vault without inventing fictional dates.
- Powers a conversational **Memory Explorer** backed by a locally installed LLM (such as Google Gemma) running in LM Studio.
- Cites specific archive records that informed each answer and suggests thoughtful interview questions to ask living relatives to fill in missing gaps.
- Guarantees complete data privacy: **no cloud AI, no telemetry, and zero data leaves your local machine.**

---

## 2. Architecture & Design Principles

```
  ┌────────────────────────────────────────────────────────┐
  │                   Browser Frontend                     │
  │  HTML5 + Archival Dark CSS + Vanilla JavaScript (ES6)  │
  │  - Archive Catalog & Filter UI                         │
  │  - Chronological Timeline & Undated Vault              │
  │  - Conversational Explorer with Evidence Cards         │
  │  - Local Browser Persistence & JSON Backup/Restore     │
  └───────────────────────────┬────────────────────────────┘
                              │ HTTP (Loopback: 127.0.0.1:3000)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Node.js Local Server                   │
  │        (Zero dependencies — built-in modules)          │
  │  - Serves static assets with security headers          │
  │  - Enforces loopback-only AI routing (anti-exfiltration│
  │  - Health checks & error sanitization                  │
  └───────────────────────────┬────────────────────────────┘
                              │ HTTP (Loopback: 127.0.0.1:1234/v1)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                       LM Studio                        │
  │            Local OpenAI-Compatible Server              │
  │     Loaded Model: Google Gemma 2 / 4 or compatible     │
  └────────────────────────────────────────────────────────┘
```

### Core Security & Privacy Protections
1. **Loopback-Only AI Routing**: The backend server validates and restricts all outbound AI requests to loopback addresses (`127.0.0.1`, `localhost`, `::1`). Attempts to configure cloud or external API endpoints (e.g. `api.openai.com`) are rejected with `HTTP 403 Forbidden`.
2. **Local Browser Persistence**: Memory data is stored in the browser's `localStorage` and never transmitted to external databases.
3. **No Fabrication Rule**: The system prompt strictly prohibits the AI from inventing family stories, fabricating quotations, claiming personal memories, or guessing private thoughts of deceased ancestors.

---

## 3. Project Structure

```
Back_in_time/
├── .env.example              # Optional environment variable template
├── package.json              # Project metadata & start script
├── server.js                 # Node.js built-in HTTP server & loopback proxy
├── test-archive.js           # Automated integration test suite
├── sample-memories.json      # Curated historical family starter records
├── README.md                 # Complete documentation & setup instructions
└── public/
    ├── index.html            # Single-page archival application interface
    ├── css/
    │   └── style.css         # Archival dark editorial theme & responsive grid
    └── js/
        ├── storage.js        # Local persistence, schema validator & JSON import/export
        ├── timeline.js       # Date/era parser, chronology sorter & undated vault
        ├── explorer.js       # Context builder, evidence categorization & citations
        ├── settings.js       # LM Studio diagnostics, model discovery & backup UI
        └── app.js            # Main controller, router, modals & CRUD handlers
```

---

## 4. Getting Started on Windows 11

### Prerequisites
1. **Node.js**: Node.js LTS (v18+ or v24+).
   *If not installed, install via PowerShell: `winget install OpenJS.NodeJS.LTS`*
2. **LM Studio**: Download and install from [https://lmstudio.ai](https://lmstudio.ai).

### Launching the Application

1. Open PowerShell or Command Prompt in the project directory (`d:\Back_in_time`):
   ```powershell
   cd d:\Back_in_time
   ```

2. Start the local server:
   ```powershell
   node server.js
   ```
   *(or run `npm start`)*

3. Open your browser and navigate to:
   ```
   http://127.0.0.1:3000
   ```

---

## 5. Setting Up LM Studio with a Gemma Model

1. **Launch LM Studio** on your Windows 11 machine.
2. **Download a Model**:
   - In the search bar at the top, type `gemma` (e.g., `google/gemma-2-2b-it`, `google/gemma-2-9b-it`, or any GGUF model).
   - Click **Download**.
3. **Start the Local Inference Server**:
   - Click the **`<->` / Local Server** tab on the left navigation sidebar.
   - In the top dropdown, select your downloaded Gemma model.
   - Verify the port is set to `1234` (default).
   - Click the green **Start Server** button.
4. **Verify in Back in Time**:
   - Open Back in Time at `http://127.0.0.1:3000`.
   - The status pill in the top header will display a green indicator: **LM Studio: Connected**.
   - Navigate to the **Settings** tab and click **Test Connection** or **↻ Detect Models** to confirm available models.

---

## 6. Manual Testing Checklist

Use this checklist to verify each subsystem of the application:

| Feature / Step | How to Test | Expected Result |
| :--- | :--- | :--- |
| **1. Home View** | Navigate to `#home`. | Hero section displays, record counter reads 6 (sample data), principles grid renders cleanly. |
| **2. Add Memory** | Click `+ Record Memory`. Fill in title, person, date, notes, source, and select "Documented". Submit. | Modal closes, success toast appears, new card is added to the Archive. |
| **3. Search & Filter** | In `#archive`, type "Ellis Island" or filter by "Documented Record". | Grid filters in real time; count updates accurately. |
| **4. Timeline View** | Navigate to `#timeline`. | Events are sorted chronologically with gold nodes. Circa dates have `~` badges. Undated records appear in the bottom vault. |
| **5. AI Explorer Inquiry** | Go to `#explorer`, select a prompt chip (e.g. *"What is known about Arthur's arrival in America?"*), click **Explore**. | AI response appears structured into 4 evidence blocks with cited memory chips at the bottom. |
| **6. Citation Inspection** | Click any cited record chip beneath the AI response. | Memory Detail modal opens displaying the exact source and narrative. |
| **7. Offline Diagnostics** | Stop the server in LM Studio and click **Test Connection** in `#settings`. | Status updates to red **Offline** with step-by-step troubleshooting instructions. |
| **8. Export Archive** | In `#settings`, click **Export Archive (JSON)**. | Browser downloads `back-in-time-archive-YYYY-MM-DD.json`. |
| **9. Import Archive** | Click **Import Archive (JSON)** and select the downloaded file. | Confirms merge, validates schema, and reports success. |
| **10. Responsive Layout** | Resize browser window to mobile width (<640px). | Navigation folds into scrollable bar, forms wrap cleanly, timeline spine adapts. |

---

## 7. Automated Test Suite

Back in Time includes a built-in automated test suite verifying file integrity, schema validation, timeline date parsing, HTTP endpoints, and security loopback restrictions:

To run the automated tests:

```powershell
# 1. Start the server in one terminal
node server.js

# 2. In a second terminal, run the test script
node test-archive.js
```

All 24 unit and integration tests should pass with `0 Failed`.

---

## 8. Known Limitations & Future Improvements

### Current Version (v1.0) Limitations
- **Browser-Local Storage**: Records are held in the browser's `localStorage` quota (~5-10 MB). This is sufficient for thousands of text memories, but user backups should be downloaded periodically.
- **Text-Only Memories**: Current version supports text narratives and sources; physical photograph attachments and audio recordings are structured in the schema for future versions.
- **Single Active Model**: Requests use the active model currently hosted by LM Studio on port 1234.

### Planned Enhancements
- [ ] IndexedDB storage layer for large photographic archives and documents.
- [ ] Audio transcription for recording oral family interviews directly in the browser.
- [ ] Visual family relationship tree connecting memory subjects.
- [ ] Export archive as a printable, illustrated family heirloom booklet (PDF).
