/**
 * MusicPlayer
 * Main coordinator (Facade pattern)
 * Single responsibility: Coordinate audio components and handle user interactions
 */
import { Playlist } from './Playlist.js';
import { PlaybackController } from './PlaybackController.js';
import { PlayerUI } from './PlayerUI.js';
import { formatTime } from './timeFormatter.js';

export class MusicPlayer {
  /**
   * @param {Object} config - Configuration object
   * @param {Array} config.playlistData - Array of track objects
   * @param {Object} config.elements - DOM elements
   * @param {EventBus} config.eventBus - Event bus instance
   */
  constructor(config) {
    if (!config.playlistData) {
      throw new Error('[MusicPlayer] playlistData required');
    }
    if (!config.elements) {
      throw new Error('[MusicPlayer] DOM elements required');
    }
    if (!config.eventBus) {
      throw new Error('[MusicPlayer] EventBus required');
    }

    this.config = config;
    this.eventBus = config.eventBus;
    this.elements = config.elements;
    
    // Create components
    this.playlist = new Playlist(config.playlistData);
    this.playbackController = new PlaybackController(
      config.elements.audioPlayer,
      this.playlist,
      config.eventBus
    );
    this.playerUI = new PlayerUI(config.elements, config.eventBus);
    
    // Bind methods
    this.handlePlayPauseClick = this.handlePlayPauseClick.bind(this);
    this.handlePrevClick = this.handlePrevClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
    this.handlePlaylistToggle = this.handlePlaylistToggle.bind(this);
    this.handleWindowClick = this.handleWindowClick.bind(this);
  }

  /**
   * Initialize the music player
   */
  async initialize() {
    console.log('[MusicPlayer] Initializing...');
    
    // Initialize components
    this.playbackController.initialize();
    this.playerUI.initialize();
    
    // Populate playlist dropdown
    this.populatePlaylist();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load first track (paused) - pass true to preserve play state (which is false/paused at init)
    await this.playbackController.loadTrack(0, true);
    
    console.log('[MusicPlayer] Initialized successfully');
  }

  /**
   * Setup event listeners for user interactions
   */
  setupEventListeners() {
    // Play/Pause button
    if (this.elements.playPauseButton) {
      this.elements.playPauseButton.addEventListener('click', this.handlePlayPauseClick);
    }
    
    // Previous button
    if (this.elements.prevButton) {
      this.elements.prevButton.addEventListener('click', this.handlePrevClick);
    }
    
    // Next button
    if (this.elements.nextButton) {
      this.elements.nextButton.addEventListener('click', this.handleNextClick);
    }
    
    // Playlist toggle button
    if (this.elements.playlistToggleBtn) {
      this.elements.playlistToggleBtn.addEventListener('click', this.handlePlaylistToggle);
    }
    
    // Click outside to close dropdowns
    window.addEventListener('click', this.handleWindowClick);
  }

  /**
   * Populate playlist dropdown with tracks
   */
  populatePlaylist() {
    const playlistDropdown = this.elements.playlistDropdown;
    if (!playlistDropdown) return;
    
    const tracks = this.playlist.getAll();
    let html = '';
    
    // SVG Icons
    const iconSong = `<svg class="playlist-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/>
        <path fill-rule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/>
        <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3h-1V2.11l-8 .8A1 1 0 0 1 5 2.905z"/>
    </svg>`;
    
    const iconAlbum = `<svg class="playlist-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    </svg>`;
    
    // Build HTML
    tracks.forEach((song, index) => {
      html += `
        <button class="playlist-item" data-index="${index}">
          ${iconSong}
          <img src="${song.cover || 'assets/images/06_Deine_Moves_Cover.png'}" 
               alt="${song.album}" 
               class="album-cover-icon"
               onerror="this.style.display='none'">
          <div class="song-details">
            <span class="song-title">${song.title}</span>
            <span class="album-info">
              ${iconAlbum}
              <span style="margin-left: 4px;">${song.album}</span>
            </span>
          </div>
          <span class="duration" id="duration-${index}">...</span>
        </button>
      `;
    });
    
    playlistDropdown.innerHTML = html;
    
    // Load metadata for durations
    this.loadPlaylistDurations(tracks);
    
    // Add click handlers
    playlistDropdown.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const index = parseInt(item.dataset.index, 10);
        this.playbackController.loadTrack(index, false); // Always play when clicked
        this.closePlaylistDropdown();
      });
    });
  }

  /**
   * Load duration metadata for playlist items
   * @param {Array} tracks - Array of tracks
   */
  loadPlaylistDurations(tracks) {
    tracks.forEach((song, index) => {
      const tempAudio = new Audio();
      tempAudio.src = song.src;
      
      tempAudio.addEventListener('loadedmetadata', () => {
        const formattedTime = formatTime(tempAudio.duration);
        const durationSpan = document.getElementById(`duration-${index}`);
        if (durationSpan) {
          durationSpan.textContent = formattedTime;
        }
      });
      
      tempAudio.addEventListener('error', () => {
        const durationSpan = document.getElementById(`duration-${index}`);
        if (durationSpan) {
          durationSpan.textContent = 'Fehler';
        }
      });
    });
  }

  /**
   * Handle play/pause button click
   */
  handlePlayPauseClick() {
    this.playbackController.togglePlay();
  }

  /**
   * Handle previous button click
   */
  handlePrevClick() {
    this.playbackController.previous(true);
  }

  /**
   * Handle next button click
   */
  handleNextClick() {
    this.playbackController.next(false);
  }

  /**
   * Handle playlist toggle button click
   */
  handlePlaylistToggle(e) {
    e.stopPropagation();
    
    if (this.elements.playlistDropdown) {
      this.elements.playlistDropdown.classList.toggle('show');
    }
    if (this.elements.playlistToggleBtn) {
      this.elements.playlistToggleBtn.classList.toggle('active');
    }
    
    // Close navigation dropdown
    this.eventBus.emit('player:playlistToggled');
  }

  /**
   * Handle window click (close dropdowns)
   */
  handleWindowClick(e) {
    const playlistToggleBtn = this.elements.playlistToggleBtn;
    const playlistDropdown = this.elements.playlistDropdown;
    
    if (playlistToggleBtn && playlistDropdown) {
      if (!playlistToggleBtn.contains(e.target) && !playlistDropdown.contains(e.target)) {
        this.closePlaylistDropdown();
      }
    }
  }

  /**
   * Close playlist dropdown
   */
  closePlaylistDropdown() {
    if (this.elements.playlistDropdown) {
      this.elements.playlistDropdown.classList.remove('show');
    }
    if (this.elements.playlistToggleBtn) {
      this.elements.playlistToggleBtn.classList.remove('active');
    }
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Remove event listeners
    if (this.elements.playPauseButton) {
      this.elements.playPauseButton.removeEventListener('click', this.handlePlayPauseClick);
    }
    if (this.elements.prevButton) {
      this.elements.prevButton.removeEventListener('click', this.handlePrevClick);
    }
    if (this.elements.nextButton) {
      this.elements.nextButton.removeEventListener('click', this.handleNextClick);
    }
    if (this.elements.playlistToggleBtn) {
      this.elements.playlistToggleBtn.removeEventListener('click', this.handlePlaylistToggle);
    }
    window.removeEventListener('click', this.handleWindowClick);
    
    // Dispose components
    this.playbackController.dispose();
    this.playerUI.dispose();
    
    console.log('[MusicPlayer] Disposed');
  }
}

