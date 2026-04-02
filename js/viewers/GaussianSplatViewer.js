/**
 * GaussianSplatViewer - Uses gsplat.js library for proper 3D Gaussian Splatting
 * https://github.com/huggingface/gsplat.js
 */
import { ViewerBase } from './ViewerBase.js';

export class GaussianSplatViewer extends ViewerBase {
  constructor(container, options = {}, eventBus = null, scriptLoader = null, featureDetector = null) {
    super(container, options, eventBus);

    this.scriptLoader = scriptLoader;
    this.featureDetector = featureDetector;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.canvas = null;

    this.animationFrameId = null;
    this.isAnimating = true;
    this.splatCount = 0;
    this.isLoading = false;
    this.SPLAT = null;

    // Splat file URL
    this.splatUrl = 'https://huggingface.co/cakewalk/splat-data/resolve/main/nike.splat';
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
    // gsplat.js is loaded via import map in HTML
    try {
      this.SPLAT = await import('gsplat');
      console.log('[GaussianSplatViewer] gsplat.js loaded');
    } catch (error) {
      console.error('[GaussianSplatViewer] Failed to load gsplat.js:', error);
      throw error;
    }
  }

  async initialize() {
    const SPLAT = this.SPLAT;
    if (!SPLAT) {
      throw new Error('gsplat.js not loaded');
    }

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 400;

    // Create wrapper for flex layout
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    `;

    // Canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.style.cssText = `
      flex: 1;
      position: relative;
      min-height: 0;
    `;

    this.container.innerHTML = '';
    this.wrapper.appendChild(this.canvasContainer);
    this.container.appendChild(this.wrapper);

    // Show loading indicator
    this.showLoadingIndicator();

    // Initialize gsplat.js components
    this.scene = new SPLAT.Scene();
    this.camera = new SPLAT.Camera();
    this.renderer = new SPLAT.WebGLRenderer();

    // Get the canvas created by the renderer
    this.canvas = this.renderer.canvas;
    this.canvas.style.cssText = 'display: block; width: 100%; height: 100%;';
    this.canvasContainer.appendChild(this.canvas);

    // Setup controls
    this.controls = new SPLAT.OrbitControls(this.camera, this.canvas);

    // Resize handler
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
    this.onResize();

    // Load the splat file
    await this.loadSplatFile();

    // Create control panel
    this.createControlPanel();

    console.log('[GaussianSplatViewer] Initialized with gsplat.js');
  }

  showLoadingIndicator() {
    if (this.loadingEl) this.loadingEl.remove();
    this.loadingEl = document.createElement('div');
    this.loadingEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #9ca3af; font-family: 'IBM Plex Mono', monospace; font-size: 12px;
      text-align: center; z-index: 5;
    `;
    this.loadingEl.innerHTML = 'Loading splat file...';
    this.canvasContainer.appendChild(this.loadingEl);
  }

  updateLoadingProgress(percent) {
    if (this.loadingEl) {
      this.loadingEl.innerHTML = `Loading... ${percent}%`;
    }
  }

  async loadSplatFile() {
    const SPLAT = this.SPLAT;
    this.isLoading = true;

    console.log(`[GaussianSplatViewer] Loading from ${this.splatUrl}`);

    try {
      await SPLAT.Loader.LoadAsync(
        this.splatUrl,
        this.scene,
        (progress) => {
          this.updateLoadingProgress(Math.round(progress * 100));
        }
      );

      // Get splat count from scene
      this.splatCount = this.scene.objects.length > 0 ?
        (this.scene.objects[0].splatCount || 'unknown') : 0;

      if (this.loadingEl) this.loadingEl.remove();
      this.isLoading = false;

      console.log(`[GaussianSplatViewer] Loaded splat successfully`);

      // Update label
      if (this.splatLabel) {
        this.splatLabel.textContent = `Nike Shoe (loaded)`;
      }

    } catch (error) {
      console.error('[GaussianSplatViewer] Load error:', error);
      if (this.loadingEl) {
        this.loadingEl.innerHTML = `Error loading file<br><small>${error.message}</small>`;
      }
      this.isLoading = false;
    }
  }

  async render() {
    this.animate();
  }

  animate() {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.isAnimating) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  createControlPanel() {
    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      background: #111;
      border-top: 1px solid #374151;
      font-family: 'IBM Plex Mono', monospace;
      flex-shrink: 0;
    `;

    const buttonStyle = `
      width: 28px;
      height: 28px;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 4px;
      color: #9ca3af;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.controlPanel.innerHTML = `
      <button data-action="toggle" style="${buttonStyle}">${this.isAnimating ? '⏸' : '▶'}</button>
      <span class="splat-label" style="color: #9ca3af; font-size: 11px;">
        Nike Shoe
      </span>
    `;

    this.splatLabel = this.controlPanel.querySelector('.splat-label');

    this.controlPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || this.isLoading) return;

      const action = btn.dataset.action;
      if (action === 'toggle') {
        this.isAnimating = !this.isAnimating;
        btn.textContent = this.isAnimating ? '⏸' : '▶';
      }
    });

    this.wrapper.appendChild(this.controlPanel);
  }

  onResize() {
    if (!this.canvas || !this.canvasContainer) return;

    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight || 350;

    this.canvas.width = width;
    this.canvas.height = height;

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  showFallback() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;
                  background: #1f2937; color: #9ca3af; text-align: center; padding: 20px;">
        <div>
          <p>WebGL2 required for Gaussian Splats</p>
          <a href="https://antimatter15.com/splat/" target="_blank" style="color: #4ade80;">
            View examples online
          </a>
        </div>
      </div>
    `;
  }

  dispose() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);

    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }

    if (this.loadingEl) this.loadingEl.remove();
    if (this.controlPanel) this.controlPanel.remove();
    if (this.canvasContainer) this.canvasContainer.remove();
    if (this.wrapper) this.wrapper.remove();

    this.emitEvent('viewer:disposed', { viewer: 'GaussianSplatViewer' });
  }
}
