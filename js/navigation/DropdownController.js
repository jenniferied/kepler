/**
 * DropdownController
 * Single responsibility: Dropdown state management
 * Handles show/hide, click outside to close, mutual exclusion
 */
export class DropdownController {
  /**
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.dropdown - Dropdown element
   * @param {HTMLElement} config.toggleButton - Toggle button element
   * @param {EventBus} config.eventBus - Event bus instance
   * @param {string} config.name - Name for this dropdown (for events)
   */
  constructor(config) {
    if (!config.dropdown || !config.toggleButton) {
      throw new Error('[DropdownController] dropdown and toggleButton required');
    }
    if (!config.eventBus) {
      throw new Error('[DropdownController] EventBus instance required');
    }

    this.dropdown = config.dropdown;
    this.toggleButton = config.toggleButton;
    this.eventBus = config.eventBus;
    this.name = config.name || 'dropdown';
    this.isOpen = false;
    
    // Bind methods
    this.handleToggleClick = this.handleToggleClick.bind(this);
    this.handleWindowClick = this.handleWindowClick.bind(this);
    this.handleOtherDropdownToggled = this.handleOtherDropdownToggled.bind(this);
  }

  /**
   * Initialize the dropdown controller
   */
  initialize() {
    // Setup event listeners
    this.toggleButton.addEventListener('click', this.handleToggleClick);
    window.addEventListener('click', this.handleWindowClick);
    
    // Listen for other dropdowns being toggled
    this.eventBus.on('dropdown:toggled', this.handleOtherDropdownToggled);
    this.eventBus.on('player:playlistToggled', this.handleOtherDropdownToggled);
    
    console.log(`[DropdownController:${this.name}] Initialized`);
  }

  /**
   * Handle toggle button click
   * @param {Event} e - Click event
   */
  handleToggleClick(e) {
    e.stopPropagation();
    this.toggle();
  }

  /**
   * Handle window click (close if clicked outside)
   * @param {Event} e - Click event
   */
  handleWindowClick(e) {
    if (!this.toggleButton.contains(e.target) && !this.dropdown.contains(e.target)) {
      this.close();
    }
  }

  /**
   * Handle other dropdown toggled (mutual exclusion)
   * @param {Object} data - Event data
   */
  handleOtherDropdownToggled(data) {
    // Close this dropdown if another one was opened
    if (data && data.name !== this.name) {
      this.close();
    }
  }

  /**
   * Toggle dropdown open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open dropdown
   */
  open() {
    this.dropdown.classList.add('show');
    this.isOpen = true;
    
    // Emit event for mutual exclusion
    this.eventBus.emit('dropdown:toggled', { name: this.name });
  }

  /**
   * Close dropdown
   */
  close() {
    this.dropdown.classList.remove('show');
    this.isOpen = false;
  }

  /**
   * Get open state
   * @returns {boolean} True if open
   */
  getIsOpen() {
    return this.isOpen;
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    this.toggleButton.removeEventListener('click', this.handleToggleClick);
    window.removeEventListener('click', this.handleWindowClick);
    this.eventBus.off('dropdown:toggled', this.handleOtherDropdownToggled);
    this.eventBus.off('player:playlistToggled', this.handleOtherDropdownToggled);
    
    console.log(`[DropdownController:${this.name}] Disposed`);
  }
}

