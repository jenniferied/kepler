/**
 * ThreeDViewer - PBR 3D Model Viewer with Texture Map Support
 * Features: Full PBR material system, texture isolation, HDRI environment, multiple lighting modes
 */
import { ViewerBase } from './ViewerBase.js';

export class ThreeDViewer extends ViewerBase {
  constructor(container, options = {}, eventBus = null, scriptLoader = null, featureDetector = null) {
    super(container, options, eventBus);

    this.scriptLoader = scriptLoader;
    this.featureDetector = featureDetector;

    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.animationFrameId = null;
    this.orbitControls = null;
    this.clock = null;

    // Lights
    this.lights = [];

    // HDRI/Environment
    this.envTexture = null;
    this.pmremGenerator = null;

    // PBR Textures storage
    this.textures = {
      diffuse: null,
      normal: null,
      roughness: null,
      metalness: null,
      ao: null,
      emissive: null
    };

    // Original material for restoration
    this.originalMaterial = null;

    // Control panel and control references
    this.controlPanel = null;
    this.controls = {
      modelSelect: null,
      shadingSelect: null,
      textureSelect: null
    };

    // State
    this.isWireframe = false;
    this.isAnimating = true;
    this.shadingMode = options.shadingMode || 'studio';
    this.textureViewMode = 'combined'; // 'combined', 'diffuse', 'normal', 'roughness', 'metalness', 'ao'
    this.currentModelKey = options.initialModel || 'kepler';

    // Configuration
    this.autoRotate = options.autoRotate !== false;
    this.initialCameraPosition = null;

    // Model catalog
    this.modelCatalog = {
      kepler: {
        name: 'Kepler',
        url: 'assets/models/kepler.glb',
        scale: 1,
        position: [0, 0, 0],
        cameraDistance: 3
      }
    };
  }

  async checkSupport() {
    console.log('[ThreeDViewer] checkSupport() called');
    if (this.featureDetector) {
      const caps = this.featureDetector.getCapabilities();
      if (caps.reducedMotion) {
        this.autoRotate = false;
        this.isAnimating = false;
      }
      console.log('[ThreeDViewer] checkSupport() returning:', caps.webgl);
      return caps.webgl;
    }
    try {
      const canvas = document.createElement('canvas');
      const supported = !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
      console.log('[ThreeDViewer] checkSupport() returning:', supported);
      return supported;
    } catch (e) {
      console.log('[ThreeDViewer] checkSupport() error:', e);
      return false;
    }
  }

  async loadDependencies() {
    console.log('[ThreeDViewer] loadDependencies() called');
    if (!this.scriptLoader) {
      throw new Error('ScriptLoader required for ThreeDViewer');
    }

    // Load Three.js r128 (last stable version with examples/js support)
    if (typeof THREE === 'undefined') {
      await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
      console.log('[ThreeDViewer] Three.js loaded');
    }

    if (typeof THREE === 'undefined') {
      throw new Error('Three.js failed to load');
    }

    // Load GLTFLoader
    if (!window.THREE.GLTFLoader) {
      try {
        await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
        console.log('[ThreeDViewer] GLTFLoader loaded');
      } catch (e) {
        console.warn('[ThreeDViewer] GLTFLoader failed to load:', e);
      }
    }

    // Load DRACOLoader for compressed GLB
    if (!window.THREE.DRACOLoader) {
      try {
        await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js');
        console.log('[ThreeDViewer] DRACOLoader loaded');
      } catch (e) {
        console.warn('[ThreeDViewer] DRACOLoader failed to load:', e);
      }
    }

    // Load RGBELoader for HDRI
    if (!window.THREE.RGBELoader) {
      try {
        await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js');
        console.log('[ThreeDViewer] RGBELoader loaded');
      } catch (e) {
        console.warn('[ThreeDViewer] RGBELoader failed to load:', e);
      }
    }

    console.log('[ThreeDViewer] All dependencies loaded');
  }

  async initialize() {
    if (!window.THREE) {
      throw new Error('THREE is not available');
    }

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 280;

    // Create clock for animations
    this.clock = new THREE.Clock();

    // Create scene (transparent background)
    this.scene = new THREE.Scene();
    this.scene.background = null;

    // Create camera (position will be set by loadModel based on model config)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 5);
    this.initialCameraPosition = this.camera.position.clone();

    // Create renderer with proper settings for PBR
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Use outputEncoding for r128 (outputColorSpace in newer versions)
    if (THREE.sRGBEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    console.log('[ThreeDViewer] Renderer created');

    // Clear container
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls disabled — display-only with auto-rotate

    // Initialize PMREM Generator for environment maps
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // Setup initial lighting
    this.setupLighting(this.shadingMode);

    // Add a temporary debug cube to verify scene renders
    const debugGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const debugMat = new THREE.MeshStandardMaterial({ color: 0x4ade80 });
    this.debugCube = new THREE.Mesh(debugGeo, debugMat);
    this.scene.add(this.debugCube);
    console.log('[ThreeDViewer] Debug cube added to scene');

    // Handle resize
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);

    // Re-trigger resize when navigating back to overview page
    if (this.eventBus) {
      this._onPageChanged = ({ pageId }) => {
        if (pageId === 'overview') {
          requestAnimationFrame(() => this.onWindowResize());
        }
      };
      this.eventBus.on('nav:pageChanged', this._onPageChanged);
    }

    console.log('[ThreeDViewer] Initialized');
  }

  async render() {
    // Load the initial model from catalog
    await this.loadModel(this.currentModelKey);
    this.animate();
  }

  async loadModel(modelKey) {
    if (!window.THREE.GLTFLoader) {
      console.warn('[ThreeDViewer] GLTFLoader not available, creating fallback');
      this.createFallbackModel();
      return;
    }

    const modelConfig = this.modelCatalog[modelKey];
    if (!modelConfig) {
      console.error('[ThreeDViewer] Unknown model:', modelKey);
      this.createFallbackModel();
      return;
    }

    // Remove existing model
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.model = null;
    }

    // Reset textures
    this.textures = {
      diffuse: null, normal: null, roughness: null,
      metalness: null, ao: null, emissive: null
    };
    this.originalMaterial = null;

    const loader = new THREE.GLTFLoader();
    if (window.THREE.DRACOLoader) {
      const dracoLoader = new THREE.DRACOLoader();
      dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
      loader.setDRACOLoader(dracoLoader);
    }
    this.currentModelKey = modelKey;

    console.log(`[ThreeDViewer] Loading ${modelConfig.name}...`);

    return new Promise((resolve) => {
      loader.load(
        modelConfig.url,
        (gltf) => {
          const inner = gltf.scene;

          // Debug: log scene hierarchy
          let meshCount = 0;
          inner.traverse((child) => {
            if (child.isMesh) {
              meshCount++;
              console.log(`[ThreeDViewer] Mesh: "${child.name}", vertices: ${child.geometry?.attributes?.position?.count}`);
            }
          });
          console.log(`[ThreeDViewer] Total meshes: ${meshCount}`);

          // Auto-center and scale
          const box = new THREE.Box3().setFromObject(inner);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const fitScale = 2 / maxDim;

          inner.scale.multiplyScalar(fitScale);
          center.multiplyScalar(fitScale);
          inner.position.sub(center);

          this.model = new THREE.Group();
          this.model.add(inner);

          // Set camera
          this.camera.position.set(0, 0, 3.5);
          this.initialCameraPosition = this.camera.position.clone();

          // Extract and store textures from all materials
          inner.traverse((child) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];

              materials.forEach((mat) => {
                if (!this.originalMaterial && mat.isMeshStandardMaterial) {
                  this.originalMaterial = mat.clone();
                }

                if (mat.map && !this.textures.diffuse) this.textures.diffuse = mat.map;
                if (mat.normalMap && !this.textures.normal) this.textures.normal = mat.normalMap;
                if (mat.roughnessMap && !this.textures.roughness) this.textures.roughness = mat.roughnessMap;
                if (mat.metalnessMap && !this.textures.metalness) this.textures.metalness = mat.metalnessMap;
                if (mat.aoMap && !this.textures.ao) this.textures.ao = mat.aoMap;
                if (mat.emissiveMap && !this.textures.emissive) this.textures.emissive = mat.emissiveMap;

                if (this.envTexture) {
                  mat.envMap = this.envTexture;
                  mat.envMapIntensity = 1.0;
                  mat.needsUpdate = true;
                }
              });
            }
          });

          // Clear scene of any previous models
          const toRemove = [];
          this.scene.traverse((child) => {
            if (child.isMesh) toRemove.push(child);
          });
          toRemove.forEach((mesh) => {
            mesh.parent.remove(mesh);
            mesh.geometry?.dispose();
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach(m => m.dispose());
            }
          });

          this.scene.add(this.model);
          this.debugCube = null;

          const loadedTextures = Object.keys(this.textures).filter(k => this.textures[k]);
          console.log(`[ThreeDViewer] ${modelConfig.name} loaded with textures:`, loadedTextures);

          // Preserve texture view mode when switching models
          if (this.textureViewMode !== 'combined') {
            this.setTextureViewMode(this.textureViewMode);
          }

          this.emitEvent('viewer:modelLoaded', { model: modelKey, textures: loadedTextures });
          resolve();
        },
        (progress) => {
          if (progress.total > 0) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            console.log(`[ThreeDViewer] Loading: ${pct}%`);
          }
        },
        (error) => {
          console.error('[ThreeDViewer] Model load error:', error);
          this.createFallbackModel();
          resolve();
        }
      );
    });
  }

  /**
   * Create fallback PBR model with procedural textures
   */
  createFallbackModel() {
    // Remove debug cube if it exists
    if (this.debugCube) {
      this.scene.remove(this.debugCube);
      this.debugCube.geometry.dispose();
      this.debugCube.material.dispose();
      this.debugCube = null;
    }

    // Create a sphere with proper UV mapping for textures
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // Create procedural textures
    const diffuseCanvas = this.createProceduralTexture('diffuse');
    const normalCanvas = this.createProceduralTexture('normal');
    const roughnessCanvas = this.createProceduralTexture('roughness');

    this.textures.diffuse = new THREE.CanvasTexture(diffuseCanvas);
    this.textures.normal = new THREE.CanvasTexture(normalCanvas);
    this.textures.roughness = new THREE.CanvasTexture(roughnessCanvas);

    // Create PBR material with all map slots
    const material = new THREE.MeshStandardMaterial({
      map: this.textures.diffuse,
      normalMap: this.textures.normal,
      roughnessMap: this.textures.roughness,
      metalness: 0,
      roughness: 0.5,
      envMap: this.envTexture,
      envMapIntensity: 1.0
    });

    this.originalMaterial = material.clone();
    this.model = new THREE.Mesh(geometry, material);
    this.scene.add(this.model);

    console.log('[ThreeDViewer] Fallback model created with procedural textures');
  }

  /**
   * Create procedural texture canvas
   */
  createProceduralTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'diffuse') {
      // Green metallic base with scratches
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#5eead4');
      gradient.addColorStop(0.5, '#14b8a6');
      gradient.addColorStop(1, '#0f766e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add some variation
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 5, 2);
      }
    } else if (type === 'normal') {
      // Flat normal map base (128, 128, 255 = flat)
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, 512, 512);

      // Add some bump detail
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = `rgb(${128 + Math.random() * 20 - 10}, ${128 + Math.random() * 20 - 10}, 255)`;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 10 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'roughness') {
      // Roughness map (white = rough, black = smooth)
      ctx.fillStyle = '#666666';
      ctx.fillRect(0, 0, 512, 512);

      // Add roughness variation
      for (let i = 0; i < 200; i++) {
        const val = Math.floor(Math.random() * 100 + 50);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 30 + 5, Math.random() * 30 + 5);
      }
    }

    return canvas;
  }

  /**
   * Setup lighting based on mode
   */
  setupLighting(mode) {
    // Store current texture view mode to restore after lighting change
    const currentTextureMode = this.textureViewMode;

    // Remove existing lights
    this.lights.forEach(light => this.scene.remove(light));
    this.lights = [];

    // Clear environment and HDRI
    this.scene.environment = null;
    this.scene.background = null;

    // Dispose and clear HDRI texture if switching away from HDRI
    if (mode !== 'hdri' && this.envTexture) {
      this.envTexture.dispose();
      this.envTexture = null;
    }

    // Clear envMap from model materials when switching away from HDRI
    if (mode !== 'hdri' && this.model) {
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.envMap = null;
          child.material.needsUpdate = true;
        }
      });
    }

    switch (mode) {
      case 'studio':
        this.scene.background = null;
        this.addLight(new THREE.AmbientLight(0xffffff, 0.3));
        const key = new THREE.DirectionalLight(0xffffff, 1.0);
        key.position.set(5, 5, 5);
        this.addLight(key);
        const fill = new THREE.DirectionalLight(0x4ade80, 0.3);
        fill.position.set(-5, 3, 0);
        this.addLight(fill);
        const rim = new THREE.DirectionalLight(0x4ade80, 0.2);
        rim.position.set(0, -2, -5);
        this.addLight(rim);
        break;

      case 'daylight':
        this.scene.background = this.createGradientTexture('day');
        this.addLight(new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.6));
        const sun = new THREE.DirectionalLight(0xfffaf0, 1.2);
        sun.position.set(5, 10, 5);
        this.addLight(sun);
        this.addLight(new THREE.AmbientLight(0xffffff, 0.3));
        break;

      case 'night':
        this.scene.background = this.createGradientTexture('night');

        // Subtle ambient base
        this.addLight(new THREE.AmbientLight(0x080812, 0.2));

        // Moon key light - cool blue from above-left
        const moon = new THREE.DirectionalLight(0x6699cc, 0.5);
        moon.position.set(-4, 6, 2);
        this.addLight(moon);

        // Rim light from behind - blueish-purple glow
        const nightRim = new THREE.DirectionalLight(0x4455aa, 0.35);
        nightRim.position.set(0, 2, -5);
        this.addLight(nightRim);

        // Secondary rim from opposite side
        const nightRim2 = new THREE.DirectionalLight(0x334488, 0.2);
        nightRim2.position.set(3, 0, -4);
        this.addLight(nightRim2);
        break;

      case 'hdri':
        this.loadHDRI();
        break;

    }

    this.shadingMode = mode;

    // Restore texture view mode after lighting change
    if (currentTextureMode !== 'combined') {
      this.setTextureViewMode(currentTextureMode);
    }

    // Sync texture dropdown to current state
    if (this.controls.textureSelect) {
      this.controls.textureSelect.value = this.textureViewMode;
    }

    this.emitEvent('viewer:shadingModeChanged', { mode });
  }

  addLight(light) {
    this.lights.push(light);
    this.scene.add(light);
  }

  /**
   * Create gradient background texture
   */
  createGradientTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'day') {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#1e40af');
      gradient.addColorStop(0.4, '#3b82f6');
      gradient.addColorStop(0.7, '#7dd3fc');
      gradient.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    } else {
      // Night: Use 2D radial gradient for smooth dark sky
      // Fill with dark base first
      ctx.fillStyle = '#010203';
      ctx.fillRect(0, 0, 512, 512);

      // Radial gradient from lower center (subtle horizon glow)
      const gradient = ctx.createRadialGradient(256, 450, 20, 256, 300, 400);
      gradient.addColorStop(0, '#0d1525');   // Slight horizon glow
      gradient.addColorStop(0.3, '#070a12');
      gradient.addColorStop(0.7, '#030508');
      gradient.addColorStop(1, '#010203');   // Near black at edges
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  /**
   * Load HDRI environment (shows in background AND lights the scene)
   */
  async loadHDRI() {
    if (!window.THREE.RGBELoader) {
      console.warn('[ThreeDViewer] RGBELoader not available');
      this.scene.background = new THREE.Color(0x111111);
      return;
    }

    const loader = new THREE.RGBELoader();
    // Using Poly Haven studio HDRI (CC0)
    const hdriUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr';

    console.log('[ThreeDViewer] Loading HDRI...');

    loader.load(
      hdriUrl,
      (texture) => {
        // Generate environment map
        this.envTexture = this.pmremGenerator.fromEquirectangular(texture).texture;

        // Set as BOTH background and environment (lighting)
        this.scene.background = texture;
        this.scene.background.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = this.envTexture;

        // Update model materials to use environment
        if (this.model) {
          this.model.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.envMap = this.envTexture;
              child.material.envMapIntensity = 1.0;
              child.material.needsUpdate = true;
            }
          });
        }

        texture.dispose();
        console.log('[ThreeDViewer] HDRI loaded and applied to background + lighting');
      },
      undefined,
      (error) => {
        console.warn('[ThreeDViewer] HDRI load failed:', error);
        this.scene.background = new THREE.Color(0x222222);
      }
    );
  }

  /**
   * Create a shader material that extracts a single channel as grayscale
   */
  createChannelMaterial(texture, channel) {
    // channel: 'r', 'g', 'b', or 'a'
    const channelIndex = { r: 0, g: 1, b: 2, a: 3 }[channel] || 1;
    const channelVec = ['r', 'g', 'b', 'a'][channelIndex];

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(map, vUv);
          float channel = texColor.${channelVec};
          gl_FragColor = vec4(vec3(channel), 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }

  /**
   * Switch texture view mode (isolate individual maps)
   */
  setTextureViewMode(mode) {
    this.textureViewMode = mode;

    if (!this.model) return;

    this.model.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      if (mode === 'combined') {
        // Restore original material
        if (this.originalMaterial) {
          child.material = this.originalMaterial.clone();
          if (this.envTexture) {
            child.material.envMap = this.envTexture;
          }
        }
      } else {
        // Get the texture for this mode
        const texture = this.textures[mode];

        if (texture) {
          // Check if roughness/metalness share a texture (glTF metallic-roughness)
          // In glTF: Green = Roughness, Blue = Metalness
          const roughnessAndMetalnessShared =
            this.textures.roughness === this.textures.metalness &&
            this.textures.roughness !== null;

          if (mode === 'roughness' && roughnessAndMetalnessShared) {
            // Extract Green channel for roughness
            child.material = this.createChannelMaterial(texture, 'g');
          } else if (mode === 'metalness' && roughnessAndMetalnessShared) {
            // Extract Blue channel for metalness
            child.material = this.createChannelMaterial(texture, 'b');
          } else {
            // Show full texture
            child.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide
            });
          }
        } else {
          // Show default color if texture not available
          const defaultColors = {
            diffuse: 0x888888,
            normal: 0x8080ff,
            roughness: 0x666666,
            metalness: 0x000000,
            ao: 0xffffff,
            emissive: 0x000000
          };
          child.material = new THREE.MeshBasicMaterial({
            color: defaultColors[mode] || 0x888888
          });
        }
      }
      child.material.needsUpdate = true;
    });

    this.emitEvent('viewer:textureViewChanged', { mode });
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Auto-rotate
    if (this.model && this.autoRotate && this.isAnimating) {
      this.model.rotation.y += 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  }

  createControlPanel() {
    // Create wrapper to hold canvas and controls
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; height: 100%;';

    // Move renderer to wrapper
    if (this.renderer && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    wrapper.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.flex = '1';

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

    const btnStyle = `
      width: 24px; height: 24px; background: #1f2937; border: 1px solid #374151;
      border-radius: 4px; color: #9ca3af; cursor: pointer; font-size: 10px;
      display: flex; align-items: center; justify-content: center;
    `;

    const selectStyle = `
      height: 22px; background: #1f2937; border: 1px solid #374151;
      border-radius: 3px; color: #d1d5db; font-size: 9px; padding: 0 3px;
    `;

    // Helper to create a select element
    const createSelect = (options, currentValue, action, title) => {
      const select = document.createElement('select');
      select.dataset.action = action;
      select.title = title;
      select.style.cssText = selectStyle;
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === currentValue) option.selected = true;
        select.appendChild(option);
      });
      return select;
    };

    // Helper to create a button
    const createButton = (action, title, content, isActive = false) => {
      const btn = document.createElement('button');
      btn.dataset.action = action;
      btn.title = title;
      btn.style.cssText = btnStyle + (isActive ? ' color: #4ade80;' : '');
      btn.textContent = content;
      return btn;
    };

    // Create buttons
    const animBtn = createButton('toggle-animation', 'Play/Pause', this.isAnimating ? '⏸' : '▶', true);
    const wireBtn = createButton('toggle-wireframe', 'Wireframe', '◇');
    const resetBtn = createButton('reset-view', 'Reset', '↺');

    // Create divider
    const divider = document.createElement('div');
    divider.style.cssText = 'width: 1px; height: 16px; background: #374151;';

    // Model options from catalog
    const modelOptions = Object.entries(this.modelCatalog).map(([key, config]) => ({
      value: key,
      label: config.name
    }));

    // Shading modes
    const shadingOptions = [
      { value: 'studio', label: 'Studio' },
      { value: 'daylight', label: 'Day' },
      { value: 'night', label: 'Night' },
      { value: 'hdri', label: 'HDRI' }
    ];

    // Texture view modes
    const textureOptions = [
      { value: 'combined', label: 'Combined' },
      { value: 'diffuse', label: 'Diffuse' },
      { value: 'normal', label: 'Normal' },
      { value: 'roughness', label: 'Rough' },
      { value: 'metalness', label: 'Metal' },
      { value: 'ao', label: 'AO' }
    ];

    // Create selects and store references
    this.controls.shadingSelect = createSelect(shadingOptions, this.shadingMode, 'shading-mode', 'Lighting');

    // Append all controls
    this.controlPanel.appendChild(animBtn);
    this.controlPanel.appendChild(wireBtn);
    this.controlPanel.appendChild(resetBtn);
    this.controlPanel.appendChild(divider);
    this.controlPanel.appendChild(this.controls.shadingSelect);

    wrapper.appendChild(this.controlPanel);
    this.container.appendChild(wrapper);
    this.bindControlEvents();
  }

  bindControlEvents() {
    this.controlPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      switch (btn.dataset.action) {
        case 'toggle-animation':
          this.isAnimating = !this.isAnimating;
          btn.textContent = this.isAnimating ? '⏸' : '▶';
          break;
        case 'toggle-wireframe':
          this.toggleWireframe();
          btn.style.color = this.isWireframe ? '#4ade80' : '#9ca3af';
          break;
        case 'reset-view':
          this.resetView();
          break;
      }
    });

    this.controlPanel.addEventListener('change', (e) => {
      const select = e.target;
      if (select.dataset.action === 'model-select') {
        this.loadModel(select.value);
      } else if (select.dataset.action === 'shading-mode') {
        this.setupLighting(select.value);
      } else if (select.dataset.action === 'texture-view') {
        this.setTextureViewMode(select.value);
      }
    });
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = this.isWireframe;
        }
      });
    }
  }

  resetView() {
    if (this.camera && this.initialCameraPosition) {
      this.camera.position.copy(this.initialCameraPosition);
      this.camera.lookAt(0, 0, 0);
    }
    if (this.model) {
      this.model.rotation.set(0, 0, 0);
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    // Skip resize when container is hidden (display: none → 0 dimensions)
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  showFallback() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;
                  background: #1f2937; color: #9ca3af;">
        WebGL required for 3D viewer
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
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.emitEvent('viewer:disposed', { viewer: 'ThreeDViewer' });
  }
}
