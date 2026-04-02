# Kepler

Kepler's website -- music, visuals, digital identity.

## Tech Stack
- Vanilla JavaScript (ES6 modules)
- EventBus pub/sub architecture
- Tailwind CSS v3.4
- GitHub Pages (static deployment)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (required for ES6 modules)
python3 -m http.server 8001

# Watch Tailwind CSS changes
npm run watch:css

# Update journal manifest after adding entries
node scripts/generate-journal-manifest.js
```

## Project Structure
```
js/
  core/         # EventBus, FeatureDetector, ScriptLoader
  audio/        # Music player (SOLID pattern)
  navigation/   # Page switching, dropdowns
  journal/      # Journal entries, markdown parser
  viewers/      # 3D, point cloud, audio, video viewers
  animations/   # Animation controller
  media/        # Lazy loading, image gallery
  pages/        # Gallery, video, interest graph pages
  app.js        # Main orchestrator (10-phase bootstrap)
assets/
  audio/        # Music tracks
  images/       # Visual content
  icons/        # UI icons
  models/       # 3D models
```
