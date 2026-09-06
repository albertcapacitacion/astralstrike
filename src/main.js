import './style.css';
import { Game, STAGES, WAVE_DURATION } from './game.js';
import { loadAssets } from './assets.js';
import { Renderer } from './renderer.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const game = new Game();
const audio = new AudioEngine();
const keys = new Set();
const joystick = { x: 0, y: 0, pointer: null, cx: 0, cy: 0 };
let assets, renderer, lastMode, bannerTime = 0, menuPage = 'title', installPrompt;
let best = 0;
try { best = Number(localStorage.getItem('astral-strike-best')) || 0; audio.enabled = localStorage.getItem('astral-strike-muted') !== 'true'; } catch { /* Storage is optional. */ }
const formatScore = value => String(Math.floor(value)).padStart(7, '0');
const formatTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
$('record').textContent = formatScore(best);
syncSound();

function syncSound() {
  $('sound').textContent = audio.enabled ? '♪ AUDIO ON' : '♪ AUDIO OFF';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}
function rememberBest() {
  if (game.score <= best) return;
  best = game.score;
  $('record').textContent = formatScore(best);
  try { localStorage.setItem('astral-strike-best', String(best)); } catch { /* A run still works in private/blocked storage. */ }
}
function clearInput() {
  keys.clear(); joystick.x = 0; joystick.y = 0; joystick.pointer = null;
  $('stick').style.transform = '';
  $('joystick').style.opacity = '.7';
}
function action(name) {
  audio.unlock();
  clearInput();
  if (name === 'start') game.start();
  if (name === 'retry') game.retry();
  if (name === 'next') game.nextStage();
  if (name === 'resume') game.resume();
  if (name === 'title') { rememberBest(); game.mode = 'title'; game.stage = 0; game.enemies = []; game.shots = []; game.bullets = []; game.pickups = []; game.effects = []; game.bombWave = null; }
  if (name === 'help') { menuPage = 'help'; renderMenu(); return; }
  menuPage = game.mode === 'title' ? 'title' : game.mode;
  if (game.mode === 'title' && lastMode === 'title') renderMenu();
  syncMode();
}
function button(label, actionName, primary = false, hint = '') {
  return `<button class="${primary ? 'primary-button' : 'secondary-button'}" data-action="${actionName}">${label}${hint ? `<small>${hint}</small>` : ''}</button>`;
}
function renderMenu() {
  let html = '';
  if (game.mode === 'title' && menuPage !== 'help') {
    html = `<p class="title-kicker">VERTICAL ARCADE SHOOTER</p><h1 class="game-title">ASTRAL<span>STRIKE</span></h1><div class="title-underline">THE LAST INTERCEPTOR</div><img class="hero-ship" src="${assets.canvases.player.toDataURL()}" alt="White and cyan interceptor spacecraft"><p class="hero-caption">AS–01 / RAPTOR CLASS</p>${button('LAUNCH MISSION ↗', 'start', true, 'ENTER')}${button('HOW TO PLAY', 'help')}<p class="menu-hint desktop-hint"><b>W A S D</b> to move · <b>I</b> to bomb<br>Weapons fire automatically.</p><p class="menu-hint touch-hint">Drag the left control to fly.<br>Tap <b>BOMB</b> to clear nearby enemies.</p>`;
  } else if (menuPage === 'help') {
    html = `<p class="result-kicker">FLIGHT MANUAL</p><h1 class="result-title">Stay sharp.<br><em>Keep moving.</em></h1><ul class="help-list"><li><b>Fly:</b> WASD on a keyboard. On touch screens, drag anywhere in the lower-left area to place the floating stick.</li><li><b>Fire:</b> automatic. The small light at your ship’s centre is your bullet hitbox.</li><li><b>Bomb:</b> press I or tap BOMB. Three per sector. Destroys enemies—including bosses—inside its ring.</li><li><b>Recover:</b> green + repairs two shields. Arrow pickups upgrade your weapon.</li><li><b>Win:</b> defeat all three sector bosses. If you fall, retry the current sector.</li></ul>${button('READY TO FLY ↗', 'start', true)}${button('BACK TO TITLE', 'title')}`;
  } else if (game.mode === 'paused') {
    html = `<p class="result-kicker">FLIGHT ON HOLD</p><h1 class="result-title">Catch your<br><em>breath.</em></h1><p class="result-copy">${STAGES[game.stage].name}<br>Your interceptor is waiting.</p>${button('RESUME FLIGHT ↗', 'resume', true, 'ESC')}${button('RETURN TO TITLE', 'title')}`;
  } else if (game.mode === 'stageClear') {
    html = `<p class="result-kicker">SECTOR 0${game.stage + 1} SECURED</p><h1 class="result-title">Blockade<br><em>broken.</em></h1><p class="result-copy">${STAGES[game.stage].boss} destroyed.<br>Two shields repaired. Bombs restocked.</p><div class="result-stats"><span>SCORE<strong>${formatScore(game.score)}</strong></span><span>NEXT SECTOR<strong>0${game.stage + 2}</strong></span></div>${button('ENTER ' + STAGES[game.stage + 1].name + ' ↗', 'next', true, 'ENTER')}`;
  } else if (game.mode === 'gameOver') {
    html = `<p class="result-kicker">SIGNAL LOST / SECTOR 0${game.stage + 1}</p><h1 class="result-title">Down.<br><em>Not out.</em></h1><p class="result-copy">Your next run starts here.<br>Retry this sector with full shields and bombs.</p><div class="result-stats"><span>RUN SCORE<strong>${formatScore(game.score)}</strong></span><span>HOSTILES DOWN<strong>${game.kills}</strong></span></div>${button('RETRY SECTOR ↗', 'retry', true, 'ENTER')}${button('RETURN TO TITLE', 'title')}`;
  } else if (game.mode === 'victory') {
    html = `<p class="result-kicker">ALL THREE SECTORS SECURED</p><h1 class="result-title">Welcome<br><em>home, pilot.</em></h1><p class="result-copy">The Void Sovereign has fallen.<br>The colonies are free. Mission complete.</p><div class="result-stats"><span>FINAL SCORE<strong>${formatScore(game.score)}</strong></span><span>HOSTILES DOWN<strong>${game.kills}</strong></span><span>FLIGHT TIME<strong>${formatTime(game.totalTime)}</strong></span><span>PERSONAL BEST<strong>${formatScore(best)}</strong></span></div>${button('FLY AGAIN ↗', 'start', true, 'ENTER')}${button('RETURN TO TITLE', 'title')}`;
  }
  $('menu-content').innerHTML = html;
}
function showBanner(overline, title, sub, seconds, warning = false) {
  $('banner-overline').textContent = overline;
  $('banner-title').textContent = title;
  $('banner-sub').textContent = sub;
  $('banner').classList.toggle('warning', warning);
  bannerTime = seconds;
  $('banner').hidden = false;
}
function syncMode() {
  if (lastMode === game.mode) return;
  const previous = lastMode;
  lastMode = game.mode;
  const menu = game.mode !== 'playing';
  document.querySelector('.cabinet').classList.toggle('menu-open', menu);
  document.querySelector('.cabinet').classList.toggle('title-open', game.mode === 'title');
  document.querySelector('.cabinet').classList.toggle('in-game', game.mode !== 'title');
  $('overlay').hidden = !menu;
  $('hud').hidden = game.mode === 'title';
  $('controls').hidden = menu;
  if (menu) {
    clearInput();
    if (game.mode !== 'paused') { bannerTime = 0; $('banner').hidden = true; }
    rememberBest();
    menuPage = game.mode;
    renderMenu();
    if (previous) $('menu-content').querySelector('button')?.focus({ preventScroll: true });
  } else document.activeElement?.blur();
  document.querySelectorAll('[data-sector]').forEach(el => {
    const n = Number(el.dataset.sector);
    el.classList.toggle('active', n === game.stage);
    el.classList.toggle('complete', n < game.stage || game.mode === 'victory');
  });
}
function updateHUD() {
  $('score').textContent = formatScore(game.score);
  $('timer').textContent = formatTime(game.time || 0);
  $('stage-label').textContent = `SECTOR 0${game.stage + 1} / 03`;
  $('flight-stage').textContent = `0${game.stage + 1} — ${STAGES[game.stage].name}`;
  if ($('shields').dataset.hp !== String(game.player.hp)) {
    $('shields').dataset.hp = String(game.player.hp);
    $('shields').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="shield-cell ${i >= game.player.hp ? 'empty' : ''}"></i>`).join('');
    $('shields').setAttribute('aria-label', `${game.player.hp} of 6 shields`);
  }
  $('weapon').textContent = ['Ⅰ', 'Ⅱ', 'Ⅲ'][game.player.weapon - 1];
  $('bomb-count').textContent = `${matchMedia('(pointer:coarse)').matches ? '' : 'I · '}×0${game.bombs}`;
  $('bomb').disabled = game.bombs === 0 || game.mode !== 'playing';
  $('bomb').setAttribute('aria-label', `Fire bomb (${game.bombs} remaining)`);
  $('boss-hud').hidden = !game.boss || game.boss.hp <= 0;
  if (game.boss) {
    const percentage = Math.max(0, Math.ceil(game.boss.hp / game.boss.maxHp * 100));
    $('boss-name').textContent = STAGES[game.stage].boss;
    $('boss-fill').style.width = percentage + '%';
    $('boss-percent').textContent = percentage + '%';
  }
}

$('menu-content').addEventListener('click', event => { const target = event.target.closest('[data-action]'); if (target) action(target.dataset.action); });
$('sound').addEventListener('click', () => {
  audio.unlock(); audio.toggle(); syncSound();
  try { localStorage.setItem('astral-strike-muted', String(!audio.enabled)); } catch { /* Optional preference. */ }
});
$('pause').addEventListener('click', () => { game.pause(); syncMode(); });
$('bomb').addEventListener('pointerdown', event => { event.preventDefault(); audio.unlock(); game.bomb(); });
$('bomb').addEventListener('click', event => { if (event.detail === 0) game.bomb(); });
window.addEventListener('keydown', event => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyI', 'Escape'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyI') game.bomb();
  if (event.code === 'Escape') { game.mode === 'playing' ? game.pause() : game.resume(); syncMode(); }
  if (event.code === 'Enter' && game.mode !== 'playing' && assets) {
    // Let a focused menu button keep its native keyboard semantics.
    if (document.activeElement?.tagName === 'BUTTON') return;
    action(game.mode === 'paused' ? 'resume' : game.mode === 'stageClear' ? 'next' : game.mode === 'gameOver' ? 'retry' : 'start');
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); game.pause(); if (assets) syncMode(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); game.pause(); if (assets) syncMode(); } });
const zone = $('touch-zone');
zone.addEventListener('pointerdown', event => {
  if (game.mode !== 'playing' || joystick.pointer !== null) return;
  event.preventDefault();
  audio.unlock();
  joystick.pointer = event.pointerId;
  joystick.cx = event.clientX; joystick.cy = event.clientY;
  const rect = zone.getBoundingClientRect();
  $('joystick').style.left = `${event.clientX - rect.left}px`;
  $('joystick').style.top = `${event.clientY - rect.top}px`;
  $('joystick').style.bottom = 'auto';
  $('joystick').style.transform = 'translate(-50%,-50%)';
  $('joystick').style.opacity = '1';
  zone.setPointerCapture(event.pointerId);
});
zone.addEventListener('pointermove', event => {
  if (event.pointerId !== joystick.pointer) return;
  const dx = event.clientX - joystick.cx, dy = event.clientY - joystick.cy;
  const r = Math.hypot(dx, dy), scale = r > 40 ? 40 / r : 1;
  joystick.x = Math.abs(dx) < 3 && r < 5 ? 0 : dx * scale / 40;
  joystick.y = Math.abs(dy) < 3 && r < 5 ? 0 : dy * scale / 40;
  $('stick').style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
});
function releaseStick(event) {
  if (event.pointerId !== joystick.pointer) return;
  clearInput();
}
zone.addEventListener('pointerup', releaseStick);
zone.addEventListener('pointercancel', releaseStick);
zone.addEventListener('lostpointercapture', releaseStick);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
$('install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $('install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; installPrompt = null; });

async function boot() {
  try {
    assets = await loadAssets(name => { $('load-status').textContent = `${name.startsWith('background') ? 'Sector map' : 'Flight assets'} online…`; });
    renderer = new Renderer($('scene'), assets);
    // Reuse a blank panel from the supplied HUD sheet for the live score panel.
    const frame = assets.canvases.hudPanel.toDataURL();
    document.querySelector('.hud-top>div:first-child').style.cssText = `background: url(${frame}) center/100% 100% no-repeat;padding:8px 12px;`;
    $('loading').hidden = true;
    syncMode(); updateHUD();
    let previous = performance.now(), accumulator = 0, visualTime = 0, hudClock = 0;
    function frameLoop(now) {
      const dt = Math.min((now - previous) / 1000, .1);
      previous = now;
      visualTime += dt;
      accumulator += dt;
      const input = { x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + joystick.x, y: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0) + joystick.y };
      while (accumulator >= 1 / 60) { game.update(1 / 60, input); accumulator -= 1 / 60; }
      for (const event of game.events.splice(0)) {
        audio.event(event.type);
        if (event.type === 'stage') showBanner(`SECTOR 0${game.stage + 1} / 03`, STAGES[game.stage].name, 'BREAK THE BLOCKADE', 3);
        if (event.type === 'warning') showBanner('WARNING / HEAVY SIGNATURE', STAGES[game.stage].boss, 'HOSTILE COMMAND SHIP APPROACHING', 4.5, true);
        if (event.type === 'damage') renderer.shake = 4;
        if (event.type === 'bomb') renderer.shake = 7;
        if (event.type === 'kill' && event.boss) renderer.shake = 10;
      }
      if (game.mode === 'playing' && bannerTime > 0) { bannerTime -= dt; if (bannerTime <= 0) $('banner').hidden = true; }
      audio.update(game.mode === 'playing', game.stage);
      syncMode();
      hudClock += dt;
      if (hudClock >= .1) { updateHUD(); hudClock = 0; }
      renderer.render(game, dt, visualTime);
      requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);
    // Development-only readout. Production contains no gameplay cheats or debug controls.
    if (import.meta.env.DEV) window.__arcade = { game, renderer, get input() { return { keys: [...keys], x: joystick.x, y: joystick.y }; }, WAVE_DURATION };
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(error => console.warn('Offline cache unavailable:', error.message));
    }
  } catch (error) {
    $('load-status').textContent = error.message;
    const retry = document.createElement('button');
    retry.className = 'primary-button'; retry.textContent = 'RETRY LOADING';
    retry.onclick = () => location.reload();
    $('loading').append(retry);
    console.error(error);
  }
}
boot();
