# Kepler — Architecture Reference

Detailed architecture documentation for the website codebase.

## Application Bootstrap (js/app.js)

The `Application` class initializes in phases:
1. Core services (EventBus, FeatureDetector, ScriptLoader)
2. Capability detection
3. Controllers (AnimationController, LazyLoader, ImageGallery)
4. Viewers (ThreeDViewer, PointCloudViewer, VideoViewer)
5. Animations
6. UI components
7. Audio player
8. Navigation
9. Journal
10. Markdown pages

Debug mode auto-enables on localhost.

## System Event Flows

### Audio System
1. User clicks play -> MusicPlayer.handlePlayPauseClick()
2. MusicPlayer calls PlaybackController.togglePlay()
3. PlaybackController emits `playback:play` event
4. PlayerUI receives event and updates UI

### Navigation System
1. User clicks menu item -> dropdown handler
2. PageNavigator.showPage() called
3. Page visibility updated, localStorage saved
4. `nav:pageChanged` event emitted
5. JournalManager listens and loads journal if needed

### Journal System
1. `nav:pageChanged` event -> JournalManager.load()
2. Fetch manifest -> load markdown -> parse -> render
3. TimelineRenderer creates timeline, EntryRenderer displays entry
4. TypingAnimation and GridLayoutOptimizer update layout

## Adding a New Viewer

```javascript
import { ViewerBase } from './ViewerBase.js';

export class MyViewer extends ViewerBase {
  async checkSupport() { /* return true/false */ }
  async loadDependencies() { /* load libs via ScriptLoader */ }
  async initialize() { /* setup */ }
  async render() { /* display */ }
  showFallback() { /* static image */ }
  dispose() { /* cleanup */ }
}

// Register in app.js:
const myViewer = new MyViewer(container, options, eventBus, scriptLoader, featureDetector);
this.viewers.set('my-viewer', myViewer);
await myViewer.setup();
```

## Important Constraints

- No global variables (except `window.keplerApp` for debugging)
- Components depend on abstractions (EventBus), not concrete classes
- External libraries (Three.js, Anime.js, Video.js) are lazy-loaded via ScriptLoader
- Respects `prefers-reduced-motion` for animations
- Progressive enhancement: core content works without JavaScript
