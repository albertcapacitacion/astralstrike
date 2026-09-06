import assert from 'node:assert/strict';
import { Game, BOMB_RADIUS } from '../src/game.js';

function active() { const game = new Game(); game.start(); game.events = []; return game; }

// Bomb boundaries, boss inclusion, stock, and repeat protection.
{
  const g = active();
  g.player.x = 240; g.player.y = 500;
  const inside = g.entity({ x: 240 + BOMB_RADIUS - .1, y: 500, hp: 3, type: 0 });
  const outside = g.entity({ x: 240, y: 500 - BOMB_RADIUS - .1, hp: 3, type: 0 });
  const boss = g.entity({ x: 240, y: 400, hp: 999, boss: true, type: 0 });
  g.enemies = [inside, outside, boss];
  g.bullets = [{ x: 240, y: 500 }, { x: 240, y: 100 }];
  assert.equal(g.bomb(), true);
  assert.equal(inside.hp, 0); assert.equal(boss.hp, 0); assert.equal(outside.hp, 3);
  assert.equal(g.bullets.length, 1); assert.equal(g.bombs, 2);
  assert.equal(g.bomb(), false);
  g.bombCooldown = 0; g.bombs = 0;
  assert.equal(g.bomb(), false);
}

// Pausing freezes the simulation, including bombs. Diagonal movement is normalized.
{
  const g = active();
  g.pause(); const before = JSON.stringify(g);
  g.update(1, { x: 1, y: -1 }); g.bomb();
  assert.equal(JSON.stringify(g), before);
  g.resume(); const x = g.player.x, y = g.player.y;
  g.update(.1, { x: 1, y: -1 });
  assert.ok(Math.abs(Math.hypot(g.player.x - x, g.player.y - y) - 25.5) < .001);
}

// Invulnerability prevents multiple hits in the same frame; retry restores the checkpoint.
{
  const g = active();
  g.player.invulnerable = 0; g.damage(); g.damage();
  assert.equal(g.player.hp, 5);
  for (let i = 0; i < 5; i++) { g.player.invulnerable = 0; g.damage(); }
  assert.equal(g.mode, 'gameOver');
  g.score = 999; g.player.weapon = 3; g.retry();
  assert.equal(g.score, 0); assert.equal(g.player.hp, 6); assert.equal(g.player.weapon, 1); assert.equal(g.mode, 'playing');
}

// Boss defeat routes all three sectors to the final victory state.
{
  const g = active();
  for (let stage = 0; stage < 3; stage++) {
    assert.equal(g.stage, stage);
    g.spawnBoss(); g.boss.y = 300; g.player.y = 400;
    g.bomb(); g.update(1 / 60);
    assert.equal(g.mode, stage === 2 ? 'victory' : 'stageClear');
    if (stage < 2) { g.nextStage(); assert.equal(g.bombs, 3); }
  }
  assert.ok(g.score > 30000);
}

// Pickups apply once, cap health/firepower, and do not accumulate offscreen.
{
  const g = active(); g.player.hp = 5; g.player.weapon = 3;
  g.pickups = [g.entity({ x: g.player.x, y: g.player.y, kind: 'health', age: 0 }), g.entity({ x: g.player.x, y: g.player.y, kind: 'power', age: 0 })];
  g.update(1 / 60);
  assert.equal(g.player.hp, 6); assert.equal(g.player.weapon, 3); assert.equal(g.pickups.length, 0); assert.equal(g.score, 500);
}
console.log('PASS: bomb boundaries and bosses; pause; movement; damage; checkpoints; three-sector progression; pickups.');
