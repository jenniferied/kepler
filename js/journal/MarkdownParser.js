/**
 * MarkdownParser
 * Single responsibility: Parse markdown to HTML
 * Handles custom syntax including world-info dropdowns and reflection widgets
 */
import { WorldInfoComponent } from './WorldInfoComponent.js';
import { ReflectionComponent } from './ReflectionComponent.js';

export class MarkdownParser {
  constructor() {
    // Link placeholder for protecting existing HTML during URL parsing
    this.linkPlaceholder = '___LINK_PLACEHOLDER___';
  }

  /**
   * Parse markdown to HTML
   * @param {string} markdown - Raw markdown text
   * @param {Object} options - Parsing options
   * @param {string} options.title - Entry title
   * @param {Date} options.date - Entry date
   * @param {string} options.time - Entry time
   * @returns {string} HTML string
   */
  parse(markdown, options = {}) {
    // Pre-process: Extract reflection section (renders as special widget)
    const { hasReflection, reflectionData, markdownWithoutReflection } =
      ReflectionComponent.parseReflection(markdown);

    // Pre-process world info components
    const { processedText, worldInfoMap } = WorldInfoComponent.parseWorldInfo(markdownWithoutReflection);

    // Parse into sections
    const sections = this.parseIntoSections(processedText);

    // If no sections (no headings), fall back to simple parsing
    if (sections.sections.length === 0 && sections.introText.length === 0) {
      let html = this.parseSimple(markdownWithoutReflection);
      // Add reflection widget if present
      if (hasReflection && reflectionData) {
        html += ReflectionComponent.createWidget(reflectionData);
      }
      return html;
    }

    // Build grid HTML with sections
    let html = this.buildGridHTML(sections, options, worldInfoMap);

    // Add reflection widget at the end (outside the grid, full width)
    if (hasReflection && reflectionData) {
      html += ReflectionComponent.createWidget(reflectionData);
    }

    // Post-process: convert URLs to links
    return this.convertURLsToLinks(html);
  }

  /**
   * Parse markdown into sections based on headings
   * @param {string} markdown - Processed markdown text
   * @returns {Object} Object with introText and sections arrays
   */
  parseIntoSections(markdown) {
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = { heading: null, headingLevel: null, content: [] };
    let currentParagraph = [];
    let hasSections = false;
    let introText = [];
    
    let inTable = false;
    let tableLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');

      // Table handling: collect consecutive table lines as one block
      if (isTableLine) {
        if (!inTable) {
          // Flush current paragraph before starting table
          if (currentParagraph.length > 0) {
            if (currentSection.heading) {
              currentSection.content.push(currentParagraph.join(' '));
            } else {
              introText.push(currentParagraph.join(' '));
            }
            currentParagraph = [];
          }
          inTable = true;
          tableLines = [];
        }
        tableLines.push(trimmed);
        continue;
      } else if (inTable) {
        // End of table block — push joined with newlines
        const tableBlock = tableLines.join('\n');
        if (currentSection.heading) {
          currentSection.content.push(tableBlock);
        } else {
          introText.push(tableBlock);
        }
        inTable = false;
        tableLines = [];
      }

      // Detect heading (#, ##, ###)
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        hasSections = true;

        // Close current paragraph
        if (currentParagraph.length > 0) {
          if (currentSection.heading) {
            currentSection.content.push(currentParagraph.join(' '));
          } else {
            introText.push(currentParagraph.join(' '));
          }
          currentParagraph = [];
        }

        // Close current section
        if (currentSection.heading || currentSection.content.length > 0) {
          sections.push(currentSection);
        }

        // Start new section
        const headingLevel = headingMatch[1].length;
        let headingText = headingMatch[2].trim().replace(/^#+\s*/, '');

        currentSection = {
          heading: headingText,
          headingLevel: headingLevel,
          content: []
        };
        continue;
      }

      // Handle lines that start with # but aren't valid headings
      if (trimmed.startsWith('#') && !trimmed.match(/^#{1,3}\s+/)) {
        currentParagraph.push(trimmed.replace(/^#+\s*/, ''));
        continue;
      }

      // Empty line - end paragraph
      if (trimmed === '') {
        if (currentParagraph.length > 0) {
          if (currentSection.heading) {
            currentSection.content.push(currentParagraph.join(' '));
          } else {
            introText.push(currentParagraph.join(' '));
          }
          currentParagraph = [];
        }
        continue;
      }

      // Normal line - add to current paragraph
      currentParagraph.push(trimmed);
    }

    // Flush trailing table
    if (inTable && tableLines.length > 0) {
      const tableBlock = tableLines.join('\n');
      if (currentSection.heading) {
        currentSection.content.push(tableBlock);
      } else {
        introText.push(tableBlock);
      }
    }
    
    // Close last paragraph and section
    if (currentParagraph.length > 0) {
      if (currentSection.heading) {
        currentSection.content.push(currentParagraph.join(' '));
      } else {
        introText.push(currentParagraph.join(' '));
      }
    }
    if (currentSection.heading || currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return { introText, sections, hasSections };
  }

  /**
   * Convert markdown table lines to HTML table
   * @param {string} tableBlock - Newline-joined markdown table lines
   * @returns {string} HTML table string
   */
  formatTable(tableBlock) {
    const lines = tableBlock.split('\n').filter(l => l.trim());
    if (lines.length < 2) return `<p class="mb-4">${tableBlock}</p>`;

    const parseRow = (line) =>
      line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);

    const headers = parseRow(lines[0]);
    const dataRows = lines.slice(2); // skip header + separator

    let html = '<div class="table-scroll"><table class="bubble-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</th>`;
    });
    html += '</tr></thead><tbody>';
    dataRows.forEach(line => {
      const cells = parseRow(line);
      html += '<tr>';
      cells.forEach(c => {
        html += `<td>${c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Format paragraphs with inline markdown
   * @param {Array} paragraphs - Array of paragraph strings
   * @param {boolean} useFullWidthImages - Use full width for images
   * @param {Map} worldInfoMap - Map of world info components
   * @returns {string} HTML string
   */
  formatParagraphs(paragraphs, useFullWidthImages = false, worldInfoMap = new Map()) {
    const results = [];
    let imageGroup = [];

    const flushImageGroup = () => {
      if (imageGroup.length === 0) return;
      if (imageGroup.length === 1) {
        results.push(imageGroup[0]);
      } else {
        // Consecutive images → side-by-side row
        results.push(`<div class="image-row image-row-${imageGroup.length}">${imageGroup.join('\n')}</div>`);
      }
      imageGroup = [];
    };

    const makeFigure = (src, caption) => {
      return `<figure class="image-figure my-4">
          <img src="${src}" alt="${caption}" class="img-100 rounded-sm h-auto" />
          ${caption ? `<figcaption class="image-caption">${caption}</figcaption>` : ''}
        </figure>`;
    };

    paragraphs.forEach(para => {
      if (!para || !para.trim()) return;

      let processed = para.trim();

      // Markdown table block (lines joined with \n containing |)
      if (processed.includes('\n') && processed.split('\n')[0].includes('|') && processed.split('\n')[1]?.match(/^\|?[\s:-]+\|/)) {
        flushImageGroup();
        results.push(this.formatTable(processed));
        return;
      }

      // Restore world info blocks
      processed = WorldInfoComponent.restoreWorldInfo(processed, worldInfoMap);

      // Bold and italic
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Check if paragraph is only an image
      const imageOnlyMatch = processed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageOnlyMatch) {
        const caption = imageOnlyMatch[1] || '';
        imageGroup.push(makeFigure(imageOnlyMatch[2], caption));
        return;
      }

      // Not an image — flush any accumulated image group first
      flushImageGroup();

      // Images within text
      const imageClass = useFullWidthImages ? 'img-100' : 'img-50';
      processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
        `<img src="$2" alt="$1" class="${imageClass} my-4 rounded-sm h-auto" />`);

      // Markdown links [text](url)
      processed = this.convertMarkdownLinks(processed);

      // Wrap in paragraph tag (unless it's a figure)
      if (processed.match(/^<figure/)) {
        results.push(processed);
      } else {
        results.push('<p class="mb-4">' + processed + '</p>');
      }
    });

    flushImageGroup();
    return results.filter(Boolean).join('\n');
  }

  /**
   * Convert markdown links to HTML
   * @param {string} text - Text with markdown links
   * @returns {string} Text with HTML links
   */
  convertMarkdownLinks(text) {
    if (!text) return text;
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawUrl) => {
      let href = rawUrl.trim();
      if (!/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }
      const safeLabel = label.trim();
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="link-pill link-inline">${safeLabel}</a>`;
    });
  }

  /**
   * Build grid HTML from sections
   * @param {Object} sectionsData - Sections data from parseIntoSections
   * @param {Object} options - Options with title, date, time
   * @param {Map} worldInfoMap - World info components map
   * @returns {string} HTML string
   */
  buildGridHTML(sectionsData, options, worldInfoMap) {
    const { introText, sections } = sectionsData;
    const { title, date, time } = options;
    
    let gridHTML = '<div class="content-grid">';
    
    // First bubble: title + intro + possibly first section
    let firstBubbleContent = '';
    
    // Add title and date if provided
    if (title && date) {
      const dateStr = this.formatDate(date);
      const timeStr = time || '10:30';
      firstBubbleContent = `
        <div class="journal-header">
          <h1 class="journal-title">${title}</h1>
          <div class="journal-date-time">${dateStr} · ${timeStr}</div>
        </div>
      `;
    }
    
    // Add intro text
    if (introText.length > 0) {
      firstBubbleContent += this.formatParagraphs(introText, true, worldInfoMap);
    }
    
    // Merge first h1 section into first bubble if exists
    let remainingSections = [...sections];
    let mergedSection = null;
    
    if (remainingSections.length > 0 && remainingSections[0].headingLevel === 1) {
      mergedSection = remainingSections.shift();
    } else if (introText.length === 0 && remainingSections.length > 0) {
      mergedSection = remainingSections.shift();
    }
    
    if (mergedSection) {
      firstBubbleContent += this.formatParagraphs(mergedSection.content, false, worldInfoMap);
    }
    
    // Render first bubble
    if (firstBubbleContent) {
      gridHTML += `
        <div class="content-bubble bubble-large">
          <div class="bubble-content">
            ${firstBubbleContent}
          </div>
        </div>
      `;
    }
    
    // Render remaining sections
    remainingSections.forEach((section) => {
      const sectionContent = this.formatParagraphs(section.content, false, worldInfoMap);
      const headingClass = section.headingLevel === 2 ? 'text-2xl' : 'text-xl';
      const bubbleSize = section.headingLevel === 2 ? 'bubble-large' : 'bubble-medium';
      
      let headingText = section.heading || 'Abschnitt';
      headingText = headingText.replace(/^#+\s*/, '').trim();
      headingText = headingText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      gridHTML += `
        <div class="content-bubble ${bubbleSize}">
          <h${section.headingLevel || 2} class="${headingClass} font-bold mb-4 text-accent bubble-section-title bubble-heading-level-${section.headingLevel || 2}">${headingText}</h${section.headingLevel || 2}>
          <div class="bubble-content">
            ${sectionContent}
          </div>
        </div>
      `;
    });
    
    gridHTML += '</div>';
    return gridHTML;
  }

  /**
   * Simple parsing (fallback when no sections)
   * @param {string} markdown - Markdown text
   * @returns {string} HTML string
   */
  parseSimple(markdown) {
    let html = markdown;
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
      '<img src="$2" alt="$1" class="img-50 my-6 rounded-sm h-auto" />');
    
    // Markdown links
    html = this.convertMarkdownLinks(html);
    
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-accent">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
    
    // Paragraphs
    const lines = html.split('\n');
    const finalLines = [];
    let para = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (para.length > 0) {
          finalLines.push('<p class="mb-4">' + para.join(' ') + '</p>');
          para = [];
        }
      } else if (trimmed.match(/^<h[1-6]/) || trimmed.match(/^<img/)) {
        if (para.length > 0) {
          finalLines.push('<p class="mb-4">' + para.join(' ') + '</p>');
          para = [];
        }
        finalLines.push(trimmed);
      } else {
        para.push(trimmed);
      }
    }
    if (para.length > 0) {
      finalLines.push('<p class="mb-4">' + para.join(' ') + '</p>');
    }
    
    return finalLines.join('\n');
  }

  /**
   * Convert plain URLs to clickable links
   * @param {string} html - HTML string
   * @returns {string} HTML with URLs converted to links
   */
  convertURLsToLinks(html) {
    const linkMap = new Map();
    let linkCounter = 0;
    
    // Protect existing links, images, and world info dropdowns
    html = html.replace(/<a[^>]*>.*?<\/a>/gi, (match) => {
      const placeholder = `${this.linkPlaceholder}${linkCounter}${this.linkPlaceholder}`;
      linkMap.set(placeholder, match);
      linkCounter++;
      return placeholder;
    });
    
    html = html.replace(/<img[^>]*>/gi, (match) => {
      const placeholder = `${this.linkPlaceholder}${linkCounter}${this.linkPlaceholder}`;
      linkMap.set(placeholder, match);
      linkCounter++;
      return placeholder;
    });
    
    html = html.replace(/<div class="world-info-container">[\s\S]*?<\/div>/gi, (match) => {
      const placeholder = `${this.linkPlaceholder}${linkCounter}${this.linkPlaceholder}`;
      linkMap.set(placeholder, match);
      linkCounter++;
      return placeholder;
    });
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
    html = html.replace(urlRegex, (url) => {
      const href = url.startsWith('http') ? url : `https://${url}`;
      const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="link-pill">${displayUrl}</a>`;
    });
    
    // Restore protected elements
    linkMap.forEach((originalLink, placeholder) => {
      html = html.replace(placeholder, originalLink);
    });
    
    return html;
  }

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Extract title from markdown (first H1)
   * @param {string} markdown - Markdown text
   * @returns {string} Extracted title
   */
  extractTitle(markdown) {
    const match = markdown.match(/^# (.+)$/m);
    return match ? match[1] : 'Unbenannter Eintrag';
  }

  /**
   * Remove first H1 heading from markdown
   * @param {string} markdown - Markdown text
   * @returns {string} Markdown without first H1
   */
  removeFirstHeading(markdown) {
    let headingRemoved = false;
    return markdown.replace(/^# .+$/m, (match) => {
      if (headingRemoved) return match;
      headingRemoved = true;
      return '';
    }).trimStart();
  }

  /**
   * Remove date lines from markdown
   * @param {string} markdown - Markdown text
   * @returns {string} Markdown without date lines
   */
  removeDateLines(markdown) {
    return markdown.replace(/^\*\*.*?\d{1,2}\.\s+\w+\s+\d{4}.*?\*\*\s*$/gm, '');
  }
}

