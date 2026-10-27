/**
 * Back in Time — Conversational Memory Explorer
 * Audiovisual Heritage Edition: Interfaces with local LM Studio AI,
 * supplies audiovisual dossiers (films, tapes, radio, languages), and renders interactive citations.
 */

class MemoryExplorer {
  constructor() {
    this.conversationHistory = [];
    this.isLoading = false;
  }

  getRelevantMemories(query, selectedPerson = 'all') {
    const allMemories = window.archiveStorage.getAll();
    if (allMemories.length === 0) return [];

    let candidates = allMemories;
    if (selectedPerson && selectedPerson !== 'all') {
      const pLower = selectedPerson.toLowerCase();
      candidates = candidates.filter(m => m.person.toLowerCase().includes(pLower));
    }

    if (candidates.length <= 30) {
      return candidates;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = candidates.map(item => {
      let score = 0;
      const haystack = `${item.title} ${item.person} ${item.year} ${item.notes} ${item.source} ${item.mediaType} ${item.formatMedium} ${item.language} ${item.tags.join(' ')}`.toLowerCase();
      for (const term of terms) {
        if (haystack.includes(term)) {
          score += 1;
        }
      }
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter(s => s.score > 0).slice(0, 20).map(s => s.item);
  }

  formatContextDossier(memories) {
    if (memories.length === 0) {
      return "NO SAVED AUDIOVISUAL MEMORY RECORDS FOUND IN ARCHIVE.";
    }

    return memories.map((m, index) => {
      return `--- RECORD #${index + 1} (ID: ${m.id}) ---
TITLE: ${m.title}
MEDIA TYPE: ${(m.mediaType || 'media').toUpperCase()}
PHYSICAL MEDIUM / FORMAT: ${m.formatMedium || 'Standard'}
LANGUAGE / DIALECT: ${m.language || 'English'}
RECORDING EXTENT / DURATION: ${m.mediaDuration || 'Unspecified'}
SUBJECT / PERSONS: ${m.person}
DATE / YEAR: ${m.year ? (m.isApproximate ? `Approx. ${m.year}` : m.year) : 'Undated'}
EVIDENCE CLASS: ${m.evidenceCategory.toUpperCase()}
SOURCE OF RECORD / PROVENANCE: ${m.source}
TAGS: ${m.tags.join(', ') || 'None'}
AUDIO TRANSCRIPT, SCENE NOTES & NARRATIVE:
${m.notes}
`;
    }).join('\n');
  }

  buildSystemPrompt(memories) {
    const dossier = this.formatContextDossier(memories);

    return `You are "Back in Time", an expert archival historian and audiovisual preservation specialist celebrating World Day for Audiovisual Heritage.
Your mission is preserving personal, family, and cultural memories recorded on films, videotapes, audio cassettes, radio broadcasts, television telecasts, and photographs across diverse languages and dialects.

=== STRICT ARCHIVAL RULES (MANDATORY) ===
1. You must NEVER invent family stories, fabricate quotations, claim to have personally experienced past events, or pretend to know the private thoughts or emotions of deceased people.
2. In EVERY response where you discuss family events or media recordings, you MUST explicitly separate and categorize the facts into these four categories:
   - 📜 Documented Information: Facts firmly verified by a cited film reel, tape recording, radio aircheck, slide, or primary source.
   - 🗣️ Family Recollection: Oral memories recalled by family members or spoken on tape; valuable but subjective.
   - 💡 Possible Interpretation: Reasonable logical inferences, cultural context of the era, or hypotheses—never presented as fact.
   - ❓ Unknown / Missing Information: Critical gaps, unrecorded dates, missing footage, or details where evidence is completely lacking.
3. Suggest 2-3 specific, thoughtful interview questions the user can ask living relatives to help uncover missing audiovisual context or interpret oral tapes.
4. When discussing recordings, note the medium (e.g. Super 8 film, VHS tape, C-90 cassette, radio broadcast, Kodachrome slide) and language/dialect where relevant.
5. In your response, explicitly cite which Record ID (e.g. [Record #mem_av_001]) you drew each detail from.

=== AUDIOVISUAL HERITAGE ARCHIVE DOSSIER (ACTIVE RECORDS) ===
${dossier}
================================================`;
  }

  async askArchive(userQuery, selectedPerson = 'all') {
    if (this.isLoading) return;
    this.isLoading = true;

    const settings = window.archiveStorage.getSettings();
    const relevantMemories = this.getRelevantMemories(userQuery, selectedPerson);
    const systemPrompt = this.buildSystemPrompt(relevantMemories);

    const messages = [
      { role: "system", content: systemPrompt },
      ...this.conversationHistory.slice(-6),
      { role: "user", content: userQuery }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: settings.lmStudioBaseUrl,
          model: settings.modelId || undefined,
          messages,
          max_tokens: parseInt(settings.maxTokens, 10) || 900,
          temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `LM Studio error (HTTP ${response.status})`);
      }

      const data = await response.json();
      const aiReply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "No response text received from LM Studio.";

      this.conversationHistory.push({ role: "user", content: userQuery });
      this.conversationHistory.push({ role: "assistant", content: aiReply });

      return {
        reply: aiReply,
        citedMemories: relevantMemories
      };

    } finally {
      this.isLoading = false;
    }
  }

  formatAiResponse(text, citedMemories = []) {
    let cleanText = this.escapeHtml(text);

    cleanText = cleanText
      .replace(/(?:###?\s*(?:\d+\.\s*)?|\*\*(?:\d+\.\s*)?)(?:📜\s*)?(?:1\.\s*)?(?:Documented Information|Documented Facts|Documented Records?)(?:\*\*)?:?/gi,
        '<div class="evidence-block ev-documented"><div class="ev-header">📜 Documented Information</div><div class="ev-body">')
      .replace(/(?:###?\s*(?:\d+\.\s*)?|\*\*(?:\d+\.\s*)?)(?:🗣️\s*)?(?:2\.\s*)?(?:Family Recollection|Family Lore|Oral Recollections?)(?:\*\*)?:?/gi,
        '</div></div><div class="evidence-block ev-recollection"><div class="ev-header">🗣️ Family Recollection</div><div class="ev-body">')
      .replace(/(?:###?\s*(?:\d+\.\s*)?|\*\*(?:\d+\.\s*)?)(?:💡\s*)?(?:3\.\s*)?(?:Possible Interpretation|Interpretation|Possible Interpretations?)(?:\*\*)?:?/gi,
        '</div></div><div class="evidence-block ev-interpretation"><div class="ev-header">💡 Possible Interpretation</div><div class="ev-body">')
      .replace(/(?:###?\s*(?:\d+\.\s*)?|\*\*(?:\d+\.\s*)?)(?:❓\s*)?(?:4\.\s*)?(?:Unknown Information|Missing Information|Unknowns?|Gaps?)(?:\*\*)?:?/gi,
        '</div></div><div class="evidence-block ev-unknown"><div class="ev-header">❓ Unknown / Missing Information</div><div class="ev-body">')
      .replace(/(?:###?\s*(?:\d+\.\s*)?|\*\*(?:\d+\.\s*)?)(?:🧭\s*)?(?:5\.\s*)?(?:Questions? for Relatives|Questions? to Ask|Next Steps?)(?:\*\*)?:?/gi,
        '</div></div><div class="evidence-block" style="border-color: var(--neon-yellow);"><div class="ev-header" style="color: var(--neon-yellow);">🧭 Questions for Relatives</div><div class="ev-body">');

    if (cleanText.includes('<div class="evidence-block')) {
      cleanText += '</div></div>';
    }

    const formattedBody = cleanText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    let citationsHtml = '';
    if (citedMemories && citedMemories.length > 0) {
      const chips = citedMemories.map(m => {
        const icon = m.mediaType === 'film' ? '🎞️' : (m.mediaType === 'audio' ? '🎙️' : (m.mediaType === 'video' ? '📼' : (m.mediaType === 'radio' ? '📻' : '📸')));
        return `<button class="citation-chip" data-action="view" data-id="${m.id}" title="Inspect: ${this.escapeHtml(m.title)}">${icon} ${this.escapeHtml(m.title)}</button>`;
      }).join(' ');

      citationsHtml = `
        <div class="citations-box">
          <div class="citations-title">Archival Media Consulted (${citedMemories.length}):</div>
          <div class="citation-chips">${chips}</div>
        </div>
      `;
    }

    return formattedBody + citationsHtml;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

window.memoryExplorer = new MemoryExplorer();
