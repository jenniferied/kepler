---
name: kepler-website
version: "1.0.0"
last_validated: "2026-04-03"
triggers:
  - "/website"
  - js
  - javascript
  - journal
  - viewer
  - EventBus
  - component
  - bubble
  - grid
  - layout
  - resize
  - AudioViewer
  - ThreeDViewer
  - GridLayoutOptimizer
  - CSS
  - style.css
description: Use when working on Kepler website frontend — JavaScript modules, journal entries, viewers, grid layout, bubbles, or CSS styling.
---

# Website Development Skill

## Trigger

Activate when working on:
- JavaScript modules in `js/`
- Journal entries in `journal/`
- Any frontend development

## Commands

```bash
# Local development (required for ES6 modules)
python3 -m http.server 8001

# Generate journal manifest after adding entries
node scripts/generate-journal-manifest.js
```

No build step — vanilla JavaScript with ES6 modules.

## Architecture: EventBus + Dependency Injection

All components communicate via central pub/sub EventBus. Components receive dependencies through constructor injection.

```javascript
// Event naming: category:action (lowercase, colon separator)
// Examples: player:play, nav:pageChanged, journal:loaded

constructor(container, eventBus, featureDetector) {
  this.container = container;
  this.eventBus = eventBus;
}
```

## Module Organization

```
js/
├── core/           # EventBus, FeatureDetector, ScriptLoader
├── audio/          # MusicPlayer (SOLID pattern)
├── navigation/     # PageNavigator, DropdownController
├── journal/        # JournalManager, MarkdownParser, TimelineRenderer
├── viewers/        # ViewerBase, ThreeDViewer, PointCloudViewer
├── animations/     # AnimationController, FloatingAnimation
├── media/          # LazyLoader, ImageGallery
└── app.js          # Main orchestrator
```

## Viewer Pattern

All viewers extend `ViewerBase`:
```javascript
async checkSupport()      // Verify device capabilities
async loadDependencies()  // Lazy load libraries
async initialize()        // Setup viewer
async render()            // Display content
showFallback()           // Static image fallback
dispose()                // Cleanup
```

**Existing viewers:** ThreeDViewer, PointCloudViewer, AudioViewer

### Embedding Viewers in Journal Markdown

Use data attributes for viewer configuration:
```html
<div data-audio-viewer
     data-prompt="Description of what was requested"
     data-artist="Artist Name"
     data-tracks='[{"src": "path/to/file.mp3", "title": "Track", "description": "..."}]'>
</div>
```

EntryRenderer auto-initializes viewers via dynamic import.

## Grid Reflow Pattern (ResizeObserver)

When a component's height changes during CSS transitions, use ResizeObserver to trigger `GridLayoutOptimizer.optimize()` continuously — not just after transition ends.

```javascript
// In component that changes height:
if (!this.resizeObserver) {
  const bubble = this.container.closest('.content-bubble');
  if (bubble) {
    let lastHeight = bubble.offsetHeight;
    this.resizeObserver = new ResizeObserver(() => {
      const currentHeight = bubble.offsetHeight;
      if (Math.abs(currentHeight - lastHeight) > 1) {
        lastHeight = currentHeight;
        this.emitEvent('component:resized', {});
      }
    });
    this.resizeObserver.observe(bubble);
  }
}

// In dispose():
if (this.resizeObserver) {
  this.resizeObserver.disconnect();
  this.resizeObserver = null;
}
```

## Code Conventions

- One class per file (PascalCase classes, camelCase utilities)
- Every component must have `dispose()` for cleanup
- Error format: `console.error('[ComponentName] Message:', error)`
- Use `requestAnimationFrame` for visual updates
- Debounce expensive operations
- Respect `prefers-reduced-motion`

## Testing

Manual browser testing before commits:
1. DevTools Console + Network tabs
2. Test feature manually
3. Verify no console errors
4. Check EventBus debug logs (localhost)
5. Test mobile viewport

## Journal Entries

Template: `journal/TEMPLATE.md`
- **Kontext**: Tool/Workflow, intention
- **Prozess**: Input, iterations, output
- **Erkenntnisse**: Surprises, errors as features
- **Weiterentwicklung**: Workflow changes, next steps
