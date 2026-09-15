document.addEventListener('DOMContentLoaded', function () {
  if (typeof Matter === 'undefined') return;

  var canvas = document.getElementById('hero-game');
  var heroSection = document.querySelector('section.main-area');
  if (!canvas || !heroSection) return;

  // ── 遊戲物件設定 ─────────────────────────────────────────────
  // 每個物件對應一張圖片，由小到大排列（radius 越大＝合成後越高階）。
  // 替換物件：把圖片放進資料夾（例如 ./pictures/merge/），再把該階級的
  //   src 填成圖片路徑，例如  src: './pictures/merge/item1.webp'
  // 建議：去背透明底、正方形的 PNG 或 WebP，顯示效果最好。
  // src 留空（'')的階級不會出現在遊戲中；請從最小的階級開始「連續」往下填，
  //   避免中間有空缺（合成到沒有圖的階級時會看不見）。
  var TIERS = [
    { src: './pictures/merge/1.png',  radius: 24 },
    { src: './pictures/merge/2.png',  radius: 30 },
    { src: './pictures/merge/3.png',  radius: 38 },
    { src: './pictures/merge/4.png',  radius: 46 },
    { src: './pictures/merge/5.png',  radius: 56 },
    { src: './pictures/merge/6.png',  radius: 66 },
    { src: './pictures/merge/7.png',  radius: 78 },
    { src: './pictures/merge/8.png',  radius: 90 },
    { src: './pictures/merge/9.png',  radius: 104 },
    { src: './pictures/merge/10.png', radius: 120 },
    { src: './pictures/merge/11.png', radius: 140 }
  ];
  // ────────────────────────────────────────────────────────────

  var MAX_TIER = TIERS.length - 1;
  var MAX_BODIES = 20;

  // 預載每個階級的圖片
  TIERS.forEach(function (t) {
    t.image = null;
    t.loaded = false;
    if (t.src) {
      var img = new Image();
      img.onload = function () { t.loaded = true; };
      img.src = t.src;
      t.image = img;
    }
  });

  // 該階級是否有已載入、可繪製的圖片
  function hasSprite(tier) {
    return tier >= 0 && TIERS[tier] && TIERS[tier].loaded && TIERS[tier].image;
  }

  // 有設定圖片（有 src）的階級索引，由小到大
  function spawnableTiers() {
    var list = [];
    TIERS.forEach(function (t, i) { if (t.src) list.push(i); });
    return list;
  }

  var Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Events = Matter.Events,
      Composite = Matter.Composite;

  var engine = Engine.create();
  var world = engine.world;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var width = 0, height = 0;
  var walls = [];

  function buildWalls() {
    if (walls.length) World.remove(world, walls);
    var thickness = 60;
    walls = [
      Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, { isStatic: true }),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, { isStatic: true })
    ];
    World.add(world, walls);
  }

  function resize() {
    var rect = heroSection.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildWalls();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function pickNextTier() {
    var s = spawnableTiers();
    if (s.length === 0) return -1;         // 尚未設定任何圖片
    if (s.length === 1) return s[0];
    return Math.random() < 0.75 ? s[0] : s[1]; // 75% 最小階、25% 次小階
  }

  var nextTier = pickNextTier();
  var hoverX = 0, hoverY = 0, isHovering = false;

  canvas.addEventListener('mouseenter', function () {
    isHovering = true;
  });

  canvas.addEventListener('mouseleave', function () {
    isHovering = false;
  });

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    hoverX = e.clientX - rect.left;
    hoverY = e.clientY - rect.top;
    isHovering = true;
  });

  function spawnBody(x, y, tier) {
    if (tier < 0 || !TIERS[tier]) return null; // 無效階級（沒有圖片）不生成
    var t = TIERS[tier];
    var body = Bodies.circle(x, y, t.radius, {
      restitution: 0.2,
      friction: 0.3,
      frictionAir: 0.001
    });
    body.tier = tier;
    World.add(world, body);
    return body;
  }

  Events.on(engine, 'collisionStart', function (event) {
    var merged = new Set();
    event.pairs.forEach(function (pair) {
      var a = pair.bodyA, b = pair.bodyB;
      if (a.isStatic || b.isStatic) return;
      if (merged.has(a) || merged.has(b)) return;
      if (a.tier === undefined || b.tier === undefined) return;
      if (a.tier !== b.tier || a.tier >= MAX_TIER) return;

      merged.add(a);
      merged.add(b);

      var midX = (a.position.x + b.position.x) / 2;
      var midY = (a.position.y + b.position.y) / 2;
      World.remove(world, [a, b]);
      spawnBody(midX, midY, a.tier + 1);
    });
  });

  var lastDrop = 0;
  canvas.addEventListener('click', function (e) {
    if (nextTier < 0) return; // 尚未設定任何圖片，暫不生成
    var now = Date.now();
    if (now - lastDrop < 220) return;
    lastDrop = now;

    var bodies = Composite.allBodies(world).filter(function (b) { return !b.isStatic; });
    if (bodies.length >= MAX_BODIES) {
      World.remove(world, bodies[0]);
    }

    var rect = canvas.getBoundingClientRect();
    var x = clamp(e.clientX - rect.left, 20, width - 20);
    var y = clamp(e.clientY - rect.top, 20, height - 20);
    spawnBody(x, y, nextTier);
    nextTier = pickNextTier();
  });

  // 在指定位置畫出某階級的圖片（圓形裁切，符合物理碰撞外觀）
  function drawSprite(tier, alpha) {
    var t = TIERS[tier];
    var d = t.radius * 2;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(t.image, -t.radius, -t.radius, d, d);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    Composite.allBodies(world).forEach(function (body) {
      if (body.isStatic || body.tier === undefined) return;
      if (!hasSprite(body.tier)) return; // 圖片尚未載入／未設定就不畫
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      drawSprite(body.tier);
      ctx.restore();
    });

    if (isHovering && hasSprite(nextTier)) {
      ctx.save();
      ctx.translate(hoverX, hoverY);
      drawSprite(nextTier, 0.45);
      ctx.restore();
    }
  }

  var running = false;
  function tick() {
    if (!running) return;
    Engine.update(engine, 1000 / 60);
    render();
    requestAnimationFrame(tick);
  }
  function startLoop() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }
  function stopLoop() {
    running = false;
  }

  // 初始：每種（有圖片的階級）各一個，隨機水平位置、從畫面上方依序落下
  function spawnInitial() {
    var order = spawnableTiers();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    order.forEach(function (tier, idx) {
      var r = TIERS[tier].radius;
      var x = clamp(Math.random() * width, r, width - r);
      var y = -r - idx * 60; // 從頂端外側錯開高度，製造陸續掉落的重力感
      spawnBody(x, y, tier);
    });
  }

  resize();
  window.addEventListener('resize', resize);
  spawnInitial();

  // 只在 hero 進入畫面時才運算＋繪製，滑到下方時暫停，維持捲動流暢並省效能
  if ('IntersectionObserver' in window) {
    var visObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) startLoop(); else stopLoop();
      });
    }, { threshold: 0 });
    visObserver.observe(canvas);
  } else {
    startLoop();
  }
});
