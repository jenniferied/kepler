/**
 * VideoViewer - Concrete implementation of ViewerBase
 * Wraps Video.js for enhanced video playback
 */
import { ViewerBase } from './ViewerBase.js';

export class VideoViewer extends ViewerBase {
  constructor(container, options = {}, eventBus = null, scriptLoader = null, featureDetector = null) {
    super(container, options, eventBus);
    
    this.scriptLoader = scriptLoader;
    this.featureDetector = featureDetector;
    
    this.player = null;
    this.videoElement = null;
    this.videoSrc = options.videoSrc || null;
    this.poster = options.poster || null;
  }

  /**
   * Video.js works everywhere, but check for slow network
   * @returns {Promise<boolean>}
   */
  async checkSupport() {
    // Video.js is a progressive enhancement
    // Always supported, but we check for optimal conditions
    if (this.featureDetector) {
      const caps = this.featureDetector.getCapabilities();
      // Return true always, but store network info for later use
      this.isSlowNetwork = caps.slowNetwork;
    }
    return true;
  }

  /**
   * Load Video.js library and styles
   * @returns {Promise<void>}
   */
  async loadDependencies() {
    if (!this.scriptLoader) {
      throw new Error('ScriptLoader required for VideoViewer');
    }

    // Load Video.js CSS
    const cssUrl = 'https://vjs.zencdn.net/8.10.0/video-js.min.css';
    await this.scriptLoader.loadStylesheet(cssUrl);
    
    // Load Video.js library
    const jsUrl = 'https://vjs.zencdn.net/8.10.0/video.min.js';
    await this.scriptLoader.loadScript(jsUrl);
    
    // Check if videojs is available
    if (typeof videojs === 'undefined') {
      throw new Error('Video.js failed to load');
    }
  }

  /**
   * Initialize Video.js player
   * @returns {Promise<void>}
   */
  async initialize() {
    // Create video element if it doesn't exist
    let videoEl = this.container.querySelector('video');
    
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.className = 'video-js vjs-default-skin';
      videoEl.controls = true;
      videoEl.preload = this.isSlowNetwork ? 'none' : 'metadata';
      
      if (this.poster) {
        videoEl.poster = this.poster;
      }
      
      this.container.innerHTML = '';
      this.container.appendChild(videoEl);
    }
    
    this.videoElement = videoEl;
    
    // Initialize Video.js
    if (typeof videojs !== 'undefined') {
      this.player = videojs(this.videoElement, {
        fluid: true,
        responsive: true,
        controls: true,
        preload: this.isSlowNetwork ? 'none' : 'metadata',
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          pictureInPictureToggle: true
        }
      });
      
      // Add event listeners
      this.player.on('ready', () => {
        this.emitEvent('video:ready', { src: this.videoSrc });
      });
      
      this.player.on('play', () => {
        this.emitEvent('video:play', { src: this.videoSrc });
      });
      
      this.player.on('pause', () => {
        this.emitEvent('video:pause', { src: this.videoSrc });
      });
      
      this.player.on('ended', () => {
        this.emitEvent('video:ended', { src: this.videoSrc });
      });
    }
  }

  /**
   * Set video source and render
   * @returns {Promise<void>}
   */
  async render() {
    if (!this.videoSrc) {
      throw new Error('No video source provided');
    }
    
    if (this.player) {
      this.player.src({
        type: 'video/mp4',
        src: this.videoSrc
      });
    } else {
      // Fallback to native video element
      this.videoElement.src = this.videoSrc;
    }
  }

  /**
   * Show native HTML5 video fallback
   */
  showFallback() {
    this.fallbackShown = true;
    
    if (!this.videoSrc) {
      this.container.innerHTML = `
        <div class="viewer-fallback">
          <p class="viewer-fallback-text">No video source provided</p>
        </div>
      `;
      return;
    }
    
    // Use native HTML5 video
    this.container.innerHTML = `
      <video 
        controls 
        preload="metadata" 
        ${this.poster ? `poster="${this.poster}"` : ''}
        style="width: 100%; height: auto; background: #111;"
      >
        <source src="${this.videoSrc}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    
    this.videoElement = null;
    this.emitEvent('viewer:disposed', { viewer: this.constructor.name });
  }

  /**
   * Public API: Play video
   */
  play() {
    if (this.player) {
      this.player.play();
    } else if (this.videoElement) {
      this.videoElement.play();
    }
  }

  /**
   * Public API: Pause video
   */
  pause() {
    if (this.player) {
      this.player.pause();
    } else if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  /**
   * Public API: Set volume (0-1)
   */
  setVolume(volume) {
    if (this.player) {
      this.player.volume(volume);
    } else if (this.videoElement) {
      this.videoElement.volume = volume;
    }
  }
}


