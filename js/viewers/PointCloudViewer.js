/**
 * PointCloudViewer - Simple WebGL2 Point Cloud Viewer
 * Self-contained without Three.js dependency for reliability
 */
import { ViewerBase } from './ViewerBase.js';

export class PointCloudViewer extends ViewerBase {
  constructor(container, options = {}, eventBus = null, scriptLoader = null, featureDetector = null) {
    super(container, options, eventBus);

    this.scriptLoader = scriptLoader;
    this.featureDetector = featureDetector;

    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.animationFrameId = null;
    this.isAnimating = true;
    this.rotation = 0;
    this.rotationY = 0;
    this.rotationX = 0;
    this.autoRotation = 0;
    this.zoom = 8;
    this.pointCount = 0;

    // FPS limiting
    this.lastFrameTime = 0;
    this.targetFPS = 24;
    this.frameInterval = 1000 / this.targetFPS;

    // No user interaction — auto-rotate only
  }

  async checkSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  async loadDependencies() {
    if (!this.scriptLoader) {
      throw new Error('ScriptLoader required for PointCloudViewer');
    }

    // Load Three.js + GLTFLoader for GLB parsing (cached if already loaded by ThreeDViewer)
    if (typeof THREE === 'undefined') {
      await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
    }
    if (!window.THREE.GLTFLoader) {
      try {
        await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
      } catch (e) {
        console.warn('[PointCloudViewer] GLTFLoader failed to load:', e);
      }
    }
    if (!window.THREE.DRACOLoader) {
      try {
        await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js');
      } catch (e) {
        console.warn('[PointCloudViewer] DRACOLoader failed to load:', e);
      }
    }
    console.log('[PointCloudViewer] Three.js dependencies loaded');
  }

  async initialize() {
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 280;

    console.log('[PointCloudViewer] Initializing:', width, 'x', height);

    // Clear container
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    // Create wrapper for flex layout (canvas + controls)
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    `;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.cssText = 'display: block; width: 100%; flex: 1;';

    // Get WebGL2 context (alpha: true for transparent background)
    this.gl = this.canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });

    if (!this.gl) {
      throw new Error('WebGL2 not available');
    }

    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);

    // Setup shaders
    this.setupShaders();

    // Show loading indicator
    this.showLoadingIndicator();

    // Load model as point cloud
    await this.loadGLBData();

    // No control panel, no mouse interaction — clean, auto-rotate only

    // Resize handler
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);

    // Re-trigger resize when navigating back to overview page
    if (this.eventBus) {
      this._onPageChanged = ({ pageId }) => {
        if (pageId === 'overview') {
          requestAnimationFrame(() => this.onResize());
        }
      };
      this.eventBus.on('nav:pageChanged', this._onPageChanged);
    }

    console.log('[PointCloudViewer] Initialized successfully');
  }

  // No mouse/touch controls — viewer is display-only with auto-rotate

  setupShaders() {
    const gl = this.gl;

    const vsSource = `#version 300 es
      in vec3 aPosition;
      in vec3 aColor;

      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform float uRotationX;
      uniform float uRotationY;
      uniform float uPointSize;

      out vec3 vColor;

      void main() {
        float cy = cos(uRotationY);
        float sy = sin(uRotationY);
        mat3 rotY = mat3(
          cy, 0.0, sy,
          0.0, 1.0, 0.0,
          -sy, 0.0, cy
        );

        float cx = cos(uRotationX);
        float sx = sin(uRotationX);
        mat3 rotX = mat3(
          1.0, 0.0, 0.0,
          0.0, cx, -sx,
          0.0, sx, cx
        );

        vec3 rotatedPos = rotY * rotX * aPosition;
        vec4 viewPos = uView * vec4(rotatedPos, 1.0);
        gl_Position = uProjection * viewPos;

        float dist = length(viewPos.xyz);
        gl_PointSize = uPointSize * 8.0 / dist;

        vColor = aColor;
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      in vec3 vColor;
      out vec4 fragColor;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        fragColor = vec4(vColor, alpha);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('[PointCloudViewer] Program link error:', gl.getProgramInfoLog(this.program));
    }

    this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
    this.aColor = gl.getAttribLocation(this.program, 'aColor');
    this.uProjection = gl.getUniformLocation(this.program, 'uProjection');
    this.uView = gl.getUniformLocation(this.program, 'uView');
    this.uRotationX = gl.getUniformLocation(this.program, 'uRotationX');
    this.uRotationY = gl.getUniformLocation(this.program, 'uRotationY');
    this.uPointSize = gl.getUniformLocation(this.program, 'uPointSize');
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[PointCloudViewer] Shader error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
  }

  showLoadingIndicator() {
    this.loadingEl = document.createElement('div');
    this.loadingEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #4ade80; font-family: 'IBM Plex Mono', monospace; font-size: 12px;
      text-align: center;
    `;
    this.loadingEl.innerHTML = 'Loading point cloud...';
    this.container.appendChild(this.loadingEl);
  }

  async loadGLBData() {
    const gl = this.gl;
    const glbUrl = 'assets/models/kepler.glb';

    try {
      console.log('[PointCloudViewer] Loading GLB as point cloud:', glbUrl);

      if (!window.THREE?.GLTFLoader) {
        throw new Error('GLTFLoader not available');
      }

      const loader = new THREE.GLTFLoader();
      if (window.THREE.DRACOLoader) {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
        loader.setDRACOLoader(dracoLoader);
      }
      const gltf = await new Promise((resolve, reject) => {
        loader.load(glbUrl, resolve, undefined, reject);
      });

      // Extract vertex positions and colors from all meshes
      const positions = [];
      const colors = [];

      gltf.scene.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;

        // Get world-space positions
        child.updateMatrixWorld(true);
        const geo = child.geometry;
        const posAttr = geo.attributes.position;
        if (!posAttr) return;

        // Get vertex colors if available
        const colorAttr = geo.attributes.color;

        // Get material base color as fallback
        const mat = child.material;
        const baseColor = mat?.color || { r: 0.8, g: 0.8, b: 0.8 };

        const vertex = new THREE.Vector3();

        // Sample every Nth vertex to reduce density
        const sampleRate = 10; // keep 1 out of every 10 vertices
        for (let i = 0; i < posAttr.count; i += sampleRate) {
          vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          vertex.applyMatrix4(child.matrixWorld);
          positions.push(vertex.x, vertex.y, vertex.z);

          // Matrix green with slight brightness variation per vertex
          const brightness = 0.6 + Math.random() * 0.4;
          colors.push(0.1 * brightness, 0.85 * brightness, 0.3 * brightness);
        }
      });

      // Dispose Three.js scene (we only needed the vertex data)
      gltf.scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => m.dispose());
        }
      });

      const count = positions.length / 3;
      console.log('[PointCloudViewer] Extracted', count, 'vertices from GLB');

      // Center and scale
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (let i = 0; i < positions.length; i += 3) {
        minX = Math.min(minX, positions[i]);     maxX = Math.max(maxX, positions[i]);
        minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
        minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]);
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
      const scale = 5 / maxDim;

      for (let i = 0; i < positions.length; i += 3) {
        const x = (positions[i]     - centerX) * scale;
        const y = (positions[i + 1] - centerY) * scale;
        const z = (positions[i + 2] - centerZ) * scale;

        // Rotate -90° around X axis to stand upright
        positions[i]     = x;
        positions[i + 1] = -z;
        positions[i + 2] = y;
      }

      if (this.loadingEl) {
        this.loadingEl.remove();
      }

      // Upload to WebGL buffers
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      this.posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

      this.colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(this.aColor);
      gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 0, 0);

      gl.bindVertexArray(null);
      this.pointCount = count;
      this.modelName = 'Kepler';

      // Update label after control panel is created
      setTimeout(() => {
        const label = this.controlPanel?.querySelector('.model-label');
        if (label) {
          label.textContent = `Kepler (${(count / 1000).toFixed(0)}K pts)`;
        }
      }, 100);

    } catch (error) {
      console.error('[PointCloudViewer] Failed to load GLB:', error);
      this.createFallbackPointCloud();
    }
  }

  createFallbackPointCloud() {
    const gl = this.gl;
    const count = 10000;
    const positions = [];
    const colors = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2;

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const hue = (theta / (Math.PI * 2));
      const rgb = this.hslToRgb(hue, 0.7, 0.5);
      colors.push(rgb.r, rgb.g, rgb.b);
    }

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    this.pointCount = count;

    if (this.loadingEl) this.loadingEl.remove();
    console.log('[PointCloudViewer] Using fallback point cloud');
  }

  async render() {
    this.animate(0);
  }

  animate(currentTime) {
    if (!this.gl || !this.program) return;

    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));

    // FPS limiting
    const elapsed = currentTime - this.lastFrameTime;
    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(this.program);

    const fov = 50 * Math.PI / 180;
    const aspect = width / height;
    const near = 0.1;
    const far = 100;
    const f = 1.0 / Math.tan(fov / 2);
    const projection = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);

    const view = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, -this.zoom, 1
    ]);

    gl.uniformMatrix4fv(this.uProjection, false, projection);
    gl.uniformMatrix4fv(this.uView, false, view);

    if (this.isAnimating) {
      this.autoRotation += 0.004;
    }

    gl.uniform1f(this.uRotationX, this.rotationX);
    gl.uniform1f(this.uRotationY, this.rotationY + this.autoRotation);
    gl.uniform1f(this.uPointSize, 1.0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.bindVertexArray(null);
  }

  createControlPanel() {
    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 8px;
      background: #111;
      border-top: 1px solid #374151;
      font-family: 'IBM Plex Mono', monospace;
    `;

    this.controlPanel.innerHTML = `
      <button data-action="toggle" style="
        width: 24px; height: 24px; background: #1f2937; border: 1px solid #374151;
        border-radius: 4px; color: ${this.isAnimating ? '#4ade80' : '#9ca3af'}; cursor: pointer; font-size: 10px;
        display: flex; align-items: center; justify-content: center;
      ">${this.isAnimating ? '⏸' : '▶'}</button>
      <div style="width: 1px; height: 16px; background: #374151;"></div>
      <span class="model-label" style="color: #9ca3af; font-size: 9px; text-transform: uppercase;">
        Kepler
      </span>
    `;

    this.controlPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.action === 'toggle') {
        this.isAnimating = !this.isAnimating;
        btn.textContent = this.isAnimating ? '⏸' : '▶';
        btn.style.color = this.isAnimating ? '#4ade80' : '#9ca3af';
      }
    });

    this.wrapper.appendChild(this.controlPanel);
  }

  onResize() {
    if (!this.canvas || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    // Skip resize when container is hidden (display: none → 0 dimensions)
    if (width === 0 || height === 0) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  showFallback() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;
                  background: #1f2937; color: #9ca3af;">
        WebGL2 required for Point Cloud viewer
      </div>
    `;
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this._onPageChanged && this.eventBus) {
      this.eventBus.off('nav:pageChanged', this._onPageChanged);
    }
    if (this.gl) {
      if (this.posBuffer) this.gl.deleteBuffer(this.posBuffer);
      if (this.colorBuffer) this.gl.deleteBuffer(this.colorBuffer);
      if (this.vao) this.gl.deleteVertexArray(this.vao);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.emitEvent('viewer:disposed', { viewer: 'PointCloudViewer' });
  }
}
