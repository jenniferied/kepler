# ROADMAP: Kepler

> Kepler's digital identity -- music, visuals, web presence

## Tasks

### 1. Incorporate Kepler's Logo
- [ ] Add logo asset to project
- [ ] Display logo in header/navigation
- [ ] Set as favicon

### 2. Starfield Space-Travel Effect
- [ ] Create `js/animations/StarfieldAnimation.js` (canvas-based)
- [ ] White dots moving toward viewer, growing larger, drifting to sides
- [ ] Integrate on landing page (overview)
- [ ] Respect `prefers-reduced-motion`
- [ ] Performance: requestAnimationFrame, particle pooling

### 3. Full Migration Cleanup
- [ ] Rename "Everything Machine" to "Kepler" everywhere
- [ ] `window.everythingMachineApp` -> `window.keplerApp`
- [ ] Update page title, footer text, meta tags
- [ ] Review/remove thesis-specific content sections
- [ ] Update navigation labels if needed

### 4. Mastered Song Versions
- [ ] Get mastered MP3s from Kepler
- [ ] Replace files in `assets/audio/`
- [ ] Update playlist metadata in MusicPlayer/Playlist

### 5. Link Collection Page
- [ ] New page in navigation (`data-page="links"`)
- [ ] Add dropdown menu item
- [ ] Design link card layout
- [ ] Populate with Kepler's links

### 6. Pretext Integration (Experimental)
- [ ] Research and set up Cheng Lou's Pretext text measurement library
- [ ] Landing page with Pretext typography effects
- [ ] Journal page with Pretext (improved bubble/text scaling)
- [ ] Journal page without Pretext (baseline comparison)
- [ ] Document findings and performance impact
