/**
 * ReflectionComponent
 * Single responsibility: Render reflection sections as structured widgets
 * Based on 5 research sub-questions (Workflow, Autorschaft, Iteration, Scheitern, Ästhetik)
 */
export class ReflectionComponent {
  /**
   * Questions based on the 5 research sub-questions
   * Main research question: "Wie verändert der Einsatz generativer KI-Werkzeuge meinen kreativen Arbeitsprozess?"
   */
  static QUESTIONS = {
    kontext: {
      tools: 'Tools',
      intention: 'Intention'
    },
    forschung: {
      workflow: 'Workflow',
      autorschaft: 'Autorschaft',
      iteration: 'Iteration',
      scheitern: 'Scheitern',
      aesthetik: 'Ästhetik'
    },
    synthese: {
      erkenntnis: 'Zentrale Erkenntnis',
      offen: 'Offene Frage'
    }
  };

  /**
   * Section titles (German)
   */
  static SECTIONS = {
    kontext: 'Kontext',
    forschung: 'Die 5 Forschungsfragen',
    synthese: 'Synthese'
  };

  /**
   * Parse reflection section from markdown
   * @param {string} markdown - Full markdown text
   * @returns {Object} Object with hasReflection, reflectionData, and markdownWithoutReflection
   */
  static parseReflection(markdown) {
    // Find ## Reflexion section
    const reflectionMatch = markdown.match(/^## Reflexion\s*$/m);

    if (!reflectionMatch) {
      return {
        hasReflection: false,
        reflectionData: null,
        markdownWithoutReflection: markdown
      };
    }

    const reflectionStart = reflectionMatch.index;
    const beforeReflection = markdown.substring(0, reflectionStart);
    const reflectionSection = markdown.substring(reflectionStart);

    // Parse the reflection content
    const reflectionData = this.parseReflectionContent(reflectionSection);

    return {
      hasReflection: true,
      reflectionData,
      markdownWithoutReflection: beforeReflection.trim()
    };
  }

  /**
   * Parse reflection content into structured data
   * New format based on 5 research sub-questions + interview transcript
   * @param {string} reflectionMarkdown - Markdown starting with ## Reflexion
   * @returns {Object} Structured reflection data
   */
  static parseReflectionContent(reflectionMarkdown) {
    const data = {
      kontext: { tools: '', intention: '' },
      forschung: { workflow: '', autorschaft: '', iteration: '', scheitern: '', aesthetik: '' },
      synthese: { erkenntnis: '', offen: '' },
      keywords: [],
      transcript: [],  // Chat transcript array
      summary: ''      // Narrative summary text
    };

    // Extract keywords (hashtags)
    const keywordMatches = reflectionMarkdown.match(/#([\w-]+)/g);
    if (keywordMatches) {
      data.keywords = keywordMatches.map(k => k.substring(1));
    }

    // Extract chat transcript from <div class="interview-transcript">
    // Use greedy match to capture all nested divs until the final closing tag
    const transcriptMatch = reflectionMarkdown.match(/<div class="interview-transcript">([\s\S]*)<\/div>\s*$/);
    if (transcriptMatch) {
      data.transcript = this.parseTranscript(transcriptMatch[1]);
    }

    // Extract summary (text between ## Reflexion and first ### or **Keywords:**)
    const summaryMatch = reflectionMarkdown.match(/## Reflexion\s*\n+([\s\S]*?)(?=\n###|\n\*\*Keywords|\n<div class="interview)/);
    if (summaryMatch) {
      data.summary = summaryMatch[1].trim();
    }

    // Parse sections
    const lines = reflectionMarkdown.split('\n');
    let currentMainSection = null;
    let currentField = null;
    let currentContent = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headers and special lines
      if (trimmed.startsWith('## Reflexion') ||
          trimmed.startsWith('**Keywords:**') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('</div')) {
        continue;
      }

      // Detect main sections (### Kontext, ### Die 5 Forschungsfragen, ### Synthese)
      const sectionMatch = trimmed.match(/^### (Kontext|Die 5 Forschungsfragen|Synthese)\s*$/);
      if (sectionMatch) {
        if (currentField && currentContent.length > 0) {
          this.setFieldValue(data, currentMainSection, currentField, currentContent.join(' '));
        }
        currentMainSection = this.getSectionKey(sectionMatch[1]);
        currentField = null;
        currentContent = [];
        continue;
      }

      // Detect field labels (- **Tools:** ...)
      const fieldMatch = trimmed.match(/^-\s*\*\*([^:]+):\*\*\s*(.*)$/);
      if (fieldMatch) {
        if (currentField && currentContent.length > 0) {
          this.setFieldValue(data, currentMainSection, currentField, currentContent.join(' '));
        }
        const fieldName = fieldMatch[1].trim();
        currentField = this.getFieldKey(fieldName);
        currentContent = fieldMatch[2].trim() ? [fieldMatch[2].trim()] : [];
        continue;
      }

      // Regular continuation line
      if (trimmed && currentField) {
        currentContent.push(trimmed);
      }
    }

    if (currentField && currentContent.length > 0) {
      this.setFieldValue(data, currentMainSection, currentField, currentContent.join(' '));
    }

    return data;
  }

  /**
   * Parse interview transcript HTML into array of messages
   */
  static parseTranscript(html) {
    const messages = [];
    // Match the full structure: chat-message -> chat-avatar -> chat-bubble with p tag
    const messageRegex = /<div class="chat-message (claude|user)">\s*<div class="chat-avatar">[\s\S]*?<\/div>\s*<div class="chat-bubble"><p>([\s\S]*?)<\/p><\/div>\s*<\/div>/g;
    let match;

    while ((match = messageRegex.exec(html)) !== null) {
      messages.push({
        role: match[1],
        content: match[2].trim()
      });
    }
    return messages;
  }

  /**
   * Get section key from German name
   */
  static getSectionKey(germanName) {
    const mapping = {
      'Kontext': 'kontext',
      'Die 5 Forschungsfragen': 'forschung',
      'Synthese': 'synthese'
    };
    return mapping[germanName] || null;
  }

  /**
   * Get field key from label
   */
  static getFieldKey(label) {
    const mapping = {
      // Kontext
      'Tools': 'tools',
      'Intention': 'intention',
      // Forschungsfragen
      'Workflow': 'workflow',
      'Autorschaft': 'autorschaft',
      'Iteration': 'iteration',
      'Scheitern': 'scheitern',
      'Ästhetik': 'aesthetik',
      // Synthese
      'Zentrale Erkenntnis': 'erkenntnis',
      'Offene Frage': 'offen'
    };
    return mapping[label] || null;
  }

  /**
   * Set field value in data object
   */
  static setFieldValue(data, section, field, value) {
    if (section && field && data[section]) {
      data[section][field] = value;
    }
  }

  /**
   * Create reflection widget HTML
   * @param {Object} reflectionData - Parsed reflection data
   * @returns {string} HTML string
   */
  static createWidget(reflectionData) {
    if (!reflectionData) return '';

    const id = `reflection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const transcriptId = `transcript-${id}`;
    const infoId = `info-${id}`;

    // Build info box HTML with methodology explanation
    const infoBoxHTML = `
      <div class="reflection-info-box" id="${infoId}">
        <div class="reflection-info-content">
          <p><strong>Methodischer Rahmen</strong></p>
          <p>Diese Reflexionen folgen dem Ansatz der <em>Autoethnographie</em> (Ellis et al., 2011) –
          einer Forschungsmethode, die persönliche Erfahrungen systematisch analysiert,
          um kulturelle Praktiken zu verstehen. Die Struktur basiert auf <em>Reflection-in-Action</em> (Schön, 1983).</p>

          <p><strong>Die Forschungsfrage</strong></p>
          <p><em>„Wie verändert der Einsatz multimodaler KI-Systeme (Text, Bild, Audio) den kreativen Prozess bei der Entwicklung einer digitalen Künstleridentität?"</em></p>

          <p><strong>Interview-Prozess</strong></p>
          <p>Nach jeder dokumentierten Session wird ein strukturiertes Interview mit Claude Code durchgeführt.
          Der Prozess folgt einem definierten Skill (<code>/reflection-interview</code>), der dieselben Fragen
          in derselben Reihenfolge stellt, um Vergleichbarkeit zu gewährleisten.</p>

          <p><strong>Die 5 Unterfragen</strong></p>
          <ol class="reflection-subquestions">
            <li><strong>Workflow:</strong> Welche neuen Arbeitsschritte entstehen? Welche fallen weg?</li>
            <li><strong>Autorschaft:</strong> Wer ist Autor:in? Wie verschiebt sich meine Rolle?</li>
            <li><strong>Iteration:</strong> Wie beeinflusst die Unmittelbarkeit von KI-Output meinen Prozess?</li>
            <li><strong>Scheitern:</strong> Was lerne ich aus fehlgeschlagenen Experimenten?</li>
            <li><strong>Ästhetik:</strong> Entwickelt sich eine eigene visuelle Sprache?</li>
          </ol>
          <p>Zusätzlich wird eine kontextuelle Frage basierend auf dem spezifischen Journal-Eintrag generiert.</p>

          <div class="reflection-info-refs">
            <span>Ellis, C., Adams, T. E., & Bochner, A. P. (2011). Autoethnography: An Overview.</span>
            <span>Schön, D. A. (1983). The Reflective Practitioner.</span>
          </div>
        </div>
      </div>
    `;

    // Build keywords HTML
    const keywordsHTML = reflectionData.keywords.length > 0
      ? `<div class="reflection-keywords">
          ${reflectionData.keywords.map(k => `<span class="reflection-keyword">#${k}</span>`).join('')}
        </div>`
      : '';

    // Build summary HTML (bullet-point overview)
    const summaryHTML = reflectionData.summary
      ? `<div class="reflection-summary">${this.formatSummary(reflectionData.summary)}</div>`
      : '';

    // Build transcript HTML
    const transcriptHTML = reflectionData.transcript && reflectionData.transcript.length > 0
      ? this.createTranscriptDropdown(reflectionData.transcript, transcriptId)
      : '';

    return `
      <div class="reflection-widget" id="${id}">
        <div class="reflection-header">
          <div class="reflection-icon">◈</div>
          <div class="reflection-title">Reflexion</div>
          <div class="reflection-subtitle">Interview-basierte Dokumentation</div>
          <button class="reflection-info-toggle" onclick="toggleReflectionInfo('${infoId}')" title="Was ist das?">
            <span class="reflection-info-icon">?</span>
          </button>
        </div>
        ${infoBoxHTML}
        ${keywordsHTML}
        ${summaryHTML}
        ${transcriptHTML}
      </div>
    `;
  }

  /**
   * Create transcript dropdown with chat bubbles
   */
  static createTranscriptDropdown(transcript, id) {
    const messagesHTML = transcript.map(msg => {
      const isUser = msg.role === 'user';
      const avatarSrc = isUser ? 'assets/icons/user.png' : 'assets/icons/claude.svg';
      const avatarAlt = isUser ? 'Jennifer' : 'Claude';

      return `
        <div class="transcript-message ${msg.role}">
          <img class="transcript-avatar" src="${avatarSrc}" alt="${avatarAlt}">
          <div class="transcript-bubble">${msg.content}</div>
        </div>
      `;
    }).join('');

    return `
      <details class="reflection-transcript" id="${id}">
        <summary class="transcript-toggle">
          <span>Interview-Transkript</span>
          <span class="transcript-chevron">&#9662;</span>
        </summary>
        <div class="transcript-content">
          ${messagesHTML}
        </div>
      </details>
    `;
  }

  /**
   * Format summary as bullet-point list
   */
  static formatSummary(text) {
    if (!text) return '';

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const bulletLines = lines.filter(l => l.startsWith('- '));

    if (bulletLines.length > 0) {
      const items = bulletLines.map(l => {
        const content = l.substring(2);
        // Match **Label:** value pattern
        const labelMatch = content.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
        if (labelMatch) {
          return `<span class="summary-item"><span class="summary-label">${labelMatch[1]}</span><span class="summary-value">${this.formatAnswer(labelMatch[2])}</span></span>`;
        }
        return `<span class="summary-item"><span class="summary-value">${this.formatAnswer(content)}</span></span>`;
      }).join('');
      return `<div class="reflection-summary-flow">${items}</div>`;
    }

    return this.formatAnswer(text);
  }

  /**
   * Format answer text (handle lists, links, etc.)
   */
  static formatAnswer(text) {
    if (!text) return '';

    // Convert markdown bold
    let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert markdown italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert markdown links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="reflection-link">$1</a>');

    // Highlight hashtags
    formatted = formatted.replace(/#(\w+)/g, '<span class="reflection-keyword-inline">#$1</span>');

    return formatted;
  }
}

/**
 * Global function for toggling reflection info box
 * Called from onclick in HTML
 * @param {string} id - Info box ID
 */
window.toggleReflectionInfo = function(id) {
  const infoBox = document.getElementById(id);
  const button = infoBox ? infoBox.previousElementSibling?.querySelector('.reflection-info-toggle') : null;

  if (infoBox) {
    infoBox.classList.toggle('show');
    if (button) {
      button.classList.toggle('active');
    }
  }
};
