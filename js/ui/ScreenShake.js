/**
 * ScreenShake — Global bass-reactive screen shake with chromatic aberration
 *
 * Applies CSS transforms to the page content on bass hits.
 * Wiggle + RGB split that responds to music energy.
 */
export class ScreenShake {
  constructor(targetEl, options = {}) {
    this.target = targetEl
    this.smoothedBass = 0
    this.shakeAmount = 0  // current shake intensity (0-1)
    this.time = 0
    this.analyzer = null
    this.running = false
    this._rafId = null

    // Chromatic aberration layers
    this.redLayer = null
    this.blueLayer = null
    this._createChromaticLayers()
  }

  _createChromaticLayers() {
    // Red channel overlay
    this.redLayer = document.createElement('div')
    this.redLayer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999;
      mix-blend-mode: screen; opacity: 0;
      background: rgba(255, 0, 0, 0.06);
      transition: opacity 0.05s;
    `
    document.body.appendChild(this.redLayer)

    // Blue channel overlay
    this.blueLayer = document.createElement('div')
    this.blueLayer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999;
      mix-blend-mode: screen; opacity: 0;
      background: rgba(0, 50, 255, 0.06);
      transition: opacity 0.05s;
    `
    document.body.appendChild(this.blueLayer)
  }

  setAnalyzer(analyzer) {
    this.analyzer = analyzer
  }

  start() {
    if (this.running) return
    this.running = true
    this._loop()
  }

  stop() {
    this.running = false
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    // Reset
    this.target.style.transform = ''
    this.redLayer.style.opacity = '0'
    this.blueLayer.style.opacity = '0'
    this.redLayer.style.transform = ''
    this.blueLayer.style.transform = ''
  }

  _loop() {
    if (!this.running) return
    this._rafId = requestAnimationFrame(() => this._loop())

    this.time += 0.1

    // Get bass energy
    let bass = 0
    if (this.analyzer && this.analyzer.connected) {
      bass = this.analyzer.getBassEnergy()
    }

    // Smooth bass with fast attack, slow release
    if (bass > this.smoothedBass) {
      this.smoothedBass += (bass - this.smoothedBass) * 0.3  // fast attack
    } else {
      this.smoothedBass += (bass - this.smoothedBass) * 0.08 // slow release
    }

    // Shake intensity — high threshold, only markante Stellen
    this.shakeAmount = Math.max(0, this.smoothedBass - 0.45) * 5
    this.shakeAmount = Math.min(this.shakeAmount, 1)

    if (this.shakeAmount < 0.01) {
      this.target.style.transform = ''
      this.redLayer.style.opacity = '0'
      this.blueLayer.style.opacity = '0'
      return
    }

    // Wiggle — sinusoidal shake with multiple frequencies
    const shake = this.shakeAmount
    const wiggleX = Math.sin(this.time * 3.7) * shake * 3
    const wiggleY = Math.cos(this.time * 4.3) * shake * 2
    const wiggleRot = Math.sin(this.time * 2.9) * shake * 0.3

    // Apply transform to target
    this.target.style.transform = `translate(${wiggleX}px, ${wiggleY}px) rotate(${wiggleRot}deg)`

    // Chromatic aberration — big RGB split
    const chrOffset = shake * 10
    this.redLayer.style.opacity = (shake * 0.8).toFixed(2)
    this.blueLayer.style.opacity = (shake * 0.8).toFixed(2)
    this.redLayer.style.transform = `translate(${-chrOffset}px, ${chrOffset * 0.3}px)`
    this.blueLayer.style.transform = `translate(${chrOffset}px, ${-chrOffset * 0.3}px)`
  }

  destroy() {
    this.stop()
    if (this.redLayer && this.redLayer.parentNode) {
      this.redLayer.parentNode.removeChild(this.redLayer)
    }
    if (this.blueLayer && this.blueLayer.parentNode) {
      this.blueLayer.parentNode.removeChild(this.blueLayer)
    }
  }
}
