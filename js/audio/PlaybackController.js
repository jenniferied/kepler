/**
 * PlaybackController
 * Single responsibility: Audio playback logic and state management
 * Emits events for state changes, no UI manipulation
 */
export class PlaybackController {
  /**
   * @param {HTMLAudioElement} audioElement - The audio element to control
   * @param {Playlist} playlist - The playlist instance
   * @param {EventBus} eventBus - Event bus for communication
   */
  constructor(audioElement, playlist, eventBus) {
    if (!audioElement || !(audioElement instanceof HTMLAudioElement)) {
      throw new Error('[PlaybackController] Valid HTMLAudioElement required');
    }
    if (!playlist) {
      throw new Error('[PlaybackController] Playlist instance required');
    }
    if (!eventBus) {
      throw new Error('[PlaybackController] EventBus instance required');
    }

    this.audio = audioElement;
    this.playlist = playlist;
    this.eventBus = eventBus;
    
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    
    this.boundHandlers = {
      ended: this.handleEnded.bind(this),
      timeupdate: this.handleTimeUpdate.bind(this),
      loadedmetadata: this.handleLoadedMetadata.bind(this),
      durationchange: this.handleDurationChange.bind(this),
      play: this.handlePlay.bind(this),
      pause: this.handlePause.bind(this),
      error: this.handleError.bind(this)
    };
  }

  /**
   * Initialize the controller
   */
  initialize() {
    // Attach event listeners to audio element
    this.audio.addEventListener('ended', this.boundHandlers.ended);
    this.audio.addEventListener('timeupdate', this.boundHandlers.timeupdate);
    this.audio.addEventListener('loadedmetadata', this.boundHandlers.loadedmetadata);
    this.audio.addEventListener('durationchange', this.boundHandlers.durationchange);
    this.audio.addEventListener('play', this.boundHandlers.play);
    this.audio.addEventListener('pause', this.boundHandlers.pause);
    this.audio.addEventListener('error', this.boundHandlers.error);
    
    console.log('[PlaybackController] Initialized');
  }

  /**
   * Load a track by index
   * @param {number} index - Track index
   * @param {boolean} preservePlayState - If true, maintain play/pause state
   * @returns {Promise<void>}
   */
  async loadTrack(index, preservePlayState = true) {
    if (!this.playlist.isValidIndex(index)) {
      console.error('[PlaybackController] Invalid track index:', index);
      return;
    }

    const track = this.playlist.getTrack(index);
    const wasPlaying = this.isPlaying;
    
    // Update state
    this.currentTrackIndex = index;
    this.isPlaying = false;
    
    // Stop current playback
    this.audio.pause();
    
    // Load new track
    this.audio.src = track.src;
    
    // Emit track changed event
    this.eventBus.emit('playback:trackChanged', { 
      trackIndex: index, 
      track 
    });
    
    // If should auto-play
    if (preservePlayState && wasPlaying) {
      await this.play();
    } else if (!preservePlayState) {
      await this.play();
    }
  }

  /**
   * Play the current track
   * @returns {Promise<void>}
   */
  async play() {
    try {
      await this.audio.play();
      this.isPlaying = true;
      this.eventBus.emit('playback:play', {
        trackIndex: this.currentTrackIndex,
        track: this.playlist.getTrack(this.currentTrackIndex)
      });
    } catch (error) {
      console.warn('[PlaybackController] Play prevented:', error);
      this.isPlaying = false;
      this.eventBus.emit('playback:playFailed', { error });
    }
  }

  /**
   * Pause the current track
   */
  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.eventBus.emit('playback:pause', {
      trackIndex: this.currentTrackIndex,
      track: this.playlist.getTrack(this.currentTrackIndex)
    });
  }

  /**
   * Toggle play/pause
   * @returns {Promise<void>}
   */
  async togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Go to next track
   * @param {boolean} autoPlay - If true, auto-play the next track
   * @returns {Promise<void>}
   */
  async next(autoPlay = false) {
    const nextIndex = this.playlist.getNextIndex(this.currentTrackIndex);
    await this.loadTrack(nextIndex, !autoPlay);
  }

  /**
   * Go to previous track
   * @param {boolean} autoPlay - If true, auto-play the previous track
   * @returns {Promise<void>}
   */
  async previous(autoPlay = false) {
    const prevIndex = this.playlist.getPreviousIndex(this.currentTrackIndex);
    await this.loadTrack(prevIndex, !autoPlay);
  }

  /**
   * Get current track
   * @returns {Object|null} Current track object
   */
  getCurrentTrack() {
    return this.playlist.getTrack(this.currentTrackIndex);
  }

  /**
   * Get current track index
   * @returns {number} Current track index
   */
  getCurrentTrackIndex() {
    return this.currentTrackIndex;
  }

  /**
   * Get playing state
   * @returns {boolean} True if playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Handle audio ended event
   */
  handleEnded() {
    this.eventBus.emit('playback:ended', {
      trackIndex: this.currentTrackIndex,
      track: this.getCurrentTrack()
    });
    // Auto-play next track
    this.next(true);
  }

  /**
   * Handle time update event (throttled via audio element)
   */
  handleTimeUpdate() {
    this.eventBus.emit('playback:timeupdate', {
      currentTime: this.audio.currentTime,
      duration: this.audio.duration
    });
  }

  /**
   * Handle loaded metadata event
   */
  handleLoadedMetadata() {
    this.eventBus.emit('playback:loadedmetadata', {
      duration: this.audio.duration,
      trackIndex: this.currentTrackIndex,
      track: this.getCurrentTrack()
    });
  }

  /**
   * Handle duration change event
   */
  handleDurationChange() {
    this.eventBus.emit('playback:durationchange', {
      duration: this.audio.duration
    });
  }

  /**
   * Handle play event (fired by browser)
   */
  handlePlay() {
    this.isPlaying = true;
  }

  /**
   * Handle pause event (fired by browser)
   */
  handlePause() {
    this.isPlaying = false;
  }

  /**
   * Handle error event
   */
  handleError(event) {
    console.error('[PlaybackController] Audio error:', event);
    this.eventBus.emit('playback:error', {
      error: event,
      track: this.getCurrentTrack()
    });
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Remove event listeners
    this.audio.removeEventListener('ended', this.boundHandlers.ended);
    this.audio.removeEventListener('timeupdate', this.boundHandlers.timeupdate);
    this.audio.removeEventListener('loadedmetadata', this.boundHandlers.loadedmetadata);
    this.audio.removeEventListener('durationchange', this.boundHandlers.durationchange);
    this.audio.removeEventListener('play', this.boundHandlers.play);
    this.audio.removeEventListener('pause', this.boundHandlers.pause);
    this.audio.removeEventListener('error', this.boundHandlers.error);
    
    // Stop playback
    this.audio.pause();
    this.audio.src = '';
    
    console.log('[PlaybackController] Disposed');
  }
}

