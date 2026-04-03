# ROADMAP: Kepler

> Kepler's digital identity -- music, visuals, web presence

## Done

### 1. Scrape keplermusik.de for Assets

- [x] Scrape logo, links/icons, Datenschutzerklärung, images
- [x] Save assets to project (`assets/images/scraped/`)
- [x] Build trial link collection page (`trial-links.html`)

### 2. Full Migration Cleanup

- [x] Rename "Everything Machine" to "Kepler" everywhere
- [x] `window.everythingMachineApp` -> `window.keplerApp`
- [x] Update page title, footer text
- [x] Navigation labels reviewed (kept German, appropriate for content)

### 3. SEO Research & Plan

- [x] Research discoverability for artist with common name
- [x] Music-specific SEO (schema.org, Open Graph)
- [x] Long-tail keyword strategy
- [x] Produce actionable recommendations (`docs/seo-research.md`)

### 4. Website Optimization & Pretext Research

- [x] Analyze site performance, accessibility, structure
- [x] Research Cheng Lou's Pretext library feasibility
- [x] Compare Pretext benefits against optimization findings
- [x] Document recommendations (`docs/optimization-and-pretext-research.md`)

## In Progress

### 5. SEO Implementation

- [ ] Add meta tags, OG tags, Twitter cards to `index.html`
- [ ] Add MusicGroup JSON-LD structured data
- [ ] Create `robots.txt` and `sitemap.xml`
- [ ] Add favicon from scraped logo

### 6. Accessibility Fixes

- [ ] Add skip navigation link
- [ ] Fix `aria-expanded` on dropdown
- [ ] Fix heading hierarchy (h3 → h2)
- [ ] Remove inline `onclick` handlers on lightbox
- [ ] Add `loading="lazy"` to images

### 7. Site Optimization

- [ ] Compress/resize large PNGs (18 MB → target <2 MB)
- [ ] Optimize font loading (`font-display: swap`)
- [ ] Minify CSS

### 8. Link Collection Page (Full Integration)

- [ ] Add to main navigation (`data-page="links"`)
- [ ] Integrate trial-links content as embedded page section

### 9. Pretext Trial Page

- [ ] Install `@chenglou/pretext`
- [ ] Create Datenschutz trial page with drag-and-drop text reflow
- [ ] Draggable sphere displaces text in real-time (canvas, 60fps)

## Up Next

### 10. Starfield Space-Travel Effect

- [ ] Create `js/animations/StarfieldAnimation.js` (canvas-based)
- [ ] White dots moving toward viewer, growing larger, drifting to sides
- [ ] Integrate on landing page (overview)
- [ ] Respect `prefers-reduced-motion`
- [ ] Performance: requestAnimationFrame, particle pooling

### 11. Incorporate Kepler's Logo in Header

- [ ] Display logo in header/navigation
- [ ] Set as favicon

### 12. Mobile Friendly

- [ ] Responsive layout pass across all pages

## Blocked

### 13. Mastered Song Versions

- [ ] Get mastered MP3s from Kepler
- [ ] Replace files in `assets/audio/`
- [ ] Update playlist metadata in MusicPlayer/Playlist
