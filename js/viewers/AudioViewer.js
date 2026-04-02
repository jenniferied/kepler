/**
 * AudioViewer - Embedded audio player for journal entries
 * Supports multi-track playlists with prompt and description display
 * Extends ViewerBase following Template Method pattern
 */
import { ViewerBase } from './ViewerBase.js';
import { formatTime } from '../audio/timeFormatter.js';

export class AudioViewer extends ViewerBase {
  constructor(container, options = {}, eventBus = null) {
    super(container, options, eventBus);

    // Parse tracks from data attribute or options
    this.tracks = options.tracks || [];
    this.prompt = options.prompt || null;
    this.artist = options.artist || '';
    this.currentTrackIndex = 0;

    // Audio element
    this.audioElement = null;

    // UI elements
    this.ui = {};

    // State
    this.isPlaying = false;
    this.isLooping = false;
    this.duration = 0;
    this.currentTime = 0;
    this.descriptionExpanded = false;
    this.descriptionResizeObserver = null;

    // Bound handlers
    this.handlePlayPause = this.handlePlayPause.bind(this);
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleLoadedMetadata = this.handleLoadedMetadata.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
    this.handleProgressClick = this.handleProgressClick.bind(this);
    this.handleLoopToggle = this.handleLoopToggle.bind(this);
    this.handlePrevTrack = this.handlePrevTrack.bind(this);
    this.handleNextTrack = this.handleNextTrack.bind(this);
    this.handleDescriptionToggle = this.handleDescriptionToggle.bind(this);
  }

  async checkSupport() {
    // HTML5 Audio is universally supported
    return true;
  }

  async loadDependencies() {
    // No external dependencies needed
    return Promise.resolve();
  }

  async initialize() {
    this.audioElement = document.createElement('audio');
    this.audioElement.preload = 'metadata';

    this.buildUI();

    // Audio event listeners
    this.audioElement.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audioElement.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.audioElement.addEventListener('ended', this.handleEnded);
    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayPauseButton();
      this.emitEvent('audio:play', { track: this.getCurrentTrack() });
    });
    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayPauseButton();
      this.emitEvent('audio:pause', { track: this.getCurrentTrack() });
    });
  }

  buildUI() {
    this.container.innerHTML = '';
    this.container.classList.add('audio-viewer');

    const wrapper = document.createElement('div');
    wrapper.className = 'audio-viewer-wrapper';

    // Prompt display (if provided)
    if (this.prompt) {
      const promptEl = document.createElement('div');
      promptEl.className = 'audio-viewer-prompt';
      promptEl.innerHTML = `<span class="audio-viewer-prompt-label">Prompt:</span> "${this.prompt}"`;
      wrapper.appendChild(promptEl);
    }

    // Player container
    const playerContainer = document.createElement('div');
    playerContainer.className = 'audio-viewer-player';

    // Cover image (left)
    const currentTrack = this.getCurrentTrack();
    const coverSrc = currentTrack?.cover || this.tracks[0]?.cover;
    if (coverSrc) {
      const coverContainer = document.createElement('div');
      coverContainer.className = 'audio-viewer-cover';
      this.ui.coverImg = document.createElement('img');
      this.ui.coverImg.src = coverSrc;
      this.ui.coverImg.alt = currentTrack?.title || 'Cover';
      this.ui.coverImg.className = 'audio-viewer-cover-img';
      coverContainer.appendChild(this.ui.coverImg);
      playerContainer.appendChild(coverContainer);
    }

    // Controls (right)
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'audio-viewer-controls';

    // Track info row
    const trackInfo = document.createElement('div');
    trackInfo.className = 'audio-viewer-track-info';

    this.ui.titleEl = document.createElement('div');
    this.ui.titleEl.className = 'audio-viewer-title';
    trackInfo.appendChild(this.ui.titleEl);

    if (this.artist) {
      const artistEl = document.createElement('div');
      artistEl.className = 'audio-viewer-artist';
      artistEl.textContent = this.artist;
      trackInfo.appendChild(artistEl);
    }

    controlsContainer.appendChild(trackInfo);

    // Controls row
    const controlsRow = document.createElement('div');
    controlsRow.className = 'audio-viewer-controls-row';

    // Prev button (if multi-track)
    if (this.tracks.length > 1) {
      this.ui.prevBtn = document.createElement('button');
      this.ui.prevBtn.className = 'audio-viewer-btn audio-viewer-nav-btn';
      this.ui.prevBtn.innerHTML = this.getPrevIcon();
      this.ui.prevBtn.title = 'Previous track';
      this.ui.prevBtn.addEventListener('click', this.handlePrevTrack);
      controlsRow.appendChild(this.ui.prevBtn);
    }

    // Play/Pause button
    this.ui.playPauseBtn = document.createElement('button');
    this.ui.playPauseBtn.className = 'audio-viewer-btn audio-viewer-play-btn';
    this.ui.playPauseBtn.innerHTML = this.getPlayIcon();
    this.ui.playPauseBtn.title = 'Play/Pause';
    this.ui.playPauseBtn.addEventListener('click', this.handlePlayPause);
    controlsRow.appendChild(this.ui.playPauseBtn);

    // Next button (if multi-track)
    if (this.tracks.length > 1) {
      this.ui.nextBtn = document.createElement('button');
      this.ui.nextBtn.className = 'audio-viewer-btn audio-viewer-nav-btn';
      this.ui.nextBtn.innerHTML = this.getNextIcon();
      this.ui.nextBtn.title = 'Next track';
      this.ui.nextBtn.addEventListener('click', this.handleNextTrack);
      controlsRow.appendChild(this.ui.nextBtn);
    }

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'audio-viewer-progress-container';
    progressContainer.addEventListener('click', this.handleProgressClick);

    this.ui.progressBar = document.createElement('div');
    this.ui.progressBar.className = 'audio-viewer-progress-bar';

    this.ui.progressFill = document.createElement('div');
    this.ui.progressFill.className = 'audio-viewer-progress-fill';

    this.ui.progressBar.appendChild(this.ui.progressFill);
    progressContainer.appendChild(this.ui.progressBar);
    controlsRow.appendChild(progressContainer);

    // Time display
    this.ui.timeDisplay = document.createElement('div');
    this.ui.timeDisplay.className = 'audio-viewer-time';
    this.ui.timeDisplay.textContent = '0:00 / 0:00';
    controlsRow.appendChild(this.ui.timeDisplay);

    // Track indicator (if multi-track)
    if (this.tracks.length > 1) {
      this.ui.trackIndicator = document.createElement('div');
      this.ui.trackIndicator.className = 'audio-viewer-track-indicator';
      controlsRow.appendChild(this.ui.trackIndicator);
    }

    // Loop button
    this.ui.loopBtn = document.createElement('button');
    this.ui.loopBtn.className = 'audio-viewer-btn audio-viewer-loop-btn';
    this.ui.loopBtn.innerHTML = this.getLoopIcon();
    this.ui.loopBtn.title = 'Toggle Loop';
    this.ui.loopBtn.addEventListener('click', this.handleLoopToggle);
    controlsRow.appendChild(this.ui.loopBtn);

    controlsContainer.appendChild(controlsRow);
    playerContainer.appendChild(controlsContainer);
    wrapper.appendChild(playerContainer);

    // Description section (expandable)
    const currentDesc = this.getCurrentTrack()?.description;
    if (currentDesc || this.tracks.some(t => t.description)) {
      const descSection = document.createElement('div');
      descSection.className = 'audio-viewer-description-section';

      this.ui.descToggle = document.createElement('button');
      this.ui.descToggle.className = 'audio-viewer-desc-toggle';
      this.ui.descToggle.textContent = 'AI-Generated Description ▼';
      this.ui.descToggle.addEventListener('click', this.handleDescriptionToggle);
      descSection.appendChild(this.ui.descToggle);

      this.ui.descContent = document.createElement('div');
      this.ui.descContent.className = 'audio-viewer-desc-content';
      descSection.appendChild(this.ui.descContent);

      wrapper.appendChild(descSection);
    }

    this.container.appendChild(wrapper);
  }

  async render() {
    if (this.tracks.length === 0) {
      throw new Error('No tracks provided');
    }

    this.loadTrack(0);
  }

  loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;

    this.currentTrackIndex = index;
    const track = this.getCurrentTrack();

    // Update audio source
    this.audioElement.src = track.src;

    // Update UI
    this.ui.titleEl.textContent = track.title || 'Untitled';

    if (this.ui.trackIndicator) {
      this.ui.trackIndicator.textContent = `${index + 1}/${this.tracks.length}`;
    }

    if (this.ui.coverImg && track.cover) {
      this.ui.coverImg.src = track.cover;
    }

    if (this.ui.descContent) {
      this.ui.descContent.textContent = track.description || 'No description available.';
    }

    // Reset progress
    this.ui.progressFill.style.width = '0%';
    this.ui.timeDisplay.textContent = '0:00 / ...';

    this.emitEvent('audio:trackChanged', { track, index });
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex] || null;
  }

  showFallback() {
    this.fallbackShown = true;
    const track = this.getCurrentTrack();
    this.container.innerHTML = `
      <div class="audio-viewer-fallback">
        <p>${track?.src
          ? `<a href="${track.src}" target="_blank" rel="noopener" class="link-pill">Download: ${track.title || 'Audio'}</a>`
          : 'No audio available'}</p>
      </div>
    `;
  }

  // Event handlers
  handlePlayPause() {
    if (this.audioElement.paused) {
      this.audioElement.play().catch(err => console.warn('[AudioViewer] Play failed:', err));
    } else {
      this.audioElement.pause();
    }
  }

  handleTimeUpdate() {
    this.currentTime = this.audioElement.currentTime;
    const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    this.ui.progressFill.style.width = `${progress}%`;
    this.ui.timeDisplay.textContent = `${formatTime(this.currentTime)} / ${formatTime(this.duration)}`;
    this.emitEvent('audio:timeupdate', { currentTime: this.currentTime, duration: this.duration });
  }

  handleLoadedMetadata() {
    this.duration = this.audioElement.duration;
    this.ui.timeDisplay.textContent = `0:00 / ${formatTime(this.duration)}`;
    this.emitEvent('audio:loadedmetadata', { duration: this.duration });
  }

  handleEnded() {
    if (!this.isLooping) {
      this.isPlaying = false;
      this.updatePlayPauseButton();
      this.ui.progressFill.style.width = '0%';
    }
    this.emitEvent('audio:ended', { track: this.getCurrentTrack() });
  }

  handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const seekTime = ((e.clientX - rect.left) / rect.width) * this.duration;
    if (!isNaN(seekTime) && isFinite(seekTime)) {
      this.audioElement.currentTime = seekTime;
    }
  }

  handleLoopToggle() {
    this.isLooping = !this.isLooping;
    this.audioElement.loop = this.isLooping;
    this.ui.loopBtn.classList.toggle('active', this.isLooping);
    this.emitEvent('audio:loopToggled', { looping: this.isLooping });
  }

  handlePrevTrack() {
    const newIndex = this.currentTrackIndex > 0
      ? this.currentTrackIndex - 1
      : this.tracks.length - 1;
    this.loadTrack(newIndex);
  }

  handleNextTrack() {
    const newIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.loadTrack(newIndex);
  }

  handleDescriptionToggle() {
    this.descriptionExpanded = !this.descriptionExpanded;
    this.ui.descContent.classList.toggle('expanded', this.descriptionExpanded);
    this.ui.descToggle.textContent = this.descriptionExpanded
      ? 'AI-Generated Description ▲'
      : 'AI-Generated Description ▼';

    // Use ResizeObserver to emit events during transition (not just at end)
    // This allows GridLayoutOptimizer to reflow subsequent bubbles continuously
    if (!this.descriptionResizeObserver) {
      const bubble = this.container.closest('.content-bubble');
      if (bubble) {
        let lastHeight = bubble.offsetHeight;
        this.descriptionResizeObserver = new ResizeObserver(() => {
          const currentHeight = bubble.offsetHeight;
          if (Math.abs(currentHeight - lastHeight) > 1) {
            lastHeight = currentHeight;
            this.emitEvent('audio:descriptionToggled', { expanded: this.descriptionExpanded });
          }
        });
        this.descriptionResizeObserver.observe(bubble);
      }
    }
  }

  updatePlayPauseButton() {
    if (this.ui.playPauseBtn) {
      this.ui.playPauseBtn.innerHTML = this.isPlaying ? this.getPauseIcon() : this.getPlayIcon();
      this.ui.playPauseBtn.classList.toggle('playing', this.isPlaying);
    }
  }

  // SVG Icons
  getPlayIcon() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5-9-5.5z"/></svg>`;
  }

  getPauseIcon() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>`;
  }

  getPrevIcon() {
    return `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="2" height="12"/><path d="M14 2L6 8l8 6V2z"/></svg>`;
  }

  getNextIcon() {
    return `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="12" y="2" width="2" height="12"/><path d="M2 2l8 6-8 6V2z"/></svg>`;
  }

  getLoopIcon() {
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11 4H7v1h5V2l-1 1zM5 12h4v-1H4v3l1-1z"/><path d="M13.5 8c0 2.5-2 4.5-4.5 4.5V14c3.3 0 6-2.7 6-6h-1.5zM7 2.5V1C3.7 1 1 3.7 1 7h1.5c0-2.5 2-4.5 4.5-4.5z"/></svg>`;
  }

  dispose() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeEventListener('timeupdate', this.handleTimeUpdate);
      this.audioElement.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
      this.audioElement.removeEventListener('ended', this.handleEnded);
      this.audioElement.src = '';
      this.audioElement = null;
    }

    if (this.ui.playPauseBtn) this.ui.playPauseBtn.removeEventListener('click', this.handlePlayPause);
    if (this.ui.loopBtn) this.ui.loopBtn.removeEventListener('click', this.handleLoopToggle);
    if (this.ui.prevBtn) this.ui.prevBtn.removeEventListener('click', this.handlePrevTrack);
    if (this.ui.nextBtn) this.ui.nextBtn.removeEventListener('click', this.handleNextTrack);
    if (this.ui.descToggle) this.ui.descToggle.removeEventListener('click', this.handleDescriptionToggle);

    // Clean up ResizeObserver
    if (this.descriptionResizeObserver) {
      this.descriptionResizeObserver.disconnect();
      this.descriptionResizeObserver = null;
    }

    this.emitEvent('viewer:disposed', { viewer: this.constructor.name });
  }
}
