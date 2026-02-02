// AK407 Shooter - simple canvas shooting game
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // UI Elements
  const scoreEl = document.getElementById('score');
  const hitsEl = document.getElementById('hits');
  const missesEl = document.getElementById('misses');
  const ammoEl = document.getElementById('ammo');
  const magEl = document.getElementById('mag');
  const reloadBtn = document.getElementById('reloadBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');

  // Game state
  let W = 800, H = 500;
  let running = false;
  let paused = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let spawnInterval = 1500; // ms
  let targets = [];
  let bullets = [];
  let particles = [];

  let score = 0, hits = 0, misses = 0;

  // Gun / ammo
  const MAG_SIZE = 30;
  let ammo = MAG_SIZE;
  let reloading = false;
  const RELOAD_TIME = 1400; // ms

  // Level / difficulty
  let level = 1;
  let timeElapsed = 0;

  // Input
  let pointer = { x: 0, y: 0, down: false };

  // Resize canvas to fit element while supporting devicePixelRatio
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Utility
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }

  // Target constructor
  function spawnTarget() {
    const size = rand(18, 36);
    const x = rand(size, W - size);
    const speed = rand(30 + level*10, 70 + level*20); // px/sec
    const health = Math.ceil(size / 12);
    const color = `hsl(${rand(0, 60)}, 70%, ${rand(40, 55)}%)`; // warm tones
    targets.push({ x, y: -size, r: size, speed, health, color, wobble: rand(0, Math.PI*2) });
  }

  // Bullet constructor
  function fireBullet(fromX, fromY, targetX, targetY) {
    const angle = Math.atan2(targetY - fromY, targetX - fromX);
    const speed = 700; // px/sec
    bullets.push({ x: fromX, y: fromY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1200 });
  }

  // Particle for muzzle/explosion
  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 260);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(400, 900),
        size: rand(1.5, 4.5),
        color
      });
    }
  }

  // Start & restart
  function startGame() {
    running = true;
    paused = false;
    lastTime = performance.now();
    score = 0; hits = 0; misses = 0;
    timeElapsed = 0;
    level = 1;
    spawnInterval = 1500;
    targets = []; bullets = []; particles = [];
    ammo = MAG_SIZE; reloading = false;
    updateUI();
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    overlay.classList.remove('hidden');
    overlayTitle.textContent = 'Game Over';
    overlayDesc.textContent = `Score: ${score} — Hits ${hits}, Misses ${misses}. Click restart to play again.`;
    startBtn.textContent = 'Restart';
  }

  // Pause toggle
  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume (P)' : 'Pause (P)';
    if (!paused) {
      lastTime = performance.now();
      requestAnimationFrame(loop);
    } else {
      // show overlay small
      overlay.classList.remove('hidden');
      overlayTitle.textContent = 'Paused';
      overlayDesc.textContent = 'Press P to resume.';
      startBtn.textContent = 'Resume';
    }
  }

  // Reload
  function reload() {
    if (reloading || ammo === MAG_SIZE) return;
    reloading = true;
    reloadBtn.textContent = 'Reloading...';
    setTimeout(() => {
      ammo = MAG_SIZE;
      reloading = false;
      reloadBtn.textContent = `Reload (R)`;
      updateUI();
    }, RELOAD_TIME);
  }

  // Update UI labels
  function updateUI() {
    scoreEl.textContent = score;
    hitsEl.textContent = hits;
    missesEl.textContent = misses;
    ammoEl.textContent = ammo;
    magEl.textContent = MAG_SIZE;
  }

  // Shooting action
  function shootAt(x, y) {
    if (!running || paused) return;
    if (reloading) return;
    if (ammo <= 0) {
      // play empty click particle
      spawnParticles(W/2, H - 70, 6, 'gray');
      return;
    }
    const gunX = W / 2;
    const gunY = H - 50;

    fireBullet(gunX, gunY, x, y);
    spawnParticles(gunX + (Math.random()*20-10), gunY - 8, 6, 'orange'); // muzzle
    ammo -= 1;
    updateUI();
  }

  // Game loop
  function loop(now) {
    if (!running) return;
    if (paused) return;
    const dt = Math.min(40, now - lastTime);
    lastTime = now;
    const seconds = dt / 1000;
    timeElapsed += dt;

    // increase difficulty slowly
    if (timeElapsed > 15000) {
      level = 2;
      spawnInterval = 1200;
    }
    if (timeElapsed > 45000) {
      level = 3;
      spawnInterval = 900;
    }

    // spawn targets
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnTarget();
    }

    // update targets
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      t.y += t.speed * seconds;
      t.wobble += seconds * 6;
      t.x += Math.sin(t.wobble) * 6 * seconds;
      // if passes bottom => miss
      if (t.y - t.r > H) {
        targets.splice(i, 1);
        misses++;
        score = Math.max(0, score - 5);
        updateUI();
      }
    }

    // update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * seconds;
      b.y += b.vy * seconds;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        bullets.splice(i, 1);
        continue;
      }
      // collision with targets
      for (let j = targets.length - 1; j >= 0; j--) {
        const t = targets[j];
        const d = Math.hypot(b.x - t.x, b.y - t.y);
        if (d < t.r) {
          // hit
          t.health -= 1;
          bullets.splice(i, 1);
          // small explosion
          spawnParticles(b.x, b.y, 12, t.color);
          if (t.health <= 0) {
            // remove target
            targets.splice(j, 1);
            score += Math.round(10 * (1 + level * 0.5) + t.r/5);
            hits++;
            // extra particles
            spawnParticles(t.x, t.y, 18, 'rgba(220,80,40,1)');
          } else {
            score += 2;
            hits++;
          }
          updateUI();
          break;
        }
      }
    }

    // update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * seconds;
      p.y += p.vy * seconds + 40 * seconds; // gravity bias
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // draw
    draw();

    // continue loop
    requestAnimationFrame(loop);
  }

  // Drawing
  function draw() {
    // clear
    ctx.clearRect(0, 0, W, H);

    // background grid / subtle
    ctx.fillStyle = '#f7fff8';
    ctx.fillRect(0, 0, W, H);

    // skyline / decorative
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#eafaf1');
    grad.addColorStop(1, '#f8fff9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // draw targets
    for (const t of targets) {
      // shadow
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.ellipse(t.x + 6, t.y + t.r + 8, t.r * 0.9, t.r * 0.35, 0, 0, Math.PI*2);
      ctx.fill();

      // body
      ctx.beginPath();
      ctx.fillStyle = t.color;
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();

      // inner highlight
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.arc(t.x - t.r*0.2, t.y - t.r*0.3, t.r*0.45, 0, Math.PI*2);
      ctx.fill();

      // health bar
      const bw = t.r * 1.6;
      const bh = 6;
      const pct = Math.max(0, t.health / Math.ceil(t.r / 12));
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(t.x - bw/2, t.y - t.r - 14, bw, bh);
      ctx.fillStyle = `linear-gradient(90deg, #0b723b, #f97316)`;
      ctx.fillStyle = `rgba(11,114,59,${0.9})`;
      ctx.fillRect(t.x - bw/2, t.y - t.r - 14, bw * pct, bh);
    }

    // bullets
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    for (const b of bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.008, b.y - b.vy * 0.008);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 900);
      ctx.fillStyle = colorWithAlpha(p.color || '#f97316', alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // draw gun at bottom center aiming at pointer
    drawGun();
  }

  // returns rgba string with alpha applied (for simple color names like 'orange' it still works)
  function colorWithAlpha(col, a) {
    // if col is rgba/hsla or hex, it's fine to use globalAlpha alternative. For simplicity:
    try {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.restore();
      // fallback simple parsing if color is hex or rgb: return col plus alpha
      if (col.startsWith('#')) {
        // convert hex to rgba
        const hex = col.slice(1);
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r},${g},${b},${a})`;
      }
    } catch (e) {}
    // if not hex, just return with alpha appended where possible
    return col.includes('rgba') ? col : col.replace(')', `,${a})`).replace('rgb(', 'rgba(');
  }

  // Draw a stylized AK407-like gun at bottom center, rotated toward pointer
  function drawGun() {
    const gunX = W / 2;
    const gunY = H - 50;
    // aim angle
    const aimAngle = Math.atan2(pointer.y - gunY, pointer.x - gunX);
    const recoil = ammo < MAG_SIZE ? Math.min(8, (MAG_SIZE - ammo) * 0.12) : 0;

    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(aimAngle);

    // draw barrel
    ctx.fillStyle = '#111';
    ctx.fillRect(8, -6 - recoil*0.4, 120, 12);

    // barrel tip
    ctx.fillStyle = '#222';
    ctx.fillRect(120, -7 - recoil*0.4, 18, 14);

    // receiver
    ctx.fillStyle = '#2b2b2b';
    roundRect(ctx, -36, -18 - recoil*0.6, 90, 36, 8, true, false);

    // magazine
    ctx.fillStyle = '#0b723b';
    ctx.fillRect(-12, 6 - recoil*0.6, 18, 40);

    // stock
    ctx.fillStyle = '#1b1b1b';
    roundRect(ctx, -92, -10 - recoil*0.6, 56, 20, 6, true, false);

    // sights (simple)
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(32, -12 - recoil*0.4, 6, 6);
    ctx.fillRect(12, -14 - recoil*0.4, 4, 10);

    // muzzle flash if recently fired: small random yellow shapes (visual via particles already)
    ctx.restore();

    // draw reticle at pointer
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(11,114,59,0.85)';
    ctx.lineWidth = 2;
    ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pointer.x - 16, pointer.y);
    ctx.lineTo(pointer.x + 16, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 16);
    ctx.lineTo(pointer.x, pointer.y + 16);
    ctx.stroke();
  }

  // rounded rectangle helper
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Input handlers
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0].clientY) - rect.top;
    pointer.x = Math.max(0, Math.min(W, x));
    pointer.y = Math.max(0, Math.min(H, y));
  }

  function onPointerDown(e) {
    pointer.down = true;
    onPointerMove(e);
    // shoot on down
    if (!running) {
      // start game when overlay visible and start pressed
      return;
    }
    if (!paused) {
      shootAction(pointer.x, pointer.y);
    }
  }

  function onPointerUp() {
    pointer.down = false;
  }

  function shootAction(x, y) {
    if (ammo <= 0) {
      // empty click
      spawnParticles(W/2, H - 70, 8, 'gray');
      return;
    }
    shootAt(x, y);
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      reload();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePause();
      if (!paused) overlay.classList.add('hidden');
      else overlay.classList.remove('hidden');
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // space to shoot toward pointer
      e.preventDefault();
      shootAction(pointer.x, pointer.y);
    }
  });

  // UI buttons
  reloadBtn.addEventListener('click', reload);
  pauseBtn.addEventListener('click', () => { togglePause(); if (paused) overlay.classList.remove('hidden'); else overlay.classList.add('hidden'); });
  restartBtn.addEventListener('click', () => { overlay.classList.add('hidden'); startGame(); });
  startBtn.addEventListener('click', () => {
    if (!running) startGame();
    else { // resume if paused
      paused = false;
      overlay.classList.add('hidden');
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  });

  // canvas pointer events
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // update function for ammo UI & other periodic updates
  function updateUI() {
    scoreEl.textContent = score;
    hitsEl.textContent = hits;
    missesEl.textContent = misses;
    ammoEl.textContent = ammo;
    magEl.textContent = MAG_SIZE;
  }

  // initial sizing and UI
  function init() {
    // fit canvas within container
    function fit() {
      const wrap = document.querySelector('.game-wrap');
      const maxW = Math.min(window.innerWidth - 40, 1100);
      const maxH = Math.min(window.innerHeight - 180, 720);
      canvas.style.width = maxW + 'px';
      canvas.style.height = maxH + 'px';
      resize();
    }
    window.addEventListener('resize', fit);
    fit();

    // show start overlay
    overlay.classList.remove('hidden');
    overlayTitle.textContent = 'AK407 Shooter';
    overlayDesc.textContent = 'Aim with mouse/touch and click or press Space to shoot. Reload with R. Pause with P.';
    startBtn.textContent = 'Start Game';

    // basic game loop for passive updates: e.g. reload end, UI, and small timer effects
    setInterval(() => {
      // small auto-update: if pointer.down, rapid-fire mode disabled — single-shot per down only in this demo
      // (optional extension: add fire rate)
      // Simple ammo auto-decrement not implemented; ammo only changes on firing / reloading
      updateUI();
    }, 120);
  }

  // Utility: shootAt wrapper with ammo checks
  function shootAt(x, y) {
    if (!running || paused) return;
    if (reloading) return;
    if (ammo <= 0) {
      spawnParticles(W/2, H - 70, 6, 'gray');
      return;
    }
    const gunX = W / 2;
    const gunY = H - 50;
    fireBullet(gunX, gunY, x, y);
    spawnParticles(gunX + Math.random()*16 - 8, gunY - 8, 8, 'orange');
    ammo--;
    updateUI();
  }

  // Start
  init();
})();