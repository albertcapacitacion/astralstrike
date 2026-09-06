import * as THREE from 'three';
import { WIDTH, HEIGHT } from './game.js';

export class Renderer {
  constructor(container, assets) {
    this.assets = assets;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x030910);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-WIDTH / 2, WIDTH / 2, HEIGHT / 2, -HEIGHT / 2, .1, 100);
    this.camera.position.z = 20;
    const plane = new THREE.PlaneGeometry(1, 1);
    this.background = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: assets.backgrounds[0], color: 0xa9bcc4 }));
    this.background.scale.set(WIDTH, HEIGHT, 1);
    this.background.position.z = -8;
    this.scene.add(this.background);
    for (const texture of assets.backgrounds) { texture.wrapT = THREE.MirroredRepeatWrapping; }
    this.groups = {};
    for (const [name, texture] of Object.entries(assets.textures)) {
      if (name === 'hudPanel') continue;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, alphaTest: .035 });
      const mesh = new THREE.InstancedMesh(plane, material, 512);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.renderOrder = ['shot', 'enemyShot', 'orb'].includes(name) ? 3 : ['spark', 'explosion'].includes(name) ? 4 : 2;
      this.groups[name] = mesh;
      this.scene.add(mesh);
    }
    this.dummy = new THREE.Object3D();
    this.ring = new THREE.Mesh(new THREE.RingGeometry(185, 188, 96), new THREE.MeshBasicMaterial({ color: 0xa7faff, transparent: true, opacity: 0, depthWrite: false }));
    this.disk = new THREE.Mesh(new THREE.CircleGeometry(188, 96), new THREE.MeshBasicMaterial({ color: 0x70e8ff, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.renderOrder = 5; this.disk.renderOrder = 4;
    this.scene.add(this.ring, this.disk);
    this.shield = new THREE.Mesh(new THREE.RingGeometry(31, 32, 48), new THREE.MeshBasicMaterial({ color: 0x8cefff, transparent: true, opacity: .5, depthWrite: false }));
    this.shield.renderOrder = 3;
    this.scene.add(this.shield);
    this.hitbox = new THREE.Mesh(new THREE.CircleGeometry(3, 12), new THREE.MeshBasicMaterial({ color: 0xe8ffff, transparent: true, opacity: .9 }));
    this.hitbox.renderOrder = 3;
    this.scene.add(this.hitbox);
    this.starPositions = new Float32Array(75 * 3);
    for (let i = 0; i < 75; i++) {
      this.starPositions[i * 3] = ((i * 197 + 79) % WIDTH) - WIDTH / 2;
      this.starPositions[i * 3 + 1] = ((i * 139 + 83) % HEIGHT) - HEIGHT / 2;
      this.starPositions[i * 3 + 2] = -5;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb9edf7, size: 1.4, transparent: true, opacity: .45, sizeAttenuation: false }));
    this.scene.add(this.stars);
    new ResizeObserver(() => this.resize(container)).observe(container);
    this.resize(container);
    this.scroll = 0;
    this.shake = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  resize(container) { this.renderer.setSize(container.clientWidth, container.clientHeight, false); }
  add(name, x, y, w, h, rotation = 0) {
    const mesh = this.groups[name];
    if (!mesh || mesh.count >= 512) return;
    this.dummy.position.set(x - WIDTH / 2, HEIGHT / 2 - y, 0);
    this.dummy.rotation.set(0, 0, rotation);
    this.dummy.scale.set(w, h, 1);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count++, this.dummy.matrix);
  }
  render(game, dt, visualTime) {
    for (const mesh of Object.values(this.groups)) mesh.count = 0;
    const playing = game.mode === 'playing';
    const title = game.mode === 'title';
    if (playing || title) this.scroll += dt * (title ? .009 : .025);
    const texture = this.assets.backgrounds[game.stage];
    if (this.background.material.map !== texture) { this.background.material.map = texture; this.background.material.needsUpdate = true; }
    texture.offset.y = this.scroll;
    if (playing || title) {
      for (let i = 0; i < 75; i++) {
        this.starPositions[i * 3 + 1] -= dt * (16 + (i % 3) * 17);
        if (this.starPositions[i * 3 + 1] < -HEIGHT / 2) this.starPositions[i * 3 + 1] += HEIGHT;
      }
      this.stars.geometry.attributes.position.needsUpdate = true;
    }
    const p = game.player;
    this.shield.visible = !title && p.hp > 0 && p.invulnerable > 0;
    this.hitbox.visible = !title && p.hp > 0;
    this.shield.position.set(p.x - WIDTH / 2, HEIGHT / 2 - p.y, 2);
    this.hitbox.position.copy(this.shield.position);
    this.shield.material.opacity = .3 + Math.sin(visualTime * 14) * .14;
    if (!title && p.hp > 0 && (p.invulnerable <= 0 || Math.floor(visualTime * 12) % 2 === 0)) this.add('player', p.x, p.y, 56, 66);
    for (const enemy of game.enemies) {
      if (enemy.boss) {
        const tall = enemy.type === 1;
        this.add(`boss${enemy.type}`, enemy.x, enemy.y, tall ? 116 : 202, tall ? 194 : 154, Math.PI);
      } else {
        const sizes = [[62, 52], [65, 44], [57, 45], [79, 48]][enemy.type];
        this.add(`enemy${enemy.type}`, enemy.x, enemy.y, ...sizes, Math.PI);
      }
    }
    for (const shot of game.shots) this.add('shot', shot.x, shot.y, 8, 30);
    for (const bullet of game.bullets) {
      const orb = bullet.kind === 'orb';
      this.add(bullet.kind, bullet.x, bullet.y, orb ? 19 : 14, orb ? 19 : 20, orb ? 0 : -Math.atan2(bullet.vy, bullet.vx) - Math.PI / 2);
    }
    for (const item of game.pickups) this.add(item.kind, item.x, item.y, 32 + Math.sin(item.age * 6) * 2, 32 + Math.sin(item.age * 6) * 2);
    for (const effect of game.effects) {
      const t = effect.age / effect.life;
      const size = effect.size * (.4 + Math.sin(t * Math.PI) * .6);
      this.add(effect.kind, effect.x, effect.y, size, size, effect.id * .7);
    }
    if (game.bombWave) {
      const wave = game.bombWave, progress = Math.min(1, wave.age / .22);
      this.ring.position.set(wave.x - WIDTH / 2, HEIGHT / 2 - wave.y, 2);
      this.disk.position.copy(this.ring.position);
      this.ring.scale.setScalar(.12 + progress * .88);
      this.disk.scale.copy(this.ring.scale);
      this.ring.material.opacity = Math.max(0, 1 - wave.age / .7);
      this.disk.material.opacity = Math.max(0, .22 * (1 - wave.age / .7));
    } else { this.ring.material.opacity = 0; this.disk.material.opacity = 0; }
    for (const mesh of Object.values(this.groups)) mesh.instanceMatrix.needsUpdate = true;
    this.shake = Math.max(0, this.shake - dt * 28);
    if (this.reducedMotion) this.shake = 0;
    this.camera.position.x = Math.sin(visualTime * 93) * this.shake;
    this.camera.position.y = Math.cos(visualTime * 87) * this.shake * .6;
    this.renderer.render(this.scene, this.camera);
  }
}
