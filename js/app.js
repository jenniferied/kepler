/**
 * Main Application Orchestrator
 * Coordinates all modules with dependency injection and progressive enhancement
 */

// Import core modules
import { FeatureDetector } from './core/FeatureDetector.js';
import { ScriptLoader } from './core/ScriptLoader.js';
import { EventBus } from './core/EventBus.js';

// Import viewers (cache-bust: v20260213b)
import { ThreeDViewer } from './viewers/ThreeDViewer.js?v=20260213b';
import { PointCloudViewer } from './viewers/PointCloudViewer.js?v=20260213b';
import { GaussianSplatViewer } from './viewers/GaussianSplatViewer.js?v=20260112';
import { VideoViewer } from './viewers/VideoViewer.js?v=20260112';

// Import animations
import { AnimationController } from './animations/AnimationController.js';
import { FloatingAnimation } from './animations/FloatingAnimation.js';

// Import media
import { LazyLoader } from './media/LazyLoader.js';
import { ImageGallery } from './media/ImageGallery.js';

// Import audio
import { MusicPlayer } from './audio/MusicPlayer.js';

// Import navigation
import { PageNavigator } from './navigation/PageNavigator.js';
import { DropdownController } from './navigation/DropdownController.js';
import { NavigationState } from './navigation/NavigationState.js';

// Import journal
import { JournalManager } from './journal/JournalManager.js';

// Import pages
import { InterestGraph } from './pages/InterestGraph.js';
import { VideoGallery } from './pages/VideoGallery.js';
import { ImageGalleryPage } from './pages/ImageGalleryPage.js';

/**
 * Application class
 * Follows dependency injection and SOLID principles
 */
class Application {
  constructor() {
    // Core services (Singletons)
    this.featureDetector = null;
    this.scriptLoader = null;
    this.eventBus = null;
    
    // Controllers
    this.animationController = null;
    this.lazyLoader = null;
    this.imageGallery = null;
    
    // Viewers
    this.viewers = new Map();
    
    // Animations
    this.animations = new Map();
    
    // UI Components
    this.uiComponents = new Map();
    
    // State
    this.initialized = false;
    this.capabilities = null;
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    console.log('[App] Initializing application...');
    
    // Phase 1: Initialize core services
    this.initializeCore();
    
    // Phase 2: Detect capabilities
    await this.detectCapabilities();
    
    // Phase 3: Initialize controllers
    await this.initializeControllers();
    
    // Phase 4: Setup viewers conditionally
    await this.setupViewers();
    
    // Phase 5: Setup animations
    await this.setupAnimations();

    // Phase 6: Setup audio player
    await this.setupAudioPlayer();
    
    // Phase 8: Setup navigation
    await this.setupNavigation();
    
    // Phase 9: Setup journal
    await this.setupJournal();
    
    // Phase 10: Setup interest graph (about page)
    await this.setupInterestGraph();

    // Phase 10b: Setup image gallery (images page)
    await this.setupImageGallery();

    // Phase 10c: Setup video gallery (generations page)
    await this.setupVideoGallery();

    // Phase 11: Initialize media lazy loading
    await this.setupMediaLazyLoading();
    
    // Phase 12: Start the application
    this.start();
    
    this.initialized = true;
    console.log('[App] Application initialized successfully');
    
    // Log capabilities for debugging (can be disabled in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.featureDetector.logCapabilities();
      console.log('[App] Animation Controller Stats:', this.animationController.getStats());
    }
  }

  /**
   * Initialize core services
   */
  initializeCore() {
    this.featureDetector = new FeatureDetector();
    this.scriptLoader = new ScriptLoader();
    this.eventBus = new EventBus();
    
    // Enable debug mode in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.eventBus.setDebugMode(true);
    }
    
    console.log('[App] Core services initialized');
  }

  /**
   * Detect device capabilities
   * @returns {Promise<void>}
   */
  async detectCapabilities() {
    this.capabilities = this.featureDetector.getCapabilities();
    
    console.log('[App] Capabilities detected:', {
      webgl: this.capabilities.webgl,
      webgl2: this.capabilities.webgl2,
      performanceTier: this.capabilities.performanceTier,
      slowNetwork: this.capabilities.slowNetwork
    });
    
    this.eventBus.emit('app:capabilities-detected', this.capabilities);
  }

  /**
   * Initialize controllers
   * @returns {Promise<void>}
   */
  async initializeControllers() {
    // Animation controller
    this.animationController = new AnimationController(
      this.featureDetector,
      this.eventBus
    );
    await this.animationController.initialize();
    
    // Lazy loader
    this.lazyLoader = new LazyLoader(
      this.featureDetector,
      this.eventBus
    );
    this.lazyLoader.initialize({
      rootMargin: '100px',
      threshold: 0.01
    });
    
    // Image gallery
    this.imageGallery = new ImageGallery(
      this.eventBus,
      this.lazyLoader
    );
    this.imageGallery.initialize();
    
    console.log('[App] Controllers initialized');
  }

  /**
   * Setup viewers based on device capabilities
   * @returns {Promise<void>}
   */
  async setupViewers() {
    console.log('[App] setupViewers called');

    // 3D Viewer setup with lazy loading
    const threeDContainer = document.getElementById('3d-viewer-container');
    console.log('[App] 3D viewer container found:', !!threeDContainer);

    if (threeDContainer) {
      // Show placeholder until viewer loads
      this.showViewerPlaceholder(threeDContainer, '3D Viewer');

      // Create viewer instance (but don't setup yet)
      const threeDViewer = new ThreeDViewer(
        threeDContainer,
        {
          autoRotate: true,
          cameraDistance: 5,
          fallbackImage: 'https://placehold.co/600x400/1f2937/4ade80?text=3D+Viewer'
        },
        this.eventBus,
        this.scriptLoader,
        this.featureDetector
      );

      this.viewers.set('3d-viewer', threeDViewer);

      // Lazy load: Only setup when visible in viewport AND on overview page
      const initViewer = async () => {
        // Check if we're on the overview page
        const overviewPage = document.getElementById('page-overview');
        const isOnOverview = overviewPage && overviewPage.classList.contains('active');

        if (!isOnOverview) {
          console.log('[App] 3D viewer: Not on overview page, deferring load');
          return false;
        }

        console.log('[App] 3D viewer: Initializing (viewport visible + overview page)');
        try {
          await threeDViewer.setup();
          console.log('[App] ThreeDViewer setup complete');
          return true;
        } catch (err) {
          console.error('[App] ThreeDViewer setup failed:', err);
          return false;
        }
      };

      // Wait for viewport visibility, then check page
      threeDViewer.waitForViewport(0.1).then(() => {
        initViewer();
      });

      // Also listen for page changes - load if navigating TO overview
      this.eventBus.on('nav:pageChanged', (data) => {
        if (data.pageId === 'overview' && !threeDViewer.isInitialized) {
          // Check if container is visible
          if (threeDViewer.isInViewport()) {
            initViewer();
          } else {
            // Wait for it to become visible
            threeDViewer.waitForViewport(0.1).then(() => {
              if (!threeDViewer.isInitialized) {
                initViewer();
              }
            });
          }
        }
      });
    }
    
    // Point Cloud Viewer setup
    const pointCloudContainer = document.getElementById('point-cloud-viewer-container');
    if (pointCloudContainer) {
      const pointCloudViewer = new PointCloudViewer(
        pointCloudContainer,
        {
          pointCloudPath: null, // Placeholder for now
          fallbackImage: 'https://placehold.co/600x400/1f2937/4ade80?text=Point+Cloud'
        },
        this.eventBus,
        this.scriptLoader,
        this.featureDetector
      );
      
      this.viewers.set('point-cloud-viewer', pointCloudViewer);

      // Setup viewer immediately
      pointCloudViewer.setup();
    }

    // Gaussian Splat Viewer setup
    const gaussianSplatContainer = document.getElementById('gaussian-splat-viewer-container');
    if (gaussianSplatContainer) {
      const gaussianSplatViewer = new GaussianSplatViewer(
        gaussianSplatContainer,
        {},
        this.eventBus,
        this.scriptLoader,
        this.featureDetector
      );

      this.viewers.set('gaussian-splat-viewer', gaussianSplatViewer);
      gaussianSplatViewer.setup();
    }

    // Video viewers setup
    const videoContainers = document.querySelectorAll('[data-video-viewer]');
    videoContainers.forEach((container, index) => {
      const videoSrc = container.dataset.videoSrc;
      const poster = container.dataset.poster;
      
      if (videoSrc) {
        const videoViewer = new VideoViewer(
          container,
          { videoSrc, poster },
          this.eventBus,
          this.scriptLoader,
          this.featureDetector
        );
        
        this.viewers.set(`video-viewer-${index}`, videoViewer);
        
        // Wait for viewport, then setup
        videoViewer.waitForViewport(0.1).then(() => {
          videoViewer.setup();
        });
      }
    });
    
    console.log(`[App] ${this.viewers.size} viewers configured`);
  }

  /**
   * Setup floating animations for homepage
   * @returns {Promise<void>}
   */
  async setupAnimations() {
    // Only setup animations if not on slow network and motion is not reduced
    if (this.capabilities.slowNetwork || this.capabilities.reducedMotion) {
      console.log('[App] Animations disabled (slow network or reduced motion)');
      return;
    }
    
    // Find all elements to animate
    const floatingElements = document.querySelectorAll('.floating-element, [data-floating]');
    
    if (floatingElements.length > 0) {
      const floatingAnimation = new FloatingAnimation(
        floatingElements,
        {
          duration: 3000,
          distance: 15,
          rotation: 3,
          useAnimeJs: true
        },
        this.scriptLoader
      );
      
      await floatingAnimation.initialize();
      
      // Register with animation controller
      this.animationController.register('floating-homepage', floatingAnimation);
      this.animations.set('floating', floatingAnimation);
      
      console.log(`[App] Floating animation setup for ${floatingElements.length} elements`);
    }
    
    // Add parallax effect to specific elements in overview
    const parallaxElements = document.querySelectorAll('.parallax-element, [data-parallax]');
    
    if (parallaxElements.length > 0) {
      const parallaxAnimation = FloatingAnimation.createParallax(
        parallaxElements,
        {
          duration: 4000,
          distance: 25,
          rotation: 2
        },
        this.scriptLoader
      );
      
      await parallaxAnimation.initialize();
      
      this.animationController.register('parallax-homepage', parallaxAnimation);
      this.animations.set('parallax', parallaxAnimation);
      
      console.log(`[App] Parallax animation setup for ${parallaxElements.length} elements`);
    }
  }

  /**
   * Setup audio player
   * @returns {Promise<void>}
   */
  async setupAudioPlayer() {
    // Playlist data - Real Kepler songs from Spotify
    // Artist Spotify: https://open.spotify.com/artist/42o6wEuAtZaVCte7QZnDtH
    const playlistData = [
      {
        artist: "Kepler ft. Kravalier, Animate",
        title: "Deine Moves",
        album: "Deine Moves (Single)",
        year: "2024",
        src: "assets/audio/06_Deine_Moves_Master_Song.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e022997326ebc5a0d12bc446dab",
        spotifyID: "15LqPeE0iqNMV31haEobtl"
      },
      {
        artist: "Kepler ft. Noemi",
        title: "MEIN BABE",
        album: "BLUE EDITION (EP)",
        year: "2023",
        src: "assets/audio/02_Mein_Babe.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e02fbf8a6a5cfd2baf88ce2599b",
        spotifyID: "7BRwvMOzuYk57CNlOjctAL"
      },
      {
        artist: "Kepler",
        title: "Für mich",
        album: "Für mich (Single)",
        year: "2023",
        src: "assets/audio/03_Fuer_Mich.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e02576df0829caf083b089f9e32",
        spotifyID: "4BnGlg3l5KcRVADo5pPymE"
      },
      {
        artist: "Kepler",
        title: "Status",
        album: "Status (Album)",
        year: "2021",
        src: "assets/audio/04_Status.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e02cd3b41e206e39be67db3e727",
        spotifyID: "5grxrbIDjr0EAvnHJaom5w"
      },
      {
        artist: "Kepler",
        title: "BLANCA",
        album: "RED EDITION (EP)",
        year: "2022",
        src: "assets/audio/05_Blanca.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e02b564493bcfb28734944bde34",
        spotifyID: "2rNoHEeDoW5ZuRsLVV5lRf"
      },
      {
        artist: "Kepler",
        title: "DOSIS",
        album: "RED EDITION (EP)",
        year: "2022",
        src: "assets/audio/06_Dosis.mp3",
        cover: "https://i.scdn.co/image/ab67616d00001e02b564493bcfb28734944bde34",
        spotifyID: "5kdxgteCgC78DquVqeKeB"
      }
    ];
    
    // Get DOM elements
    const elements = {
      audioPlayer: document.getElementById('audio-player'),
      playPauseButton: document.getElementById('play-pause-button'),
      prevButton: document.getElementById('prev-button'),
      nextButton: document.getElementById('next-button'),
      albumCover: document.getElementById('album-cover'),
      marqueeContent: document.getElementById('marquee-content'),
      timeDisplay: document.getElementById('time-display'),
      playlistDropdown: document.getElementById('playlist-dropdown'),
      playlistToggleBtn: document.getElementById('playlist-toggle-btn')
    };
    
    // Check if required elements exist
    if (!elements.audioPlayer) {
      console.warn('[App] Audio player element not found, skipping audio setup');
      return;
    }
    
    // Create and initialize music player
    const musicPlayer = new MusicPlayer({
      playlistData,
      elements,
      eventBus: this.eventBus
    });
    
    await musicPlayer.initialize();
    
    this.uiComponents.set('music-player', musicPlayer);
    console.log('[App] Music player initialized');
  }

  /**
   * Setup navigation system
   * @returns {Promise<void>}
   */
  async setupNavigation() {
    // Check if navigation elements exist (not on test pages)
    const dropdownMenu = document.getElementById('dropdown-menu');
    const contentsToggle = document.getElementById('contents-toggle');

    if (!dropdownMenu || !contentsToggle) {
      console.log('[App] Navigation elements not found, skipping navigation setup');
      return;
    }

    // Create navigation state
    const navigationState = new NavigationState('activePage');

    // Create page navigator
    const pageNavigator = new PageNavigator(this.eventBus, navigationState);
    pageNavigator.initialize();

    // Create dropdown controllers
    const mainDropdown = new DropdownController({
      dropdown: dropdownMenu,
      toggleButton: contentsToggle,
      eventBus: this.eventBus,
      name: 'main-dropdown'
    });
    mainDropdown.initialize();

    // Setup dropdown item click handlers
    const dropdownItems = document.querySelectorAll('#dropdown-menu .dropdown-item');
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        if (pageId) {
          pageNavigator.showPage(pageId, item, true);
        }
      });
    });

    // Store in components
    this.uiComponents.set('page-navigator', pageNavigator);
    this.uiComponents.set('main-dropdown', mainDropdown);
    this.uiComponents.set('navigation-state', navigationState);

    console.log('[App] Navigation system initialized');
  }

  /**
   * Setup journal system
   * @returns {Promise<void>}
   */
  async setupJournal() {
    const logbookContainer = document.getElementById('logbook-container');
    const timelineContainer = document.getElementById('timeline-list');
    
    if (!logbookContainer || !timelineContainer) {
      console.warn('[App] Journal containers not found, skipping journal setup');
      return;
    }
    
    // Create journal manager with image gallery integration
    const journalManager = new JournalManager({
      logbookContainer,
      timelineContainer,
      eventBus: this.eventBus,
      imageGallery: this.imageGallery
    });
    
    await journalManager.initialize();

    this.uiComponents.set('journal-manager', journalManager);

    // Deep link: navigate to logbook page when hash points to a journal entry
    if (location.hash.startsWith('#journal-')) {
      const pageNavigator = this.uiComponents.get('page-navigator');
      if (pageNavigator) {
        const btn = document.querySelector('[data-page="logbook"]');
        pageNavigator.showPage('logbook', btn, false);
      }
    }

    console.log('[App] Journal system initialized');
  }

  /**
   * Setup interest graph on about page (lazy-loaded)
   * @returns {Promise<void>}
   */
  async setupInterestGraph() {
    const container = document.getElementById('interest-graph-container');
    if (!container) return;

    let graph = null;

    const initGraph = () => {
      if (graph) return;
      const canvas = document.getElementById('interest-graph-canvas');
      const detail = document.getElementById('interest-graph-detail');
      if (!canvas) return;
      graph = new InterestGraph(container, canvas, detail);
      this.uiComponents.set('interest-graph', graph);
      console.log('[App] Interest graph initialized');
    };

    // Check if already on about page
    const aboutPage = document.getElementById('page-about');
    if (aboutPage && aboutPage.classList.contains('active')) {
      initGraph();
    }

    // Lazy-load when navigating to about page
    this.eventBus.on('nav:pageChanged', (data) => {
      if (data.pageId === 'about') {
        initGraph();
      }
    });
  }

  /**
   * Setup image gallery on images page (lazy-loaded)
   * @returns {Promise<void>}
   */
  async setupImageGallery() {
    const container = document.getElementById('image-gallery-container');
    if (!container) return;

    let gallery = null;

    const initGallery = () => {
      if (gallery) return;
      gallery = new ImageGalleryPage(container, this.eventBus);
      gallery.initialize();
      this.uiComponents.set('image-gallery-page', gallery);

      // Register images with the existing lightbox system
      const imgs = gallery.getGalleryImages();
      if (imgs.length && this.imageGallery) {
        this.imageGallery.registerGallery('exp05', imgs);
      }
      console.log('[App] Image gallery initialized');
    };

    const hash = location.hash;
    if (hash.startsWith('#image/') || hash === '#images') {
      const pageNavigator = this.uiComponents.get('page-navigator');
      if (pageNavigator) {
        const btn = document.querySelector('[data-page="images"]');
        pageNavigator.showPage('images', btn, false);
      }
      initGallery();
    }

    // If page was restored from localStorage, the nav:pageChanged event already fired
    const pageNavigator = this.uiComponents.get('page-navigator');
    if (pageNavigator && pageNavigator.getCurrentPage() === 'images') {
      initGallery();
    }

    this.eventBus.on('nav:pageChanged', (data) => {
      if (data.pageId === 'images') {
        initGallery();
      }
    });
  }

  /**
   * Setup video gallery on generations page (lazy-loaded)
   * @returns {Promise<void>}
   */
  async setupVideoGallery() {
    const container = document.getElementById('video-gallery-container');
    if (!container) return;

    let gallery = null;

    const initGallery = () => {
      if (gallery) return;
      gallery = new VideoGallery(container, this.eventBus);
      gallery.initialize();
      this.uiComponents.set('video-gallery', gallery);
      console.log('[App] Video gallery initialized');
    };

    // Check if we need to auto-navigate for deep links
    const hash = location.hash;
    if (hash.startsWith('#video/') || hash === '#generations') {
      const pageNavigator = this.uiComponents.get('page-navigator');
      if (pageNavigator) {
        const btn = document.querySelector('[data-page="generations"]');
        pageNavigator.showPage('generations', btn, false);
      }
      initGallery();
    }

    // If page was restored from localStorage, the nav:pageChanged event already fired
    const pageNavigator = this.uiComponents.get('page-navigator');
    if (pageNavigator && pageNavigator.getCurrentPage() === 'generations') {
      initGallery();
    }

    // Lazy-load when navigating to generations page
    this.eventBus.on('nav:pageChanged', (data) => {
      if (data.pageId === 'generations') {
        initGallery();
      }
    });
  }

  /**
   * Setup media lazy loading
   * @returns {Promise<void>}
   */
  async setupMediaLazyLoading() {
    // Lazy load images
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    if (lazyImages.length > 0) {
      // Prepare images for lazy loading
      lazyImages.forEach(img => {
        if (!img.dataset.src && img.src) {
          img.dataset.src = img.src;
          img.removeAttribute('src');
        }
      });
      
      this.lazyLoader.observe(lazyImages);
      console.log(`[App] Lazy loading setup for ${lazyImages.length} images`);
    }
    
    // Lazy load videos
    const lazyVideos = document.querySelectorAll('video[data-src]');
    if (lazyVideos.length > 0) {
      this.lazyLoader.observe(lazyVideos);
      console.log(`[App] Lazy loading setup for ${lazyVideos.length} videos`);
    }
    
    // Auto-initialize galleries from DOM
    this.imageGallery.autoInitialize();
  }

  /**
   * Show placeholder for lazy-loaded viewer
   * @param {HTMLElement} container - Viewer container element
   * @param {string} label - Label for the placeholder
   */
  showViewerPlaceholder(container, label = 'Viewer') {
    if (!container) return;

    container.innerHTML = `
      <div class="viewer-placeholder" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 200px;
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        color: #6b7280;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 2px solid #374151;
          border-top-color: #4ade80;
          border-radius: 50%;
          animation: viewer-placeholder-spin 1s linear infinite;
          margin-bottom: 12px;
        "></div>
        <span>${label}</span>
        <span style="font-size: 10px; opacity: 0.6; margin-top: 4px;">Loading when visible...</span>
      </div>
      <style>
        @keyframes viewer-placeholder-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * Start the application (begin animations, etc.)
   */
  start() {
    // Start animation controller
    if (this.animationController && this.animations.size > 0) {
      this.animationController.startAll();
      console.log('[App] Animations started');
    }

    this.eventBus.emit('app:started');
  }

  /**
   * Stop the application
   */
  stop() {
    if (this.animationController) {
      this.animationController.pauseAll();
    }
    
    this.eventBus.emit('app:stopped');
    console.log('[App] Application stopped');
  }

  /**
   * Dispose and cleanup all resources
   */
  dispose() {
    // Dispose controllers
    if (this.animationController) {
      this.animationController.disposeAll();
    }
    
    if (this.lazyLoader) {
      this.lazyLoader.dispose();
    }
    
    if (this.imageGallery) {
      this.imageGallery.dispose();
    }
    
    // Dispose viewers
    this.viewers.forEach(viewer => viewer.dispose());
    this.viewers.clear();
    
    // Dispose animations
    this.animations.forEach(animation => animation.dispose());
    this.animations.clear();
    
    // Dispose UI components
    this.uiComponents.forEach(component => component.dispose());
    this.uiComponents.clear();
    
    // Clear event bus
    if (this.eventBus) {
      this.eventBus.clear();
    }
    
    this.initialized = false;
    this.eventBus.emit('app:disposed');
    console.log('[App] Application disposed');
  }

  /**
   * Get application status and statistics
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this.initialized,
      capabilities: this.capabilities,
      viewers: this.viewers.size,
      animations: this.animations.size,
      uiComponents: this.uiComponents.size,
      animationStats: this.animationController ? this.animationController.getStats() : null,
      lazyLoaderStats: this.lazyLoader ? this.lazyLoader.getStats() : null
    };
  }
}

// Create and export global app instance
const app = new Application();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Expose app globally for debugging (optional, can be removed in production)
if (typeof window !== 'undefined') {
  window.everythingMachineApp = app;
}

export default app;

