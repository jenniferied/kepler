/**
 * TimelineRenderer
 * Single responsibility: Render timeline UI
 * Creates and updates the horizontal timeline component
 */
export class TimelineRenderer {
  /**
   * @param {HTMLElement} container - Timeline container element
   */
  constructor(container) {
    if (!container) {
      throw new Error('[TimelineRenderer] Container element required');
    }
    this.container = container;
  }

  /**
   * Render timeline from entries
   * @param {Array} entries - Array of entry objects with formattedDate and title
   */
  render(entries) {
    let html = '';
    
    entries.forEach((entry, index) => {
      html += `
        <div class="timeline-item" data-index="${index}" onclick="selectEntry(${index})">
          <div class="timeline-item-date">${entry.formattedDate}</div>
          <div class="timeline-item-title">${entry.title}</div>
        </div>
      `;
    });
    
    this.container.innerHTML = html;
    console.log(`[TimelineRenderer] Rendered ${entries.length} timeline items`);
  }

  /**
   * Update active item in timeline
   * @param {number} activeIndex - Index of active entry
   */
  updateActiveItem(activeIndex) {
    const items = this.container.querySelectorAll('.timeline-item');
    
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
        
        // Scroll to active item
        this.scrollToItem(item);
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Scroll timeline to show active item
   * @param {HTMLElement} item - Timeline item element
   */
  scrollToItem(item) {
    const timelineContainer = this.container.parentElement;
    if (!timelineContainer || !item) return;
    
    const itemLeft = item.offsetLeft;
    const itemWidth = item.offsetWidth;
    const containerWidth = timelineContainer.offsetWidth;
    const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);
    
    timelineContainer.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
  }

  /**
   * Clear timeline
   */
  clear() {
    this.container.innerHTML = '';
  }
}

