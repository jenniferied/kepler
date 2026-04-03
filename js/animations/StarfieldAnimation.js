/**
 * StarfieldAnimation - Canvas-based space travel starfield effect
 * Stars emanate from the center and drift outward with trail effects.
 * Audio-reactive: speed follows energy, wiggle follows spectral flux (onsets).
 * Respects prefers-reduced-motion for accessibility.
 */
export class StarfieldAnimation {
  /**
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {Object} [options] - Configuration options
   * @param {number} [options.starCount=300] - Number of stars in the pool
   * @param {number} [options.speed=0.4] - Base travel speed multiplier
   * @param {number} [options.trailLength=0.3] - Trail streak length (0-1)
   * @param {number} [options.maxDepth=1000] - Virtual depth for perspective
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Configuration
    this.starCount = options.starCount || 300;
    this.speed = options.speed || 0.4;
    this.trailLength = options.trailLength || 0.3;
    this.maxDepth = options.maxDepth || 1000;

    // State
    this.stars = [];
    this.running = false;
    this.rafId = null;
    this.centerX = 0;
    this.centerY = 0;
    this.reducedMotion = false;
    this.destroyed = false;

    // Audio reactivity
    this.audioAnalyzer = null;
    this.smoothedEnergy = 0;
    this.energySmoothingFactor = 0.12;
    this.energySpeedScale = 2.5;

    // Debug overlay (toggle with 'd' key)
    this.debugMode = false;
    this.onsetFlash = 0; // Flashes on onset for visual feedback
    this._onKeyDown = (e) => {
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        this.debugMode = !this.debugMode;
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    // Wiggle state (driven by spectral flux / onset detection)
    this.wiggleIntensity = 0;
    this.wiggleDecay = 0.92;       // Per-frame decay (higher = longer wiggle)
    this.wiggleAttack = 1.2;       // How much of onset intensity to apply
    this.time = 0;

    // Speed burst state (driven by bass energy spikes)
    this.speedBurst = 0;
    this.speedBurstDecay = 0.95;

    // Bind methods
    this._onResize = this._onResize.bind(this);
    this._animate = this._animate.bind(this);
  }

  /**
   * Initialize the star pool and check accessibility preferences
   */
  _initPool() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this._createStar(true));
    }
  }

  /**
   * Create or reset a star object
   * @param {boolean} randomDepth - If true, place at random depth (initial scatter)
   * @returns {Object} Star object
   */
  _createStar(randomDepth = false) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.8 + 0.2;

    return {
      x: Math.cos(angle) * radius * this.maxDepth,
      y: Math.sin(angle) * radius * this.maxDepth,
      z: randomDepth ? Math.random() * this.maxDepth : this.maxDepth,
      baseSize: Math.random() * 1.5 + 0.5,
      hue: Math.random() < 0.25 ? 210 + Math.random() * 30 : 0,
      saturation: Math.random() < 0.25 ? 30 + Math.random() * 40 : 0,
      brightness: 85 + Math.random() * 15
    };
  }

  /**
   * Resize the canvas to fill its container
   */
  _onResize() {
    if (this.destroyed) return;
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    let contentH = 0;
    for (const child of parent.children) {
      if (child === this.canvas) continue;
      const bottom = child.offsetTop + child.offsetHeight;
      if (bottom > contentH) contentH = bottom;
    }
    const h = Math.max(contentH, parent.clientHeight, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.viewWidth = w;
    this.viewHeight = h;

    if (this.reducedMotion) {
      this._renderStaticStars();
    }
  }

  /**
   * Render a single static frame (for reduced motion)
   */
  _renderStaticStars() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    for (const star of this.stars) {
      const perspective = this.maxDepth / (star.z + 1);
      const sx = this.centerX + star.x * perspective;
      const sy = this.centerY + star.y * perspective;
      const size = star.baseSize * perspective * 0.5;

      if (sx < -10 || sx > this.viewWidth + 10 || sy < -10 || sy > this.viewHeight + 10) continue;

      const alpha = Math.min(1, (1 - star.z / this.maxDepth) * 1.2);
      if (star.saturation > 0) {
        ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, ${star.brightness}%, ${alpha * 0.7})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.3, size * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Main animation loop
   */
  _animate() {
    if (!this.running || this.destroyed) return;

    this.rafId = requestAnimationFrame(this._animate);

    const ctx = this.ctx;
    // Trail effect — dynamic: more wiggle/speed = less clearing = longer visible trails
    const reactivity = Math.max(this.wiggleIntensity, this.speedBurst * 0.5);
    const dynamicTrail = this.trailLength + reactivity * 0.6; // up to 0.6 more trail
    ctx.fillStyle = `rgba(10, 10, 10, ${1 - dynamicTrail})`;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    // --- Audio reactivity ---
    let energy = 0;
    let bass = 0;
    const hasAnalyzer = this.audioAnalyzer && this.audioAnalyzer.connected;

    if (hasAnalyzer) {
      // Update FFT data + compute manual spectral flux (MUST call first)
      this.audioAnalyzer._updateFFT();

      energy = this.audioAnalyzer.getEnergy();
      bass = this.audioAnalyzer.getBassEnergy();

      // Onset detection via spectral flux — triggers wiggle
      if (this.audioAnalyzer.isOnset()) {
        const intensity = this.audioAnalyzer.getOnsetIntensity();
        // Combine onset intensity with bass for visceral impact
        this.wiggleIntensity = Math.min(1, intensity * this.wiggleAttack + bass * 0.3);
      }

      // Bass pushes speed burst up, but always decays exponentially
      if (bass > this.speedBurst * 0.8) {
        this.speedBurst = Math.min(1, bass * 0.5);
      }
    }

    this.smoothedEnergy += (energy - this.smoothedEnergy) * this.energySmoothingFactor;
    this.time += 0.1;

    // Decay wiggle and speed burst (exponential falloff)
    this.wiggleIntensity *= this.wiggleDecay;
    if (this.wiggleIntensity < 0.005) this.wiggleIntensity = 0;

    this.speedBurst *= this.speedBurstDecay;
    if (this.speedBurst < 0.005) this.speedBurst = 0;

    // Modulate speed: base + energy + speed burst on beats
    const speed = this.speed * 2 * (1 + this.smoothedEnergy * this.energySpeedScale + this.speedBurst * 1.5);

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];

      // Store previous projected position for trail
      const prevPerspective = this.maxDepth / (star.z + 1);
      const prevSx = this.centerX + star.x * prevPerspective;
      const prevSy = this.centerY + star.y * prevPerspective;

      // Move star closer to the viewer
      star.z -= speed;

      // Reset star when it passes the viewer
      if (star.z <= 0) {
        this.stars[i] = this._createStar(false);
        continue;
      }

      const perspective = this.maxDepth / (star.z + 1);
      const baseSx = this.centerX + star.x * perspective;
      const baseSy = this.centerY + star.y * perspective;
      const size = star.baseSize * perspective * 0.5;

      // Skip if off-screen
      if (baseSx < -50 || baseSx > this.viewWidth + 50 || baseSy < -50 || baseSy > this.viewHeight + 50) {
        this.stars[i] = this._createStar(false);
        continue;
      }

      const depthRatio = 1 - star.z / this.maxDepth;
      const alpha = Math.min(1, depthRatio * 1.5);

      let color;
      if (star.saturation > 0) {
        color = `hsla(${star.hue}, ${star.saturation}%, ${star.brightness}%, ${alpha})`;
      } else {
        color = `rgba(255, 255, 255, ${alpha})`;
      }

      // Trail line
      if (depthRatio > 0.15) {
        ctx.strokeStyle = star.saturation > 0
          ? `hsla(${star.hue}, ${star.saturation}%, ${star.brightness}%, ${alpha * 0.4})`
          : `rgba(255, 255, 255, ${alpha * 0.4})`;
        ctx.lineWidth = Math.max(0.3, size * 0.5);
        ctx.beginPath();
        ctx.moveTo(prevSx, prevSy);
        ctx.lineTo(baseSx, baseSy);
        ctx.stroke();
      }

      // Wiggle: spectral flux onset effect with chromatic aberration
      if (this.wiggleIntensity > 0.01) {
        const wig = this.wiggleIntensity;
        // Per-star wiggle — stronger displacement
        const wigX = Math.sin(this.time * 5 + i * 0.7) * wig * 6;
        const wigY = Math.cos(this.time * 4.2 + i * 1.1) * wig * 5;
        const sx = baseSx + wigX;
        const sy = baseSy + wigY;
        const chrOff = wig * 6; // Chromatic aberration offset
        const chrAlpha = alpha * (0.3 + wig * 0.35);

        // Ghost at base position
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.12})`;
        ctx.beginPath();
        ctx.arc(baseSx, baseSy, Math.max(0.3, size * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // Red channel — desaturated pink, offset left
        ctx.fillStyle = `rgba(220, 140, 140, ${chrAlpha})`;
        ctx.beginPath();
        ctx.arc(sx - chrOff, sy + chrOff * 0.25, Math.max(0.4, size * 0.9), 0, Math.PI * 2);
        ctx.fill();

        // Blue channel — desaturated lavender, offset right
        ctx.fillStyle = `rgba(140, 160, 220, ${chrAlpha})`;
        ctx.beginPath();
        ctx.arc(sx + chrOff, sy - chrOff * 0.25, Math.max(0.4, size * 0.9), 0, Math.PI * 2);
        ctx.fill();

        // Green channel — desaturated mint, subtle vertical
        ctx.fillStyle = `rgba(140, 210, 160, ${chrAlpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy + chrOff * 0.4, Math.max(0.3, size * 0.7), 0, Math.PI * 2);
        ctx.fill();

        // Main star at wiggled position (slightly bigger during wiggle)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, size * (1 + wig * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal star dot (no wiggle)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(baseSx, baseSy, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Debug overlay (press 'd' to toggle)
    if (this.debugMode) {
      this._renderDebug(ctx, hasAnalyzer, energy, bass);
    }
  }

  /**
   * Render debug overlay with live audio feature values and meter bars
   */
  _renderDebug(ctx, hasAnalyzer, energy, bass) {
    const x = 10;
    const y = 10;
    const w = 220;
    const lineH = 16;
    const barW = 100;
    const barH = 8;
    const barX = x + 112;

    // Collect values
    const flux = hasAnalyzer ? this.audioAnalyzer.getSpectralFlux() : 0;
    const centroid = hasAnalyzer ? this.audioAnalyzer.getSpectralCentroid() : 0;
    const mid = hasAnalyzer ? this.audioAnalyzer.getMidEnergy() : 0;
    const treble = hasAnalyzer ? this.audioAnalyzer.getTrebleEnergy() : 0;
    const meydaOk = hasAnalyzer && this.audioAnalyzer.meydaReady;

    // Flash on onset
    if (hasAnalyzer && this.audioAnalyzer.isOnset()) {
      this.onsetFlash = 1;
    }
    this.onsetFlash *= 0.85;

    const lines = [
      { label: 'Analyzer', value: hasAnalyzer ? (meydaOk ? 'Meyda' : 'FFT only') : 'OFF', bar: -1 },
      { label: 'RMS Energy', value: energy.toFixed(3), bar: energy, color: '#4ade80' },
      { label: 'Bass', value: bass.toFixed(3), bar: bass, color: '#f97316' },
      { label: 'Mid', value: mid.toFixed(3), bar: mid, color: '#facc15' },
      { label: 'Treble', value: treble.toFixed(3), bar: treble, color: '#38bdf8' },
      { label: 'Spec. Flux', value: flux.toFixed(4), bar: Math.min(1, flux * 3), color: '#e879f9' },
      { label: 'Centroid', value: centroid.toFixed(0), bar: Math.min(1, centroid / 5000), color: '#a78bfa' },
      { label: '---', value: '', bar: -1 },
      { label: 'Wiggle', value: this.wiggleIntensity.toFixed(3), bar: this.wiggleIntensity, color: '#fb7185' },
      { label: 'Speed Burst', value: this.speedBurst.toFixed(3), bar: this.speedBurst, color: '#fbbf24' },
      { label: 'Sm. Energy', value: this.smoothedEnergy.toFixed(3), bar: this.smoothedEnergy, color: '#34d399' },
    ];

    const h = lines.length * lineH + 16;

    // Background
    ctx.fillStyle = `rgba(0, 0, 0, 0.75)`;
    ctx.fillRect(x, y, w, h);

    // Onset flash border
    if (this.onsetFlash > 0.05) {
      ctx.strokeStyle = `rgba(255, 100, 200, ${this.onsetFlash})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < lines.length; i++) {
      const ly = y + 10 + i * lineH;
      const line = lines[i];

      if (line.label === '---') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(x + 6, ly);
        ctx.lineTo(x + w - 6, ly);
        ctx.stroke();
        continue;
      }

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, x + 6, ly);

      if (line.bar === -1) {
        // Text-only value (status)
        ctx.fillStyle = hasAnalyzer ? '#4ade80' : '#ef4444';
        ctx.textAlign = 'right';
        ctx.fillText(line.value, x + w - 6, ly);
      } else {
        // Bar meter
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, ly - barH / 2, barW, barH);
        ctx.fillStyle = line.color || '#4ade80';
        ctx.fillRect(barX, ly - barH / 2, barW * Math.min(1, line.bar), barH);
      }
    }
  }

  /**
   * Set the audio analyzer for audio-reactive visuals.
   * @param {Object|null} analyzer - AudioAnalyzer instance (or null to disable)
   */
  setAudioAnalyzer(analyzer) {
    this.audioAnalyzer = analyzer;
  }

  /**
   * Start the starfield animation
   */
  start() {
    if (this.destroyed || this.running) return;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._initPool();
    this._onResize();
    window.addEventListener('resize', this._onResize);

    if (this.reducedMotion) {
      this._renderStaticStars();
      return;
    }

    // Clear canvas fully before starting
    this.ctx.fillStyle = 'rgba(10, 10, 10, 1)';
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    this.running = true;
    this.rafId = requestAnimationFrame(this._animate);
  }

  /**
   * Stop the animation loop (can be resumed with start)
   */
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Called by AnimationController on each frame tick.
   * Since this animation manages its own rAF, this is a no-op
   * but satisfies the AnimationController interface.
   */
  update() {
    // Self-managed animation loop
  }

  /**
   * Reduce quality when performance is poor (called by AnimationController)
   */
  reduceQuality() {
    const targetCount = Math.max(100, Math.floor(this.starCount * 0.5));
    if (this.stars.length > targetCount) {
      this.stars.length = targetCount;
    }
    this.trailLength = Math.max(0.1, this.trailLength * 0.7);
  }

  /**
   * Destroy and clean up all resources
   */
  destroy() {
    this.stop();
    this.destroyed = true;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    this.stars = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Alias for destroy() to match the project's dispose convention
   */
  dispose() {
    this.destroy();
  }
}
