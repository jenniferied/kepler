/**
 * ImageGalleryPage — Experiment 5 image pipeline comparison
 * 9 models × 7 phases, grouped by pipeline phase
 */

const BASE = 'assets/images/experiment-05';

const PHASES = [
  {
    id: 'phase1',
    title: 'Phase 1: Modell-Screening',
    description: '5 Modelle mit A-Pose-Input (1024×1024, quadratisch). Erster systematischer Test — welche Modelle können Keplers Voxel-Ästhetik überhaupt reproduzieren?',
    input: 'a-pose',
    inputImage: 'inputs/kepler-a-pose-1024.jpg',
    prompt: 'A voxel character made of small 3D cubes, faceless geometric humanoid figure, white shirt and dark pants, standing in a dramatic cinematic environment, volumetric lighting, no face, blocky pixel art style 3D character',
    sceneVariants: [
      'in a neon-lit cyberpunk city at night',
      'in a foggy forest with golden light rays',
      'on a concert stage with dramatic spotlights',
    ],
    models: [
      { folder: '01_minimax_subject', name: 'MiniMax Subject Ref.', images: ['01_minimax_subject_000.jpg','01_minimax_subject_010.jpg','01_minimax_subject_020.jpg'], bewertung: 'nein', halluzination: 'ja', kommentar: 'Minecraft-Stil — halluzinierte Gesichtszüge (Augen/Mund)' },
      { folder: '02_zimage_controlnet', name: 'Z-Image Turbo ControlNet', images: ['02_zimage_controlnet_000.jpg','02_zimage_controlnet_010.jpg','02_zimage_controlnet_020.jpg'], bewertung: 'bedingt', halluzination: 'nein', kommentar: 'A-Pose erhalten — kein Gesicht — clean' },
      { folder: '03_flux_depth', name: 'FLUX Depth LoRA', images: ['03_flux_depth_000.jpg','03_flux_depth_010.jpg','03_flux_depth_020.jpg'], bewertung: 'nein', halluzination: '', kommentar: 'Körper wird humanoid/geglättet' },
      { folder: '04_flux_canny', name: 'FLUX Canny LoRA', images: ['04_flux_canny_010.jpg','04_flux_canny_020.jpg'], bewertung: 'nein', halluzination: 'ja', kommentar: 'Volles menschliches Gesicht halluziniert' },
      { folder: '05_era3d', name: 'Era 3D', images: ['05_era3d_000.jpg','05_era3d_001.jpg','05_era3d_002.jpg','05_era3d_003.jpg','05_era3d_004.jpg','05_era3d_005.jpg'], bewertung: 'nein', halluzination: '', kommentar: 'Multiviews nutzlos — eigene Renders in besserer Qualität' },
    ],
  },
  {
    id: 'phase2',
    title: 'Phase 2: Top-Modelle in Szenen',
    description: '4 vielversprechende Modelle werden in Szenen-Kontexte eingeführt (A-Pose-Input).',
    input: 'a-pose',
    inputImage: 'inputs/kepler-a-pose-1024.jpg',
    prompt: 'Place this voxel character in a neon-lit cyberpunk city at night, walking down the street with hands in pockets, cinematic lighting',
    models: [
      { folder: '06_flux_kontext', name: 'FLUX Kontext Pro', images: ['06_flux_kontext_000.jpg','06_flux_kontext_010.jpg','06_flux_kontext_020.jpg'], bewertung: 'bedingt', halluzination: '', kommentar: 'Es fängt an gut zu werden!' },
      { folder: '07_gpt_image_15', name: 'GPT-Image-1.5', images: ['07_gpt_image_15_000.jpg','07_gpt_image_15_010.jpg','07_gpt_image_15_020.jpg'], bewertung: 'bedingt', halluzination: 'teilweise', kommentar: 'Teilweise Halluzinationen — aber sehr solide' },
      { folder: '08_seeddream', name: 'SeedDream v4.5', images: ['08_seeddream_000.jpg','08_seeddream_010.jpg','08_seeddream_020.jpg'], bewertung: 'nein', halluzination: 'ja', kommentar: 'Volles Gesicht halluziniert (Augen/Nase/Mund)' },
      { folder: '09_nanobanana_pro', name: 'NanoBanana Pro', images: ['09_nanobanana_pro_000.jpg','09_nanobanana_pro_010.jpg','09_nanobanana_pro_020.jpg'], bewertung: 'gut', halluzination: 'teilweise', kommentar: 'Keine Gesichtszüge sichtbar — kleinere Halluzinationen (fehlende Cap) — aber gut' },
    ],
  },
  {
    id: 'phase2b',
    title: 'Phase 2b: Posed-Input-Durchbruch',
    description: 'Wechsel zum "Posed Input" — natürliche Haltung statt A-Pose. Der entscheidende Durchbruch: FLUX Kontext schied aus (Gesichtshalluzinationen verstärkt), GPT-1.5 und NanoBanana blieben als Finalisten.',
    input: 'posed',
    inputImage: 'inputs/kepler-posed-1024.jpg',
    inputCompare: { from: 'inputs/kepler-a-pose-1024.jpg', to: 'inputs/kepler-posed-1024.jpg', label: 'A-Pose → Posed' },
    prompt: 'Place this voxel character in a neon-lit cyberpunk city at night, walking down a rain-soaked street with hands in pockets, cinematic lighting, reflections on wet ground',
    models: [
      { folder: '10_flux_kontext_posed', name: 'FLUX Kontext Posed', images: ['10_flux_kontext_posed_000.jpg','10_flux_kontext_posed_010.jpg','10_flux_kontext_posed_020.jpg','10_flux_kontext_posed_030.jpg','10_flux_kontext_posed_040.jpg'], bewertung: 'nein', halluzination: 'ja', kommentar: 'Gesichter werden reinhalluziniert' },
      { folder: '11_gpt15_posed', name: 'GPT-Image-1.5 Posed', images: ['11_gpt15_posed_000.jpg','11_gpt15_posed_010.jpg','11_gpt15_posed_020.jpg','11_gpt15_posed_030.jpg','11_gpt15_posed_040.jpg'], bewertung: 'ja', halluzination: 'teilweise', kommentar: 'Solideste Ergebnisse — nur ein Bild Halluzinationen — enthält Lieblingsbild' },
      { folder: '12_nanobanana_posed', name: 'NanoBanana Posed', images: ['12_nanobanana_posed_000.jpg','12_nanobanana_posed_010.jpg','12_nanobanana_posed_020.jpg','12_nanobanana_posed_030.jpg','12_nanobanana_posed_040.jpg'], bewertung: 'ja', halluzination: 'nein', kommentar: 'Stärkste Voxel-Ästhetik — auch Umgebung voxelisiert' },
    ],
  },
  {
    id: 'phase3a',
    title: 'Phase 3a: Signature Scenes v1',
    description: 'GPT-1.5 und NanoBanana parallel in 4 "Signature Scenes". Ratio-Bug bei GPT — alle Outputs quadratisch statt Portrait/Landscape.',
    input: 'posed',
    prompt: 'Place this voxel character in a professional recording studio, sitting at a large mixing console with both hands on the faders, studio monitors glowing, headphones on, warm amber lighting...',
    scenes: ['Studio', 'Retro Car Bridge', 'Spiral Staircase', 'Pool Floaty'],
    models: [
      { folder: '13_gpt15_scenes_portrait', name: 'GPT-1.5 "Portrait" (sq.)', images: ['studio.jpg','retro_car_bridge.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: 'Buggy 1:1 Ratio' },
      { folder: '13_gpt15_scenes_landscape', name: 'GPT-1.5 "Landscape" (sq.)', images: ['studio.jpg','retro_car_bridge.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: 'Auch 1:1 leider' },
      { folder: '14_nanobanana_scenes_portrait', name: 'NanoBanana Portrait', images: ['studio.jpg','retro_car_bridge.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: 'Halb cool, halb Halluzinationen' },
      { folder: '14_nanobanana_scenes_landscape', name: 'NanoBanana Landscape', images: ['studio.jpg','retro_car_bridge.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: 'Ohne Halluzinationen eigentlich stark' },
    ],
  },
  {
    id: 'phase3b',
    title: 'Phase 3b: Gestretchte Inputs + Prompt-Verfeinerung',
    description: 'Ratio-Bug behoben, Tokyo Rain ersetzt Bridge. Neuer Fehler: quadratisches Referenzbild naiv gestretcht statt gepaddet. Trotzdem produzierte NanoBanana überzeugende Ergebnisse.',
    input: 'posed (gestretcht)',
    inputCompare: { from: 'inputs/kepler-posed-portrait.jpg', to: 'inputs/kepler-posed-landscape.jpg', label: 'Fehlerhafte Inputs: gestretcht' },
    prompt: 'Show this voxel character in a cozy recording studio. He\'s sitting at a big mixing desk with his hands on the faders, wearing headphones. Warm amber lighting, acoustic panels on walls, DAW screens glowing behind him. IMPORTANT: The character must remain completely faceless...',
    scenes: ['Studio', 'Tokyo Rain', 'Spiral Staircase', 'Pool Floaty'],
    models: [
      { folder: '15_gpt15_fixed_portrait', name: 'GPT-1.5 Portrait (15)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: 'Gestretchte Referenz' },
      { folder: '15_gpt15_fixed_landscape', name: 'GPT-1.5 Landscape (15)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: 'Stretching + Cap fehlen' },
      { folder: '16_nanobanana_fixed_portrait', name: 'NanoBanana Portrait (16)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'nein', kommentar: 'Stretching stark — keine Halluzinationen' },
      { folder: '16_nanobanana_fixed_landscape', name: 'NanoBanana Landscape (16)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: 'Weniger Stretching' },
      { folder: '17_gpt15_v2_portrait', name: 'GPT-1.5 Portrait (17)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: '1:1 Bug + leichte Halluzinationen' },
      { folder: '17_gpt15_v2_landscape', name: 'GPT-1.5 Landscape (17)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: 'teilweise', kommentar: 'Dasselbe' },
      { folder: '18_nanobanana_v2_portrait', name: 'NanoBanana Portrait (18)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: '' },
      { folder: '18_nanobanana_v2_landscape', name: 'NanoBanana Landscape (18)', images: ['studio.jpg','tokyo_rain.jpg','spiral_staircase.jpg','pool_floaty.jpg'], bewertung: 'stark', halluzination: '', kommentar: '' },
    ],
  },
  {
    id: 'phase3c',
    title: 'Phase 3c: Korrigierte Pipeline',
    description: 'Korrekt gepaddete Inputs (schwarze Balken statt Stretching). Night Drive ersetzt Tokyo Rain. Erstmals konsistente Ergebnisse — die besten Bilder wären als Promo-Material verwendbar.',
    input: 'posed (gepaddet)',
    inputCompare: { from: 'inputs/kepler-posed-portrait-padded.jpg', to: 'inputs/kepler-posed-landscape-padded.jpg', label: 'Korrekt gepaddete Inputs' },
    prompt: 'Background: A wide night road cutting through a valley, a glowing city skyline receding behind the car, dark mountain range rising ahead on the horizon, full moon low in the sky... Center: This faceless voxel character sits behind the wheel of a sleek retro sports car...',
    scenes: ['Night Drive', 'Spiral Staircase', 'Pool Floaty', 'Studio'],
    models: [
      { folder: '19_gpt15_final_portrait', name: 'GPT-1.5 Portrait (19)', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg','studio.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: '' },
      { folder: '19_gpt15_final_landscape', name: 'GPT-1.5 Landscape (19)', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg','studio.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: '' },
      { folder: '20_nanobanana_final_portrait', name: 'NanoBanana Portrait (20)', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg','studio.jpg'], bewertung: 'gemischt', halluzination: '', kommentar: '' },
      { folder: '20_nanobanana_final_landscape', name: 'NanoBanana Landscape (20)', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg','studio.jpg'], bewertung: 'stark', halluzination: '', kommentar: '' },
    ],
  },
  {
    id: 'phase3d',
    title: 'Phase 3d: Posed vs. A-Pose Vergleich',
    description: 'Dieselben 3 Signature Scenes mit Posed (21/22) und A-Pose (23/24) Input parallel. Ergebnis: Posed war A-Pose in fast allen Szenen überlegen.',
    input: 'posed vs. a-pose',
    inputCompare: { from: 'inputs/kepler-posed-portrait-padded.jpg', to: 'inputs/kepler-a-pose-portrait-padded.jpg', label: 'Posed vs. A-Pose' },
    prompt: 'This voxel character is cruising down a night road in a sleek retro 1980s sports car with pop-up headlights. Behind him a glowing city skyline fades into the distance...',
    scenes: ['Night Drive', 'Spiral Staircase', 'Pool Floaty'],
    subgroups: [
      {
        label: 'Portrait',
        models: [
          { folder: '21_gpt15_refined_portrait', name: 'GPT-1.5 Posed', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'ja', kommentar: 'Scheibe fehlt' },
              { scene: 'Spiral Staircase', bewertung: 'ja', halluzination: 'nein', kommentar: '' },
              { scene: 'Pool Floaty', bewertung: 'ja', halluzination: 'nein', kommentar: '' },
            ]},
          { folder: '23_gpt15_apose_portrait', name: 'GPT-1.5 A-Pose', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'nein', halluzination: 'ja', kommentar: 'Scheinwerfer falsch + Haare/Cap fehlen' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'ja', kommentar: 'A-Pose wird overfitted' },
              { scene: 'Pool Floaty', bewertung: 'neutral', halluzination: 'ja', kommentar: 'Ring nicht wie gewollt + Cap fehlt' },
            ]},
          { folder: '22_nanobanana_refined_portrait', name: 'NanoBanana Posed', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'nein', kommentar: '' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'nein', kommentar: 'Stufen sehen nicht schön aus' },
              { scene: 'Pool Floaty', bewertung: 'ja', halluzination: 'nein', kommentar: 'Sehr cool!' },
            ]},
          { folder: '24_nanobanana_apose_portrait', name: 'NanoBanana A-Pose', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'nein', kommentar: '' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'ja', kommentar: 'Treppe sieht nicht gut aus' },
              { scene: 'Pool Floaty', bewertung: 'ja', halluzination: 'nein', kommentar: 'Super' },
            ]},
        ],
      },
      {
        label: 'Landscape',
        models: [
          { folder: '21_gpt15_refined_landscape', name: 'GPT-1.5 Posed', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'ja', kommentar: 'Teil des Autos fehlt' },
              { scene: 'Spiral Staircase', bewertung: 'ja', halluzination: 'nein', kommentar: '' },
              { scene: 'Pool Floaty', bewertung: 'neutral', halluzination: 'ja', kommentar: 'Cap und Haare fehlen' },
            ]},
          { folder: '23_gpt15_apose_landscape', name: 'GPT-1.5 A-Pose', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'ja', kommentar: 'Haare/Cap fehlen — Scheinwerfer OK' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'nein', kommentar: 'Pose zu starr (A-Pose overfitting)' },
              { scene: 'Pool Floaty', bewertung: 'ja', halluzination: 'ja', kommentar: 'Cap fehlt + Pool Floaty falsch' },
            ]},
          { folder: '22_nanobanana_refined_landscape', name: 'NanoBanana Posed', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'ja', halluzination: 'ja', kommentar: 'Cockpit an falscher Stelle' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'ja', kommentar: 'Doppelte Treppe halluziniert' },
              { scene: 'Pool Floaty', bewertung: 'ja', halluzination: 'nein', kommentar: 'Transparenter Pool Float gefällt sehr' },
            ]},
          { folder: '24_nanobanana_apose_landscape', name: 'NanoBanana A-Pose', images: ['night_drive.jpg','spiral_staircase.jpg','pool_floaty.jpg'],
            ratings: [
              { scene: 'Night Drive', bewertung: 'neutral', halluzination: 'ja', kommentar: 'Ganz okay aber Halluzinationen stören' },
              { scene: 'Spiral Staircase', bewertung: 'nein', halluzination: 'ja', kommentar: 'Treppen nicht schön' },
              { scene: 'Pool Floaty', bewertung: 'neutral', halluzination: 'ja', kommentar: 'Cool aber Pool Floaty falsch' },
            ]},
        ],
      },
    ],
  },
];

function ratingClass(bew) {
  if (bew === 'gut' || bew === 'ja' || bew === 'stark') return 'rating-gut';
  if (bew === 'nein') return 'rating-schlecht';
  if (bew === 'neutral' || bew === 'bedingt' || bew === 'gemischt') return 'rating-okay';
  return 'rating-okay';
}

function halluzLabel(h) {
  if (!h || h === 'nein') return '';
  if (h === 'ja') return 'Halluz.';
  return `Halluz. ${h}`;
}

function renderImageCard(folder, image, rating, halluz, kommentar, modelName, sceneName) {
  const key = `${folder}_${image.replace('.jpg', '')}`;
  const hLabel = halluzLabel(halluz);
  return `
    <div class="ig-card" id="image-${key}" data-image-key="${key}">
      <div class="ig-img-wrap">
        <img src="${BASE}/${folder}/${image}" alt="${modelName} — ${sceneName || image}" loading="lazy"
             data-gallery="exp05" data-caption="${modelName}: ${sceneName || image}${kommentar ? ' — ' + kommentar : ''}">
      </div>
      <div class="ig-card-info">
        ${sceneName ? `<span class="ig-scene-label">${sceneName}</span>` : ''}
        <div class="ig-badges">
          ${rating ? `<span class="vg-badge ${ratingClass(rating)}">${rating}</span>` : ''}
          ${hLabel ? `<span class="vg-badge rating-halluz">${hLabel}</span>` : ''}
        </div>
        ${kommentar ? `<p class="ig-comment">${kommentar}</p>` : ''}
      </div>
    </div>`;
}

function renderPhase(phase) {
  let html = `<div class="ig-phase" id="phase-${phase.id}">`;
  html += `<div class="ig-phase-header">`;
  html += `<h4 class="ig-phase-title">${phase.title}</h4>`;
  html += `<p class="ig-phase-desc">${phase.description}</p>`;

  // Prompt
  html += `<div class="ig-prompt"><strong>Prompt:</strong> ${phase.prompt}`;
  if (phase.sceneVariants) {
    html += `<br><br><strong>Szenen-Varianten:</strong><ul>${phase.sceneVariants.map(v => `<li>"...${v}"</li>`).join('')}</ul>`;
  }
  html += `</div>`;

  // Input reference
  if (phase.inputCompare) {
    html += `<div class="ig-input-compare">`;
    html += `<span class="ig-input-label">${phase.inputCompare.label}</span>`;
    html += `<img src="${BASE}/${phase.inputCompare.from}" alt="Input A" loading="lazy">`;
    html += `<span class="ig-arrow">→</span>`;
    html += `<img src="${BASE}/${phase.inputCompare.to}" alt="Input B" loading="lazy">`;
    html += `</div>`;
  } else if (phase.inputImage) {
    html += `<div class="ig-input-ref">`;
    html += `<span class="ig-input-label">Input: ${phase.input}</span>`;
    html += `<img src="${BASE}/${phase.inputImage}" alt="Input" loading="lazy">`;
    html += `</div>`;
  }

  html += `</div>`; // end phase-header

  // Phase 3d has subgroups
  if (phase.subgroups) {
    for (const sg of phase.subgroups) {
      html += `<h5 class="ig-subgroup-title">${sg.label}</h5>`;
      for (const model of sg.models) {
        html += `<div class="ig-model-section">`;
        html += `<span class="ig-model-name">${model.name}</span>`;
        html += `<div class="ig-grid ig-grid-scene">`;
        model.images.forEach((img, i) => {
          const r = model.ratings[i];
          html += renderImageCard(model.folder, img, r.bewertung, r.halluzination, r.kommentar, model.name, r.scene);
        });
        html += `</div></div>`;
      }
    }
  } else {
    // Standard phases: each model is a row
    for (const model of phase.models) {
      html += `<div class="ig-model-section">`;
      html += `<span class="ig-model-name">${model.name}</span>`;
      html += `<div class="ig-badges ig-model-badges">`;
      html += `<span class="vg-badge ${ratingClass(model.bewertung)}">${model.bewertung}</span>`;
      const hL = halluzLabel(model.halluzination);
      if (hL) html += `<span class="vg-badge rating-halluz">${hL}</span>`;
      html += `</div>`;
      if (model.kommentar) html += `<p class="ig-comment">${model.kommentar}</p>`;
      html += `<div class="ig-grid">`;
      model.images.forEach((img, i) => {
        const sceneName = phase.scenes ? phase.scenes[i] : '';
        html += `
          <div class="ig-card" id="image-${model.folder}_${img.replace('.jpg','')}" data-image-key="${model.folder}_${img.replace('.jpg','')}">
            <div class="ig-img-wrap">
              <img src="${BASE}/${model.folder}/${img}" alt="${model.name} — ${sceneName || img}" loading="lazy"
                   data-gallery="exp05" data-caption="${model.name}: ${sceneName || img}">
            </div>
            ${sceneName ? `<span class="ig-scene-tag">${sceneName}</span>` : ''}
          </div>`;
      });
      html += `</div></div>`;
    }
  }

  html += `</div>`; // end ig-phase
  return html;
}

export class ImageGalleryPage {
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
    console.log('[ImageGalleryPage] Initialized with', PHASES.length, 'phases');
  }

  render() {
    this.container.innerHTML = PHASES.map(renderPhase).join('');
  }

  /** Return all gallery images so the app can register them with ImageGallery */
  getGalleryImages() {
    return this.container.querySelectorAll('.ig-img-wrap img[data-gallery]');
  }

  handleDeepLink() {
    const hash = location.hash;
    if (!hash.startsWith('#image/')) return;

    const key = hash.slice('#image/'.length);
    const card = document.getElementById(`image-${key}`);
    if (!card) return;

    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ig-card-highlight');
      setTimeout(() => card.classList.remove('ig-card-highlight'), 2000);
    });
  }

  dispose() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
