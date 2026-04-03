/**
 * PretextOverlay — Reusable text reflow effect using Pretext
 *
 * Overlays a canvas on a DOM text container. A spinning CD-ROM disc bounces
 * around autonomously (DVD screensaver style) and the canvas renders rich
 * text via Pretext with exclusion zones around the disc.
 *
 * Usage:
 *   const overlay = new PretextOverlay(containerEl, { eventBus })
 *   await overlay.initialize()
 *   overlay.destroy()
 */

const PRETEXT_CDN = 'https://esm.sh/@chenglou/pretext@0.0.4'

// Shared Pretext module reference (loaded once for all instances)
let _pretextModule = null
let _pretextLoading = null

async function loadPretext() {
  if (_pretextModule) return _pretextModule
  if (_pretextLoading) return _pretextLoading
  _pretextLoading = import(PRETEXT_CDN).then(mod => {
    _pretextModule = mod
    return mod
  }).catch(err => {
    console.warn('[PretextOverlay] Failed to load Pretext from CDN:', err)
    _pretextLoading = null
    return null
  })
  return _pretextLoading
}

/**
 * Compute the horizontal interval blocked by a circle on a given line band.
 * Returns { left, right } or null if no intersection.
 */
function getCircleExclusion(cx, cy, cr, bandTop, bandBot) {
  if (bandTop >= cy + cr || bandBot <= cy - cr) return null
  let minDy
  if (cy >= bandTop && cy <= bandBot) {
    minDy = 0
  } else if (cy < bandTop) {
    minDy = bandTop - cy
  } else {
    minDy = cy - bandBot
  }
  if (minDy >= cr) return null
  const dx = Math.sqrt(cr * cr - minDy * minDy)
  return { left: cx - dx, right: cx + dx }
}

/**
 * Carve available slots from a base interval, removing blocked intervals.
 */
function carveSlots(baseLeft, baseRight, blocked, minWidth) {
  let slots = [{ left: baseLeft, right: baseRight }]
  for (const interval of blocked) {
    const next = []
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) {
        next.push({ left: slot.left, right: interval.left })
      }
      if (interval.right < slot.right) {
        next.push({ left: interval.right, right: slot.right })
      }
    }
    slots = next
  }
  return slots.filter(s => (s.right - s.left) >= minWidth)
}

export class PretextOverlay {
  /**
   * @param {HTMLElement} container - The DOM element containing text to overlay
   * @param {Object} options
   * @param {EventBus} [options.eventBus] - Optional EventBus instance
   * @param {string} [options.font] - Canvas font string
   * @param {number} [options.lineHeight] - Line height in px
   * @param {string} [options.textColor] - Text fill color
   * @param {number} [options.padding] - Horizontal padding in px
   * @param {number} [options.sphereRadius] - Sphere radius in px
   * @param {number} [options.spherePadding] - Extra clearance around sphere
   */
  constructor(container, options = {}) {
    this.container = container
    this.eventBus = options.eventBus || null

    // Configuration
    this.font = options.font || '15px "IBM Plex Mono", monospace'
    this.lineHeight = options.lineHeight || 24
    this.textColor = options.textColor || '#c8c8c8'

    // Style-specific fonts and colors for rich text rendering
    this.styleFonts = {
      heading: 'bold 15px "IBM Plex Mono", monospace',
      bold:    'bold 15px "IBM Plex Mono", monospace',
      italic:  'italic 15px "IBM Plex Mono", monospace',
      normal:  '15px "IBM Plex Mono", monospace',
    }
    this.styleColors = {
      heading: '#e0e0e0',
      bold:    '#d0d0d0',
      italic:  '#b0b0b0',
      normal:  '#999',
    }
    this.padding = options.padding || 40
    this.sphereRadius = options.sphereRadius || 55
    this.spherePadding = options.spherePadding || 14
    this.minSlotWidth = options.minSlotWidth || 30

    // Internal state
    this.canvas = null
    this.ctx = null
    this.pretext = null
    this.prepared = null
    this.textContent = ''
    this.textSegments = []

    this.discAngle = 0
    this.discSpinSpeed = 0.001  // nearly still when muted
    this.discTrail = []
    this.trailMaxLen = 45

    this.sphereX = 0
    this.sphereY = 0
    this.vx = 0
    this.vy = 0
    this.active = false

    // Music-reactive state machine
    this.musicPlaying = false       // current detected state
    this.colorIntensity = 0         // 0 = muted gray, 1 = full rainbow
    this.motionIntensity = 0        // 0 = still, 1 = full bounce
    this.targetVx = 0
    this.targetVy = 0
    this.hoveringDisc = false       // mouse is over the disc

    // Drag state
    this.dragging = false
    this.dragOffsetX = 0
    this.dragOffsetY = 0
    this.lastDragX = 0
    this.lastDragY = 0
    this.throwVx = 0
    this.throwVy = 0

    this.canvasWidth = 0
    this.canvasHeight = 0
    this.dpr = window.devicePixelRatio || 1

    this.initialized = false
    this.destroyed = false

    // Bound handlers (for cleanup)
    this._onResize = this._handleResize.bind(this)
    this._onPointerDown = this._handlePointerDown.bind(this)
    this._onPointerMove = this._handlePointerMove.bind(this)
    this._onPointerUp = this._handlePointerUp.bind(this)
    this._onHoverCheck = this._handleHoverCheck.bind(this)
    this._rafId = null
    this._animating = false
  }

  /**
   * Initialize the overlay: load Pretext, extract text, create canvas.
   * Returns false if initialization failed (Pretext unavailable, reduced motion, etc.)
   */
  async initialize() {
    if (this.destroyed) return false

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log('[PretextOverlay] Reduced motion preferred, skipping')
      return false
    }

    // Load Pretext
    this.pretext = await loadPretext()
    if (!this.pretext) {
      console.warn('[PretextOverlay] Pretext not available, skipping overlay')
      return false
    }

    // Extract text content from the container
    this.textContent = this._extractText()
    if (!this.textContent || this.textContent.length < 50) {
      console.log('[PretextOverlay] Not enough text content, skipping')
      return false
    }

    // Wait for fonts to be ready
    await document.fonts.ready

    // Prepare text with Pretext
    try {
      this.prepared = this.pretext.prepareWithSegments(this.textContent, this.font)
    } catch (err) {
      console.warn('[PretextOverlay] Failed to prepare text:', err)
      return false
    }

    // Create canvas overlay
    this._createCanvas()

    // Initialize sphere position and velocity
    this._initSpherePosition()
    this._initVelocity()

    // Bind event listeners
    window.addEventListener('resize', this._onResize)
    this.container.addEventListener('mousedown', this._onPointerDown)
    this.container.addEventListener('touchstart', this._onPointerDown, { passive: false })
    window.addEventListener('mousemove', this._onPointerMove)
    window.addEventListener('touchmove', this._onPointerMove, { passive: false })
    window.addEventListener('mouseup', this._onPointerUp)
    window.addEventListener('touchend', this._onPointerUp)
    this.container.addEventListener('mousemove', this._onHoverCheck)

    this.initialized = true
    console.log('[PretextOverlay] Initialized on', this.container.id || this.container.className)
    return true
  }

  /**
   * Determine the style for a text node based on its ancestor elements.
   */
  _getNodeStyle(node) {
    let el = node.parentElement
    while (el && el !== this.container) {
      const tag = el.tagName
      if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4') return 'heading'
      if (tag === 'STRONG' || tag === 'B') return 'bold'
      if (tag === 'EM' || tag === 'I') return 'italic'
      el = el.parentElement
    }
    return 'normal'
  }

  /**
   * Extract text segments with formatting info from the container's children.
   * Returns an array of { text, style } segments and sets this.textSegments.
   * Also returns the concatenated plain text string.
   */
  _extractText() {
    const segments = []
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tag = parent.tagName
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS') {
            return NodeFilter.FILTER_REJECT
          }
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim()
      if (text) {
        const style = this._getNodeStyle(node)
        segments.push({ text, style })
      }
    }

    this.textSegments = segments
    return segments.map(s => s.text).join(' ')
  }

  /**
   * Create the canvas element and position it over the container.
   */
  _createCanvas() {
    const pos = window.getComputedStyle(this.container).position
    if (pos === 'static') {
      this.container.style.position = 'relative'
    }

    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      opacity: 0;
      z-index: 10;
      cursor: default;
    `
    this.canvas.setAttribute('aria-hidden', 'true')
    this.container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')

    this._sizeCanvas()
  }

  /**
   * Size canvas to match container dimensions at current DPR.
   */
  _sizeCanvas() {
    if (!this.canvas) return

    const rect = this.container.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    this.dpr = window.devicePixelRatio || 1

    if (this.canvasWidth !== w || this.canvasHeight !== h) {
      this.canvasWidth = w
      this.canvasHeight = h
      this.canvas.width = Math.round(w * this.dpr)
      this.canvas.height = Math.round(h * this.dpr)
      this.canvas.style.width = w + 'px'
      this.canvas.style.height = h + 'px'
    }
  }

  /**
   * Place the sphere in an initial position within the container.
   */
  _initSpherePosition() {
    const r = this.sphereRadius
    this.sphereX = r + 20
    this.sphereY = r + 20
  }

  /**
   * Set initial velocity — starts still (no music = no movement).
   * A random direction is stored for when music starts.
   */
  _initVelocity() {
    // Start still; pick a random direction for when music kicks in
    this._baseAngle = Math.random() * Math.PI * 2
    this.vx = 0
    this.vy = 0
  }

  _getPointerPos(e) {
    const rect = this.container.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return { x: cx - rect.left, y: cy - rect.top }
  }

  _isOnDisc(px, py) {
    const dx = (px - this.sphereX) / this.sphereRadius
    const dy = (py - this.sphereY) / (this.sphereRadius * 0.85)
    return dx * dx + dy * dy <= 1
  }

  _handlePointerDown(e) {
    if (!this.initialized || !this.active) return
    const pos = this._getPointerPos(e)
    if (this._isOnDisc(pos.x, pos.y)) {
      this.dragging = true
      this.dragOffsetX = this.sphereX - pos.x
      this.dragOffsetY = this.sphereY - pos.y
      this.lastDragX = pos.x
      this.lastDragY = pos.y
      this.throwVx = 0
      this.throwVy = 0
      this.canvas.style.pointerEvents = 'auto'
      this.canvas.style.cursor = 'grabbing'
      e.preventDefault()
    }
  }

  _handlePointerMove(e) {
    if (!this.dragging) return
    const pos = this._getPointerPos(e)
    this.throwVx = pos.x - this.lastDragX
    this.throwVy = pos.y - this.lastDragY
    this.lastDragX = pos.x
    this.lastDragY = pos.y
    this.sphereX = pos.x + this.dragOffsetX
    this.sphereY = pos.y + this.dragOffsetY
    e.preventDefault()
  }

  _handlePointerUp() {
    if (!this.dragging) return
    this.dragging = false
    // Apply throw velocity
    this.vx = this.throwVx * 0.8
    this.vy = this.throwVy * 0.8
    // Clamp max throw speed
    const maxV = 12
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (spd > maxV) { this.vx *= maxV / spd; this.vy *= maxV / spd }
    this.canvas.style.pointerEvents = 'none'
    this.canvas.style.cursor = ''
  }

  _handleHoverCheck(e) {
    if (!this.initialized || !this.active || this.dragging) return
    const pos = this._getPointerPos(e)
    const onDisc = this._isOnDisc(pos.x, pos.y)
    this.hoveringDisc = onDisc
    if (this.canvas) {
      this.canvas.style.cursor = onDisc ? 'grab' : 'default'
    }
  }

  _handleResize() {
    if (!this.initialized) return
    this._sizeCanvas()
    // Clamp sphere to new bounds
    const r = this.sphereRadius
    this.sphereX = Math.max(r, Math.min(this.canvasWidth - r, this.sphereX))
    this.sphereY = Math.max(r, Math.min(this.canvasHeight - r, this.sphereY))
  }

  /**
   * Show the overlay — activate canvas, hide DOM text, start bouncing.
   * Called on page enter.
   */
  show() {
    if (!this.initialized) return
    this.active = true
    this.canvas.style.opacity = '1'
    this._setDomTextVisibility(false)
    this._sizeCanvas()
    this._startAnimationLoop()
  }

  /**
   * Hide the overlay — stop animation, restore DOM text.
   * Called on page leave.
   */
  hide() {
    if (!this.initialized) return
    this.active = false
    this._animating = false
    this.canvas.style.opacity = '0'
    this._setDomTextVisibility(true)
  }

  _setDomTextVisibility(visible) {
    for (const child of this.container.children) {
      if (child === this.canvas) continue
      child.style.visibility = visible ? '' : 'hidden'
    }
  }

  /**
   * Autonomous bouncing animation loop.
   * Sphere behavior depends on music state:
   *   - No music: still, muted gray, no trail
   *   - Music playing: bouncing, colorful, trail active
   *   - Music stops: glides to stop, fades to muted
   */
  _startAnimationLoop() {
    if (this._animating) return
    this._animating = true

    const baseSpeed = 1.2

    const loop = () => {
      if (!this._animating || !this.active) return

      // Detect music state
      const audio = document.getElementById('audio-player')
      const nowPlaying = !!(audio && !audio.paused && !audio.ended)

      // Smooth transitions for color and motion intensity
      const rampUp = 0.03    // ~1 second to full
      const rampDown = 0.015 // ~2 seconds to stop

      if (nowPlaying) {
        this.colorIntensity += (1 - this.colorIntensity) * rampUp
        this.motionIntensity += (1 - this.motionIntensity) * rampUp
      } else {
        this.colorIntensity += (0 - this.colorIntensity) * rampDown
        this.motionIntensity += (0 - this.motionIntensity) * rampDown
        if (this.colorIntensity < 0.005) this.colorIntensity = 0
        if (this.motionIntensity < 0.005) this.motionIntensity = 0
      }

      // If music just started and disc is still, give it a push
      if (nowPlaying && !this.musicPlaying) {
        if (Math.abs(this.vx) < 0.01 && Math.abs(this.vy) < 0.01) {
          this._baseAngle = Math.random() * Math.PI * 2
          this.vx = Math.cos(this._baseAngle) * 0.1
          this.vy = Math.sin(this._baseAngle) * 0.1
        }
      }
      this.musicPlaying = nowPlaying

      // Spin speed
      if (nowPlaying) {
        this.discSpinSpeed += (0.06 - this.discSpinSpeed) * 0.05
      } else {
        this.discSpinSpeed += (0.001 - this.discSpinSpeed) * 0.02
        if (this.discSpinSpeed < 0.001) this.discSpinSpeed = 0.001
      }

      if (!this.dragging) {
        if (this.motionIntensity > 0.01) {
          // Move sphere — velocity scaled by motionIntensity
          const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy)

          // Ramp toward base speed when music is on
          if (nowPlaying) {
            if (spd > baseSpeed) {
              this.vx *= 0.985
              this.vy *= 0.985
            } else if (spd < baseSpeed * 0.8) {
              const a = Math.atan2(this.vy, this.vx) || this._baseAngle
              const targetSpd = baseSpeed * this.motionIntensity
              this.vx += (Math.cos(a) * targetSpd - this.vx) * 0.03
              this.vy += (Math.sin(a) * targetSpd - this.vy) * 0.03
            }
          } else {
            // Friction to stop when music off
            this.vx *= 0.98
            this.vy *= 0.98
            if (Math.abs(this.vx) < 0.01) this.vx = 0
            if (Math.abs(this.vy) < 0.01) this.vy = 0
          }

          this.sphereX += this.vx
          this.sphereY += this.vy
        }

        // Bounce off edges (always, in case of throw)
        const r = this.sphereRadius
        const w = this.canvasWidth
        const h = this.canvasHeight

        if (this.sphereX - r <= 0) { this.sphereX = r; this.vx = Math.abs(this.vx) }
        else if (this.sphereX + r >= w) { this.sphereX = w - r; this.vx = -Math.abs(this.vx) }
        if (this.sphereY - r <= 0) { this.sphereY = r; this.vy = Math.abs(this.vy) }
        else if (this.sphereY + r >= h) { this.sphereY = h - r; this.vy = -Math.abs(this.vy) }
      }

      this._render()
      this._rafId = requestAnimationFrame(loop)
    }

    this._rafId = requestAnimationFrame(loop)
  }

  /**
   * Build a flat array mapping each character index in the concatenated
   * text string to its style ('heading', 'bold', 'italic', 'normal').
   */
  _buildCharStyleMap() {
    if (this._charStyleMap) return this._charStyleMap
    const map = []
    for (let i = 0; i < this.textSegments.length; i++) {
      const seg = this.textSegments[i]
      for (let c = 0; c < seg.text.length; c++) {
        map.push(seg.style)
      }
      // Account for the space separator between segments (except after last)
      if (i < this.textSegments.length - 1) {
        map.push(seg.style)
      }
    }
    this._charStyleMap = map
    return map
  }

  /**
   * Render a line of text with per-character styling based on the style map.
   * charOffset is the global character offset for the start of this line.
   */
  _renderStyledLine(ctx, text, x, y, charOffset) {
    const styleMap = this._buildCharStyleMap()
    let curX = x
    let runStart = 0
    const len = text.length

    // Determine style at a given position in the line
    const styleAt = (i) => {
      const globalIdx = charOffset + i
      if (globalIdx >= 0 && globalIdx < styleMap.length) {
        return styleMap[globalIdx]
      }
      return 'normal'
    }

    while (runStart < len) {
      const style = styleAt(runStart)
      let runEnd = runStart + 1
      while (runEnd < len && styleAt(runEnd) === style) {
        runEnd++
      }

      ctx.font = this.styleFonts[style] || this.styleFonts.normal
      ctx.fillStyle = this.styleColors[style] || this.styleColors.normal
      const segment = text.slice(runStart, runEnd)
      ctx.fillText(segment, curX, y)
      curX += ctx.measureText(segment).width

      runStart = runEnd
    }
  }

  /**
   * Render text with Pretext + disc exclusion onto the canvas.
   */
  _render() {
    if (!this.ctx || !this.prepared) return

    const ctx = this.ctx
    const w = this.canvasWidth
    const h = this.canvasHeight

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Fill background to match site
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, w, h)

    const textLeft = this.padding
    const textRight = w - this.padding
    const totalWidth = textRight - textLeft
    if (totalWidth < 60) return

    const effectiveR = this.sphereRadius + this.spherePadding

    ctx.font = this.font
    ctx.fillStyle = this.textColor
    ctx.textBaseline = 'top'

    // Track global character offset for styled rendering
    let charOffset = 0
    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = this.padding

    const { layoutNextLine } = this.pretext

    while (y + this.lineHeight <= h - 10) {
      const bandTop = y
      const bandBot = y + this.lineHeight

      const exclusion = getCircleExclusion(
        this.sphereX, this.sphereY, effectiveR, bandTop, bandBot
      )

      if (exclusion === null) {
        const line = layoutNextLine(this.prepared, cursor, totalWidth)
        if (line === null) break
        this._renderStyledLine(ctx, line.text, textLeft, y, charOffset)
        charOffset += line.text.length
        cursor = line.end
      } else {
        const slots = carveSlots(textLeft, textRight, [exclusion], this.minSlotWidth)

        if (slots.length === 0) {
          y += this.lineHeight
          continue
        }

        slots.sort((a, b) => a.left - b.left)

        let done = false
        for (const slot of slots) {
          const slotWidth = slot.right - slot.left
          const line = layoutNextLine(this.prepared, cursor, slotWidth)
          if (line === null) { done = true; break }
          this._renderStyledLine(ctx, line.text, slot.left, y, charOffset)
          charOffset += line.text.length
          cursor = line.end
        }
        if (done) break
      }

      y += this.lineHeight
    }

    // Disc rotation
    this.discAngle += this.discSpinSpeed

    const ci = this.colorIntensity

    // Trail: only accumulate when there is motion and color
    if (ci > 0.01 && this.motionIntensity > 0.01) {
      this.discTrail.push({ x: this.sphereX, y: this.sphereY })
      if (this.discTrail.length > this.trailMaxLen) this.discTrail.shift()
    } else {
      // Fade out trail by removing oldest entries
      if (this.discTrail.length > 0) {
        this.discTrail.shift()
      }
    }

    // Draw glow trail (long, rainbow, fading) — scaled by colorIntensity
    if (this.discTrail.length > 1) {
      for (let i = 0; i < this.discTrail.length - 1; i++) {
        const t = this.discTrail[i]
        const progress = i / this.discTrail.length
        const alpha = progress * progress * 0.5 * ci
        const scale = 0.3 + progress * 0.6
        const hue = (this.discAngle * 57.3 + i * 6) % 360
        // Outer glow
        ctx.beginPath()
        ctx.ellipse(t.x, t.y, this.sphereRadius * scale * 1.3, this.sphereRadius * scale * 1.3 * 0.85, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue}, 50%, 70%, ${alpha * 0.3})`
        ctx.fill()
        // Inner core
        ctx.beginPath()
        ctx.ellipse(t.x, t.y, this.sphereRadius * scale * 0.6, this.sphereRadius * scale * 0.6 * 0.85, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${alpha * 0.7})`
        ctx.fill()
      }
    }

    // Draw disc with current color intensity and hover state
    this._drawDisc(ctx, this.sphereX, this.sphereY, this.sphereRadius, ci, this.hoveringDisc)
  }

  /**
   * Lerp helper for color interpolation.
   */
  _lerp(a, b, t) {
    return a + (b - a) * t
  }

  /**
   * Interpolate between two CSS color strings of the form 'rgb(r,g,b)' or hex.
   * Returns a hex string. Accepts arrays [r,g,b] for convenience.
   */
  _lerpColor(mutedRGB, brightRGB, t) {
    const r = Math.round(this._lerp(mutedRGB[0], brightRGB[0], t))
    const g = Math.round(this._lerp(mutedRGB[1], brightRGB[1], t))
    const b = Math.round(this._lerp(mutedRGB[2], brightRGB[2], t))
    return `rgb(${r},${g},${b})`
  }

  /**
   * Draw a spinning CD-ROM / DVD disc with holographic sheen.
   * @param {number} ci - colorIntensity: 0 = muted gray, 1 = full rainbow
   * @param {boolean} hovering - whether the mouse is over the disc
   */
  _drawDisc(ctx, x, y, r, ci = 1, hovering = false) {
    const angle = this.discAngle
    const tiltY = 0.85 // nearly upright

    ctx.save()

    // Hover glow — brighter aura when mouse is over the disc
    if (hovering) {
      const glowAlpha = 0.15 + ci * 0.2
      ctx.beginPath()
      ctx.ellipse(x, y, r * 1.25, r * tiltY * 1.25, 0, 0, Math.PI * 2)
      const glowGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.25)
      const hoverHue = (angle * 57.3) % 360
      glowGrad.addColorStop(0, `hsla(${hoverHue}, 60%, 75%, ${glowAlpha})`)
      glowGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = glowGrad
      ctx.fill()
    }

    // Subtle shadow
    ctx.beginPath()
    ctx.ellipse(x + 2, y + 3, r * 0.9, r * tiltY * 0.9, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fill()

    // Disc body — interpolate between muted gray and bright silver
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * tiltY, 0, 0, Math.PI * 2)
    const bodyGrad = ctx.createRadialGradient(x, y, r * 0.15, x, y, r)
    // Muted: darker grays; Bright: original silvers
    bodyGrad.addColorStop(0, this._lerpColor([140, 140, 140], [224, 224, 224], ci))
    bodyGrad.addColorStop(0.4, this._lerpColor([120, 120, 120], [208, 208, 208], ci))
    bodyGrad.addColorStop(0.7, this._lerpColor([100, 100, 100], [184, 184, 184], ci))
    bodyGrad.addColorStop(1, this._lerpColor([70, 70, 70], [144, 144, 144], ci))
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Rotating rainbow sheen — only when colorIntensity > 0
    if (ci > 0.01) {
      const hue = (angle * 57.3) % 360
      const specX = x + Math.cos(angle) * r * 0.35
      const specY = y + Math.sin(angle) * r * tiltY * 0.35
      const sheenGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.7)
      sheenGrad.addColorStop(0, `hsla(${hue}, 80%, 75%, ${0.35 * ci})`)
      sheenGrad.addColorStop(0.4, `hsla(${(hue + 90) % 360}, 60%, 70%, ${0.15 * ci})`)
      sheenGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * tiltY, 0, 0, Math.PI * 2)
      ctx.fillStyle = sheenGrad
      ctx.fill()
    }

    // Data-area track rings (concentric grooves like a real CD)
    const ringAlpha = this._lerp(0.06, 0.12, ci)
    ctx.strokeStyle = `rgba(140,140,150,${ringAlpha})`
    ctx.lineWidth = 0.4
    for (const ring of [0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.90]) {
      ctx.beginPath()
      ctx.ellipse(x, y, r * ring, r * ring * tiltY, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Outer rim — slightly inset bevel
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * tiltY, 0, 0, Math.PI * 2)
    const rimAlpha = this._lerp(0.3, 0.6, ci)
    ctx.strokeStyle = `rgba(200,200,210,${rimAlpha})`
    ctx.lineWidth = 2.5
    ctx.stroke()
    // Inner edge of outer rim
    ctx.beginPath()
    ctx.ellipse(x, y, r * 0.965, r * 0.965 * tiltY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(160,160,170,${rimAlpha * 0.5})`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // --- Clear / transparent section (between data area and clamping ring) ---
    // This is the see-through ring on a real CD
    const clearOuterR = r * 0.28   // where data area begins
    const clearInnerR = r * 0.21   // where clamping ring ends
    ctx.beginPath()
    ctx.ellipse(x, y, clearOuterR, clearOuterR * tiltY, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(8, 8, 12, 0.55)'
    ctx.fill()
    // Subdividing ring in the clear section (stacking ring)
    const stackRingR = (clearOuterR + clearInnerR) / 2
    ctx.beginPath()
    ctx.ellipse(x, y, stackRingR, stackRingR * tiltY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(160,160,175,${this._lerp(0.15, 0.3, ci)})`
    ctx.lineWidth = 0.8
    ctx.stroke()
    // Outer edge of clear section
    ctx.beginPath()
    ctx.ellipse(x, y, clearOuterR, clearOuterR * tiltY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(180,180,190,${this._lerp(0.12, 0.22, ci)})`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // --- Clamping ring (thick raised hub around center hole) ---
    const clampOuterR = r * 0.21
    const clampInnerR = r * 0.14
    // Clamping ring fill — slightly lighter, metallic
    ctx.beginPath()
    ctx.ellipse(x, y, clampOuterR, clampOuterR * tiltY, 0, 0, Math.PI * 2)
    const clampGrad = ctx.createRadialGradient(x, y, clampInnerR * 0.8, x, y, clampOuterR)
    clampGrad.addColorStop(0, this._lerpColor([160, 160, 165], [210, 210, 215], ci))
    clampGrad.addColorStop(0.5, this._lerpColor([130, 130, 135], [185, 185, 190], ci))
    clampGrad.addColorStop(1, this._lerpColor([110, 110, 115], [165, 165, 170], ci))
    ctx.fillStyle = clampGrad
    ctx.fill()
    // Thick outer stroke of clamping ring
    ctx.beginPath()
    ctx.ellipse(x, y, clampOuterR, clampOuterR * tiltY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(190,190,200,${this._lerp(0.3, 0.55, ci)})`
    ctx.lineWidth = 2
    ctx.stroke()
    // Inner stroke of clamping ring
    ctx.beginPath()
    ctx.ellipse(x, y, clampInnerR, clampInnerR * tiltY, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(170,170,180,${this._lerp(0.25, 0.45, ci)})`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Center hole
    const holeR = r * 0.125
    ctx.beginPath()
    ctx.ellipse(x, y, holeR, holeR * tiltY, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#080808'
    ctx.fill()
    ctx.strokeStyle = `rgba(200,200,210,${this._lerp(0.3, 0.55, ci)})`
    ctx.lineWidth = 1.8
    ctx.stroke()

    ctx.restore()
  }

  /**
   * Clean up all resources and event listeners.
   */
  destroy() {
    this.destroyed = true
    this.initialized = false

    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }

    // Remove event listeners
    window.removeEventListener('resize', this._onResize)
    this.container.removeEventListener('mousedown', this._onPointerDown)
    this.container.removeEventListener('touchstart', this._onPointerDown)
    window.removeEventListener('mousemove', this._onPointerMove)
    window.removeEventListener('touchmove', this._onPointerMove)
    window.removeEventListener('mouseup', this._onPointerUp)
    window.removeEventListener('touchend', this._onPointerUp)
    this.container.removeEventListener('mousemove', this._onHoverCheck)

    // Remove canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }

    // Restore DOM text visibility
    this._setDomTextVisibility(true)

    this.canvas = null
    this.ctx = null
    this.prepared = null
  }

  /**
   * Dispose alias for compatibility with app.js component lifecycle.
   */
  dispose() {
    this.destroy()
  }
}
