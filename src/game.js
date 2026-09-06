// Pure fixed-step simulation. Coordinates are in a 480 × 854 portrait field.
export const WIDTH = 480;
export const HEIGHT = 854;
export const BOMB_RADIUS = 188;
export const WAVE_DURATION = 100;
export const STAGES = [
  { name: 'VERDANT VEIL', subtitle: 'Outer colonies', boss: 'THE HARVESTER', color: 0x78edce },
  { name: 'FROSTLINE', subtitle: 'Asteroid frontier', boss: 'FROST REAVER', color: 0x6ecfff },
  { name: 'THE VOID', subtitle: 'Command stronghold', boss: 'VOID SOVEREIGN', color: 0xcf83ff },
];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor(seed = 2086) {
    this.seed = seed;
    this.serial = 0;
    this.mode = 'title';
    this.stage = 0;
    this.score = 0;
    this.kills = 0;
    this.totalTime = 0;
    this.events = [];
    this.player = { x: WIDTH / 2, y: HEIGHT - 170, hp: 6, weapon: 1, invulnerable: 0 };
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.pickups = [];
    this.effects = [];
    this.bombs = 3;
    this.bombWave = null;
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  entity(fields) { return { id: ++this.serial, ...fields }; }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  start() {
    this.seed = 2086;
    this.stage = 0;
    this.score = 0;
    this.kills = 0;
    this.totalTime = 0;
    this.player.hp = 6;
    this.player.weapon = 1;
    this.beginStage();
  }
  beginStage() {
    this.mode = 'playing';
    this.time = 0;
    this.wave = 0;
    this.nextWave = 3;
    this.fireClock = 0;
    this.bossSpawned = false;
    this.warningSent = false;
    this.boss = null;
    this.bombs = 3;
    this.bombCooldown = 0;
    this.bombWave = null;
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.pickups = [];
    this.effects = [];
    this.player.x = WIDTH / 2;
    this.player.y = HEIGHT - 170;
    this.player.invulnerable = 3;
    this.checkpoint = { score: this.score, kills: this.kills, weapon: this.player.weapon, totalTime: this.totalTime };
    this.emit('stage', { stage: this.stage });
  }
  retry() {
    Object.assign(this, { score: this.checkpoint.score, kills: this.checkpoint.kills, totalTime: this.checkpoint.totalTime });
    this.player.hp = 6;
    this.player.weapon = this.checkpoint.weapon;
    this.beginStage();
  }
  nextStage() {
    if (this.mode !== 'stageClear') return;
    this.stage++;
    this.player.hp = Math.min(6, this.player.hp + 2);
    this.beginStage();
  }
  pause() { if (this.mode === 'playing') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'playing'; }
  bomb() {
    if (this.mode !== 'playing' || this.bombs <= 0 || this.bombCooldown > 0) return false;
    this.bombs--;
    this.bombCooldown = .7;
    this.bombWave = { x: this.player.x, y: this.player.y, age: 0, radius: BOMB_RADIUS };
    // Resolve once at activation: enemies outside the displayed radius survive.
    for (const enemy of this.enemies) {
      if (enemy.hp > 0 && enemy.y >= 0 && distance(enemy, this.player) <= BOMB_RADIUS) this.kill(enemy);
    }
    this.bullets = this.bullets.filter(b => distance(b, this.player) > BOMB_RADIUS);
    this.player.invulnerable = Math.max(this.player.invulnerable, .8);
    this.emit('bomb');
    return true;
  }
  explosion(x, y, size = 50, kind = 'explosion') {
    this.effects.push(this.entity({ x, y, size, kind, age: 0, life: kind === 'spark' ? .18 : .5 }));
  }
  kill(enemy) {
    if (enemy.hp <= 0) return;
    enemy.hp = 0;
    this.kills++;
    this.score += enemy.boss ? 5000 * (this.stage + 1) : (enemy.type + 1) * 100;
    this.explosion(enemy.x, enemy.y, enemy.boss ? 240 : 70);
    this.emit('kill', { boss: !!enemy.boss });
    if (!enemy.boss && this.kills % 7 === 0) {
      const kind = this.kills % 14 === 0 ? 'health' : 'power';
      this.pickups.push(this.entity({ x: enemy.x, y: enemy.y, kind, age: 0 }));
    }
  }
  damage() {
    if (this.player.invulnerable > 0 || this.mode !== 'playing') return;
    this.player.hp--;
    this.player.invulnerable = 1.65;
    this.explosion(this.player.x, this.player.y, 65, 'spark');
    this.emit('damage');
    if (this.player.hp <= 0) {
      this.explosion(this.player.x, this.player.y, 130);
      this.mode = 'gameOver';
      this.emit('gameOver');
    }
  }
  spawnWave() {
    const type = this.wave % 4;
    const count = type === 3 ? 3 : 4 + this.stage;
    const left = this.wave % 2 === 0;
    for (let i = 0; i < count; i++) {
      const x = type === 0 ? 65 + (350 / Math.max(1, count - 1)) * i : left ? 70 + i * 43 : 410 - i * 43;
      this.enemies.push(this.entity({
        x, y: -45 - i * (type === 0 ? 28 : 67), home: x, type,
        hp: type === 3 ? 5 + this.stage : 2 + (type === 2 ? 1 : 0),
        age: 0, speed: 68 + this.stage * 11 + (type === 1 ? 24 : 0),
        fire: 1.6 + i * .23, radius: type === 3 ? 21 : 16,
        phase: i * .55, direction: left ? 1 : -1,
      }));
    }
    this.wave++;
    this.nextWave += 4.2 - this.stage * .35;
  }
  spawnBoss() {
    this.bossSpawned = true;
    const hp = 140 + this.stage * 60;
    this.boss = this.entity({ x: WIDTH / 2, y: -140, hp, maxHp: hp, age: 0, fire: 2.6, volley: 0, radius: 62, boss: true, type: this.stage % 2 });
    this.enemies.push(this.boss);
    this.emit('boss');
  }
  shootEnemy(enemy) {
    const aim = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    if (enemy.boss) {
      const enraged = enemy.hp < enemy.maxHp * .45;
      const n = 7 + this.stage * 2;
      const sweep = enemy.volley % 3;
      for (let i = 0; i < n; i++) {
        const a = sweep === 0 ? aim + (i - (n - 1) / 2) * .13 : .22 + i / (n - 1) * (Math.PI - .44) + Math.sin(enemy.age) * .12;
        this.enemyBullet(enemy.x, enemy.y + 58, a, 120 + this.stage * 17 + (enraged ? 20 : 0), 'orb');
      }
      if (this.stage > 0 && sweep === 2) {
        for (const side of [-1, 1]) this.enemyBullet(enemy.x + side * 57, enemy.y + 35, aim, 200, 'enemyShot');
      }
      enemy.volley++;
      enemy.fire = enraged ? .92 : 1.3;
    } else {
      const count = enemy.type === 3 ? 3 : 1;
      for (let i = 0; i < count; i++) this.enemyBullet(enemy.x, enemy.y + 20, aim + (i - (count - 1) / 2) * .21, 135 + this.stage * 22, enemy.type === 2 ? 'orb' : 'enemyShot');
      enemy.fire = 2.35 - this.stage * .2;
    }
  }
  enemyBullet(x, y, angle, speed, kind) {
    this.bullets.push(this.entity({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: kind === 'orb' ? 6 : 4, kind }));
  }
  update(dt, input = { x: 0, y: 0 }) {
    if (this.mode !== 'playing') return;
    this.time += dt;
    this.totalTime += dt;
    this.bombCooldown -= dt;
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    const length = Math.max(1, Math.hypot(input.x, input.y));
    p.x = clamp(p.x + input.x / length * 255 * dt, 25, WIDTH - 25);
    p.y = clamp(p.y + input.y / length * 255 * dt, 153, HEIGHT - 87);
    this.fireClock -= dt;
    if (this.fireClock <= 0) {
      this.fireClock += .135;
      for (let i = 0; i < p.weapon; i++) {
        const offset = (i - (p.weapon - 1) / 2);
        this.shots.push(this.entity({ x: p.x + offset * 16, y: p.y - 31, vx: offset * (p.weapon === 3 ? 28 : 0), vy: -660 }));
      }
      this.emit('shot');
    }
    if (this.time < WAVE_DURATION && this.time >= this.nextWave) this.spawnWave();
    if (!this.warningSent && this.time >= WAVE_DURATION - 4) { this.warningSent = true; this.emit('warning'); }
    if (!this.bossSpawned && this.time >= WAVE_DURATION) this.spawnBoss();
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.age += dt;
      if (enemy.boss) {
        enemy.y = Math.min(231, enemy.y + 62 * dt);
        if (enemy.y >= 231) enemy.x = WIDTH / 2 + Math.sin((enemy.age - 6) * .68) * 128;
      } else {
        enemy.y += enemy.speed * dt;
        enemy.x = clamp(enemy.home + Math.sin(enemy.age * (enemy.type === 1 ? 1.8 : 1) + enemy.phase) * (enemy.type === 1 ? 65 : 28) * enemy.direction, 27, WIDTH - 27);
      }
      enemy.fire -= dt;
      if (enemy.fire <= 0 && enemy.y > 145 && enemy.y < HEIGHT - 150) this.shootEnemy(enemy);
      if (distance(enemy, p) < enemy.radius + 9) this.damage();
    }
    for (const shot of this.shots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || enemy.y < 115) continue;
        if (Math.abs(shot.x - enemy.x) < enemy.radius + 4 && Math.abs(shot.y - enemy.y) < enemy.radius + 12) {
          enemy.hp--;
          this.explosion(shot.x, shot.y, 24, 'spark');
          shot.dead = true;
          if (enemy.hp <= 0) { enemy.hp = 1; this.kill(enemy); }
          break;
        }
      }
    }
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (distance(bullet, p) < bullet.radius + 7) { this.damage(); bullet.dead = true; }
    }
    for (const item of this.pickups) {
      item.age += dt;
      item.y += 73 * dt;
      if (distance(item, p) < 100) {
        const angle = Math.atan2(p.y - item.y, p.x - item.x);
        item.x += Math.cos(angle) * 175 * dt;
        item.y += Math.sin(angle) * 175 * dt;
      }
      if (distance(item, p) < 29) {
        item.dead = true;
        if (item.kind === 'health') p.hp = Math.min(6, p.hp + 2);
        else p.weapon = Math.min(3, p.weapon + 1);
        this.score += 250;
        this.emit('pickup', { kind: item.kind });
      }
    }
    for (const fx of this.effects) fx.age += dt;
    if (this.bombWave) { this.bombWave.age += dt; if (this.bombWave.age > .7) this.bombWave = null; }
    this.enemies = this.enemies.filter(e => e.hp > 0 && e.y < HEIGHT + 80);
    this.shots = this.shots.filter(b => !b.dead && b.y > -40);
    this.bullets = this.bullets.filter(b => !b.dead && b.y < HEIGHT + 30 && b.y > -40 && b.x > -30 && b.x < WIDTH + 30);
    this.pickups = this.pickups.filter(i => !i.dead && i.y < HEIGHT + 30);
    this.effects = this.effects.filter(f => f.age < f.life);
    if (this.mode === 'playing' && this.bossSpawned && this.boss.hp <= 0) {
      this.score += this.player.hp * 500 + this.bombs * 300;
      this.bullets = [];
      this.mode = this.stage === 2 ? 'victory' : 'stageClear';
      this.emit(this.mode);
    }
  }
}
