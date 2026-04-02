/**
 * VideoGallery — Experiment 6 video comparison grid
 * 7 models × 4 scenes, native <video> with poster frames
 */

const BASE_PATH = 'assets/videos/experiment-06';

const MODELS = [
  { id: 'pixverse_v55', name: 'PixVerse v5.5', cost: '$0.20' },
  { id: 'ltx2', name: 'LTX-2', cost: '$0.36' },
  { id: 'wan_v26', name: 'Wan 2.6', cost: '$0.50' },
  { id: 'seedance_pro', name: 'Seedance 1.0 Pro', cost: '$0.62' },
  { id: 'veo31', name: 'Veo 3.1', cost: '$0.80' },
  { id: 'kling_o3', name: 'Kling O3', cost: '$0.84' },
  { id: 'kling_v3', name: 'Kling 3.0 V3', cost: '$0.84' },
];

const SCENES = [
  {
    id: 'studio',
    title: 'Studio (Landscape)',
    prompt: 'The voxel character nods gently to the beat, fingers resting on the mixing console. Monitor screens glow steadily. Camera holds still.',
  },
  {
    id: 'pool',
    title: 'Pool (Portrait)',
    prompt: 'The voxel character drifts slowly on the pool ring. Water ripples gently around the float. Camera holds still from above.',
  },
  {
    id: 'night_drive',
    title: 'Night Drive (Portrait)',
    prompt: 'The voxel character drives steadily down the desert highway. Headlights illuminate the road ahead. Camera holds still from behind.',
  },
  {
    id: 'spiral_staircase',
    title: 'Spiral Staircase (Portrait)',
    prompt: 'The white marble staircase begins to glow with a deep blue light. The voxel character slowly ascends the steps. Camera holds still.',
  },
];

// Rating data from CSV (model_scene → { bewertung, halluzination, kommentar })
const RATINGS = {
  pixverse_v55_studio: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Kamerabewegung gefällt, aber Bewegung etwas unpassend. Schwarzer Kasten entsteht plötzlich.' },
  ltx2_studio: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Als nicht-Audio-Person schwer zu beurteilen ob halluziniert.' },
  wan_v26_studio: { bewertung: 'Gut', halluzination: 'Nein', kommentar: 'Bild wirkt leicht überzeichnet, Audio wurde trotzdem generiert.' },
  seedance_pro_studio: { bewertung: 'Okay', halluzination: 'Nein', kommentar: 'Bewegt sich zwar nicht, aber okay.' },
  veo31_studio: { bewertung: 'Schlecht', halluzination: 'Ja, leicht', kommentar: 'Slider bewegen sich. Bewegung gefällt nicht.' },
  kling_o3_studio: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Audio Meter sehr unscharf. Bewegung gefällt sehr.' },
  kling_v3_studio: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Audio Meter schwammig. Bewegung etwas ruckartig aber cool.' },

  pixverse_v55_pool: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Voxel-Gesicht verändert sich. Bewegung zu schnell.' },
  ltx2_pool: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Aspect Ratio geändert, Kamera bewegt sich zu sehr. Ansichtswinkel hat sich auch geändert.' },
  wan_v26_pool: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Es entsteht ein Gesicht mit der Zeit. Pool Floaty Bewegung ist aber gelungen.' },
  seedance_pro_pool: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Gesicht entsteht, Zehen zeichnen sich in Schuhen ab.' },
  veo31_pool: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Voxel-Gesicht verändert sich leicht. Pool Floaty Bewegung cool, aber water ripples fehlen.' },
  kling_o3_pool: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Ripples an falscher Stelle. Pool Bewegung und Wassersimulation top.' },
  kling_v3_pool: { bewertung: 'Gut', halluzination: 'Nein', kommentar: 'Das beste!' },

  pixverse_v55_night_drive: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Gesicht verändert sich zu einer Art Lego-Figur. Autofahrt unnatürlich.' },
  ltx2_night_drive: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Auto fährt rückwärts, Licht ist hinten, Aspect Ratio hat sich geändert.' },
  wan_v26_night_drive: { bewertung: 'Schlecht', halluzination: 'Ja, leicht', kommentar: 'Es wird ein Gesicht dazu generiert, ansonsten ist die Animation gut.' },
  seedance_pro_night_drive: { bewertung: 'Gut', halluzination: 'Nein', kommentar: 'Überraschenderweise gut.' },
  veo31_night_drive: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Funktioniert gut, fährt aber rückwärts – könnte man umkehren.' },
  kling_o3_night_drive: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Eigentlich okay, aber halluziniert viel am Rand und zoomt zu sehr heraus.' },
  kling_v3_night_drive: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Etwas besser als Kling O3.' },

  pixverse_v55_spiral_staircase: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Stufen etwas unnatürlich, aber interessanter Glow.' },
  ltx2_spiral_staircase: { bewertung: 'Schlecht', halluzination: 'Ja, stark', kommentar: 'Er läuft fast von der Stufe, Aspect Ratio ändert sich.' },
  wan_v26_spiral_staircase: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Bewegung leicht unnatürlich.' },
  seedance_pro_spiral_staircase: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Kopf verändert sich. Treppenanimation in Ordnung, Glow auch.' },
  veo31_spiral_staircase: { bewertung: 'Okay', halluzination: 'Ja, leicht', kommentar: 'Er überspringt Stufen, Animation wirkt aber relativ okay.' },
  kling_o3_spiral_staircase: { bewertung: 'Gut', halluzination: 'Ja, leicht', kommentar: 'Leider funktioniert eine Stufe nicht gut, aber Bewegung ist okay. Leuchten gefällt.' },
  kling_v3_spiral_staircase: { bewertung: 'Schlecht', halluzination: 'Ja, leicht', kommentar: 'Stufen funktionieren nicht, Leuchten komisch, Kamerabewegung geht in unerwartete Richtung.' },
};

function ratingClass(bewertung) {
  if (bewertung === 'Gut') return 'rating-gut';
  if (bewertung === 'Schlecht') return 'rating-schlecht';
  return 'rating-okay';
}

function hallucinationLabel(h) {
  if (h === 'Nein') return '';
  if (h === 'Ja, stark') return 'Halluz. stark';
  return 'Halluz. leicht';
}

export class VideoGallery {
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    this.render();
    this.initialized = true;
    this.handleDeepLink();
    window.addEventListener('hashchange', () => this.handleDeepLink());
    console.log('[VideoGallery] Initialized with 28 videos');
  }

  render() {
    const html = SCENES.map(scene => `
      <div class="vg-scene" id="scene-${scene.id}">
        <div class="vg-scene-header">
          <h4 class="vg-scene-title">${scene.title}</h4>
          <p class="vg-scene-prompt">${scene.prompt}</p>
        </div>
        <div class="vg-grid">
          ${MODELS.map(model => {
            const key = `${model.id}_${scene.id}`;
            const r = RATINGS[key];
            const hLabel = hallucinationLabel(r.halluzination);
            return `
              <div class="vg-card" id="video-${key}" data-video-key="${key}">
                <div class="vg-video-wrap">
                  <video
                    poster="${BASE_PATH}/frames/${key}.jpg"
                    controls
                    preload="none"
                    playsinline
                  >
                    <source src="${BASE_PATH}/${key}.mp4" type="video/mp4">
                  </video>
                </div>
                <div class="vg-card-info">
                  <div class="vg-card-header">
                    <span class="vg-model-name">${model.name}</span>
                    <span class="vg-cost">${model.cost}</span>
                  </div>
                  <div class="vg-badges">
                    <span class="vg-badge ${ratingClass(r.bewertung)}">${r.bewertung}</span>
                    ${hLabel ? `<span class="vg-badge rating-halluz">${hLabel}</span>` : ''}
                  </div>
                  <p class="vg-comment">${r.kommentar}</p>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    this.container.innerHTML = html;
  }

  handleDeepLink() {
    const hash = location.hash;
    if (!hash.startsWith('#video/')) return;

    const key = hash.slice('#video/'.length);
    const card = document.getElementById(`video-${key}`);
    if (!card) return;

    // Scroll to card
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('vg-card-highlight');
      setTimeout(() => card.classList.remove('vg-card-highlight'), 2000);

      // Auto-play video
      const video = card.querySelector('video');
      if (video) {
        video.play().catch(() => { /* autoplay blocked */ });
      }
    });
  }

  dispose() {
    // Pause all videos
    if (this.container) {
      this.container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
    }
  }
}
