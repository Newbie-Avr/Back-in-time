/**
 * Back in Time — Main Application Controller
 * Audiovisual Heritage Edition: 3D Perspective, Interactive Boombox Tape Deck,
 * Web Audio Synth, Media File Uploads & Vibrant Retro Navigation.
 */

class BackInTimeApp {
  constructor() {
    this.currentView = 'home';
    this.activeFilter = {
      search: '',
      mediaType: 'all',
      evidence: 'all',
      person: 'all',
      sort: 'date-desc'
    };

    // Tape deck audio simulation state
    this.deckState = {
      isPlaying: false,
      timerSec: 0,
      timerInterval: null,
      audioCtx: null
    };
  }

  init() {
    this.bindNavigation();
    this.bindModals();
    this.bindArchiveControls();
    this.bindExplorerControls();
    this.bindQuickActions();
    this.bindTapeDeck();
    this.bindCrtToggle();
    this.bindMediaUpload();

    // Initialize settings
    window.archiveSettings.init();

    // Initial render
    this.handleRoute();
    this.refreshAll();
  }

  // --- 3D INTERACTIVE BOOMBOX TAPE DECK ---

  bindTapeDeck() {
    const btnPlay = document.getElementById('btn-deck-play');
    const btnStop = document.getElementById('btn-deck-stop');
    const btnShuffle = document.getElementById('btn-deck-shuffle');
    const deck = document.getElementById('interactive-deck');

    if (!deck) return;

    if (btnPlay) {
      btnPlay.addEventListener('click', () => this.toggleDeckPlayback(true));
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => this.toggleDeckPlayback(false));
    }

    if (btnShuffle) {
      btnShuffle.addEventListener('click', () => this.shuffleDeckTrack());
    }

    const btnViewPlay = document.getElementById('btn-view-deck-play');
    if (btnViewPlay) {
      btnViewPlay.addEventListener('click', () => {
        const viewModal = document.getElementById('view-modal');
        const viewTitle = document.getElementById('view-modal-title');
        if (viewModal) viewModal.classList.add('hidden');

        window.location.hash = 'home';
        this.loadDeckTrack(viewTitle ? viewTitle.textContent : 'Archival Memory Tape');
        this.toggleDeckPlayback(true);
      });
    }
  }

  toggleDeckPlayback(play) {
    const deck = document.getElementById('interactive-deck');
    const led = document.getElementById('deck-status-led');
    const counterEl = document.getElementById('deck-time-counter');

    this.playRetroAudioTone(play ? 'play' : 'stop');

    if (play && !this.deckState.isPlaying) {
      this.deckState.isPlaying = true;
      if (deck) deck.classList.add('playing');
      if (led) {
        led.textContent = 'PLAY ▶';
        led.style.color = 'var(--neon-green)';
      }

      this.deckState.timerInterval = setInterval(() => {
        this.deckState.timerSec++;
        const mins = String(Math.floor(this.deckState.timerSec / 60)).padStart(2, '0');
        const secs = String(this.deckState.timerSec % 60).padStart(2, '0');
        if (counterEl) counterEl.textContent = `${mins}:${secs}`;
      }, 1000);

    } else if (!play && this.deckState.isPlaying) {
      this.deckState.isPlaying = false;
      if (deck) deck.classList.remove('playing');
      if (led) {
        led.textContent = 'STOPPED';
        led.style.color = 'var(--neon-pink)';
      }
      clearInterval(this.deckState.timerInterval);
    }
  }

  shuffleDeckTrack() {
    const memories = window.archiveStorage.getAll();
    if (memories.length === 0) return;
    const randomItem = memories[Math.floor(Math.random() * memories.length)];
    this.loadDeckTrack(randomItem.title);
    this.toggleDeckPlayback(true);
  }

  loadDeckTrack(title) {
    const titleEl = document.getElementById('deck-track-title');
    if (titleEl) {
      titleEl.textContent = title.toUpperCase();
    }
  }

  playRetroAudioTone(type) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.deckState.audioCtx) {
        this.deckState.audioCtx = new AudioContext();
      }
      const ctx = this.deckState.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'play') {
        // Satisfying dual analog tape click & warm synth chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Mechanical tape stop thud
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // Graceful fallback if audio is blocked by browser policy
    }
  }

  // --- CRT SCANLINES TOGGLE ---

  bindCrtToggle() {
    const btn = document.getElementById('btn-toggle-crt');
    const label = document.getElementById('crt-status-text');

    if (btn && label) {
      btn.addEventListener('click', () => {
        const hasCrt = document.body.classList.toggle('crt-scanlines');
        label.textContent = hasCrt ? 'ON' : 'OFF';
        window.appToast(`Retro CRT Scanlines: ${hasCrt ? 'ON' : 'OFF'}`, 'info');
      });
    }
  }

  // --- 3D CARD PERSPECTIVE TILT ---

  init3DTilt() {
    const cards = document.querySelectorAll('.memory-card-3d');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

  // --- SPA ROUTING & NAVIGATION ---

  bindNavigation() {
    window.addEventListener('hashchange', () => this.handleRoute());

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const page = link.getAttribute('data-page');
        if (page) window.location.hash = page;
      });
    });

    // Domain cards on home click to filter
    document.querySelectorAll('.heritage-type-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-filter-type');
        if (type) {
          this.activeFilter.mediaType = type;
          window.location.hash = 'archive';
          this.renderArchiveGrid();
        }
      });
    });
  }

  handleRoute() {
    const hash = window.location.hash.replace(/^#/, '') || 'home';
    const validPages = ['home', 'archive', 'timeline', 'explorer', 'settings'];
    const targetPage = validPages.includes(hash) ? hash : 'home';

    this.currentView = targetPage;

    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const activeSec = document.getElementById(`page-${targetPage}`);
    if (activeSec) activeSec.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-page') === targetPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetPage === 'archive') {
      this.renderArchiveGrid();
    } else if (targetPage === 'timeline') {
      this.renderTimelineView();
    } else if (targetPage === 'explorer') {
      this.refreshExplorerSidebar();
    } else if (targetPage === 'home') {
      this.updateHomeStats();
    }
  }

  // --- GLOBAL REFRESH ---

  refreshAll() {
    this.updateHomeStats();
    this.populatePersonFilters();
    this.renderArchiveGrid();
    this.renderTimelineView();
    this.refreshExplorerSidebar();
  }

  updateHomeStats() {
    const memories = window.archiveStorage.getAll();
    const statTotal = document.getElementById('stat-total-memories');
    const statMediaTypes = document.getElementById('stat-total-media-types');
    const statLanguages = document.getElementById('stat-total-languages');

    if (statTotal) statTotal.textContent = memories.length;

    // Count distinct media types
    const mediaSet = new Set(memories.map(m => m.mediaType || 'photo'));
    if (statMediaTypes) statMediaTypes.textContent = mediaSet.size;

    // Count distinct languages
    const langSet = new Set(memories.map(m => (m.language || 'English').toLowerCase().trim()));
    if (statLanguages) statLanguages.textContent = langSet.size;
  }

  populatePersonFilters() {
    const memories = window.archiveStorage.getAll();
    const peopleSet = new Set();

    memories.forEach(m => {
      if (m.person && m.person.trim()) {
        peopleSet.add(m.person.trim());
      }
    });

    const sortedPeople = Array.from(peopleSet).sort((a, b) => a.localeCompare(b));

    const archivePersonSelect = document.getElementById('filter-person');
    const explorerPersonSelect = document.getElementById('explorer-person-filter');

    const updateSelect = (selectEl, defaultLabel) => {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      selectEl.innerHTML = `<option value="all">${defaultLabel}</option>`;
      sortedPeople.forEach(person => {
        const opt = document.createElement('option');
        opt.value = person;
        opt.textContent = person;
        if (person === currentVal) opt.selected = true;
        selectEl.appendChild(opt);
      });
    };

    updateSelect(archivePersonSelect, 'All People / Voices');
    updateSelect(explorerPersonSelect, 'Entire Family Archive (All Records)');
  }

  // --- ARCHIVE VIEW & FILTERING ---

  bindArchiveControls() {
    const searchInput = document.getElementById('archive-search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const filterEvidence = document.getElementById('filter-evidence');
    const filterPerson = document.getElementById('filter-person');
    const filterSort = document.getElementById('filter-sort');
    const btnResetFilters = document.getElementById('btn-reset-filters');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.activeFilter.search = e.target.value.trim().toLowerCase();
        if (btnClearSearch) {
          btnClearSearch.style.display = this.activeFilter.search ? 'block' : 'none';
        }
        this.renderArchiveGrid();
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.activeFilter.search = '';
        btnClearSearch.style.display = 'none';
        this.renderArchiveGrid();
      });
    }

    // Media filter chips
    document.querySelectorAll('.media-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.media-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter.mediaType = chip.getAttribute('data-type');
        this.renderArchiveGrid();
      });
    });

    if (filterEvidence) {
      filterEvidence.addEventListener('change', (e) => {
        this.activeFilter.evidence = e.target.value;
        this.renderArchiveGrid();
      });
    }

    if (filterPerson) {
      filterPerson.addEventListener('change', (e) => {
        this.activeFilter.person = e.target.value;
        this.renderArchiveGrid();
      });
    }

    if (filterSort) {
      filterSort.addEventListener('change', (e) => {
        this.activeFilter.sort = e.target.value;
        this.renderArchiveGrid();
      });
    }

    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (btnClearSearch) btnClearSearch.style.display = 'none';
        if (filterEvidence) filterEvidence.value = 'all';
        if (filterPerson) filterPerson.value = 'all';
        if (filterSort) filterSort.value = 'date-desc';

        document.querySelectorAll('.media-filter-chip').forEach(c => c.classList.remove('active'));
        const allChip = document.querySelector('.media-filter-chip[data-type="all"]');
        if (allChip) allChip.classList.add('active');

        this.activeFilter = {
          search: '',
          mediaType: 'all',
          evidence: 'all',
          person: 'all',
          sort: 'date-desc'
        };
        this.renderArchiveGrid();
      });
    }
  }

  getFilteredMemories() {
    let memories = window.archiveStorage.getAll();

    // 1. Media Type Filter
    if (this.activeFilter.mediaType !== 'all') {
      memories = memories.filter(m => m.mediaType === this.activeFilter.mediaType);
    }

    // 2. Text Search
    if (this.activeFilter.search) {
      const q = this.activeFilter.search;
      memories = memories.filter(m => {
        const fullText = `${m.title} ${m.person} ${m.year} ${m.notes} ${m.source} ${m.formatMedium} ${m.language} ${m.tags.join(' ')}`.toLowerCase();
        return fullText.includes(q);
      });
    }

    // 3. Evidence Category Filter
    if (this.activeFilter.evidence !== 'all') {
      memories = memories.filter(m => m.evidenceCategory === this.activeFilter.evidence);
    }

    // 4. Person Filter
    if (this.activeFilter.person !== 'all') {
      const p = this.activeFilter.person.toLowerCase();
      memories = memories.filter(m => m.person.toLowerCase().includes(p));
    }

    // 5. Sorting
    memories.sort((a, b) => {
      if (this.activeFilter.sort === 'created-desc') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (this.activeFilter.sort === 'title-asc') {
        return a.title.localeCompare(b.title);
      }

      const parsedA = window.archiveTimeline.parseDate(a.year, a.isApproximate);
      const parsedB = window.archiveTimeline.parseDate(b.year, b.isApproximate);

      const yearA = parsedA.year !== null ? parsedA.year : -99999;
      const yearB = parsedB.year !== null ? parsedB.year : -99999;

      if (this.activeFilter.sort === 'date-asc') {
        return yearA - yearB;
      } else {
        return yearB - yearA;
      }
    });

    return memories;
  }

  renderArchiveGrid() {
    const grid = document.getElementById('memory-grid');
    const emptyState = document.getElementById('archive-empty-state');
    const countLabel = document.getElementById('archive-results-count');

    if (!grid) return;

    // Sync media type chips active state
    document.querySelectorAll('.media-filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-type') === this.activeFilter.mediaType);
    });

    const memories = this.getFilteredMemories();

    if (countLabel) {
      countLabel.textContent = `Showing ${memories.length} audiovisual record${memories.length === 1 ? '' : 's'}`;
    }

    if (memories.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    let html = '';
    memories.forEach(m => {
      const parsed = window.archiveTimeline.parseDate(m.year, m.isApproximate);
      const displayDate = parsed.year ? (parsed.isApprox ? `~ ${parsed.displayDate}` : parsed.displayDate) : 'Undated';
      const badgeClass = `badge-${m.evidenceCategory}`;
      const evidenceLabel = window.archiveTimeline.formatEvidenceLabel(m.evidenceCategory);
      const mediaBadge = window.archiveTimeline.formatMediaBadge(m.mediaType);

      const tagsHtml = (m.tags || []).slice(0, 3).map(t => `<span class="tag-chip">#${this.escapeHtml(t)}</span>`).join('');

      let mediaThumb = '';
      if (m.mediaUrl) {
        if (this.isAudioUrl(m.mediaUrl)) {
          mediaThumb = `
            <div class="memory-card-media" style="padding: 1.25rem 1rem; display: flex; flex-direction: column; justify-content: center; background: linear-gradient(180deg, #24144b 0%, #100b26 100%);">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem;">
                <span style="font-size: 1.6rem;">🎙️</span>
                <span style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--neon-cyan); font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${this.escapeHtml(m.formatMedium || 'Audio Recording')}
                </span>
              </div>
              <audio controls preload="none" src="${this.escapeHtml(m.mediaUrl)}" style="width: 100%; height: 38px;"></audio>
              <div class="media-type-badge-overlay">${mediaBadge}</div>
              ${m.mediaDuration ? `<div class="media-duration-badge-overlay">⏱️ ${this.escapeHtml(m.mediaDuration)}</div>` : ''}
            </div>
          `;
        } else if (this.isVideoUrl(m.mediaUrl)) {
          mediaThumb = `
            <div class="memory-card-media">
              <video controls preload="metadata" src="${this.escapeHtml(m.mediaUrl)}" style="width: 100%; height: 100%; object-fit: cover;"></video>
              <div class="media-type-badge-overlay">${mediaBadge}</div>
              ${m.mediaDuration ? `<div class="media-duration-badge-overlay">⏱️ ${this.escapeHtml(m.mediaDuration)}</div>` : ''}
            </div>
          `;
        } else {
          mediaThumb = `
            <div class="memory-card-media">
              <img src="${this.escapeHtml(m.mediaUrl)}" alt="${this.escapeHtml(m.title)}" loading="lazy">
              <div class="media-type-badge-overlay">${mediaBadge}</div>
              ${m.mediaDuration ? `<div class="media-duration-badge-overlay">⏱️ ${this.escapeHtml(m.mediaDuration)}</div>` : ''}
            </div>
          `;
        }
      } else {
        mediaThumb = `
          <div class="memory-card-media" style="display:flex; align-items:center; justify-content:center; background:#120e24;">
            <span style="font-size:3rem;">${this.getMediaEmoji(m.mediaType)}</span>
            <div class="media-type-badge-overlay">${mediaBadge}</div>
          </div>
        `;
      }

      html += `
        <div class="memory-card-3d" data-id="${m.id}">
          ${mediaThumb}
          <div class="memory-card-header">
            <span class="badge ${badgeClass}">${evidenceLabel}</span>
            <span class="memory-card-date">${this.escapeHtml(displayDate)}</span>
          </div>
          <h3 class="memory-card-title">${this.escapeHtml(m.title)}</h3>
          <div class="memory-card-meta-line">
            <span>👤 ${this.escapeHtml(m.person)}</span>
            ${m.formatMedium ? `<span>📼 ${this.escapeHtml(m.formatMedium)}</span>` : ''}
            ${m.language ? `<span>🌍 ${this.escapeHtml(m.language)}</span>` : ''}
          </div>
          <p class="memory-card-notes">${this.escapeHtml(m.notes)}</p>
          <div class="memory-card-source"><strong>Source:</strong> ${this.escapeHtml(m.source)}</div>
          <div class="memory-card-footer">
            <div class="memory-tags">${tagsHtml}</div>
            <button class="btn btn-neon-yellow btn-sm" data-action="view" data-id="${m.id}">
              Inspect Record
            </button>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
    this.init3DTilt();

    grid.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openViewModal(id);
      });
    });
  }

  getMediaEmoji(type) {
    switch (type) {
      case 'film': return '🎞️';
      case 'video': return '📼';
      case 'audio': return '🎙️';
      case 'radio': return '📻';
      case 'photo': return '📸';
      case 'television': return '📺';
      default: return '📜';
    }
  }

  isAudioUrl(url) {
    if (!url) return false;
    return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(url) || url.startsWith('data:audio/');
  }

  isVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url) || url.startsWith('data:video/');
  }

  // --- TIMELINE VIEW ---

  renderTimelineView() {
    const allMemories = window.archiveStorage.getAll();
    window.archiveTimeline.renderTimeline(
      'timeline-container',
      'undated-memory-grid',
      allMemories,
      (selectedId) => this.openViewModal(selectedId)
    );
    this.init3DTilt();
  }

  // --- MEMORY EXPLORER VIEW ---

  bindExplorerControls() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const personFilter = document.getElementById('explorer-person-filter');

    if (form && input) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        await this.handleUserChat(text);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          form.dispatchEvent(new Event('submit'));
        }
      });
    }

    if (personFilter) {
      personFilter.addEventListener('change', () => {
        this.refreshExplorerSidebar();
      });
    }

    document.querySelectorAll('.prompt-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt && input) {
          input.value = prompt;
          form.dispatchEvent(new Event('submit'));
        }
      });
    });
  }

  refreshExplorerSidebar() {
    const personFilter = document.getElementById('explorer-person-filter');
    const recordsLoadedEl = document.getElementById('explorer-records-loaded');
    const evidenceRatioEl = document.getElementById('explorer-evidence-ratio');

    const selectedPerson = personFilter ? personFilter.value : 'all';
    const relevant = window.memoryExplorer.getRelevantMemories('', selectedPerson);

    if (recordsLoadedEl) recordsLoadedEl.textContent = relevant.length;

    if (evidenceRatioEl) {
      if (relevant.length === 0) {
        evidenceRatioEl.textContent = '0%';
      } else {
        const docCount = relevant.filter(m => m.evidenceCategory === 'documented').length;
        evidenceRatioEl.textContent = `${Math.round((docCount / relevant.length) * 100)}%`;
      }
    }
  }

  async handleUserChat(userText) {
    const chatContainer = document.getElementById('chat-container');
    const btnSend = document.getElementById('btn-chat-send');
    const personFilter = document.getElementById('explorer-person-filter');
    const selectedPerson = personFilter ? personFilter.value : 'all';

    if (!chatContainer) return;

    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-message user-message';
    userMsgEl.innerHTML = `<div class="message-bubble">${this.escapeHtml(userText)}</div>`;
    chatContainer.appendChild(userMsgEl);

    const loadingMsgEl = document.createElement('div');
    loadingMsgEl.className = 'chat-message ai-message';
    loadingMsgEl.innerHTML = `
      <div class="message-bubble">
        <span class="status-dot status-checking"></span>
        <em>Analyzing audiovisual reels, oral tapes, broadcasts &amp; family context via local LM Studio...</em>
      </div>
    `;
    chatContainer.appendChild(loadingMsgEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (btnSend) {
      btnSend.disabled = true;
      btnSend.innerHTML = '<span class="status-dot status-checking"></span> Exploring...';
    }

    try {
      const result = await window.memoryExplorer.askArchive(userText, selectedPerson);

      const formattedHtml = window.memoryExplorer.formatAiResponse(result.reply, result.citedMemories);
      loadingMsgEl.innerHTML = `<div class="message-bubble">${formattedHtml}</div>`;

      loadingMsgEl.querySelectorAll('.citation-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const id = chip.getAttribute('data-id');
          if (id) this.openViewModal(id);
        });
      });

    } catch (err) {
      loadingMsgEl.innerHTML = `
        <div class="message-bubble" style="border-color: var(--danger-border); background-color: var(--danger-bg); color: var(--danger-text);">
          <strong>Inference Offline:</strong> ${this.escapeHtml(err.message)}
          <div style="margin-top: 0.5rem; font-size: 0.82rem;">
            Please ensure LM Studio Local Server is active at <code>http://127.0.0.1:1234</code> with a model loaded.
            <a href="#settings" style="color: #fff; text-decoration: underline; margin-left: 0.5rem;">Configure Settings</a>
          </div>
        </div>
      `;
    } finally {
      if (btnSend) {
        btnSend.disabled = false;
        btnSend.innerHTML = '<span class="send-icon">✦</span> Explore';
      }
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // --- MEDIA FILE UPLOAD & PREVIEW ---

  bindMediaUpload() {
    const fileInput = document.getElementById('form-file-input');
    const urlInput = document.getElementById('form-media-url');
    const previewImg = document.getElementById('form-media-preview');
    const previewAudio = document.getElementById('form-media-audio-preview');
    const audioName = document.getElementById('form-audio-name');
    const placeholder = document.getElementById('form-media-preview-placeholder');
    const statusIndicator = document.getElementById('upload-status-indicator');

    const updatePreview = (src) => {
      if (src && src.trim()) {
        const url = src.trim();
        if (this.isAudioUrl(url)) {
          if (previewImg) previewImg.classList.add('hidden');
          if (previewAudio) previewAudio.classList.remove('hidden');
          if (audioName) audioName.textContent = url.split('/').pop();
          if (placeholder) placeholder.classList.add('hidden');
        } else {
          if (previewAudio) previewAudio.classList.add('hidden');
          if (previewImg) {
            previewImg.src = url;
            previewImg.classList.remove('hidden');
          }
          if (placeholder) placeholder.classList.add('hidden');
        }
      } else {
        if (previewImg) previewImg.classList.add('hidden');
        if (previewAudio) previewAudio.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');
      }
    };

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
          window.appToast('File is too large (100MB limit).', 'error');
          return;
        }

        if (statusIndicator) {
          statusIndicator.classList.remove('hidden');
          statusIndicator.textContent = `Saving ${Math.round(file.size / 1024)} KB to archive...`;
        }

        const reader = new FileReader();
        reader.onload = async (uploadEv) => {
          const dataUrl = uploadEv.target.result;

          // Attempt local disk storage via /api/upload
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                dataUrl: dataUrl
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Upload failed (HTTP ${res.status})`);
            }

            const data = await res.json();
            if (urlInput) urlInput.value = data.url;
            updatePreview(data.url);
            window.appToast(`File saved to local storage: ${file.name}`, 'success');

          } catch (uploadErr) {
            console.warn('Local disk upload fallback to data URI:', uploadErr);
            if (file.size < 2 * 1024 * 1024) {
              if (urlInput) urlInput.value = dataUrl;
              updatePreview(dataUrl);
              window.appToast(`Stored in browser cache (offline fallback): ${file.name}`, 'info');
            } else {
              window.appToast(`Upload failed: ${uploadErr.message}. Ensure Back in Time server is running.`, 'error');
            }
          } finally {
            if (statusIndicator) statusIndicator.classList.add('hidden');
          }
        };

        reader.readAsDataURL(file);
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        updatePreview(e.target.value.trim());
      });
    }

    // Media type change auto-suggests formats
    const mediaTypeSelect = document.getElementById('form-media-type');
    const formatInput = document.getElementById('form-format-medium');
    if (mediaTypeSelect && formatInput) {
      mediaTypeSelect.addEventListener('change', (e) => {
        if (!formatInput.value.trim()) {
          switch (e.target.value) {
            case 'film': formatInput.value = 'Super 8mm Film Reel (Kodachrome)'; break;
            case 'video': formatInput.value = 'VHS SP Tape (Camcorder)'; break;
            case 'audio': formatInput.value = 'Compact Cassette Tape C-90'; break;
            case 'radio': formatInput.value = 'AM Radio Broadcast / Aircheck'; break;
            case 'photo': formatInput.value = '35mm Kodachrome Slide'; break;
            case 'television': formatInput.value = 'Archival Television Broadcast'; break;
            default: formatInput.value = ''; break;
          }
        }
      });
    }
  }

  // --- MODALS & CRUD BINDINGS ---

  bindModals() {
    const openAddModal = () => this.openMemoryFormModal();
    const btnQuickAdd = document.getElementById('btn-quick-add');
    const btnHeroAdd = document.getElementById('btn-hero-add');
    const btnArchiveAdd = document.getElementById('btn-archive-add');
    const btnEmptyAdd = document.getElementById('btn-empty-add');

    if (btnQuickAdd) btnQuickAdd.addEventListener('click', openAddModal);
    if (btnHeroAdd) btnHeroAdd.addEventListener('click', openAddModal);
    if (btnArchiveAdd) btnArchiveAdd.addEventListener('click', openAddModal);
    if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', openAddModal);

    const modal = document.getElementById('memory-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const closeModal = () => { if (modal) modal.classList.add('hidden'); };

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    const memoryForm = document.getElementById('memory-form');
    if (memoryForm) {
      memoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveMemoryFromForm();
      });
    }

    const viewModal = document.getElementById('view-modal');
    const btnCloseView = document.getElementById('btn-close-view');
    const closeView = () => { if (viewModal) viewModal.classList.add('hidden'); };
    if (btnCloseView) btnCloseView.addEventListener('click', closeView);

    const confirmModal = document.getElementById('confirm-modal');
    const btnCloseConfirm = document.getElementById('btn-close-confirm');
    const btnCancelConfirm = document.getElementById('btn-confirm-cancel');
    const closeConfirm = () => { if (confirmModal) confirmModal.classList.add('hidden'); };
    if (btnCloseConfirm) btnCloseConfirm.addEventListener('click', closeConfirm);
    if (btnCancelConfirm) btnCancelConfirm.addEventListener('click', closeConfirm);
  }

  bindQuickActions() {
    const btnEmptySample = document.getElementById('btn-empty-sample');
    if (btnEmptySample) {
      btnEmptySample.addEventListener('click', () => {
        window.archiveStorage.loadSamples();
        window.appToast('Audiovisual sample records loaded into archive.', 'success');
        this.refreshAll();
      });
    }
  }

  openMemoryFormModal(memory = null) {
    const modal = document.getElementById('memory-modal');
    const titleEl = document.getElementById('modal-memory-title');
    const form = document.getElementById('memory-form');

    const idInput = document.getElementById('form-memory-id');
    const titleInput = document.getElementById('form-title');
    const mediaTypeSelect = document.getElementById('form-media-type');
    const formatInput = document.getElementById('form-format-medium');
    const personInput = document.getElementById('form-person');
    const yearInput = document.getElementById('form-year');
    const isApproxInput = document.getElementById('form-is-approximate');
    const langInput = document.getElementById('form-language');
    const durationInput = document.getElementById('form-duration');
    const mediaUrlInput = document.getElementById('form-media-url');
    const previewImg = document.getElementById('form-media-preview');
    const placeholder = document.getElementById('form-media-preview-placeholder');
    const notesInput = document.getElementById('form-notes');
    const sourceInput = document.getElementById('form-source');
    const evidenceInput = document.getElementById('form-evidence');
    const tagsInput = document.getElementById('form-tags');

    if (!modal || !form) return;

    if (memory) {
      titleEl.textContent = 'Edit Audiovisual Record';
      idInput.value = memory.id;
      titleInput.value = memory.title || '';
      mediaTypeSelect.value = memory.mediaType || 'photo';
      formatInput.value = memory.formatMedium || '';
      personInput.value = memory.person || '';
      yearInput.value = memory.year || '';
      isApproxInput.checked = Boolean(memory.isApproximate);
      langInput.value = memory.language || 'English';
      durationInput.value = memory.mediaDuration || '';
      mediaUrlInput.value = memory.mediaUrl || '';
      notesInput.value = memory.notes || '';
      sourceInput.value = memory.source || '';
      evidenceInput.value = memory.evidenceCategory || 'family_recollection';
      tagsInput.value = (memory.tags || []).join(', ');

      if (memory.mediaUrl) {
        previewImg.src = memory.mediaUrl;
        previewImg.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } else {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');
      }
    } else {
      titleEl.textContent = 'Record Audiovisual Memory';
      form.reset();
      idInput.value = '';
      mediaTypeSelect.value = 'photo';
      formatInput.value = '35mm Kodachrome Slide';
      langInput.value = 'English';
      evidenceInput.value = 'family_recollection';
      previewImg.src = '';
      previewImg.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    titleInput.focus();
  }

  saveMemoryFromForm() {
    const idInput = document.getElementById('form-memory-id');
    const titleInput = document.getElementById('form-title');
    const mediaTypeSelect = document.getElementById('form-media-type');
    const formatInput = document.getElementById('form-format-medium');
    const personInput = document.getElementById('form-person');
    const yearInput = document.getElementById('form-year');
    const isApproxInput = document.getElementById('form-is-approximate');
    const langInput = document.getElementById('form-language');
    const durationInput = document.getElementById('form-duration');
    const mediaUrlInput = document.getElementById('form-media-url');
    const notesInput = document.getElementById('form-notes');
    const sourceInput = document.getElementById('form-source');
    const evidenceInput = document.getElementById('form-evidence');
    const tagsInput = document.getElementById('form-tags');

    const title = titleInput.value.trim();
    const person = personInput.value.trim();
    const notes = notesInput.value.trim();
    const source = sourceInput.value.trim();

    if (!title || !person || !notes || !source) {
      window.appToast('Please fill out all required fields.', 'error');
      return;
    }

    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const record = {
      id: idInput.value || undefined,
      title,
      person,
      year: yearInput.value.trim(),
      isApproximate: isApproxInput.checked,
      mediaType: mediaTypeSelect.value,
      formatMedium: formatInput.value.trim(),
      language: langInput.value.trim() || 'English',
      mediaDuration: durationInput.value.trim(),
      mediaUrl: mediaUrlInput.value.trim(),
      notes,
      source,
      evidenceCategory: evidenceInput.value,
      tags
    };

    try {
      const saved = window.archiveStorage.save(record);
      document.getElementById('memory-modal').classList.add('hidden');
      window.appToast(`Media record '${saved.title}' saved successfully.`, 'success');
      this.refreshAll();
    } catch (err) {
      window.appToast(err.message, 'error');
    }
  }

  openViewModal(id) {
    const memory = window.archiveStorage.getById(id);
    if (!memory) {
      window.appToast('Record not found.', 'error');
      return;
    }

    const modal = document.getElementById('view-modal');
    const heroMedia = document.getElementById('view-media-hero');
    const titleEl = document.getElementById('view-modal-title');
    const mediaBadge = document.getElementById('view-media-badge');
    const evBadge = document.getElementById('view-evidence-badge');
    const dateBadge = document.getElementById('view-date-badge');
    const personEl = document.getElementById('view-person');
    const mediumEl = document.getElementById('view-medium');
    const langEl = document.getElementById('view-language');
    const durationEl = document.getElementById('view-duration');
    const notesEl = document.getElementById('view-notes');
    const sourceEl = document.getElementById('view-source');
    const tagsContainer = document.getElementById('view-tags-container');
    const createdEl = document.getElementById('view-created-at');
    const updatedEl = document.getElementById('view-updated-at');

    const btnAskAi = document.getElementById('btn-view-ask-ai');
    const btnEdit = document.getElementById('btn-view-edit');
    const btnDelete = document.getElementById('btn-view-delete');

    if (!modal) return;

    if (heroMedia) {
      if (memory.mediaUrl) {
        if (this.isAudioUrl(memory.mediaUrl)) {
          heroMedia.innerHTML = `
            <div style="width: 100%; padding: 2.25rem 1.5rem; text-align: center; background: linear-gradient(180deg, #25164f 0%, #0d0721 100%);">
              <span style="font-size: 3.5rem; display: block; margin-bottom: 0.5rem; filter: drop-shadow(0 0 10px var(--neon-cyan));">🎙️</span>
              <div style="font-family: var(--font-mono); color: var(--neon-cyan); margin-bottom: 1.25rem; font-size: 0.95rem; font-weight: bold;">
                ${this.escapeHtml(memory.formatMedium || 'Audio Recording')}
              </div>
              <audio controls autoplay src="${this.escapeHtml(memory.mediaUrl)}" style="width: 90%; max-width: 480px;"></audio>
            </div>
          `;
        } else if (this.isVideoUrl(memory.mediaUrl)) {
          heroMedia.innerHTML = `
            <video controls autoplay src="${this.escapeHtml(memory.mediaUrl)}" style="width: 100%; max-height: 340px; background: #000;"></video>
          `;
        } else {
          heroMedia.innerHTML = `<img src="${this.escapeHtml(memory.mediaUrl)}" alt="${this.escapeHtml(memory.title)}">`;
        }
        heroMedia.classList.remove('hidden');
      } else {
        heroMedia.innerHTML = `<div style="font-size: 4rem; padding: 2rem;">${this.getMediaEmoji(memory.mediaType)}</div>`;
        heroMedia.classList.remove('hidden');
      }
    }

    titleEl.textContent = memory.title;
    personEl.textContent = memory.person;
    mediumEl.textContent = memory.formatMedium || 'Standard Archive Medium';
    langEl.textContent = memory.language || 'English';
    durationEl.textContent = memory.mediaDuration || 'Still Image / Full Reel';
    notesEl.textContent = memory.notes;
    sourceEl.textContent = memory.source;

    // Badges
    if (mediaBadge) {
      mediaBadge.textContent = window.archiveTimeline.formatMediaBadge(memory.mediaType);
      mediaBadge.style.backgroundColor = 'var(--neon-pink)';
      mediaBadge.style.color = '#fff';
    }

    evBadge.className = `badge badge-${memory.evidenceCategory}`;
    evBadge.textContent = window.archiveTimeline.formatEvidenceLabel(memory.evidenceCategory);

    const parsed = window.archiveTimeline.parseDate(memory.year, memory.isApproximate);
    dateBadge.textContent = parsed.year ? (parsed.isApprox ? `~ ${parsed.displayDate}` : parsed.displayDate) : 'Undated';

    if (tagsContainer) {
      tagsContainer.innerHTML = (memory.tags || []).map(t => `<span class="tag-chip">#${this.escapeHtml(t)}</span>`).join('');
    }

    if (createdEl) createdEl.textContent = memory.createdAt ? new Date(memory.createdAt).toLocaleDateString() : '--';
    if (updatedEl) updatedEl.textContent = memory.updatedAt ? new Date(memory.updatedAt).toLocaleDateString() : '--';

    btnEdit.onclick = () => {
      modal.classList.add('hidden');
      this.openMemoryFormModal(memory);
    };

    btnDelete.onclick = () => {
      window.appConfirm(
        'Delete Audiovisual Record',
        `Are you sure you want to permanently delete "${memory.title}"? This action cannot be reversed.`,
        () => {
          window.archiveStorage.delete(memory.id);
          modal.classList.add('hidden');
          window.appToast('Record deleted.', 'info');
          this.refreshAll();
        }
      );
    };

    btnAskAi.onclick = () => {
      modal.classList.add('hidden');
      window.location.hash = 'explorer';
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = `Tell me about what is preserved in "${memory.title}" (${memory.formatMedium || 'audiovisual recording'}), and what questions should I ask relatives?`;
        input.focus();
      }
    };

    modal.classList.remove('hidden');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// Global UI helpers
window.appToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.appConfirm = function(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const btnOk = document.getElementById('btn-confirm-ok');

  if (!modal || !titleEl || !msgEl || !btnOk) return;

  titleEl.textContent = title;
  msgEl.textContent = message;

  btnOk.onclick = () => {
    modal.classList.add('hidden');
    if (onConfirm) onConfirm();
  };

  modal.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
  window.app = new BackInTimeApp();
  window.app.init();
});
