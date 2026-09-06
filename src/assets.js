import * as THREE from 'three';

const sources = ['ships', 'HUD', 'FX', 'background1', 'background2', 'background3'];
export const SPRITES = {
  player: ['ships', 9, 190, 257, 302],
  boss0: ['ships', 237, 66, 642, 490],
  boss1: ['ships', 851, 31, 378, 636],
  enemy0: ['ships', 14, 691, 261, 218],
  enemy1: ['ships', 295, 708, 299, 203],
  enemy2: ['ships', 600, 701, 269, 210],
  enemy3: ['ships', 875, 706, 369, 224],
  shot: ['FX', 250, 81, 36, 127],
  enemyShot: ['FX', 188, 354, 29, 44],
  orb: ['FX', 180, 250, 44, 47],
  spark: ['FX', 1061, 24, 77, 80],
  explosion: ['FX', 47, 627, 214, 199],
  health: ['FX', 60, 850, 100, 107],
  power: ['HUD', 879, 1131, 91, 94],
  hudPanel: ['HUD', 30, 556, 281, 88],
};

function cutout(img, x, y, width, height, isolate = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const d = pixels.data;
  // Flood only the light, neutral background connected to the crop boundary.
  // Enclosed white cockpit and armour highlights remain opaque.
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  function push(i) {
    if (i < 0 || i >= visited.length || visited[i]) return;
    visited[i] = 1;
    const j = i * 4, lo = Math.min(d[j], d[j + 1], d[j + 2]), hi = Math.max(d[j], d[j + 1], d[j + 2]);
    if (lo >= 208 && hi - lo < 42) { queue[tail++] = i; d[j + 3] = 0; }
  }
  for (let ix = 0; ix < width; ix++) { push(ix); push((height - 1) * width + ix); }
  for (let iy = 0; iy < height; iy++) { push(iy * width); push(iy * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], col = i % width;
    if (col > 0) push(i - 1);
    if (col < width - 1) push(i + 1);
    push(i - width); push(i + width);
  }
  // Ship crops can overlap a neighbour's wing on a tightly packed sheet.
  // Keep the main connected silhouette, removing detached foreign fragments.
  if (isolate) {
    const labels = new Int32Array(width * height);
    let component = 0, largest = 0, largestSize = 0;
    for (let start = 0; start < labels.length; start++) {
      if (labels[start] || !d[start * 4 + 3]) continue;
      component++; head = 0; tail = 1; queue[0] = start; labels[start] = component;
      while (head < tail) {
        const i = queue[head++], col = i % width;
        for (const offset of [-width, width, ...(col > 0 ? [-1] : []), ...(col < width - 1 ? [1] : [])]) {
          const next = i + offset;
          if (next >= 0 && next < labels.length && !labels[next] && d[next * 4 + 3]) { labels[next] = component; queue[tail++] = next; }
        }
      }
      if (tail > largestSize) { largest = component; largestSize = tail; }
    }
    for (let i = 0; i < labels.length; i++) if (labels[i] !== largest) d[i * 4 + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export async function loadAssets(onProgress) {
  const images = {};
  await Promise.all(sources.map(name => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[name] = img; onProgress?.(name); resolve(); };
    img.onerror = () => reject(new Error(`Could not load ${name}.jpg`));
    img.src = `${import.meta.env.BASE_URL}assets/${name}.jpg`;
  })));
  const textures = {}, canvases = {};
  for (const [name, [source, x, y, w, h]] of Object.entries(SPRITES)) {
    const canvas = cutout(images[source], x, y, w, h, source === 'ships');
    canvases[name] = canvas;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    textures[name] = texture;
  }
  const backgrounds = [1, 2, 3].map(i => {
    const texture = new THREE.Texture(images[`background${i}`]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  });
  return { textures, canvases, backgrounds };
}
