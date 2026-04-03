# Website Optimization Analysis + Pretext Library Research

**Date:** 2026-04-03
**Scope:** Performance audit of kepler site, feasibility assessment of Cheng Lou's Pretext library

---

## Part 1: Current Site Analysis

### Architecture Overview

The Kepler site is a static GitHub Pages site built with vanilla JS (ES6 modules), an EventBus pub/sub pattern, and Tailwind CSS. There is a single HTML entry point (`index.html`) with five SPA-style "pages" toggled via JS. The codebase is well-structured into domain folders: `core/`, `navigation/`, `audio/`, `viewers/`, `journal/`, `animations/`, `media/`, `pages/`.

**Key stats:**
- 33 JS modules (~9,800 lines total, ~376 KB unminified)
- 2 CSS files: `dist/tailwind.css` (12 KB minified) + `dist/style.css` (72 KB, 3,394 lines, unminified)
- 1 npm dependency: `tailwindcss` (dev only)
- External CDN libs loaded at runtime: Three.js r128, Anime.js 3.2.2, Video.js 8.10.0

### Strengths

1. **Clean module architecture.** EventBus decoupling, dependency injection in Application class, single-responsibility modules. This is unusually well-organized for a static site.
2. **Progressive enhancement.** `FeatureDetector` checks WebGL, performance tier, reduced motion, slow network. Viewers and animations degrade gracefully.
3. **Lazy loading infrastructure.** `LazyLoader` with IntersectionObserver, viewers wait for viewport visibility, pages like InterestGraph and VideoGallery initialize only on navigation.
4. **Conditional CDN loading.** Three.js and Video.js are only loaded when their viewers are actually needed via `ScriptLoader`, not on every page load.
5. **Accessibility basics present.** `aria-label` on player buttons, `role="menu"` and `role="menuitem"` on dropdown, `aria-haspopup` on toggle. `prefers-reduced-motion` media query in CSS and checked in JS.
6. **Responsive design.** 27 `@media` queries in `style.css` covering 480px, 640px, 768px, and 1024px breakpoints. Tailwind responsive utilities (`md:flex`, `hidden md:flex`) used in HTML.

### Weaknesses & Optimization Opportunities

#### 1. Performance

| Issue | Impact | Effort |
|-------|--------|--------|
| **No JS bundling/minification.** 33 separate ES module files loaded via browser `import`. Each is a separate HTTP request. | High | Medium |
| **Images are all PNG, no WebP/AVIF.** Total image assets ~18 MB. `alles-war-easy.png` alone is 5 MB, `kepler-studio.png` is 3.2 MB. | High | Low |
| **No `loading="lazy"` on `<img>` tags.** Images in `index.html` use direct `src=` with no native lazy loading attribute. The JS LazyLoader exists but only processes `img[data-src]` or `img[loading="lazy"]` -- the actual HTML images have neither. | High | Low |
| **`style.css` is unminified (72 KB).** Could be ~40-50 KB minified. | Medium | Low |
| **Google Fonts block render.** Two separate `<link>` tags for IBM Plex Mono and Press Start 2P load synchronously in `<head>`. | Medium | Low |
| **Cache-busting via query strings** (`?v=20260112`) instead of hashed filenames. Less efficient for CDN caching. | Low | Medium |
| **Three.js r128 is outdated** (current is r170+). Older version, larger bundle, missing performance improvements. | Low | High |

#### 2. Accessibility

| Issue | Impact |
|-------|--------|
| **No skip-to-content link.** Keyboard users must tab through entire nav to reach main content. | Medium |
| **Dropdown menu lacks `aria-expanded`.** The `contents-toggle` button has `aria-haspopup` but no `aria-expanded` state. | Medium |
| **Lightbox uses inline `onclick` handlers** (`onclick="closeLightbox()"`) but `closeLightbox` is not defined in any module -- potential runtime error. No keyboard trap management for modal. | Medium |
| **No `<h1>` or `<h2>` on most pages.** Heading hierarchy jumps to `<h3>`. Screen readers lose document structure. | Medium |
| **Color contrast.** Gray text (`#6b7280`, `text-gray-500`) on dark background (`#111`) may not meet WCAG AA 4.5:1 for body text. | Medium |
| **Language attribute.** `<html lang="de">` is correct for content but some UI labels are in English ("Play/Pause", "Previous Track"). Mixed language should use `lang` attributes on English-language spans. | Low |

#### 3. Asset Loading

| Issue | Detail |
|-------|--------|
| **Font loading strategy.** Two Google Font requests, one for IBM Plex Mono (3 weights: 300, 400, 500) and one for Press Start 2P. Both are render-blocking. Using `display=swap` is good, but could be combined into a single request or self-hosted. |
| **No font subsetting.** IBM Plex Mono ships full Latin + extended character sets. German content only needs Latin. |
| **No resource hints** beyond `preconnect` for Google Fonts. No `<link rel="preload">` for critical CSS or JS. |
| **Album covers from Spotify CDN** (`i.scdn.co`). External dependency -- if Spotify changes URLs, covers break. No fallback. |

#### 4. Code Quality

| Issue | Detail |
|-------|--------|
| **Playlist data hardcoded in `app.js`.** 6 tracks with Spotify URLs embedded in the main orchestrator. Should be a separate data file. |
| **`eval()` in `FeatureDetector.isModernBrowser()`.** Used to test ES6 support. Unnecessary since the site already uses ES6 modules (`type="module"`), which means the browser already supports ES6. Also a CSP violation risk. |
| **Phase numbering gap** in `app.js`: jumps from Phase 6 to Phase 8 (Phase 7 is missing). Minor but indicates removed code. |
| **`GaussianSplatViewer` imported but no container** in HTML (`gaussian-splat-viewer-container` does not exist). Dead import. |
| **`AudioViewer` in `js/viewers/` is never imported.** Potential dead code. |

#### 5. Mobile Readiness

The site is mobile-responsive with comprehensive media queries. The mini-player is hidden on small screens (`hidden md:flex`), which is appropriate. The logbook timeline adapts. However:
- No touch-specific gesture handling for the image lightbox (swipe to navigate)
- 3D viewers on mobile may be heavy -- the performance tier detection helps, but there is no explicit mobile fallback for WebGL viewers
- Large unoptimized PNGs will be especially painful on mobile networks

---

## Part 2: Pretext Library Research

### What is Pretext?

[Pretext](https://github.com/chenglou/pretext) is a pure TypeScript library by Cheng Lou (React core team, ReasonML, Midjourney) for multiline text measurement and layout. It bypasses the DOM entirely, performing text layout as pure arithmetic after a one-time font measurement pass.

**Key characteristics:**
- **Size:** ~15 KB gzipped, zero dependencies (693 KB unpacked on npm due to TypeScript source + types)
- **Performance:** Claims 300-600x faster than DOM-based text measurement. Can process 500 text blocks in ~0.09ms.
- **Rendering targets:** DOM, Canvas, SVG (server-side upcoming)
- **i18n:** Full support for bidirectional text, CJK, Arabic, Hebrew, Thai, grapheme-aware line breaking
- **License:** MIT
- **Version:** 0.0.4 (early but actively developed as of March 2026)
- **Maintenance:** Active -- Cheng Lou is known for high-quality, long-lived projects (React, ReasonML/ReScript)

### What It Enables

Pretext's core value is predicting text block heights and performing line-breaking without triggering DOM reflow. This enables:

1. **Text displacement effects** -- text flowing around irregular shapes (the "dragon demo") at 60fps
2. **Animated typography** -- orbs/objects pushing text apart in real-time
3. **Canvas/SVG text rendering** -- accurate multiline text in Canvas without manual line-break calculation
4. **ASCII art and generative text** -- fluid smoke rendered as characters, wireframe shapes through character grids
5. **Multi-column layouts** -- magazine-style text wrapping with dynamic obstacles

### Relevance to the Kepler Site

The Kepler site is a music artist portfolio with a dark, "Matrix/research" aesthetic. Potential uses:

| Use Case | Fit | Complexity |
|----------|-----|------------|
| **Animated text headers** -- song titles or section names with displacement effects | High | Low |
| **Canvas-rendered lyrics** with visual effects synced to the audio player | High | Medium |
| **ASCII/generative art backgrounds** that incorporate text as visual texture | High | Medium |
| **Text flowing around 3D viewer containers** dynamically | Medium | Medium |
| **Interactive typographic experiments** as a "visual identity" page element | High | Low-Medium |

### Integration Assessment

**Compatibility with current stack:**
- Pretext is a standard ES module, compatible with the site's vanilla JS + ES6 module setup
- Zero dependencies means no conflict risk
- Can be loaded via CDN (`@chenglou/pretext` on npm / jsdelivr) using the existing `ScriptLoader` pattern
- Works with Canvas (already used for InterestGraph) and DOM

**Concerns:**
- Version 0.0.4 -- API may change. Not yet battle-tested in production at scale.
- The library solves layout reflow problems that are most critical in complex UIs with hundreds of text elements being repositioned. The Kepler site has relatively simple text layout needs.
- Adding visual effects increases total JS payload and cognitive complexity
- The demo effects (dragon, smoke, tetris) are impressive but require significant custom code on top of Pretext -- the library provides measurement, not the effects themselves

### Performance Impact Assessment

| Factor | Assessment |
|--------|------------|
| **Bundle cost:** ~15 KB gzipped | Minimal -- less than a single unoptimized PNG on this site |
| **Runtime cost:** Pure math, no DOM reflow | Excellent -- would not degrade existing performance |
| **Loading strategy:** Can be lazy-loaded via ScriptLoader when needed | Compatible with current architecture |
| **Net impact if combined with image optimization:** Negligible | Adding 15 KB while removing megabytes of unoptimized PNGs is a clear win |

---

## Part 3: Prioritized Quick Wins

### Priority 1: Image Optimization (High impact, low effort)

- Convert PNGs to WebP (or WebP with PNG fallback via `<picture>`)
- Target: `alles-war-easy.png` (5 MB), `kepler-studio.png` (3.2 MB), `kepler-voxel.png` (1.3 MB), `artefakt-1.png` (1.2 MB)
- Expected savings: 60-80% file size reduction
- Add `loading="lazy"` to all below-the-fold `<img>` tags
- Add `width` and `height` attributes to prevent layout shift (CLS)

### Priority 2: Font Loading (Medium impact, low effort)

- Combine both Google Font requests into one URL
- Add `<link rel="preload">` for the primary font (IBM Plex Mono 400)
- Consider self-hosting fonts to eliminate Google Fonts as a render-blocking external dependency
- Subset IBM Plex Mono to Latin only if German content is the primary use case

### Priority 3: CSS Minification (Medium impact, low effort)

- Add a minification step for `style.css` in the build script (e.g., `cssnano` or even just `--minify` flag)
- Estimated savings: ~20-30 KB

### Priority 4: Remove Dead Code (Low impact, low effort)

- Remove `GaussianSplatViewer` import (no container in HTML)
- Remove `eval()` from `FeatureDetector.isModernBrowser()` -- replace with a simple feature check or remove entirely
- Audit `AudioViewer.js` for usage

### Priority 5: JS Bundling (High impact, medium effort)

- Introduce a lightweight bundler (esbuild or Rollup) to combine 33 modules into 1-3 bundles
- Enable minification and tree-shaking
- Expected savings: fewer HTTP requests, smaller total payload, dead code elimination

### Priority 6: Accessibility Fixes (Medium impact, low effort)

- Add `<a href="#main-content" class="sr-only">` skip link
- Add `aria-expanded` to dropdown toggle
- Fix heading hierarchy (add `<h1>`, `<h2>` where appropriate)
- Audit color contrast for `text-gray-500` elements

---

## Part 4: Pretext Recommendation

### Recommendation: **Adopt (deferred, after quick wins)**

**Reasoning:**

1. **Alignment with project identity.** Kepler is a music artist site that values visual experimentation and digital identity. Pretext enables typographic effects (animated text, text-as-visual-art, lyrics visualization) that directly serve this identity. The "Matrix/research" aesthetic pairs well with generative text effects.

2. **Technical fit is excellent.** Zero dependencies, ES module compatible, works with Canvas (already in use), and can be lazy-loaded with the existing `ScriptLoader`. Integration friction is minimal.

3. **Performance cost is negligible.** At ~15 KB gzipped, Pretext is smaller than a single thumbnail image on the site. The runtime is pure math with no DOM reflow, meaning it would actually be more performant than equivalent DOM-based text effects.

4. **Why defer, not adopt immediately:**
   - The site has higher-priority optimization work (image compression alone could save 10+ MB)
   - Pretext is at v0.0.4 -- waiting for a v0.1.0 or v1.0.0 reduces API instability risk
   - The visual effects built on top of Pretext require custom development time; the library provides measurement, not ready-made effects
   - Current site text is primarily static content that does not need dynamic layout

5. **When to adopt:** After completing Priority 1-3 optimizations, introduce Pretext for a specific feature: an interactive lyrics visualizer synced to the audio player, or a generative ASCII art hero section. Start with one contained experiment, not a site-wide integration.

**Suggested first experiment:** A Canvas-based animated text element on the overview page that responds to the currently playing track -- text that breathes, pulses, or flows in response to audio. This would combine the existing audio player EventBus events with Pretext's fast text layout for a 60fps typographic visualization.

---

## Sources

- [chenglou/pretext on GitHub](https://github.com/chenglou/pretext)
- [@chenglou/pretext on npm](https://www.npmjs.com/package/@chenglou/pretext)
- [Pretext Demos (official)](https://chenglou.me/pretext/)
- [Pretext Community Demos](https://www.pretext.cool/)
- [New TypeScript Library Pretext Tackles Text Reflow Bottlenecks - Dataconomy](https://dataconomy.com/2026/03/31/new-typescript-library-pretext-tackles-text-reflow-bottlenecks/)
- [Midjourney engineer debuts Pretext - VentureBeat](https://venturebeat.com/technology/midjourney-engineer-debuts-new-vibe-coded-open-source-standard-pretext-to)
- [Web Typography Just Caught Up To The Page - B2BNN](https://www.b2bnn.com/2026/03/web-typography-just-caught-up-to-the-page-and-a-midjourney-engineer-built-the-bridge/)
- [Pretext: 15KB Library That Makes Text Layout 300x Faster - SVG Guide](https://vectosolve.com/blog/pretext-svg-text-layout-300x-faster-2026)
- [Hacker News Discussion](https://news.ycombinator.com/item?id=47556290)
