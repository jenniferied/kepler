/**
 * AudioAnalyzer
 * Real-time audio analysis using Web Audio API + Meyda.js.
 * Provides energy levels, spectral flux (onset detection), and beat detection
 * for visual reactivity.
 *
 * Meyda.js is lazy-loaded from CDN on first connect().
 * Falls back to manual spectral flux from FFT if Meyda is unavailable.
 */
export class AudioAnalyzer {
  /**
   * @param {HTMLAudioElement} audioElement - The audio element to analyze
   * @param {Object} [options] - Configuration options
   * @param {number} [options.fftSize=512] - FFT size for frequency analysis
   * @param {number} [options.smoothingTimeConstant=0.8] - Frequency data smoothing
   * @param {number} [options.meydaBufferSize=512] - Meyda analysis buffer size
   * @param {number} [options.onsetThreshold=0.15] - Spectral flux threshold for onset detection
   * @param {number} [options.onsetCooldown=80] - Minimum ms between onsets
   * @param {number} [options.beatThreshold=0.6] - Bass energy threshold for beat detection
   * @param {number} [options.beatCooldown=200] - Minimum ms between beats
   */
  constructor(audioElement, options = {}) {
    this.audioElement = audioElement;

    // Configuration
    this.fftSize = options.fftSize || 512;
    this.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;
    this.meydaBufferSize = options.meydaBufferSize || 512;
    this.onsetThreshold = options.onsetThreshold || 0.15;
    this.onsetCooldown = options.onsetCooldown || 80;
    this.beatThreshold = options.beatThreshold || 0.6;
    this.beatCooldown = options.beatCooldown || 200;

    // Web Audio API nodes
    this.audioContext = null;
    this.analyser = null;
    this.source = null;

    // Analysis buffers
    this.frequencyData = null;
    this.previousFrequencyData = null; // For manual spectral flux

    // Meyda analyzer instance
    this.meydaAnalyzer = null;
    this.meydaReady = false;

    // Real-time features from Meyda (updated every frame by callback)
    this.features = {
      rms: 0,
      energy: 0,
      spectralFlux: 0,
      spectralCentroid: 0,
      zcr: 0
    };

    // Manual spectral flux (FFT-based fallback, always computed)
    this.manualFlux = 0;

    // Onset detection state
    this.lastOnsetTime = 0;
    this.lastOnsetResult = false;  // Cached per-frame result
    this.lastOnsetFrame = -1;      // Frame counter to avoid double-calling
    this.frameCount = 0;
    this.fluxHistory = [];
    this.fluxHistorySize = 15;
    this.adaptiveThreshold = this.onsetThreshold;

    // Beat detection state (bass energy based)
    this.lastBeatTime = 0;
    this.previousBassEnergy = 0;

    // Connection state
    this.connected = false;
    this.destroyed = false;
  }

  /**
   * Load Meyda.js from CDN if not already available.
   * @returns {Promise<void>}
   */
  async _loadMeyda() {
    if (typeof window.Meyda !== 'undefined') return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/meyda@5/dist/web/meyda.min.js';
      script.onload = () => {
        console.log('[AudioAnalyzer] Meyda.js loaded from CDN');
        resolve();
      };
      script.onerror = () => {
        console.warn('[AudioAnalyzer] Meyda.js CDN failed, using manual spectral flux');
        reject(new Error('Meyda CDN load failed'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Meyda analyzer on the existing audio graph.
   */
  _initMeyda() {
    if (!window.Meyda || !this.audioContext || !this.source) return;

    try {
      this.meydaAnalyzer = window.Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: this.source,
        bufferSize: this.meydaBufferSize,
        featureExtractors: [
          'rms',
          'energy',
          'spectralFlux',
          'spectralCentroid',
          'zcr'
        ],
        callback: (features) => {
          if (!features) return;
          this.features.rms = features.rms || 0;
          this.features.energy = features.energy || 0;
          this.features.spectralFlux = features.spectralFlux || 0;
          this.features.spectralCentroid = features.spectralCentroid || 0;
          this.features.zcr = features.zcr || 0;
        }
      });
      this.meydaAnalyzer.start();
      this.meydaReady = true;
      console.log('[AudioAnalyzer] Meyda analyzer started');
    } catch (err) {
      console.warn('[AudioAnalyzer] Meyda init failed:', err);
      this.meydaReady = false;
    }
  }

  /**
   * Initialize the AudioContext and connect to the audio element.
   * Must be called from a user gesture (click/tap) to satisfy browser autoplay policy.
   * Safe to call multiple times -- only connects once.
   */
  async connect() {
    if (this.connected || this.destroyed) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

      // Connect: audioElement -> source -> analyser -> destination
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Allocate analysis buffers
      const binCount = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(binCount);
      this.previousFrequencyData = new Uint8Array(binCount);

      this.connected = true;
      console.log('[AudioAnalyzer] Connected to audio element');

      // Load and init Meyda (non-blocking — falls back to manual flux if CDN fails)
      try {
        await this._loadMeyda();
        this._initMeyda();
      } catch (_) {
        // Meyda failed to load — manual spectral flux still works
      }
    } catch (error) {
      console.error('[AudioAnalyzer] Failed to connect:', error);
    }
  }

  /**
   * Resume the AudioContext (required after user gesture).
   * @returns {Promise<void>}
   */
  async resume() {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[AudioAnalyzer] AudioContext resumed');
    }
  }

  /**
   * Read fresh FFT data and compute manual spectral flux.
   * Called once per frame before other getters.
   */
  _updateFFT() {
    if (!this.connected || !this.analyser) return;

    // Copy current -> previous before reading new data
    this.previousFrequencyData.set(this.frequencyData);
    this.analyser.getByteFrequencyData(this.frequencyData);

    // Manual spectral flux: sum of positive differences between frames
    let flux = 0;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const diff = this.frequencyData[i] - this.previousFrequencyData[i];
      if (diff > 0) flux += diff;
    }
    // Normalize to ~0-1 range (255 * binCount is theoretical max)
    this.manualFlux = flux / (len * 40);

    // Update flux history and adaptive threshold
    const currentFlux = this.getSpectralFlux();
    this.fluxHistory.push(currentFlux);
    if (this.fluxHistory.length > this.fluxHistorySize) {
      this.fluxHistory.shift();
    }
    if (this.fluxHistory.length >= 3) {
      const mean = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
      const variance = this.fluxHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.fluxHistory.length;
      this.adaptiveThreshold = Math.max(this.onsetThreshold, mean + 1.5 * Math.sqrt(variance));
    }

    this.frameCount++;
  }

  /**
   * Get overall energy level from FFT frequency data.
   * Always uses FFT (not Meyda) for reliability.
   * @returns {number} Energy value between 0 and 1
   */
  getEnergy() {
    if (!this.connected || !this.analyser) return 0;

    let sum = 0;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      sum += this.frequencyData[i];
    }

    return sum / (len * 255);
  }

  /**
   * Get bass energy (low-frequency bins).
   * @returns {number} Bass energy value between 0 and 1
   */
  getBassEnergy() {
    if (!this.connected || !this.analyser) return 0;

    const bassEnd = Math.max(1, Math.floor(this.frequencyData.length * 0.1));
    let sum = 0;
    for (let i = 0; i < bassEnd; i++) {
      sum += this.frequencyData[i];
    }

    return sum / (bassEnd * 255);
  }

  /**
   * Get mid-range energy.
   * @returns {number} Mid energy value between 0 and 1
   */
  getMidEnergy() {
    if (!this.connected || !this.analyser) return 0;

    const len = this.frequencyData.length;
    const midStart = Math.floor(len * 0.1);
    const midEnd = Math.floor(len * 0.5);
    let sum = 0;
    for (let i = midStart; i < midEnd; i++) {
      sum += this.frequencyData[i];
    }

    return sum / ((midEnd - midStart) * 255);
  }

  /**
   * Get treble/high-frequency energy.
   * @returns {number} Treble energy value between 0 and 1
   */
  getTrebleEnergy() {
    if (!this.connected || !this.analyser) return 0;

    const len = this.frequencyData.length;
    const trebleStart = Math.floor(len * 0.5);
    let sum = 0;
    for (let i = trebleStart; i < len; i++) {
      sum += this.frequencyData[i];
    }

    return sum / ((len - trebleStart) * 255);
  }

  /**
   * Get current spectral flux value (rate of spectral change).
   * Uses Meyda if available, otherwise manual FFT-based calculation.
   * @returns {number} Spectral flux value (0+, typically 0-1 range)
   */
  getSpectralFlux() {
    if (this.meydaReady && this.features.spectralFlux > 0) {
      return this.features.spectralFlux;
    }
    return this.manualFlux;
  }

  /**
   * Get spectral centroid (brightness of the sound).
   * @returns {number} Spectral centroid (0-1 normalized)
   */
  getSpectralCentroid() {
    if (this.meydaReady && this.features.spectralCentroid > 0) {
      return this.features.spectralCentroid;
    }
    // Manual centroid from FFT: weighted average of bin indices
    if (!this.connected || !this.analyser) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      weightedSum += i * this.frequencyData[i];
      totalWeight += this.frequencyData[i];
    }
    if (totalWeight === 0) return 0;
    return weightedSum / totalWeight / len; // Normalized 0-1
  }

  /**
   * Onset detection based on spectral flux spikes.
   * Returns true when a sudden timbral change occurs (drum hit, note attack).
   * Safe to call multiple times per frame (caches result).
   * @returns {boolean} True if an onset is detected this frame
   */
  isOnset() {
    if (!this.connected) return false;

    // Cache per frame — avoids cooldown eating the second call
    if (this.lastOnsetFrame === this.frameCount) {
      return this.lastOnsetResult;
    }
    this.lastOnsetFrame = this.frameCount;

    const flux = this.getSpectralFlux();
    const now = performance.now();
    const timeSinceLast = now - this.lastOnsetTime;

    if (flux > this.adaptiveThreshold && timeSinceLast > this.onsetCooldown) {
      this.lastOnsetTime = now;
      this.lastOnsetResult = true;
    } else {
      this.lastOnsetResult = false;
    }

    return this.lastOnsetResult;
  }

  /**
   * Get onset intensity (how strong the current onset is relative to threshold).
   * @returns {number} 0 when below threshold, >0 when onset (higher = stronger)
   */
  getOnsetIntensity() {
    const flux = this.getSpectralFlux();
    if (flux <= this.adaptiveThreshold) return 0;
    return Math.min(1, (flux - this.adaptiveThreshold) / (this.adaptiveThreshold + 0.01));
  }

  /**
   * Simple beat detection based on bass energy spikes.
   * @returns {boolean} True if a beat is detected this frame
   */
  isBeat() {
    if (!this.connected) return false;

    const bassEnergy = this.getBassEnergy();
    const now = performance.now();
    const timeSinceLast = now - this.lastBeatTime;

    const spike = bassEnergy > this.beatThreshold &&
                  bassEnergy > this.previousBassEnergy * 1.2;
    const cooldownPassed = timeSinceLast > this.beatCooldown;

    this.previousBassEnergy = bassEnergy;

    if (spike && cooldownPassed) {
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  /**
   * Dispose and release all Web Audio resources
   */
  dispose() {
    this.destroyed = true;

    if (this.meydaAnalyzer) {
      try { this.meydaAnalyzer.stop(); } catch (_) { /* ignore */ }
      this.meydaAnalyzer = null;
    }

    if (this.source) {
      try { this.source.disconnect(); } catch (_) { /* ignore */ }
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (_) { /* ignore */ }
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.frequencyData = null;
    this.previousFrequencyData = null;
    this.connected = false;
    this.meydaReady = false;
    console.log('[AudioAnalyzer] Disposed');
  }
}
