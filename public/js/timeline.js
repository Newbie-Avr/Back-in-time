/**
 * Back in Time — Audiovisual Timeline Module
 * Organizes films, videos, cassette recordings, and radio broadcasts chronologically.
 */

class ArchiveTimeline {
  parseDate(dateString, isExplicitApprox = false) {
    if (!dateString || typeof dateString !== 'string' || !dateString.trim()) {
      return { year: null, displayDate: 'Undated', isApprox: false };
    }

    const raw = dateString.trim();
    let isApprox = isExplicitApprox || /circa|c\.|~|approx|about|\b\d{4}s\b/i.test(raw);

    const match = raw.match(/\b(17\d{2}|18\d{2}|19\d{2}|20\d{2})\b/);
    if (!match) {
      return { year: null, displayDate: raw, isApprox: true };
    }

    const year = parseInt(match[1], 10);
    return {
      year,
      displayDate: raw,
      isApprox
    };
  }

  organizeMemories(memories) {
    const dated = [];
    const undated = [];

    for (const mem of memories) {
      const parsed = this.parseDate(mem.year, mem.isApproximate);
      if (parsed.year !== null) {
        dated.push({
          ...mem,
          parsedYear: parsed.year,
          displayDate: parsed.displayDate,
          effectiveApprox: parsed.isApprox
        });
      } else {
        undated.push(mem);
      }
    }

    dated.sort((a, b) => {
      if (a.parsedYear !== b.parsedYear) {
        return a.parsedYear - b.parsedYear;
      }
      return (a.year || '').localeCompare(b.year || '');
    });

    return { dated, undated };
  }

  renderTimeline(containerId, undatedContainerId, memories, onSelectMemory) {
    const timelineEl = document.getElementById(containerId);
    const undatedEl = document.getElementById(undatedContainerId);
    const undatedCountBadge = document.getElementById('undated-count-badge');

    if (!timelineEl || !undatedEl) return;

    const { dated, undated } = this.organizeMemories(memories);

    // Render Dated Entries
    if (dated.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⏳</div>
          <h3 class="empty-title">No dated audiovisual memories yet</h3>
          <p class="empty-text">Record films, cassettes, or radio airchecks with dates to populate your timeline.</p>
        </div>
      `;
    } else {
      let html = '';
      dated.forEach(item => {
        const approxClass = item.effectiveApprox ? 'approx' : '';
        const approxPrefix = item.effectiveApprox ? '~ ' : '';
        const badgeClass = `badge-${item.evidenceCategory}`;
        const evidenceLabel = this.formatEvidenceLabel(item.evidenceCategory);
        const mediaBadge = this.formatMediaBadge(item.mediaType);

        let mediaThumb = '';
        if (item.mediaUrl) {
          if (this.isAudioUrl(item.mediaUrl)) {
            mediaThumb = `
              <div class="memory-card-media" style="height: auto; padding: 0.75rem; margin-bottom: 0.75rem; background: #190f38;">
                <audio controls preload="none" src="${this.escapeHtml(item.mediaUrl)}" style="width: 100%; height: 34px;"></audio>
              </div>
            `;
          } else if (this.isVideoUrl(item.mediaUrl)) {
            mediaThumb = `
              <div class="memory-card-media" style="height: 140px; margin-bottom: 0.75rem;">
                <video controls preload="metadata" src="${this.escapeHtml(item.mediaUrl)}" style="width: 100%; height: 100%; object-fit: cover;"></video>
              </div>
            `;
          } else {
            mediaThumb = `
              <div class="memory-card-media" style="height: 140px; margin-bottom: 0.75rem;">
                <img src="${this.escapeHtml(item.mediaUrl)}" alt="${this.escapeHtml(item.title)}" loading="lazy">
              </div>
            `;
          }
        }

        html += `
          <div class="timeline-entry" data-id="${item.id}">
            <div class="timeline-date-col">
              <span class="timeline-year-badge ${approxClass}">
                ${approxPrefix}${item.displayDate}
              </span>
            </div>
            <div class="timeline-node ${approxClass}"></div>
            <div class="timeline-content-card" data-action="view" data-id="${item.id}">
              ${mediaThumb}
              <div class="memory-card-header">
                <div class="badge-row">
                  <span class="badge" style="background-color: var(--neon-pink); color: #fff;">${mediaBadge}</span>
                  <span class="badge ${badgeClass}">${evidenceLabel}</span>
                </div>
              </div>
              <h3 class="memory-card-title">${this.escapeHtml(item.title)}</h3>
              <div class="memory-card-meta-line">
                <span>👤 ${this.escapeHtml(item.person)}</span>
                ${item.formatMedium ? `<span>📼 ${this.escapeHtml(item.formatMedium)}</span>` : ''}
                ${item.language ? `<span>🌍 ${this.escapeHtml(item.language)}</span>` : ''}
              </div>
              <p class="memory-card-notes">${this.escapeHtml(item.notes)}</p>
              <div class="memory-card-source"><strong>Source:</strong> ${this.escapeHtml(item.source)}</div>
            </div>
          </div>
        `;
      });
      timelineEl.innerHTML = html;
    }

    // Render Undated Entries
    if (undatedCountBadge) {
      undatedCountBadge.textContent = `${undated.length} record${undated.length === 1 ? '' : 's'}`;
    }

    if (undated.length === 0) {
      undatedEl.innerHTML = `
        <div style="grid-column: 1 / -1; color: var(--text-dim); font-size: 0.9rem; padding: 1rem 0;">
          All cataloged audiovisual recordings currently have dates or approximate eras.
        </div>
      `;
    } else {
      let undatedHtml = '';
      undated.forEach(item => {
        const badgeClass = `badge-${item.evidenceCategory}`;
        const evidenceLabel = this.formatEvidenceLabel(item.evidenceCategory);
        const mediaBadge = this.formatMediaBadge(item.mediaType);

        let mediaThumb = '';
        if (item.mediaUrl) {
          if (this.isAudioUrl(item.mediaUrl)) {
            mediaThumb = `
              <div class="memory-card-media" style="height: auto; padding: 0.75rem; margin-bottom: 0.75rem; background: #190f38;">
                <audio controls preload="none" src="${this.escapeHtml(item.mediaUrl)}" style="width: 100%; height: 34px;"></audio>
              </div>
            `;
          } else if (this.isVideoUrl(item.mediaUrl)) {
            mediaThumb = `
              <div class="memory-card-media" style="height: 140px; margin-bottom: 0.75rem;">
                <video controls preload="metadata" src="${this.escapeHtml(item.mediaUrl)}" style="width: 100%; height: 100%; object-fit: cover;"></video>
              </div>
            `;
          } else {
            mediaThumb = `
              <div class="memory-card-media" style="height: 140px; margin-bottom: 0.75rem;">
                <img src="${this.escapeHtml(item.mediaUrl)}" alt="${this.escapeHtml(item.title)}" loading="lazy">
              </div>
            `;
          }
        }

        undatedHtml += `
          <div class="memory-card-3d" data-id="${item.id}">
            ${mediaThumb}
            <div class="memory-card-header">
              <span class="badge" style="background-color: var(--neon-pink); color: #fff;">${mediaBadge}</span>
              <span class="badge ${badgeClass}">${evidenceLabel}</span>
              <span class="badge badge-muted">Undated</span>
            </div>
            <h3 class="memory-card-title">${this.escapeHtml(item.title)}</h3>
            <div class="memory-card-meta-line">
              <span>👤 ${this.escapeHtml(item.person)}</span>
            </div>
            <p class="memory-card-notes">${this.escapeHtml(item.notes)}</p>
            <div class="memory-card-footer">
              <button class="btn btn-neon-yellow btn-sm" data-action="view" data-id="${item.id}">Inspect Record</button>
            </div>
          </div>
        `;
      });
      undatedEl.innerHTML = undatedHtml;
    }

    const clickTargets = document.querySelectorAll('#' + containerId + ' [data-action="view"], #' + undatedContainerId + ' [data-action="view"]');
    clickTargets.forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id && onSelectMemory) {
          onSelectMemory(id);
        }
      });
    });
  }

  formatEvidenceLabel(cat) {
    switch (cat) {
      case 'documented': return '📜 Documented';
      case 'family_recollection': return '🗣️ Recollection';
      case 'possible_interpretation': return '💡 Interpretation';
      case 'uncertain': return '❓ Uncertain';
      default: return cat;
    }
  }

  formatMediaBadge(type) {
    switch (type) {
      case 'film': return '🎞️ Film Reel';
      case 'video': return '📼 VHS / Video';
      case 'audio': return '🎙️ Cassette / Audio';
      case 'radio': return '📻 Radio Broadcast';
      case 'photo': return '📸 Kodachrome Slide';
      case 'television': return '📺 Television';
      case 'document': return '📜 Document';
      default: return '📼 Media';
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

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.archiveTimeline = new ArchiveTimeline();
