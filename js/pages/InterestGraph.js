/**
 * InterestGraph — Obsidian-style force-directed bubble graph
 * Canvas 2D, vanilla JS, no dependencies
 * Icons loaded from assets/icons/tools/
 */
export class InterestGraph {
  constructor(container, canvas, detailEl) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.detail = detailEl;
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;
    this.nodes = [];
    this.edges = [];
    this.icons = new Map();
    this.animFrameId = null;
    this.settled = false;
    this.settleTimer = null;
    this.dragging = null;
    this.dragMoved = false;
    this.hoveredNode = null;
    this.selectedNode = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.time = 0; // for vortex animation

    this._initData();
    this._bindEvents();
    this.resize();
    this._loadIcons().then(() => this._start());
  }

  /* ── Data ──────────────────────────────────────── */

  _initData() {
    const pillars = [
      { id: 'songwriting', label: 'Songwriting', big: true, icon: 'musik', desc: 'Texte zwischen Alltag und Kosmos. Persönliche Geschichten, die den Status quo des deutschen Sprachgesangs hinterfragen.' },
      { id: 'produktion', label: 'Produktion', big: true, icon: 'suno', desc: 'Beats, Arrangement, Mixing und Mastering — vom ersten Loop bis zum fertigen Release. Homerecording trifft auf professionellen Anspruch.' },
      { id: 'deutschrap', label: 'Deutscher\nRap', big: true, icon: 'kepler', url: 'https://open.spotify.com/artist/42o6wEuAtZaVCte7QZnDtH', desc: '„Ich möchte mit meiner Kunst neue Maßstäbe setzen und hoffe, dass vielen klar wird, wie gewöhnlich und austauschbar der heutige Status quo von deutscher Rapmusik ist."' },
      { id: 'visuals', label: 'Visuals &\nÄsthetik', big: true, icon: 'voxel', desc: 'Voxel-Ästhetik, Musikvideos und visuelle Identität. Retro-3D-Stil zwischen Nostalgie und Zukunft — Keplers unverwechselbare Bildsprache.' },
      { id: 'ki', label: 'Künstliche\nIntelligenz', big: true, icon: 'ki', desc: 'KI als kreativer Partner im Musikprozess — von Textideen über Bildgenerierung bis zur Klangexploration. Werkzeug und Forschungsobjekt zugleich.' },
    ];

    const satellites = [
      { id: 'red', label: 'RED\nEDITION', big: false, icon: 'kepler', url: 'https://open.spotify.com/album/2viSDQgg4DaKIZRWh7HSHx', desc: 'Erste EP der Trilogie (2022). Grundstein der musikalischen Identität von Kepler.' },
      { id: 'yellow', label: 'YELLOW\nEDITION', big: false, icon: 'kepler', url: 'https://open.spotify.com/album/57mnpOQLV38azZn5DWtB7v', desc: 'Zweite EP der Trilogie (2023). Weiterentwicklung des Sounds und der lyrischen Tiefe.' },
      { id: 'blue', label: 'BLUE\nEDITION', big: false, icon: 'kepler', url: 'https://open.spotify.com/album/7hlWoDUmNRHGzDzBDhWkHs', desc: 'Dritte EP der Trilogie (2023). Abschluss eines zusammenhängenden künstlerischen Dreiteilers.' },
      { id: 'update', label: 'Update', big: false, icon: 'kepler', url: 'https://open.spotify.com/album/5Qgod9Pko3VdtjTg3jjjQF', desc: 'Neuestes Album — die nächste Phase von Kepler. Evolution des Sounds nach der Trilogie.' },
      { id: 'suno', label: 'Suno', big: false, icon: 'suno', url: 'https://suno.com', desc: 'KI-Musikgenerierung — komplette Songs aus Text-Prompts. Wird für Klangexperimente und kreative Exploration eingesetzt.' },
      { id: 'midjourney', label: 'Midjourney', big: false, icon: 'midjourney', url: 'https://www.midjourney.com', desc: 'KI-Bildgenerierung für Cover-Art, Konzeptbilder und visuelle Exploration. Starker ästhetischer Fokus.' },
      { id: 'vr', label: 'VR-\nKonzerte', big: false, icon: 'vp', desc: 'Live-Auftritte im Metaverse — Keplers erstes VR-Konzert fand 2022 statt. Digitale Bühnen als neue Performance-Räume.' },
      { id: 'claude', label: 'Claude', big: false, icon: 'claude', url: 'https://claude.ai', desc: 'KI-Assistent für kreatives Schreiben, Textarbeit und Website-Entwicklung.' },
      { id: 'comfyui', label: 'ComfyUI', big: false, icon: 'comfyui', url: 'https://www.comfy.org', desc: 'Node-basierter Workflow für Bildgenerierung. Visuelle Programmierung für komplexe kreative Pipelines.' },
      { id: 'teleskop', label: 'Kepler-\nTeleskop', big: false, icon: 'procgen', desc: 'Namensgeber: Das NASA-Weltraumteleskop, das bis 2018 nach habitablen Exoplaneten suchte. Symbol dafür, der Menschheit ihre Gewöhnlichkeit zu zeigen.' },
      { id: 'clipstar', label: 'Clipstar', big: false, icon: 'kepler', url: 'https://open.spotify.com/album/0yBC2CDzMgpWyU3Xt8sWqs', desc: 'Erste Single (2021) zusammen mit IUS. Der Startpunkt von Keplers musikalischer Reise.' },
    ];

    const cx = 0.5, cy = 0.5;

    pillars.forEach((d, i) => {
      const angle = (i / pillars.length) * Math.PI * 2 - Math.PI / 2;
      const r = 0.18;
      this.nodes.push({
        ...d,
        x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 0.02,
        y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 0.02,
        vx: 0, vy: 0, radius: 42,
      });
    });

    satellites.forEach((d, i) => {
      const angle = (i / satellites.length) * Math.PI * 2;
      const r = 0.26 + Math.random() * 0.06;
      this.nodes.push({
        ...d,
        x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 0.04,
        y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 0.04,
        vx: 0, vy: 0, radius: 24,
      });
    });

    const connections = [
      ['red', 'deutschrap'], ['yellow', 'deutschrap'], ['blue', 'deutschrap'],
      ['update', 'deutschrap'], ['update', 'produktion'],
      ['clipstar', 'deutschrap'],
      ['suno', 'ki'], ['suno', 'produktion'],
      ['midjourney', 'ki'], ['midjourney', 'visuals'],
      ['vr', 'visuals'],
      ['claude', 'ki'], ['claude', 'songwriting'],
      ['comfyui', 'ki'], ['comfyui', 'visuals'],
      ['teleskop', 'deutschrap'],
      ['songwriting', 'deutschrap'], ['songwriting', 'produktion'],
      ['ki', 'produktion'], ['ki', 'visuals'],
      ['visuals', 'deutschrap'],
      ['red', 'songwriting'], ['clipstar', 'produktion'],
    ];

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    connections.forEach(([a, b]) => {
      const na = nodeMap.get(a), nb = nodeMap.get(b);
      if (na && nb) this.edges.push({ source: na, target: nb });
    });
  }

  /* ── Icon Loading ──────────────────────────────── */

  async _loadIcons() {
    const basePath = 'assets/icons/tools/';
    const ids = [...new Set(this.nodes.map(n => n.icon))];

    const promises = ids.map(id => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => { this.icons.set(id, img); resolve(); };
        img.onerror = () => resolve(); // graceful fallback — draw circle
        img.src = basePath + id + '.svg';
      });
    });

    await Promise.all(promises);
  }

  /* ── Physics ───────────────────────────────────── */

  _tick() {
    const damping = 0.88;
    const repulse = 0.0004;
    const spring = 0.005;
    const restLen = 0.12;
    const centerPull = 0.0006;
    const maxRadius = 0.4; // circular bound from center

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const force = repulse / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }

    this.edges.forEach(e => {
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const force = (dist - restLen) * spring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      e.source.vx += fx; e.source.vy += fy;
      e.target.vx -= fx; e.target.vy -= fy;
    });

    this.nodes.forEach(n => {
      n.vx += (0.5 - n.x) * centerPull;
      n.vy += (0.5 - n.y) * centerPull;
    });

    // Gentle vortex — tangential force around center, each node slightly different
    this.time += 0.001;
    const vortexStrength = 0.00008;
    this.nodes.forEach((n, i) => {
      const dx = n.x - 0.5, dy = n.y - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      // Tangential direction (perpendicular to radius), alternating CW/CCW
      const dir = (i % 3 === 0) ? -1 : 1;
      const speed = vortexStrength * (0.7 + 0.6 * Math.sin(i * 2.17 + this.time * 3));
      n.vx += (-dy / dist) * speed * dir;
      n.vy += (dx / dist) * speed * dir;
    });

    let totalV = 0;
    this.nodes.forEach(n => {
      if (n === this.dragging) return;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      // Circular bounds — push back toward center if too far
      const dx = n.x - 0.5, dy = n.y - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        n.x = 0.5 + (dx / dist) * maxRadius;
        n.y = 0.5 + (dy / dist) * maxRadius;
      }
      totalV += Math.abs(n.vx) + Math.abs(n.vy);
    });

    return totalV;
  }

  /* ── Rendering ─────────────────────────────────── */

  _draw() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    ctx.clearRect(0, 0, w, h);

    const active = this.hoveredNode || this.selectedNode;
    const connectedIds = new Set();
    if (active) {
      this.edges.forEach(e => {
        if (e.source === active || e.target === active) {
          connectedIds.add(e.source.id);
          connectedIds.add(e.target.id);
        }
      });
    }

    // Edges
    this.edges.forEach(e => {
      const sx = e.source.x * w, sy = e.source.y * h;
      const tx = e.target.x * w, ty = e.target.y * h;
      const highlighted = active && (e.source === active || e.target === active);
      const dimmed = active && !highlighted;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = dimmed
        ? 'rgba(74,222,128,0.04)'
        : highlighted
          ? 'rgba(74,222,128,0.45)'
          : 'rgba(74,222,128,0.12)';
      ctx.lineWidth = highlighted ? 2 : 1;
      ctx.stroke();
    });

    // Nodes
    this.nodes.forEach(n => {
      const nx = n.x * w, ny = n.y * h;
      const r = n.radius * this.dpr * 0.5;
      const isActive = n === active;
      const isSelected = n === this.selectedNode;
      const isConnected = active && connectedIds.has(n.id);
      const dimmed = active && !isActive && !isConnected;

      // Glow
      if (isActive || isSelected || (n.big && !dimmed)) {
        ctx.save();
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = isActive ? 28 : isSelected ? 20 : 10;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74,222,128,0.01)';
        ctx.fill();
        ctx.restore();
      }

      // Circle background
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      const alpha = dimmed ? 0.1 : isActive ? 0.9 : n.big ? 0.7 : 0.35;
      ctx.fillStyle = `rgba(74,222,128,${alpha})`;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (isActive) {
        ctx.strokeStyle = 'rgba(74,222,128,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Icon
      const icon = this.icons.get(n.icon);
      if (icon && !dimmed) {
        const iconSize = r * 1.2;
        ctx.save();
        ctx.globalAlpha = dimmed ? 0.2 : isActive ? 1 : n.big ? 0.9 : 0.7;
        ctx.drawImage(icon, nx - iconSize / 2, ny - iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      // Label
      const showLabel = n.big || isActive || isConnected || isSelected;
      if (showLabel && !dimmed) {
        const fontSize = n.big ? 11 : 9;
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isActive ? 'rgba(243,244,246,1)' : 'rgba(243,244,246,0.85)';
        const lines = n.label.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, nx, ny + r + 6 + i * (fontSize + 3));
        });
      }
    });
  }

  /* ── Animation loop ────────────────────────────── */

  _start() {
    if (this.reducedMotion) {
      for (let i = 0; i < 200; i++) this._tick();
      this._draw();
      return;
    }

    const loop = () => {
      const totalV = this._tick();
      this._draw();

      // Never fully settle — vortex keeps gentle motion alive
      this.settled = false;
      if (this.settleTimer) {
        clearTimeout(this.settleTimer);
        this.settleTimer = null;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  _wake() {
    if (!this.animFrameId && !this.reducedMotion) {
      this.settled = false;
      this._start();
    }
  }

  /* ── Interaction ───────────────────────────────── */

  _bindEvents() {
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = this.resize.bind(this);

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave.bind(this));
    window.addEventListener('resize', this._onResize);
  }

  _hitTest(px, py) {
    const w = this.width, h = this.height;
    let closest = null, closestDist = Infinity;
    this.nodes.forEach(n => {
      const dx = n.x * w - px, dy = n.y * h - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitR = (n.radius * this.dpr * 0.5) + 10;
      if (dist < hitR && dist < closestDist) {
        closest = n;
        closestDist = dist;
      }
    });
    return closest;
  }

  _canvasXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * this.dpr,
      (e.clientY - rect.top) * this.dpr,
    ];
  }

  _onPointerDown(e) {
    const [px, py] = this._canvasXY(e);
    const node = this._hitTest(px, py);
    if (node) {
      this.dragging = node;
      this.dragMoved = false;
      this.canvas.setPointerCapture(e.pointerId);
      this._selectNode(node);
      this._wake();
    }
  }

  _onPointerMove(e) {
    const [px, py] = this._canvasXY(e);

    if (this.dragging) {
      this.dragMoved = true;
      this.dragging.x = px / this.width;
      this.dragging.y = py / this.height;
      this.dragging.vx = 0;
      this.dragging.vy = 0;
      if (this.reducedMotion) {
        for (let i = 0; i < 5; i++) this._tick();
        this._draw();
      }
      return;
    }

    const node = this._hitTest(px, py);
    if (node !== this.hoveredNode) {
      this.hoveredNode = node;
      this.canvas.style.cursor = node ? 'grab' : 'default';
      // Show detail for hovered node
      if (node) {
        this._showDetail(node);
      } else if (!this.selectedNode) {
        this._hideDetail();
      } else {
        this._showDetail(this.selectedNode);
      }
      if (this.settled || this.reducedMotion) this._draw();
      this._wake();
    }
  }

  _onPointerUp(e) {
    if (this.dragging) {
      const wasDrag = this.dragMoved;
      const clickedNode = this.dragging;
      this.canvas.releasePointerCapture(e.pointerId);
      this.dragging = null;

      // Pure click on already-selected node → deselect
      if (!wasDrag && this.selectedNode === clickedNode) {
        this._selectNode(null);
      }
    } else {
      // Click on empty space → deselect
      const [px, py] = this._canvasXY(e);
      const node = this._hitTest(px, py);
      if (!node && this.selectedNode) {
        this._selectNode(null);
      }
    }
  }

  _onPointerLeave() {
    this.hoveredNode = null;
    // Fall back to selected node or hide
    if (this.selectedNode) {
      this._showDetail(this.selectedNode);
    } else {
      this._hideDetail();
    }
    if (this.settled || this.reducedMotion) this._draw();
  }

  _selectNode(node) {
    this.selectedNode = node;

    if (node) {
      this._showDetail(node);
    } else {
      this._hideDetail();
    }

    if (this.settled || this.reducedMotion) this._draw();
    this._wake();
  }

  _showDetail(node) {
    if (!this.detail) return;
    const title = node.label.replace(/\n/g, ' ');
    const link = node.url
      ? `<a href="${node.url}" target="_blank" rel="noopener" class="interest-detail-link">${new URL(node.url).hostname.replace('www.', '')} &rarr;</a>`
      : '';
    this.detail.innerHTML =
      `<div class="interest-detail-header">` +
        `<strong>${title}</strong>` +
        `<span class="interest-detail-badge">${node.big ? 'Kernbereich' : 'Release / Tool'}</span>` +
      `</div>` +
      `<p>${node.desc}</p>` +
      link;
    this.detail.hidden = false;
    this.detail.classList.add('visible');
  }

  _hideDetail() {
    if (!this.detail) return;
    this.detail.classList.remove('visible');
    setTimeout(() => {
      if (!this.selectedNode) this.detail.hidden = true;
    }, 200);
  }

  /* ── Resize ────────────────────────────────────── */

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    if (this.settled || this.reducedMotion) this._draw();
  }

  /* ── Cleanup ───────────────────────────────────── */

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
  }
}
