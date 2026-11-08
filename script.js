/* ============ العداد + الانتقال إلى الوردة ============ */
// للتجربة: افتح الصفحة بـ ?in=15 ليبدأ العد من 15 ثانية فقط
const testSec = parseFloat(new URLSearchParams(location.search).get("in"));

// ╚══════════════════════════════════════════════════════════════════╝
const target = isNaN(testSec)
  ? new Date(2026, 10, 8, 17, 55, 0, 0)  
  : new Date(Date.now() + testSec * 1000);

const pad = n => String(n).padStart(2, "0");
const typed = document.getElementById("typed");
const messages = [
  "> INITIALISING BIRTHDAY PROTOCOL...",
  "> TARGET: BIRTHDAY GIRL",
  "> LOCATION: LIVERPOOL, UK",
  "> SNIPER: SHAYMA#XOXO",
  "> SURPRISE: IN PROGRESS..."
];
let bloomTriggered = false;  
let messageIndex = 0, charIndex = 0;
function typeNext() {
  if (bloomTriggered || messageIndex >= messages.length) return;
  const line = document.createElement("div");
  line.className = "line";
  typed.appendChild(line);
  const current = messages[messageIndex];
  const timer = setInterval(() => {
    if (bloomTriggered) { clearInterval(timer); return; }  
    line.textContent = current.slice(0, ++charIndex);
    if (charIndex >= current.length) {
      clearInterval(timer);
      messageIndex++; charIndex = 0;
      setTimeout(typeNext, 420);
    }
  }, 45);
}
typeNext();

// الانتقال: لحظة وصول الوقت يبدأ الصندوق بالاختفاء فوراً وبدون أي تغيير داخله، وتنبت الوردة
const HOLD_COMPLETE_MS = 0;      // تأخير قبل بدء الاختفاء بالميلي ثانية (0 = فوراً)
const FADE_OUT_MS = 900;         // مدة اختفاء الصندوق (يجب أن تطابق transition في style.css)
function triggerBloom() {
  if (bloomTriggered) return;
  bloomTriggered = true;
  setTimeout(() => {
    const sc = document.querySelector(".screen");
    document.body.classList.add("bloom");
    sc.classList.add("leaving");
    if (window.Lily) window.Lily.showMap();
    setTimeout(() => { sc.style.display = "none"; }, FADE_OUT_MS);
  }, HOLD_COMPLETE_MS);
}

function update() {
  if (bloomTriggered) return;   // بعد وصول الوقت لا يتغير أي شيء داخل الصندوق
  const now = new Date();
  document.getElementById("clock").textContent =
    `LOCAL TIME ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const remaining = target - now;
  if (remaining <= 0) {
    // يبقى العداد على أصفار ويبدأ الصندوق بالاختفاء كما هو
    document.getElementById("days").textContent = "000";
    document.getElementById("hours").textContent = "00";
    document.getElementById("minutes").textContent = "00";
    document.getElementById("seconds").textContent = "00";
    triggerBloom();
    return;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.getElementById("days").textContent = String(days).padStart(3,"0");
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
  document.getElementById("seconds").textContent = pad(seconds);
}
update();
setInterval(update, 250);


/* ============ الخلفية + الوردة (Canvas) ============ */
(function () {
  "use strict";

  /* ================= الإعدادات ================= */
  var T_STEM = 4.0;                 // مدة نمو الساق
  var T_B0 = 5.0, T_B1 = 15.0;      // بداية ونهاية تفتّح الزهرة
  var START_T = -0.5;               // زمن الوردة قبل البدء (سالب = تأخير قبل ظهور التربة والساق)
  var LOOP_AT = 0;                  // 0 = بدون تكرار
  var MAX_DIM = 1280;               // أقصى دقة داخلية (قلّلها لو أردت أداءً أخف)
  var TAP_TO_RESTART = false;       // نقرتان سريعتان = إعادة التشغيل (بعد ظهور الوردة)
  var BG = [4, 2, 10];
  var GREETING = "Happy Birthday!"; // نص التهنئة (يظهر مقوّساً فوق الوردة)
  var T_TEXT = T_B1 - 7;          // وقت بدء ظهور النص (بعد اكتمال التفتّح)
  var TEXT_FONT = '"Snell Roundhand","Brush Script MT",cursive';
  var MAP_HEART_DELAY = 2.6;        // ثواني بعد ظهور الخريطة قبل أن ينطلق القلب
  var MAP_TRAVEL = 4.8;             // مدة سفر القلب من مانشستر إلى ليفربول
  var MAP_OUT = 0.9;                // مدة اختفاء الخريطة بعد الضغط

  /* ================= أدوات ================= */
  var canvas = document.getElementById('lily');
  var ctx = canvas.getContext('2d', { alpha: false });

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(11);
  function normal() {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function uniform(a, b) { return a + (b - a) * rand(); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function interp1(x, xs, ys) {
    var n = xs.length;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    var i = 1;
    while (x > xs[i]) i++;
    var t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
  }

  var K = 40;
  var RIB_R = new Float64Array(K + 1), RIB_H = new Float64Array(K + 1);
  function midrib(L, a0, curl) {
    var ds = L / K, r = 0, h = 0;
    RIB_R[0] = 0; RIB_H[0] = 0;
    for (var j = 1; j <= K; j++) {
      var us = j / K;
      var al = a0 + curl * Math.pow(us, 1.6);
      r += Math.sin(al) * ds;
      h += Math.cos(al) * ds;
      RIB_R[j] = r; RIB_H[j] = h;
    }
  }
  function interpU(u, arr) {
    var f = u * K, i = f | 0;
    if (i >= K) return arr[K];
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  }

  var W = 0, H = 0, S = 1, gx = 0, gy = 0, HS = 0;
  var img, img32, imgBytes;
  var smallCanvas = document.createElement('canvas');
  var sctx = smallCanvas.getContext('2d');
  var simg, SW = 0, SH = 0;

  var petals, leaves, stam;
  var NP = 2300, NS = 3200, NG = 5000, ND = 500, NF = 140, NRING = 1100;
  var st_s, st_dx, st_col;
  var so_dx, so_y, so_col;
  var d_x, d_y, d_sp, d_ph, d_f;
  var ang_ring, ang_c;
  var f_off, f_ph, f_dr, f_sp;

  var MAXP = 48000;
  var PX = new Float32Array(MAXP), PY = new Float32Array(MAXP), PZ = new Float32Array(MAXP);
  var CR = new Float32Array(MAXP), CG = new Float32Array(MAXP), CB = new Float32Array(MAXP);
  var order = new Int32Array(MAXP);
  var NBIN = 1700, ZOFF = 1100;
  var counts = new Int32Array(NBIN + 1);
  var binOf = new Int32Array(MAXP);
  var n = 0;

  function build() {
    rand = mulberry32(11);
    S = Math.min(W / 720, H / 1280);
    gx = W / 2; gy = H * 0.82; HS = 380 * S;
    var i, k;

    petals = [];
    var stops = [0, 0.35, 0.7, 1];
    var cR = [205, 255, 255, 255], cG = [40, 95, 150, 195], cB = [125, 165, 205, 228];
    for (k = 0; k < 6; k++) {
      var outer = (k % 2 === 0);
      var pu = new Float32Array(NP), pv = new Float32Array(NP), prof = new Float32Array(NP);
      var base = new Float32Array(NP * 3);
      for (i = 0; i < NP; i++) pu[i] = Math.pow(rand(), 0.85);
      for (i = 0; i < NP; i++) pv[i] = uniform(-1, 1);
      for (i = 0; i < NP; i++) {
        prof[i] = Math.pow(Math.sin(Math.PI * Math.pow(pu[i], 0.7)), 0.9);
        var r = interp1(pu[i], stops, cR), g = interp1(pu[i], stops, cG), b = interp1(pu[i], stops, cB);
        var av = Math.abs(pv[i]);
        var mid = (av < 0.07) && (pu[i] < 0.55);
        if (mid) { r = 235; g = 225; b = 150; }
        var spot = (rand() < 0.10) && (pu[i] < 0.6) && (av < 0.75) && !mid;
        if (spot) { r = 140; g = 15; b = 80; }
        if (av > 0.88) { r *= 1.08; g *= 1.08; b *= 1.08; }
        var f = 0.82 + 0.35 * rand();
        base[i * 3] = r * f; base[i * 3 + 1] = g * f; base[i * 3 + 2] = b * f;
      }
      petals.push({
        phi: (k * 60 + 8) * Math.PI / 180,
        L: (outer ? 300 : 280) * S,
        Wm: (outer ? 64 : 72) * S,
        ac: outer ? 0.10 : 0.05,
        ao: outer ? 1.05 : 0.82,
        curl: outer ? 0.95 : 0.75,
        pu: pu, pv: pv, prof: prof, base: base
      });
    }

    st_s = new Float32Array(NS); st_dx = new Float32Array(NS); st_col = new Float32Array(NS * 3);
    for (i = 0; i < NS; i++) st_s[i] = rand();
    for (i = 0; i < NS; i++) {
      st_dx[i] = normal() * (3.2 * S) * (1 - 0.5 * st_s[i]);
      var s = st_s[i], f2 = 0.8 + 0.4 * rand();
      st_col[i * 3] = lerp(40, 120, s) * f2;
      st_col[i * 3 + 1] = lerp(150, 215, s) * f2;
      st_col[i * 3 + 2] = lerp(95, 120, s) * f2;
    }

    // الأوراق
    leaves = [];
    var defs = [[0.10, 190, 1], [0.24, 175, -1], [0.40, 150, 1], [0.56, 120, -1]];
    for (var li = 0; li < defs.length; li++) {
      var nn = 900;
      var u = new Float32Array(nn), v = new Float32Array(nn), pr = new Float32Array(nn), col = new Float32Array(nn * 3);
      for (i = 0; i < nn; i++) u[i] = Math.pow(rand(), 0.9);
      for (i = 0; i < nn; i++) v[i] = uniform(-1, 1);
      for (i = 0; i < nn; i++) {
        pr[i] = Math.pow(Math.sin(Math.PI * Math.pow(u[i], 0.8)), 0.8);
        var r2 = lerp(40, 140, u[i]), g2 = lerp(160, 235, u[i]), b2 = lerp(100, 140, u[i]);
        if (Math.abs(v[i]) < 0.08) { r2 = 190; g2 = 240; b2 = 170; }
        var f3 = 0.8 + 0.4 * rand();
        col[i * 3] = r2 * f3; col[i * 3 + 1] = g2 * f3; col[i * 3 + 2] = b2 * f3;
      }
      leaves.push({ s0: defs[li][0], L: defs[li][1] * S, side: defs[li][2], u: u, v: v, prof: pr, col: col, n: nn });
    }

    // التربة
    so_dx = new Float32Array(NG); so_y = new Float32Array(NG); so_col = new Float32Array(NG * 3);
    for (i = 0; i < NG; i++) {
      so_dx[i] = uniform(-340, 340) * S;
      var q = so_dx[i] / (340 * S);
      var mound = (1 - q * q) * 55 * S;
      so_y[i] = gy - mound * Math.pow(rand(), 0.5) + normal() * 1.5;
      so_col[i * 3] = lerp(70, 140, rand());
      so_col[i * 3 + 1] = lerp(55, 100, rand());
      so_col[i * 3 + 2] = lerp(80, 120, rand());
    }

    // الغبار
    d_x = new Float32Array(ND); d_y = new Float32Array(ND);
    d_sp = new Float32Array(ND); d_ph = new Float32Array(ND); d_f = new Float32Array(ND);
    for (i = 0; i < ND; i++) {
      d_x[i] = rand() * W; d_y[i] = rand() * H;
      d_sp[i] = uniform(6, 22) * S; d_ph[i] = rand() * 6.28; d_f[i] = uniform(1, 4);
    }

    // الهالة
    ang_ring = new Float32Array(NRING);
    for (i = 0; i < NRING; i++) ang_ring[i] = rand() * 6.28;
    ang_c = [];
    for (k = 0; k < 6; k++) {
      var arr = new Float32Array(260);
      for (i = 0; i < 260; i++) arr[i] = rand() * 6.28;
      ang_c.push(arr);
    }

    // اليراعات
    f_off = new Float32Array(NF); f_ph = new Float32Array(NF);
    f_dr = new Float32Array(NF); f_sp = new Float32Array(NF);
    for (i = 0; i < NF; i++) f_off[i] = rand();
    for (i = 0; i < NF; i++) f_ph[i] = rand() * 6.28;
    for (i = 0; i < NF; i++) f_dr[i] = uniform(-80, 80) * S;
    for (i = 0; i < NF; i++) f_sp[i] = uniform(0.05, 0.12);

    // الأسدية
    stam = [];
    for (k = 0; k < 6; k++) {
      var an = new Float32Array(35 * 2);
      for (i = 0; i < 70; i++) an[i] = normal();
      stam.push({ phi: (k * 60 + 38) * Math.PI / 180, an: an });
    }

    buildText();
    buildMap();
  }

  /* نص التهنئة: يُحوَّل إلى نقاط موزّعة على نصف دائرة فوق الزهرة */
  var tx_, ty_, tl_, tph_, tr_, tg_, tb_;
  function buildText() {
    var fs = Math.max(20, Math.round(84 * S));
    var R = 200 * S, A = 2.9;                 // نصف القطر وزاوية القوس (راديان)
    var chars = GREETING.split('');
    var cwid = Math.ceil(fs * 1.6), chei = Math.ceil(fs * 1.6);
    var mc = document.createElement('canvas');
    mc.width = cwid; mc.height = chei;
    var mx = mc.getContext('2d');
    var font = 'bold ' + fs + 'px ' + TEXT_FONT;
    mx.font = font;

    var widths = [], total = 0, i;
    for (i = 0; i < chars.length; i++) {
      var w = mx.measureText(chars[i]).width;
      widths.push(w); total += w;
    }
    var gaps = Math.max(1, chars.length - 1);
    var extra = Math.max(0, (A * R - total) / gaps);
    var totalLen = total + extra * (chars.length - 1);

    var xs = [], ys = [], ls = [], ph = [], cr = [], cg = [], cb = [];
    var cum = 0, nch = chars.length;
    for (i = 0; i < nch; i++) {
      if (chars[i] !== ' ') {
        mx.clearRect(0, 0, cwid, chei);
        mx.font = font; mx.textAlign = 'center';
        mx.textBaseline = 'alphabetic'; mx.fillStyle = '#fff';
        mx.fillText(chars[i], cwid / 2, chei * 0.72);
        var data = mx.getImageData(0, 0, cwid, chei).data;
        var a = (cum + widths[i] / 2 - totalLen / 2) / R;
        var ca = Math.cos(a), sa = Math.sin(a);
        var ax = R * Math.sin(a), ay = -R * Math.cos(a);
        var mixc = i / Math.max(1, nch - 1);
        for (var y = 0; y < chei; y++) {
          for (var x = 0; x < cwid; x++) {
            if (data[(y * cwid + x) * 4 + 3] > 128 && rand() < 0.38) {
              var lx = x - cwid / 2 + (rand() - 0.5) * 0.8;
              var ly = y - chei * 0.72 + (rand() - 0.5) * 0.8;
              var f = 0.85 + 0.3 * rand();
              xs.push(ax + lx * ca - ly * sa);
              ys.push(ay + lx * sa + ly * ca);
              ls.push(i);
              ph.push(rand() * 6.28);
              cr.push(255 * f);
              cg.push(lerp(225, 160, mixc) * f);
              cb.push(lerp(130, 210, mixc) * f);
            }
          }
        }
      }
      cum += widths[i] + extra;
    }
    tx_ = new Float32Array(xs); ty_ = new Float32Array(ys);
    tl_ = new Float32Array(ls); tph_ = new Float32Array(ph);
    tr_ = new Float32Array(cr); tg_ = new Float32Array(cg); tb_ = new Float32Array(cb);
  }

  /* ================= مشهد الخريطة: قلب صغير من مانشستر إلى ليفربول ================= */
    var scene = 'idle', mt = 0, ot = 0;        // idle → map → out → done
  var TAP_AT = MAP_HEART_DELAY + MAP_TRAVEL + 0.6;   // متى تظهر عبارة "اضغطي على القلب"
  var MAN = [53.4808, -2.2426], LIV = [53.4084, -2.9916];   // [خط العرض، خط الطول]
  var pxLat = 1, sm = 1;
  var hh_x, hh_y, hh_f, bs_a, bs_r;
  var Mx = 0, My = 0, Lx = 0, Ly = 0, Cx = 0, Cy = 0, pathLen = 1, bzx = 0, bzy = 0;
  var mapUi = document.getElementById('mapui');
  var lblMan = document.getElementById('lbl-man');
  var lblLiv = document.getElementById('lbl-liv');
  var tapEl = document.getElementById('tapprompt');
    var tp1 = document.getElementById('tp1'), tp2 = document.getElementById('tp2'), cur1 = document.getElementById('cur1'), cur2 = document.getElementById('cur2');
  // رسالة الوصول تُكتب حرفاً حرفاً مثل التيرمنال (غيّر النصوص والسرعة من هنا)
  var TP_LINE1 = '> LOVE: DELIVERED';
  var TP_LINE2 = '[ TAP THE HEART ]';
  var TP_CHAR = 0.045;               // ثواني لكل حرف (نفس سرعة التيرمنال)
  var TP_GAP = 0.42;                 // توقف بين السطرين
  var TP_DONE = TAP_AT + (TP_LINE1.length + TP_LINE2.length) * TP_CHAR + TP_GAP;  // متى تكتمل الكتابة
  var uiClean = false;

  function project(lat, lon) { return [W * (lon + 3.6) / 2.0, H * 0.45 - (lat - 53.45) * pxLat]; }
  function bez(u) {
    var v = 1 - u;
    bzx = v * v * Mx + 2 * v * u * Cx + u * u * Lx;
    bzy = v * v * My + 2 * v * u * Cy + u * u * Ly;
  }

  function buildMap() {
    pxLat = W / (2.0 * Math.cos(53.45 * Math.PI / 180));
    sm = W / 720;
    var i;

    // شكل القلب (نقاط داخل المنحنى الضمني)
    var hx = [], hy = [], hf = [];
    while (hx.length < 420) {
      var qx = rand() * 2.5 - 1.25, qy = rand() * 2.45 - 1.15;
      var qa = qx * qx + qy * qy - 1;
      if (qa * qa * qa - qx * qx * qy * qy * qy <= 0) { hx.push(qx); hy.push(qy); hf.push(0.8 + 0.4 * rand()); }
    }
    hh_x = new Float32Array(hx); hh_y = new Float32Array(hy); hh_f = new Float32Array(hf);
    bs_a = new Float32Array(60); bs_r = new Float32Array(60);
    for (i = 0; i < 60; i++) { bs_a[i] = rand() * 6.28; bs_r[i] = rand(); }

    // المدينتان والمسار (قوس يميل للشمال)
    var m = project(MAN[0], MAN[1]), l = project(LIV[0], LIV[1]);
    Mx = m[0]; My = m[1]; Lx = l[0]; Ly = l[1];
    var dist = Math.hypot(Lx - Mx, Ly - My);
    Cx = (Mx + Lx) / 2; Cy = (My + Ly) / 2 - 0.35 * dist;
    pathLen = 0;
    var px = Mx, py = My;
    for (i = 1; i <= 40; i++) {
      bez(i / 40);
      pathLen += Math.hypot(bzx - px, bzy - py); px = bzx; py = bzy;
    }
    if (lblMan) { lblMan.style.left = (Mx / W * 100) + '%'; lblMan.style.top = (My / H * 100) + '%'; }
    if (lblLiv) { lblLiv.style.left = (Lx / W * 100) + '%'; lblLiv.style.top = (Ly / H * 100) + '%'; }
  }

  function drawMap() {
    var fo = (scene === 'out') ? 1 - smooth(ot / MAP_OUT) : 1;
    if (fo <= 0.01 || !hh_x) return;
    var i, k, f;

    // علامتا المدينتين
    var ma = smooth((mt - 1.0) / 0.8) * fo;
    if (ma > 0.01) {
      var rr = 7 * sm * (1 + 0.12 * Math.sin(clk * 3));
      for (var c = 0; c < 2; c++) {
        var ccx = c ? Lx : Mx, ccy = c ? Ly : My;
        for (i = 0; i < 36; i++) {
          var an = i * Math.PI / 18;
          add(ccx + rr * Math.cos(an), ccy + rr * Math.sin(an), -770, 103 * ma, 255 * ma, 154 * ma);
        }
        add(ccx, ccy, -770, 200 * ma, 255 * ma, 220 * ma);
        add(ccx + 1, ccy, -770, 200 * ma, 255 * ma, 220 * ma);
        add(ccx, ccy + 1, -770, 200 * ma, 255 * ma, 220 * ma);
      }
    }

    // القلب وخط التتبع
    var hAp = smooth((mt - 1.6) / 0.6) * fo;
    if (hAp > 0.01) {
      var prog = smooth((mt - MAP_HEART_DELAY) / MAP_TRAVEL);
      var ntr = Math.min(260, Math.floor(prog * pathLen / 3));
      for (i = 0; i <= ntr; i++) {
        f = ntr ? i / ntr : 0;
        bez(prog * f);
        k = (0.20 + 0.60 * Math.pow(f, 2.2)) * hAp;
        add(bzx + Math.sin(i * 12.9 + clk * 2) * 0.8, bzy + Math.cos(i * 7.3 + clk * 2) * 0.8,
            -780, 255 * k, 125 * k, 170 * k);
      }
      bez(prog);
      var arrived = mt > MAP_HEART_DELAY + MAP_TRAVEL;
      var hx0 = bzx, hy0 = bzy + ((prog > 0 && prog < 1) ? Math.sin(clk * 5) * 2 * sm : 0);
      var beat = Math.pow(Math.max(0, Math.sin(clk * (arrived ? 6 : 7))), 6) * (arrived ? 0.28 : 0.18);
      var hs = 15 * sm * (1 + beat);
      for (i = 0; i < hh_x.length; i++) {
        k = hAp * hh_f[i];
        add(hx0 + hh_x[i] * hs, hy0 - hh_y[i] * hs, -700,
            255 * k, (50 + 30 * hh_f[i]) * k, (80 + 30 * hh_f[i]) * k);
      }

      // عند الوصول: موجات وشرارات حول ليفربول
      if (arrived) {
        var tau = mt - (MAP_HEART_DELAY + MAP_TRAVEL);
        for (var q = 0; q < 2; q++) {
          var ph = ((tau * 0.5) + q * 0.5) % 1;
          var rad = ph * 90 * sm, ra = (1 - ph) * 0.8 * fo;
          for (i = 0; i < 64; i++) {
            var an2 = i * Math.PI / 32;
            add(Lx + rad * Math.cos(an2), Ly + rad * Math.sin(an2), -760, 255 * ra, 90 * ra, 130 * ra);
          }
        }
        if (tau < 1.4) {
          var ba = (1 - tau / 1.4) * fo;
          for (i = 0; i < 60; i++) {
            var rb = tau * 70 * sm * (0.4 + bs_r[i]);
            add(Lx + rb * Math.cos(bs_a[i]), Ly + rb * Math.sin(bs_a[i]), -750, 255 * ba, 190 * ba, 120 * ba);
          }
        }
      }
    }
  }

  function updateMapUi() {
    if (!mapUi || scene === 'idle') return;
    if (scene === 'done') {
      if (!uiClean) {
        uiClean = true;
        lblMan.style.opacity = 0; lblLiv.style.opacity = 0; tapEl.style.opacity = 0;
      }
      return;
    }
    var fo = (scene === 'out') ? 1 - smooth(ot / MAP_OUT) : 1;
    var la = smooth((mt - 1.0) / 0.8) * fo;
    lblMan.style.opacity = la; lblLiv.style.opacity = la;
        // كتابة الرسالة بحرف حرف
    var tt = mt - TAP_AT;
    if (tt < 0) { tapEl.style.opacity = 0; return; }
    tapEl.style.opacity = fo;
    var n1 = Math.min(TP_LINE1.length, Math.floor(tt / TP_CHAR));
    var n2 = Math.max(0, Math.min(TP_LINE2.length, Math.floor((tt - TP_LINE1.length * TP_CHAR - TP_GAP) / TP_CHAR)));
    var s1 = TP_LINE1.slice(0, n1), s2 = TP_LINE2.slice(0, n2);
    if (tp1.textContent !== s1) tp1.textContent = s1;
    if (tp2.textContent !== s2) tp2.textContent = s2;
    var onLine2 = tt > TP_LINE1.length * TP_CHAR + TP_GAP;     // المؤشر ينتقل للسطر الثاني
    cur1.style.display = onLine2 ? 'none' : 'inline-block';
    cur2.style.display = onLine2 ? 'inline-block' : 'none';
    if (n2 >= TP_LINE2.length) {                       // انتهت الكتابة: السطر الثاني يومض
      if (tp2.className !== 'taphint') tp2.className = 'taphint';
    }
  }

  function showMap() { if (scene === 'idle') { scene = 'map'; mt = 0; } }
  function startBloom() { running = true; }

  // الضغط بعد وصول القلب: تختفي الخريطة وتنبت الوردة
  document.addEventListener('pointerup', function (ev) {
    if (scene !== 'map' || mt <= TP_DONE) return;
    var rc = canvas.getBoundingClientRect();
    var k = W / (rc.width || W);
    var px = (ev.clientX - rc.left) * k, py = (ev.clientY - rc.top) * k;
    var hitR = Math.max(70, 40 * k);          // منطقة الضغط حول القلب (سخيّة للمس)
    if (Math.hypot(px - Lx, py - Ly) <= hitR) { scene = 'out'; ot = 0; startBloom(); }
  });

  function stemX(s, t) {
    var sway = 10 * S * Math.sin(0.9 * t);
    return gx + 30 * S * Math.sin(2.2 * s) + sway * s * s;
  }
  function stemY(s) { return gy - s * HS; }

  function add(x, y, z, r, g, b) {
    if (n >= MAXP) return;
    PX[n] = x; PY[n] = y; PZ[n] = z; CR[n] = r; CG[n] = g; CB[n] = b; n++;
  }

  /* ================= الرسم ================= */
  // t = زمن الوردة، clk = ساعة مستمرة للغبار المتلألئ (لا تُصفَّر عند بدء الوردة)
  function render(t, clk) {
    n = 0;
    var i, k, p;
    var g = smooth(t / T_STEM);
    var e = smooth((t - T_B0) / (T_B1 - T_B0));
    var rev = smooth((t - T_STEM + 0.3) / 1.6);
    var hx = stemX(1.0, t), hy = stemY(1.0);

    // غبار متلألئ (الخلفية)
    for (i = 0; i < ND; i++) {
          var sn = 0.5 + 0.5 * Math.sin(clk * d_f[i] + d_ph[i]);   // لمعان ناعم 0..1
      var tw = 0.25 + 0.75 * sn * sn;
      var yy = (d_y[i] - clk * d_sp[i]) % H; if (yy < 0) yy += H;
      var cr = 255 * tw, cg = 215 * tw, cb = 245 * tw;
      add(d_x[i], yy, -1000, cr, cg, cb);
      if (d_f[i] > 2.2) {                       // النجوم الأكبر: صليب صغير يكبّرها ويزيد توهجها
        var sz = (d_f[i] > 3.3 ? 3 : 2) * S;
        add(d_x[i] + sz, yy, -1000, cr * 0.7, cg * 0.7, cb * 0.7);
        add(d_x[i] - sz, yy, -1000, cr * 0.7, cg * 0.7, cb * 0.7);
        add(d_x[i], yy + sz, -1000, cr * 0.7, cg * 0.7, cb * 0.7);
        add(d_x[i], yy - sz, -1000, cr * 0.7, cg * 0.7, cb * 0.7);
      }
    }

    // الهالة
    var ha = smooth((t - T_B0 + 1.5) / 4.0) * 0.9;
    if (ha > 0.01) {
      var cx0 = hx, cy0 = hy - 90 * S, R = 300 * S, rot = t * 0.12;
      for (i = 0; i < NRING; i++) {
        var a = ang_ring[i] + rot;
        add(cx0 + R * Math.cos(a), cy0 + R * Math.sin(a), -900,
            255 * ha * 0.7, 190 * ha * 0.7, 225 * ha * 0.7);
      }
      for (k = 0; k < 6; k++) {
        var ca = rot * 1.3 + k * Math.PI / 3;
        var ox = cx0 + R * Math.cos(ca), oy = cy0 + R * Math.sin(ca);
        var arrc = ang_c[k];
        for (i = 0; i < 260; i++) {
          var a2 = arrc[i] + rot;
          add(ox + R * 0.5 * Math.cos(a2), oy + R * 0.5 * Math.sin(a2), -900,
              255 * ha * 0.45, 170 * ha * 0.45, 215 * ha * 0.45);
        }
      }
    }

    // التربة (تظهر تدريجياً عند بدء الوردة)
    var ga = smooth((t - START_T) / 2.5);
    if (ga > 0.01) {
      var gk = 0.8 * ga;
      for (i = 0; i < NG; i++) {
        add(so_dx[i] + gx, so_y[i], -500,
            so_col[i * 3] * gk, so_col[i * 3 + 1] * gk, so_col[i * 3 + 2] * gk);
      }
    }

    // الساق
    for (i = 0; i < NS; i++) {
      if (st_s[i] <= g) {
        var s = st_s[i];
        add(stemX(s, t) + st_dx[i], stemY(s), -100,
            st_col[i * 3], st_col[i * 3 + 1], st_col[i * 3 + 2]);
      }
    }

    // الأوراق
    for (var li = 0; li < leaves.length; li++) {
      var lf = leaves[li];
      var lg = clamp((g - lf.s0) * 2.5, 0, 1);
      if (lg <= 0.01) continue;
      midrib(lf.L * lg, 0.85, 1.1);
      var bx = stemX(lf.s0, t), by = stemY(lf.s0);
      var swy = Math.sin(t * 1.2 + lf.s0 * 5) * 0.03;
      for (i = 0; i < lf.n; i++) {
        var u = lf.u[i], v = lf.v[i];
        var rr = interpU(u, RIB_R), hh = interpU(u, RIB_H);
        var wid = 15 * S * lf.prof[i] * lg;
        var x = bx + lf.side * (rr + v * wid * 0.35) + swy * hh * lf.side;
        var y = by - hh + v * wid;
        add(x, y, -90, lf.col[i * 3], lf.col[i * 3 + 1], lf.col[i * 3 + 2]);
      }
    }

    // البتلات + الأسدية
    var cp = 1, sp = 0, ct = 1, st = 0;
    if (rev > 0.01) {
      var psi = 0.25 + t * 0.22, tau = 0.5;
      cp = Math.cos(psi); sp = Math.sin(psi);
      ct = Math.cos(tau); st = Math.sin(tau);
      var sway_t = Math.sin(t * 0.8) * 0.02;

      for (k = 0; k < petals.length; k++) {
        p = petals[k];
        var Ls = p.L * (0.45 + 0.55 * e) * (0.35 + 0.65 * rev);
        var a0 = lerp(p.ac, p.ao, e);
        var curl = (0.12 + 0.88 * e) * p.curl;
        midrib(Ls, a0, curl);
        var ph = p.phi, cph = Math.cos(ph), sph = Math.sin(ph);
        var wmul = p.Wm * (0.55 + 0.45 * e) * (0.35 + 0.65 * rev);
        var tintBase = (1 - e) * 0.6;
        for (i = 0; i < NP; i++) {
          var pu = p.pu[i];
          if (pu > rev) continue;
          var pv = p.pv[i];
          var rr2 = interpU(pu, RIB_R), hh2 = interpU(pu, RIB_H);
          var wid2 = wmul * p.prof[i];
          var X = rr2 * cph - pv * wid2 * sph;
          var Z = rr2 * sph + pv * wid2 * cph;
          var Y = hh2 + (pv * pv) * wid2 * (0.30 * (1 - e) - 0.25 * e);
          var Xp = X * cp + Z * sp;
          var Zp = -X * sp + Z * cp;
          var sy = Y * ct - Zp * st;
          var shade = 0.55 + 0.45 * clamp(Zp / p.L * 0.8 + 0.5, 0, 1);
          var tint = tintBase * clamp(pu * 1.3, 0, 1);
          var r = p.base[i * 3] * (1 - tint) + 135 * tint;
          var gg = p.base[i * 3 + 1] * (1 - tint) + 205 * tint;
          var b = p.base[i * 3 + 2] * (1 - tint) + 125 * tint;
          add(hx + Xp + sway_t * sy, hy - sy, Zp, r * shade, gg * shade, b * shade);
        }
      }

      if (e > 0.28) {
        var sr = smooth((e - 0.28) / 0.4);
        for (k = 0; k < stam.length; k++) {
          var sd = stam[k];
          var Ls2 = 215 * S * (0.4 + 0.6 * e) * sr;
          midrib(Ls2, lerp(0.15, 0.62, e), 0.55 * e);
          var ph2 = sd.phi, c2 = Math.cos(ph2), s2 = Math.sin(ph2);
          for (i = 0; i < 45; i++) {
            var uu = Math.random();
            var r3 = interpU(uu, RIB_R), h3 = interpU(uu, RIB_H);
            var X2 = r3 * c2, Z2 = r3 * s2, Y2 = h3;
            var Xp2 = X2 * cp + Z2 * sp;
            var Zp2 = -X2 * sp + Z2 * cp;
            var sy2 = Y2 * ct - Zp2 * st;
            add(hx + Xp2, hy - sy2, Zp2 + 5, 245, 235, 200);
          }
          var tx = RIB_R[K] * c2, tz = RIB_R[K] * s2, ty = RIB_H[K];
          var txp = tx * cp + tz * sp, tzp = -tx * sp + tz * cp;
          var tsy = ty * ct - tzp * st;
          for (i = 0; i < 35; i++) {
            var ax2 = sd.an[i * 2] * 5 * S, ay2 = sd.an[i * 2 + 1] * 5 * S;
            var f = 0.8 + 0.4 * Math.random();
            add(hx + txp + ax2 * 1.6, hy - tsy + ay2 * 0.7, tzp + 6, 255 * f, 150 * f, 40 * f);
          }
        }
      }
    }

    // يراعات
    if (e > 0.6) {
      var fa = smooth((e - 0.6) / 0.4);
      for (i = 0; i < NF; i++) {
        var q = (t * f_sp[i] + f_off[i]) % 1.0;
        var fx = hx + f_dr[i] * q + Math.sin(q * 7 + f_ph[i]) * 25 * S;
        var fy = (hy - 110 * S) + q * (gy - hy + 90 * S);
        var fade = (1 - q) * fa;
        if (f_ph[i] > 3.1) add(fx, fy, 300, 255 * fade, 190 * fade, 80 * fade);
        else add(fx, fy, 300, 255 * fade, 150 * fade, 205 * fade);
      }
    }

    // رسالة التهنئة: تظهر حرفاً بحرف بعد اكتمال التفتّح
    if (t > T_TEXT && tx_) {
      var tcy = hy - 90 * S;
      for (i = 0; i < tx_.length; i++) {
        var lal = smooth((t - T_TEXT - tl_[i] * 0.22) / 0.9);
        if (lal <= 0.01) continue;
        var tk = lal * (0.85 + 0.15 * Math.sin(t * 3 + tph_[i]));
        var bob = 3 * S * Math.sin(t * 1.5 + tl_[i] * 0.5);
        add(hx + tx_[i], tcy + ty_[i] + bob, 250, tr_[i] * tk, tg_[i] * tk, tb_[i] * tk);
      }
    }

    if (scene === 'map' || scene === 'out') drawMap();

    // فرز حسب العمق (فرز عدّي سريع) ثم الكتابة في الصورة
    var j, c;
    counts.fill(0);
    for (j = 0; j < n; j++) {
      var bn = ((PZ[j] + ZOFF) | 0);
      if (bn < 0) bn = 0; else if (bn >= NBIN) bn = NBIN - 1;
      binOf[j] = bn;
      counts[bn + 1]++;
    }
    for (j = 0; j < NBIN; j++) counts[j + 1] += counts[j];
    for (j = 0; j < n; j++) order[counts[binOf[j]]++] = j;

    var bgc = (255 << 24) | (BG[2] << 16) | (BG[1] << 8) | BG[0];
    img32.fill(bgc);
    var lim = W - 2, limY = H - 2;
    for (j = 0; j < n; j++) {
      var idx = order[j];
      var ix = PX[idx] | 0, iy = PY[idx] | 0;
      if (ix < 0 || ix >= lim || iy < 0 || iy >= limY) continue;
      var rr3 = CR[idx], g3 = CG[idx], b3 = CB[idx];
      rr3 = rr3 < 0 ? 0 : (rr3 > 255 ? 255 : rr3 | 0);
      g3 = g3 < 0 ? 0 : (g3 > 255 ? 255 : g3 | 0);
      b3 = b3 < 0 ? 0 : (b3 > 255 ? 255 : b3 | 0);
      c = (255 << 24) | (b3 << 16) | (g3 << 8) | rr3;
      var o = iy * W + ix;
      img32[o] = c; img32[o + 1] = c; img32[o + W] = c;
    }
  }

  /* التوهّج: تصغير ×10 ثم تكبير بإضافة الألوان */
  function glow() {
    var sd = simg.data, bd = imgBytes;
    for (var by = 0; by < SH; by++) {
      for (var bx = 0; bx < SW; bx++) {
        var sr = 0, sg = 0, sb = 0;
        for (var yy = 0; yy < 10; yy += 2) {
          var row = ((by * 10 + yy) * W + bx * 10) * 4;
          for (var xx = 0; xx < 10; xx += 2) {
            var o = row + xx * 4;
            sr += bd[o]; sg += bd[o + 1]; sb += bd[o + 2];
          }
        }
        var d = (by * SW + bx) * 4;
        sd[d] = sr / 25; sd[d + 1] = sg / 25; sd[d + 2] = sb / 25; sd[d + 3] = 255;
      }
    }
    sctx.putImageData(simg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(smallCanvas, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ================= الحجم ================= */
  function resize() {
    var cw = canvas.clientWidth || window.innerWidth;
    var ch = canvas.clientHeight || window.innerHeight;
    var k = Math.min(1, MAX_DIM / Math.max(cw, ch));
    var nw = Math.max(200, Math.round(cw * k));
    var nh = Math.max(200, Math.round(ch * k));
    if (nw === W && nh === H) return;
    W = nw; H = nh;
    canvas.width = W; canvas.height = H;
    img = ctx.createImageData(W, H);
    img32 = new Uint32Array(img.data.buffer);
    imgBytes = img.data;
    SW = Math.floor(W / 10); SH = Math.floor(H / 10);
    smallCanvas.width = SW; smallCanvas.height = SH;
    simg = sctx.createImageData(SW, SH);
    build();
  }

  /* ================= الحلقة الرئيسية ================= */
  var t = START_T, clk = 0, running = false, paused = false, last = 0, rafId = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    clk += dt;                                   // الخلفية تتحرك دائماً
    if (scene === 'map') mt += dt;
    else if (scene === 'out') { ot += dt; if (ot >= MAP_OUT) scene = 'done'; }
    if (running && !paused) {                    // الوردة تبدأ فقط عند نهاية العد
      t += dt;
      if (LOOP_AT && t > LOOP_AT) t = START_T;
    }
    render(t, clk);
    ctx.putImageData(img, 0, 0);
    glow();
    updateMapUi();
  }

  function start() {
    resize();
    last = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
  document.addEventListener('visibilitychange', function () { last = 0; });

  var lastTap = 0;
  if (TAP_TO_RESTART) {
    canvas.addEventListener('pointerup', function () {
      var now = Date.now();
      if (now - lastTap < 320) { t = START_T; running = true; }
      lastTap = now;
    });
  }

  // واجهة للتحكم: Lily.start() تبدأ نمو الوردة (يستدعيها العداد تلقائياً)
  window.Lily = {
    showMap: showMap,
    start: startBloom,
    restart: function () { t = START_T; running = true; },
    pause: function () { paused = true; },
    resume: function () { paused = false; },
    seek: function (sec) { t = sec; running = true; scene = 'done'; }
  };

  start();
})();
