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
    { src: './pictures/merge/1.png',  radius: 42 },
    { src: './pictures/merge/2.png',  radius: 40 },
    { src: './pictures/merge/3.png',  radius: 38 },
    { src: './pictures/merge/4.png',  radius: 46 },
    { src: './pictures/merge/5.png',  radius: 56 },
    { src: './pictures/merge/6.png',  radius: 66 },
    { src: './pictures/merge/7.png',  radius: 78 },
    { src: './pictures/merge/8.png',  radius: 90 },
    { src: './pictures/merge/9.png',  radius: 104 },
    { src: './pictures/merge/10.png', radius: 120 },
    { src: './pictures/merge/11.png', radius: 140 },
    { src: './pictures/merge/15.png', radius: 96 },
    { src: './pictures/merge/16.png', radius: 90 },
    { src: './pictures/merge/17.png', radius: 100 },
    { src: './ICONS/icon-02.svg', radius: 30 },
    { src: './ICONS/icon-04.svg', radius: 28 }
  ];
  // ────────────────────────────────────────────────────────────

  var MAX_TIER = TIERS.length - 1;
  var MAX_BODIES = 20;

  // 凸包（Andrew monotone chain），用來把圖片輪廓轉成碰撞多邊形
  function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  function convexHull(points) {
    points = points.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var n = points.length, k = 0, h = [];
    for (var i = 0; i < n; i++) {
      while (k >= 2 && cross(h[k - 2], h[k - 1], points[i]) <= 0) k--;
      h[k++] = points[i];
    }
    for (var i2 = n - 2, tlim = k + 1; i2 >= 0; i2--) {
      while (k >= tlim && cross(h[k - 2], h[k - 1], points[i2]) <= 0) k--;
      h[k++] = points[i2];
    }
    h.length = k - 1;
    return h;
  }

  // 多邊形質心（面積加權），用來補償繪圖對齊
  function polygonCentroid(pts) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      var f = p.x * q.y - q.x * p.y;
      a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-6) return { x: 0, y: 0 };
    return { x: cx / (6 * a), y: cy / (6 * a) };
  }

  // 讀圖片的透明邊緣，算出物件輪廓的凸多邊形（相對中心、縮放到該階級大小）
  function computeHull(img, radius) {
    var N = 40;
    try {
      var oc = document.createElement('canvas');
      oc.width = N; oc.height = N;
      var octx = oc.getContext('2d');
      var iw = img.naturalWidth || N, ih = img.naturalHeight || N;
      var sc = Math.min(N / iw, N / ih); // 與繪製一致：維持原比例 contain
      var dw = iw * sc, dh = ih * sc;
      octx.drawImage(img, (N - dw) / 2, (N - dh) / 2, dw, dh);
      var data = octx.getImageData(0, 0, N, N).data;
      var pts = [];
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          if (data[(y * N + x) * 4 + 3] > 40) pts.push({ x: x, y: y });
        }
      }
      if (pts.length < 3) return null;
      var hull = convexHull(pts);
      if (hull.length < 3) return null;
      var s = (2 * radius) / N;
      var scaled = hull.map(function (p) { return { x: (p.x - N / 2) * s, y: (p.y - N / 2) * s }; });
      return { hull: scaled, offset: polygonCentroid(scaled) };
    } catch (e) {
      return null; // 圖片跨來源無法讀像素時，退回圓形碰撞
    }
  }

  var pendingImages = 0, initialSpawned = false;
  function maybeSpawnInitial() {
    if (!initialSpawned && pendingImages <= 0) {
      initialSpawned = true;
      spawnInitial();
    }
  }

  // 預載每個階級的圖片，並算好碰撞用的多邊形；全部載入後才生成初始物件
  TIERS.forEach(function (t) {
    t.image = null;
    t.loaded = false;
    t.hull = null;
    t.hullOffset = null;
    if (t.src) {
      pendingImages++;
      var img = new Image();
      img.onload = function () {
        var source = img;
        // SVG 只有 viewBox、無像素尺寸，canvas drawImage 會縮放異常；
        // 先光柵化到固定尺寸的離屏 canvas 當繪圖來源
        if (/\.svg(\?|$)/i.test(t.src)) {
          var rc = document.createElement('canvas');
          rc.width = 200; rc.height = 200;
          rc.getContext('2d').drawImage(img, 0, 0, 200, 200);
          t.image = rc;
          source = rc;
        }
        t.loaded = true;
        var res = computeHull(source, t.radius);
        if (res) { t.hull = res.hull; t.hullOffset = res.offset; }
        pendingImages--;
        maybeSpawnInitial();
      };
      img.onerror = function () { pendingImages--; maybeSpawnInitial(); };
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
    var bottomGap = 48; // 物件堆疊時離畫面最底留一點間隙
    walls = [
      Bodies.rectangle(width / 2, (height - bottomGap) + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
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
    var opts = { restitution: 0.2, friction: 0.3, frictionAir: 0.001 };
    var body = null;
    if (t.hull && Bodies.fromVertices) {
      body = Bodies.fromVertices(x, y, [t.hull], opts, true); // 用圖片輪廓多邊形碰撞
      if (body && (!body.vertices || body.vertices.length < 3)) body = null;
    }
    if (!body) body = Bodies.circle(x, y, t.radius, opts); // 退回圓形
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

  // 在指定位置畫出某階級的圖片（完整方形，不做圓形裁切）
  // 多邊形 body 以質心為原點，補償偏移讓圖片對齊
  function drawSprite(tier, alpha) {
    var t = TIERS[tier];
    var d = t.radius * 2;
    var img = t.image;
    var iw = img.naturalWidth || d, ih = img.naturalHeight || d;
    var scale = Math.min(d / iw, d / ih); // 維持原比例，contain 進外框
    var w = iw * scale, h = ih * scale;
    var ox = t.hullOffset ? t.hullOffset.x : 0;
    var oy = t.hullOffset ? t.hullOffset.y : 0;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, -w / 2 - ox, -h / 2 - oy, w, h);
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
  // 初始物件在圖片（含碰撞多邊形）載入完成後由 maybeSpawnInitial() 生成；
  // 保險：即使圖片載入偵測失敗，最多 3 秒後仍生成（會退回圓形碰撞）
  window.setTimeout(function () { pendingImages = 0; maybeSpawnInitial(); }, 3000);

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

  // 捲動時讓物件微微晃動：往捲動的反方向輕推，做出慣性感（僅在遊戲運行時）
  var Body = Matter.Body;
  var lastScrollY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    var delta = y - lastScrollY;
    lastScrollY = y;
    if (!running || !delta) return;
    delta = Math.max(-50, Math.min(50, delta)); // 限制單次擾動幅度
    Composite.allBodies(world).forEach(function (b) {
      if (b.isStatic || b.tier === undefined) return;
      Body.applyForce(b, b.position, {
        x: (Math.random() - 0.5) * 0.00007 * b.mass,
        y: -delta * 0.00015 * b.mass
      });
    });
  }, { passive: true });
});
