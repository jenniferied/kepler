/**
 * WorldInfoComponent
 * Single responsibility: World info dropdown widget for journal entries
 * Creates HTML for world-info dropdowns (used in markdown parsing)
 */
export class WorldInfoComponent {
  /**
   * Create a world info dropdown
   * @param {Object} worldData - World data object
   * @returns {string} HTML string for dropdown
   */
  static createDropdown(worldData) {
    const id = `world-info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const hasLink = worldData.link && worldData.link.trim() !== '';
    const hasVrLink = worldData.vrLink && worldData.vrLink.trim() !== '';
    
    return `
      <div class="world-info-container">
        ${hasLink || hasVrLink ? `
          <div class="world-info-links">
            ${hasLink ? `
              <a href="${worldData.link}" target="_blank" rel="noopener noreferrer" class="world-info-link">
                Welt öffnen →
              </a>
            ` : ''}
            ${hasVrLink ? `
              <a href="${worldData.vrLink}" target="_blank" rel="noopener noreferrer" class="world-info-link world-info-link-vr">
                VR-Modus öffnen →
              </a>
            ` : ''}
          </div>
        ` : ''}
        <div class="world-info-toggle" onclick="toggleWorldInfo('${id}')">
          <span class="world-info-toggle-title">${worldData.title || 'Welt-Info'}</span>
          <span class="world-info-toggle-icon">▼</span>
        </div>
        <div class="world-info-dropdown" id="${id}">
          <div class="world-info-details">
            ${worldData.model ? `<p><strong>Model:</strong> ${worldData.model}</p>` : ''}
            ${worldData.seed !== undefined ? `<p><strong>Seed:</strong> ${worldData.seed}</p>` : ''}
            ${worldData.publicMode !== undefined ? `<p><strong>Public mode:</strong> ${worldData.publicMode ? 'Yes' : 'No'}</p>` : ''}
          </div>
          ${worldData.description ? `
            <div class="world-info-description">
              <strong>World Guide:</strong>
              <p>${worldData.description}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Parse world info syntax from text
   * Format: [WORLD_INFO:title|model|seed|publicMode|previewImage|link|vrLink|description]
   * @param {string} text - Text containing world info markers
   * @returns {Object} Object with processed text and world info map
   */
  static parseWorldInfo(text) {
    const worldInfoPlaceholder = '___WORLD_INFO_PLACEHOLDER___';
    const worldInfoMap = new Map();
    let worldInfoCounter = 0;
    
    const worldInfoRegex = /\[WORLD_INFO:([^\]]+)\]/g;
    const processedText = text.replace(worldInfoRegex, (match, data) => {
      // Parse data
      const parts = data.split('|');
      const worldData = {
        title: parts[0] || '',
        model: parts[1] || '',
        seed: parts[2] || '',
        publicMode: parts[3] === 'true' || parts[3] === '1',
        previewImage: parts[4] || '',
        link: parts[5] || '',
        vrLink: parts[6] || '',
        description: parts.slice(7).join('|') || ''
      };
      
      const placeholder = `${worldInfoPlaceholder}${worldInfoCounter}${worldInfoPlaceholder}`;
      worldInfoMap.set(placeholder, WorldInfoComponent.createDropdown(worldData));
      worldInfoCounter++;
      return placeholder;
    });
    
    return { processedText, worldInfoMap };
  }

  /**
   * Restore world info placeholders in HTML
   * @param {string} html - HTML with placeholders
   * @param {Map} worldInfoMap - Map of placeholders to HTML
   * @returns {string} HTML with restored world info components
   */
  static restoreWorldInfo(html, worldInfoMap) {
    let result = html;
    worldInfoMap.forEach((componentHTML, placeholder) => {
      result = result.split(placeholder).join(componentHTML);
    });
    return result;
  }
}

/**
 * Global function for toggling world info dropdowns
 * Called from onclick in HTML
 * @param {string} id - Dropdown ID
 */
window.toggleWorldInfo = function(id) {
  const dropdown = document.getElementById(id);
  const toggle = dropdown ? dropdown.previousElementSibling : null;
  if (dropdown && toggle) {
    dropdown.classList.toggle('show');
    toggle.classList.toggle('active');
  }
};

