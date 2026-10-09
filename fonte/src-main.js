
(function(){
  "use strict";

  /* ---------- WhatsApp ---------- */
  var WHATSAPP = "5548992037431";
  var links = document.querySelectorAll("[data-wa]");
  for (var i = 0; i < links.length; i++) {
    var a = links[i], plan = a.getAttribute("data-plan");
    var msg = plan ? "Olá! Quero testar o plano " + plan + " do YAXUM por 30 dias grátis." : "Olá! Quero testar o YAXUM 30 dias grátis na minha assistência.";
    a.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
    a.target = "_blank"; a.rel = "noopener";
  }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function small(){ return innerWidth < 720; }
  /* YX vem do script do topo da página: modo leve (sem 3D) ou completo, e se é celular */
  var YX = window.YX || (window.YX = { leve: false, movel: small() });
  var toque = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  function semTilt(){ return reduce || YX.leve || toque || small(); }

  /* ---------- calculators ---------- */
  function $(id){ return document.getElementById(id); }
  function inteiro(n){ return Math.round(n).toLocaleString("pt-BR"); }
  function reais(n){ return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function calcFunil(){
    var o = +$("cfOrc").value, t = +$("cfTicket").value, r = +$("cfRec").value;
    var n = Math.round(o * r / 100);
    $("cfOrcV").textContent = inteiro(o); $("cfTicketV").textContent = "R$ " + inteiro(t); $("cfRecV").textContent = r + "%";
    $("cfN").textContent = inteiro(n); $("cfR").textContent = "R$ " + inteiro(n * t);
  }
  var precoSup = 99.9;
  function calcSup(){
    var n = +$("csN").value;
    $("csNV").textContent = n; $("csM").textContent = reais(n * precoSup); $("csA").textContent = reais(n * precoSup * 12);
  }
  if ($("cfOrc")) { ["cfOrc", "cfTicket", "cfRec"].forEach(function(id){ $(id).addEventListener("input", calcFunil); }); calcFunil(); }
  if ($("csN")) {
    $("csN").addEventListener("input", calcSup);
    Array.prototype.forEach.call(document.querySelectorAll("#csPlano button"), function(b){
      b.addEventListener("click", function(){
        Array.prototype.forEach.call(document.querySelectorAll("#csPlano button"), function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        precoSup = +b.getAttribute("data-p"); calcSup();
      });
    });
    calcSup();
  }

  /* ---------- live timecode ---------- */
  var t = 12 * 60 + 47, tc = document.getElementById("tc"), tc2 = document.getElementById("tc2");
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function fmt(s){ return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60); }
  if (!reduce) setInterval(function(){ t++; var s = fmt(t); if (tc) tc.textContent = s; if (tc2) tc2.textContent = "Gravando " + s; }, 1000);

  /* ---------- OS code on the hologram ticket ---------- */
  var qc = document.getElementById("qr");
  if (qc && qc.getContext) {
    var x = qc.getContext("2d"), N = 25, seed = 4821;
    var rnd = function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    x.fillStyle = "#00F0FF";
    for (var qi = 0; qi < N; qi++) for (var qj = 0; qj < N; qj++) if (rnd() > .52) x.fillRect(qi, qj, 1, 1);
    var finder = function(fx, fy){
      x.clearRect(fx - 1, fy - 1, 9, 9);
      x.fillStyle = "#00F0FF"; x.fillRect(fx, fy, 7, 7);
      x.clearRect(fx + 1, fy + 1, 5, 5);
      x.fillRect(fx + 2, fy + 2, 3, 3);
    };
    finder(0, 0); finder(18, 0); finder(0, 18);
  }

  /* ---------- glitch headline ---------- */
  var hl = document.getElementById("headline");
  function glitch(){ if (!hl || reduce || YX.leve) return; hl.classList.remove("on"); void hl.offsetWidth; hl.classList.add("on"); }
  setTimeout(glitch, 500); setInterval(glitch, 7000);

  /* ---------- scroll-linked 3D for panels ---------- */
  var items = Array.prototype.map.call(document.querySelectorAll("[data-tilt],[data-par]"), function(el){
    return { el: el, tilt: +el.getAttribute("data-tilt") || 0, spin: +el.getAttribute("data-spin") || 0, par: +el.getAttribute("data-par") || 0, top: 0, h: 0 };
  });
  function measure(){
    if (semTilt()) { apply(); return; }
    items.forEach(function(it){ it.el.style.transform = "none"; });
    var sy = scrollY;
    items.forEach(function(it){ var r = it.el.getBoundingClientRect(); it.top = r.top + sy; it.h = r.height; });
    apply();
  }
  var tiltLimpo = false;
  function apply(){
    if (semTilt()) { if (!tiltLimpo) { items.forEach(function(it){ it.el.style.transform = ""; }); tiltLimpo = true; } return; }
    tiltLimpo = false;
    var vh = innerHeight, mid = scrollY + vh / 2, k = small() ? .5 : 1;
    for (var n = 0; n < items.length; n++) {
      var it = items[n], p = (it.top + it.h / 2 - mid) / vh;
      if (p > 1.3) p = 1.3; else if (p < -1.3) p = -1.3;
      var rx = p * it.tilt * k, ry = p * it.spin * k, ty = -p * it.par * 120 * k, tz = -Math.abs(p) * it.tilt * 9 * k;
      it.el.style.transform = "perspective(1300px) translate3d(0," + ty.toFixed(1) + "px," + tz.toFixed(1) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
    }
  }

  /* ---------- hero stage: mouse + scroll ---------- */
  var stageIn = document.getElementById("stageIn");
  var mx = 0, my = 0, cmx = 0, cmy = 0;
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", function(e){ mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  }
  var stageKey = "";
  function stageFrame(){
    cmx += (mx - cmx) * .07; cmy += (my - cmy) * .07;
    var sp = Math.min(1.4, scrollY / innerHeight);
    var rx = 6 - cmy * 10 + sp * 22, ry = -16 + cmx * 18 - sp * 12;
    var t = "translateY(" + (-sp * 50).toFixed(1) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
    if (stageIn && t !== stageKey) { stageKey = t; stageIn.style.transform = t; }
    return Math.abs(mx - cmx) > .0015 || Math.abs(my - cmy) > .0015;
  }

  /* ---------- 3D repair lab (three.js) ---------- */
  function initSpace(){
    var T = window.THREE, canvas = document.getElementById("space");
    if (!T || !canvas) return null;
    var low = small() || YX.movel;
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !low, powerPreference: "high-performance" }); }
    catch (e) { return null; }
    /* celular desenha o 3D em 1x; computador em até 1,25x. O governador de
       qualidade baixa essa escala se o aparelho não der conta. */
    var escala = 1;
    function baseDpr(){ return Math.min(window.devicePixelRatio || 1, low ? 1 : 1.25); }
    renderer.setPixelRatio(baseDpr() * escala);
    renderer.setSize(innerWidth, innerHeight, false);

    var BG = 0x05060d;
    var scene = new T.Scene();
    scene.background = new T.Color(BG);
    scene.fog = new T.Fog(BG, 420, 2100);
    var camera = new T.PerspectiveCamera(low ? 74 : 58, innerWidth / innerHeight, 4, 3600);

    var seed = 11;
    function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    /* canvas textures */
    var redraws = [];
    function ctex(w, h, draw, repeat, isText){
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var g = c.getContext("2d"); draw(g, w, h);
      var t = new T.CanvasTexture(c);
      if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
      t.anisotropy = 4;
      if (isText) { var fn = function(){ g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; }; t.__redraw = fn; redraws.push(fn); }
      return t;
    }
    function lcd(text, color, bg){
      return ctex(256, 96, function(g, w, h){
        g.fillStyle = bg || "#040507"; g.fillRect(0, 0, w, h);
        g.font = '700 58px "JetBrains Mono", ui-monospace, monospace';
        g.textAlign = "center"; g.textBaseline = "middle";
        g.shadowColor = color; g.shadowBlur = bg ? 0 : 16; g.fillStyle = color;
        g.fillText(text, w / 2, h / 2 + 3);
      }, false, true);
    }
    var matTex = ctex(256, 256, function(g, w, h){
      g.fillStyle = "#1b5264"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(220,240,255,.16)"; g.lineWidth = 1;
      for (var i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, h); g.stroke(); g.beginPath(); g.moveTo(0, i + .5); g.lineTo(w, i + .5); g.stroke(); }
      g.strokeStyle = "rgba(220,240,255,.28)"; g.beginPath(); g.arc(192, 64, 22, 0, Math.PI * 2); g.stroke();
    }, true);
    matTex.repeat.set(7, 2.2);
    var pcbDraw = function(g, w, h){
      g.fillStyle = "#0e5a32"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(226,186,92,.8)"; g.lineWidth = 2.2;
      for (var i = 0; i < 150; i++) {
        var x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y);
        var x2 = x + (rnd() - .5) * 180; g.lineTo(x2, y); g.lineTo(x2, y + (rnd() - .5) * 180); g.stroke();
      }
      for (var k = 0; k < 16; k++) {
        var cx = rnd() * (w - 90), cy = rnd() * (h - 90), cw = 24 + rnd() * 60, ch = 24 + rnd() * 60;
        g.fillStyle = "#111417"; g.fillRect(cx, cy, cw, ch);
        g.fillStyle = "#b9c2c9"; for (var p = 4; p < cw - 3; p += 6) { g.fillRect(cx + p, cy - 3, 2, 3); g.fillRect(cx + p, cy + ch, 2, 3); }
      }
      g.fillStyle = "#d9b25a"; for (var q = 0; q < 90; q++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 2.5, 0, Math.PI * 2); g.fill(); }
    };
    var pcbTex = ctex(512, 512, pcbDraw);
    var zoomTex = ctex(640, 384, function(g, w, h){
      g.save(); g.scale(3, 3); pcbDraw(g, w, h); g.restore();
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 0, w, h);
      // the chip being reworked
      var cx = w * .44, cy = h * .56;
      g.fillStyle = "#15181c"; g.fillRect(cx - 70, cy - 55, 140, 110);
      g.fillStyle = "#c8ced4"; for (var i = -60; i <= 60; i += 12) { g.fillRect(cx + i - 3, cy - 64, 6, 9); g.fillRect(cx + i - 3, cy + 55, 6, 9); }
      g.fillStyle = "#8d949b"; g.font = '600 15px "JetBrains Mono", monospace'; g.fillText("U2 PMIC", cx - 34, cy + 5);
      // shiny solder joints
      for (var k = 0; k < 7; k++) { var gr = g.createRadialGradient(cx + 95, cy - 50 + k * 17, 1, cx + 95, cy - 50 + k * 17, 8); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.4, "#cfd6de"); gr.addColorStop(1, "#6d747c"); g.fillStyle = gr; g.beginPath(); g.arc(cx + 95, cy - 50 + k * 17, 7, 0, Math.PI * 2); g.fill(); }
      // soldering iron tip coming in from the top right, glowing
      var tx = cx + 104, ty = cy - 30;
      var mg = g.createLinearGradient(w, 0, tx, ty); mg.addColorStop(0, "#5b6168"); mg.addColorStop(.6, "#b9c0c8"); mg.addColorStop(1, "#e7ebef");
      g.fillStyle = mg; g.beginPath(); g.moveTo(w + 20, 10); g.lineTo(w - 40, -20); g.lineTo(tx - 4, ty - 6); g.lineTo(tx + 4, ty + 4); g.closePath(); g.fill();
      var gl = g.createRadialGradient(tx, ty, 2, tx, ty, 34); gl.addColorStop(0, "rgba(255,190,90,.95)"); gl.addColorStop(.35, "rgba(255,110,30,.55)"); gl.addColorStop(1, "rgba(255,80,20,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(tx, ty, 34, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(tx - 6, ty - 14); g.bezierCurveTo(tx - 20, ty - 40, tx + 6, ty - 58, tx - 10, ty - 86); g.stroke();
      // crosshair + HUD
      g.strokeStyle = "rgba(0,240,255,.9)"; g.lineWidth = 2; g.strokeRect(cx - 86, cy - 72, 172, 144);
      g.beginPath(); g.moveTo(cx, cy - 90); g.lineTo(cx, cy - 76); g.moveTo(cx, cy + 76); g.lineTo(cx, cy + 90); g.moveTo(cx - 104, cy); g.lineTo(cx - 90, cy); g.moveTo(cx + 90, cy); g.lineTo(cx + 104, cy); g.stroke();
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40);
      g.fillStyle = "#ff2a45"; g.beginPath(); g.arc(20, 20, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff"; g.font = '700 20px "JetBrains Mono", monospace'; g.fillText("MICROSCÓPIO 45x", 36, 27);
      g.fillStyle = "#ffb15c"; g.fillText("350°C", w - 90, 27);
      g.fillStyle = "#7df9ff"; g.font = '600 18px "JetBrains Mono", monospace'; g.fillText("REPARO DE PLACA · ORDEM DE SERVIÇO 4821", 16, h - 14);
    }, false, true);
    var scopeTex = ctex(512, 256, function(g, w, h){
      g.fillStyle = "#03120d"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(0,255,170,.16)"; g.lineWidth = 1;
      for (var i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      for (var j = 0; j <= h; j += 32) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
      g.lineWidth = 3; g.shadowBlur = 10;
      g.strokeStyle = "#00f0ff"; g.shadowColor = "#00f0ff"; g.beginPath();
      for (var x = 0; x <= w; x += 2) { var y = h * .36 + Math.sin(x / w * Math.PI * 8) * 38; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.strokeStyle = "#fcee0a"; g.shadowColor = "#fcee0a"; g.beginPath();
      for (var s = 0; s <= w; s += 2) { var yy = h * .76 + ((Math.floor(s / 32) % 2) ? -22 : 22); s ? g.lineTo(s, yy) : g.moveTo(s, yy); } g.stroke();
    }, true);
    var tcSec = 12 * 60 + 47;
    var liveTex = ctex(512, 288, function(g, w, h){
      g.fillStyle = "#0f3340"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(200,240,255,.12)";
      for (var i = 0; i < w; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      for (var j = 0; j < h; j += 24) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
      g.fillStyle = "#1b2024"; g.fillRect(70, 90, 170, 110); g.fillStyle = "#1f4a32"; g.fillRect(160, 100, 70, 90);
      g.fillStyle = "#2d3439"; g.fillRect(85, 100, 65, 90);
      g.fillStyle = "#d08417"; g.fillRect(240, 128, 36, 10); g.fillRect(240, 146, 36, 14);
      g.fillStyle = "#0a0c0e"; g.fillRect(276, 90, 170, 110);
      g.strokeStyle = "#c6ced2"; g.lineWidth = 5; g.beginPath(); g.moveTo(330, 270); g.lineTo(410, 220); g.stroke();
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(14, 14, 128, 34); g.fillRect(w - 150, 14, 136, 34);
      g.fillStyle = "#ff2a45"; g.beginPath(); g.arc(32, 31, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.font = '700 20px "JetBrains Mono", monospace'; g.fillText("AO VIVO", 48, 38);
      var s = tcSec, tc = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function(n){ return (n < 10 ? "0" : "") + n; }).join(":");
      g.fillText(tc, w - 138, 38);
      g.font = '600 18px "Barlow", sans-serif'; g.fillText("Ordem de Serviço 4821 · Bancada 2", 16, h - 16);
    }, false, true);
    var aulaTex = ctex(512, 288, function(g, w, h){
      g.fillStyle = "#0b1030"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ff2bd6"; g.fillRect(0, 0, w, 44);
      g.fillStyle = "#fff"; g.font = '700 24px "Chakra Petch", "Barlow", sans-serif'; g.fillText("AULA · SUPORTE DIGITAL", 16, 31);
      g.strokeStyle = "#7df9ff"; g.lineWidth = 5; g.strokeRect(40, 66, 104, 196);
      g.fillStyle = "rgba(0,240,255,.35)"; g.fillRect(54, 90, 60, 18); g.fillRect(70, 118, 60, 18);
      g.fillStyle = "rgba(255,43,214,.45)"; g.fillRect(54, 146, 70, 18); g.fillRect(70, 174, 56, 18);
      g.font = '600 24px "Barlow", sans-serif';
      ["Backup de fotos", "Conta Google", "WhatsApp e apps", "Fones e Bluetooth"].forEach(function(t, i){
        g.strokeStyle = "#3dff9c"; g.lineWidth = 5; g.beginPath(); g.moveTo(186, 96 + i * 48); g.lineTo(197, 107 + i * 48); g.lineTo(216, 86 + i * 48); g.stroke();
        g.fillStyle = "#e8f6ff"; g.fillText(t, 230, 106 + i * 48);
      });
    }, false, true);
    var pegTex = ctex(128, 128, function(g, w, h){
      g.fillStyle = "#1a1f2c"; g.fillRect(0, 0, w, h); g.fillStyle = "#07080d";
      for (var x = 8; x < w; x += 16) for (var y = 8; y < h; y += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
    }, true);
    pegTex.repeat.set(5, 3);
    function signTex(title, code, col){
      return ctex(640, 140, function(g, w, h){
        g.fillStyle = "rgba(4,6,16,.9)"; g.fillRect(0, 0, w, h);
        g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 18; g.strokeRect(6, 6, w - 12, h - 12);
        g.shadowBlur = 0; g.fillStyle = col; g.fillRect(6, 6, 16, h - 12);
        g.textBaseline = "middle"; g.font = '600 24px "JetBrains Mono", monospace'; g.fillText(code, 44, 38);
        g.font = '700 54px "Chakra Petch", "Barlow", sans-serif'; g.fillStyle = "#ffffff"; g.shadowColor = col; g.shadowBlur = 14;
        g.fillText(title, 44, 92);
      }, false, true);
    }
    var neonTex = ctex(1024, 320, function(g, w, h){
      g.clearRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle";
      g.font = '700 190px "Chakra Petch", "Barlow", sans-serif';
      for (var i = 0; i < 3; i++) { g.shadowColor = "#00f0ff"; g.shadowBlur = 40; g.strokeStyle = "#00f0ff"; g.lineWidth = 7; g.strokeText("YAXUM", w / 2, 128); }
      g.shadowBlur = 12; g.fillStyle = "#e9feff"; g.fillText("YAXUM", w / 2, 128);
      g.font = '600 38px "JetBrains Mono", monospace'; g.shadowColor = "#ff2bd6"; g.shadowBlur = 20; g.fillStyle = "#ff7be6";
      g.fillText("LAB  ·  ASSISTÊNCIA TÉCNICA", w / 2, 262);
    }, false, true);

    /* materials */
    function ph(color, shin, spec){ return new T.MeshPhongMaterial({ color: color, shininess: shin == null ? 30 : shin, specular: spec == null ? 0x20242f : spec }); }
    function basic(color, op){ var m = new T.MeshBasicMaterial({ color: color }); if (op != null) { m.transparent = true; m.opacity = op; m.depthWrite = false; } return m; }
    function scr(t, op){ var m = new T.MeshBasicMaterial({ map: t }); if (op != null) { m.transparent = true; m.opacity = op; } return m; }
    var M = {
      bench: ph(0x1a1f2d, 40, 0x3a4260), frame: ph(0x2b3243, 60, 0x55607a), dark: ph(0x171a22, 50, 0x2d3344),
      black: ph(0x0b0c10, 70, 0x333845), metal: ph(0xa0a8b6, 90, 0xd6dcea), steel: ph(0x5e6676, 80, 0x9aa3b8),
      yellow: ph(0xe0b810, 40, 0x554400), red: ph(0xb3202e, 40), blue: ph(0x2448a0, 50), white: ph(0xdfe3ea, 30),
      pink: ph(0xc2327f, 30), mat: new T.MeshPhongMaterial({ map: matTex, shininess: 6, specular: 0x111111 }),
      pcb: new T.MeshPhongMaterial({ map: pcbTex, shininess: 50 }), floor: ph(0x0a0c15, 90, 0x2a3350), wall: ph(0x0c0f1a, 10, 0x0c0c0c),
      peg: new T.MeshPhongMaterial({ map: pegTex, shininess: 10 }),
      cyan: basic(0x00f0ff), magenta: basic(0xff2bd6), yel: basic(0xfcee0a), rec: basic(0xff2a45), hot: basic(0x8a2f0a),
      uv: basic(0x9b5cff, .85), uvGlow: basic(0x9b5cff, .28), liquid: basic(0x38d8ff, .55), glass: basic(0x7df9ff, .2),
      led: basic(0x3dff9c)
    };

    /* geometry helpers (unit shapes, scaled) */
    var GB = new T.BoxGeometry(1, 1, 1), GC = new T.CylinderGeometry(1, 1, 1, 22), GS = new T.SphereGeometry(1, 14, 10), GP = new T.PlaneGeometry(1, 1), GT = new T.TorusGeometry(1, .09, 8, 40);
    function add(geo, mat, sx, sy, sz, x, y, z, p, rx, ry, rz){
      var m = new T.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      m.rotation.set(rx || 0, ry || 0, rz || 0); (p || scene).add(m); return m;
    }
    function box(mat, w, h, d, x, y, z, p, rx, ry, rz){ return add(GB, mat, w, h, d, x, y, z, p, rx, ry, rz); }
    function cyl(mat, r, h, x, y, z, p, rx, ry, rz){ return add(GC, mat, r, h, r, x, y, z, p, rx, ry, rz); }
    function pln(mat, w, h, x, y, z, p, rx, ry, rz){ return add(GP, mat, w, h, 1, x, y, z, p, rx, ry, rz); }
    function ring(mat, r, x, y, z, p, rx, ry, rz){ return add(GT, mat, r, r, r, x, y, z, p, rx, ry, rz); }
    function tube(mat, pts, r, p){
      var curve = new T.CatmullRomCurve3(pts.map(function(a){ return new T.Vector3(a[0], a[1], a[2]); }));
      var m = new T.Mesh(new T.TubeGeometry(curve, 16, r, 6, false), mat); (p || scene).add(m); return m;
    }

    /* lab dimensions (cm) */
    var L = 280, D = 90, H = 92, Y0 = 95.3, AX = 245, SP = 340, NB = 6;
    var benchZ = []; for (var bi = 0; bi < NB; bi++) benchZ.push(40 - bi * SP);
    var backZ = benchZ[NB - 1] - 640, len = 700 - backZ, midZ = (700 + backZ) / 2;

    var anim = { holos: [], recs: [] };

    /* stations: local coords, +z faces the aisle, y0 = mat surface */
    function phoneOpen(g, x, z, y){
      box(M.black, 8, 1, 16, x, y + .5, z, g);
      pln(M.pcb, 6.6, 13.6, x, y + 1.05, z, g, -Math.PI / 2);
      box(M.black, 8, .8, 16, x + 10, y + .4, z, g);
      box(M.hot, 3.4, .3, 1.2, x + 5, y + .9, z - 2, g);
    }
    function monitor(g, x, z, tex, w, h){
      box(M.dark, 3, 22, 3, x, Y0 + 11, z, g); box(M.dark, 16, 1.5, 10, x, Y0 + .8, z, g);
      box(M.black, w + 3, h + 3, 2.4, x, Y0 + 22 + h / 2, z, g);
      pln(scr(tex), w, h, x, Y0 + 22 + h / 2, z + 1.25, g);
    }
    var handleMats = [M.red, M.yellow, M.blue, M.pink, M.black, M.red, M.blue, M.yellow];
    function toolKit(g, x, z){
      box(M.dark, 32, 5, 8, x, Y0 + 2.5, z - 6, g);
      box(M.cyan, 32, .6, .6, x, Y0 + 5.2, z - 1.8, g);
      for (var k = 0; k < 8; k++) {
        var hx = x - 13.3 + k * 3.8;
        cyl(handleMats[k], 1.35, 11, hx, Y0 + 10.5, z - 6, g);
        cyl(M.metal, .7, 1.2, hx, Y0 + 16.6, z - 6, g);
      }
      box(M.white, 22, .4, 15, x + 30, Y0 + .2, z + 2, g);
      for (var sc = 0; sc < 8; sc++) cyl(M.metal, .55, .8, x + 22 + (sc % 4) * 5, Y0 + .7, z - 2 + Math.floor(sc / 4) * 7, g);
      box(M.metal, .7, .4, 15, x - 8, Y0 + .4, z + 8, g, 0, .35); box(M.metal, .7, .4, 15, x - 6.8, Y0 + .4, z + 8.4, g, 0, .28);
      box(M.blue, 1.4, .7, 15, x + 4, Y0 + .45, z + 9, g, 0, -.45);
      box(M.yellow, 1.2, .6, 12, x + 9, Y0 + .4, z + 10, g, 0, .6);
      cyl(M.pink, 3.4, 1.4, x + 16, Y0 + .7, z + 11, g); ring(M.metal, 2, x + 16, Y0 + 3.2, z + 11, g);
    }
    var TOOLS = { A: [70, 30], B: [-20, 30], C: [-104, 30], D: [-20, 30], E: [8, 30], F: [-20, 30], S: [-8, 30] };
    var ST = {
      A: function(g){ // microsolda
        box(M.dark, 28, 3, 34, -20, Y0 + 1.5, -2, g); cyl(M.metal, 2.4, 50, -20, Y0 + 26, -16, g);
        box(M.dark, 6, 6, 18, -20, Y0 + 47, -8, g); box(M.white, 14, 11, 14, -20, Y0 + 40, 2, g);
        cyl(M.black, 1.8, 11, -23, Y0 + 48, 6, g, -.6); cyl(M.black, 1.8, 11, -17, Y0 + 48, 6, g, -.6);
        cyl(M.black, 3.5, 7, -20, Y0 + 31, 2, g); ring(M.cyan, 6, -20, Y0 + 28, 2, g, Math.PI / 2);
        cyl(M.black, 2, 6, -20, Y0 + 49, -2, g);
        box(M.steel, 18, 2.5, 11, -20, Y0 + 4.2, 3, g); box(M.black, 15, .8, 7.5, -20, Y0 + 5.8, 3, g);
        pln(M.pcb, 13, 6.4, -20, Y0 + 6.25, 3, g, -Math.PI / 2);
        box(M.hot, 2, .4, 2, -18, Y0 + 6.5, 3, g); ring(M.cyan, 10, -20, Y0 + 6.6, 3, g, Math.PI / 2);
        monitor(g, 38, -30, zoomTex, 72, 43);
        box(M.dark, 22, 12, 18, -82, Y0 + 6, -18, g); pln(scr(lcd("350°C", "#ff7a1a")), 11, 4.2, -84, Y0 + 7.5, -8.9, g);
        box(M.cyan, 22, .7, .7, -82, Y0 + 12.3, -9, g); cyl(M.steel, 2.2, 2, -74, Y0 + 6, -8.4, g, Math.PI / 2);
        cyl(M.steel, 3, 14, -60, Y0 + 7, -4, g, 0, 0, .7); cyl(M.blue, 1.3, 12, -53, Y0 + 13, -4, g, 0, 0, .7);
        cyl(M.metal, .45, 8, -48.5, Y0 + 17.8, -4, g, 0, 0, .7);
        tube(M.black, [[-78, Y0 + 3, -9], [-68, Y0 + 1, 2], [-58, Y0 + 9, -2], [-56, Y0 + 11, -4]], .6, g);
        cyl(M.metal, 3.5, 3, -104, Y0 + 1.5, 14, g); cyl(M.white, .8, 10, -96, Y0 + .8, 22, g, 0, 0, Math.PI / 2);
        box(M.steel, 1, .5, 12, 6, Y0 + .3, 20, g, 0, .3);
      },
      B: function(g){ // retrabalho BGA
        box(M.black, 26, 15, 20, -72, Y0 + 7.5, -16, g);
        pln(scr(lcd("380°C", "#ff3b30")), 9, 4, -78, Y0 + 10, -5.9, g); pln(scr(lcd("AR 60", "#3dff7a")), 9, 4, -66, Y0 + 10, -5.9, g);
        box(M.magenta, 26, .7, .7, -72, Y0 + 15.3, -6, g);
        cyl(M.dark, 2.4, 20, -46, Y0 + 12, -6, g, .25, 0, -.35); cyl(M.metal, 1.2, 6, -42, Y0 + 2.5, -3, g, .25, 0, -.35);
        tube(M.black, [[-62, Y0 + 7, -8], [-56, Y0 + 1, 4], [-50, Y0 + 20, -6], [-49, Y0 + 22, -7]], .8, g);
        box(M.steel, 32, 5, 26, 2, Y0 + 2.5, -2, g); box(M.hot, 27, .6, 20, 2, Y0 + 5.3, -2, g);
        pln(M.pcb, 13, 19, 2, Y0 + 5.8, -2, g, -Math.PI / 2);
        box(M.steel, 2, 9, 2, -12, Y0 + 9, -2, g); box(M.steel, 2, 9, 2, 16, Y0 + 9, -2, g);
        var mm = new T.Group(); mm.position.set(52, Y0, 10); mm.rotation.y = .35; g.add(mm);
        box(M.yellow, 10, 3, 18, 0, 1.5, 0, mm); pln(scr(lcd("4.203", "#10200f", "#9fb89a")), 7, 3.6, 0, 3.05, -4, mm, -Math.PI / 2);
        cyl(M.black, 1.3, 1, 0, 3.4, 3, mm);
        cyl(M.red, .45, 22, 66, Y0 + .5, 20, g, 0, .7, Math.PI / 2); cyl(M.black, .45, 22, 64, Y0 + .5, 24, g, 0, .5, Math.PI / 2);
        box(M.black, 18, 22, 8, 104, Y0 + 11, -22, g); cyl(M.steel, 7, 1, 104, Y0 + 12, -17.5, g, Math.PI / 2);
        ring(M.cyan, 7.6, 104, Y0 + 12, -17, g);
      },
      C: function(g){ // diagnóstico
        box(M.steel, 24, 14, 26, -72, Y0 + 7, -14, g);
        pln(scr(lcd("04.20V", "#3dff7a")), 11, 3.6, -76, Y0 + 10.5, -.9, g); pln(scr(lcd("0.85A", "#ff3b30")), 11, 3.6, -76, Y0 + 5.5, -.9, g);
        cyl(M.black, 1.6, 1.8, -64, Y0 + 10, -.4, g, Math.PI / 2); cyl(M.black, 1.6, 1.8, -64, Y0 + 5, -.4, g, Math.PI / 2);
        box(M.dark, 34, 20, 14, -24, Y0 + 10, -22, g);
        var sc = pln(scr(scopeTex), 22, 13.5, -28, Y0 + 11, -14.9, g); anim.scope = scopeTex; sc.name = "scope";
        for (var k = 0; k < 6; k++) cyl(M.steel, 1, 1.4, -13 + (k % 2) * 4, Y0 + 16 - Math.floor(k / 2) * 5, -14.5, g, Math.PI / 2);
        phoneOpen(g, 26, 8, Y0);
        tube(M.red, [[-68, Y0 + 3, -.5], [-40, Y0 + .6, 12], [20, Y0 + .6, 12], [26, Y0 + 1.2, 6]], .45, g);
        tube(M.black, [[-66, Y0 + 3, -.5], [-38, Y0 + .6, 16], [22, Y0 + .6, 15], [28, Y0 + 1.2, 6]], .45, g);
        // hologram of a phone
        var h = new T.Group(); h.position.set(30, Y0 + 92, 0); g.add(h);
        var e = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(34, 68, 5)), new T.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: .9 }));
        h.add(e); var ip = pln(scr(pcbTex, .35), 28, 58, 0, 0, 0, h); ip.material.blending = T.AdditiveBlending; ip.material.depthWrite = false;
        ip.material.side = T.DoubleSide;
        ring(M.cyan, 24, 0, -48, 0, h, Math.PI / 2); anim.holos.push(h);
      },
      D: function(g){ // troca de vidro
        // congeladora de separação (-170°C)
        box(M.white, 30, 10, 24, -112, Y0 + 5, -8, g); pln(basic(0xbfefff, .75), 24, 16, -112, Y0 + 10.1, -9, g, -Math.PI / 2);
        pln(scr(lcd("-170°C", "#7df9ff")), 10, 3.6, -112, Y0 + 5, 4.1, g);
        // laminadora OCA a vácuo com tampa aberta
        box(M.dark, 30, 12, 28, 112, Y0 + 6, -8, g); box(M.black, 24, 1, 20, 112, Y0 + 12.4, -6, g);
        box(M.steel, 30, 2, 26, 112, Y0 + 22, -21, g, -1.1);
        pln(scr(lcd("-98kPa", "#3dff9c")), 10, 3.6, 112, Y0 + 5, 6.1, g);
        // fio de molibdênio para separar o vidro
        cyl(M.steel, .8, 10, 30, Y0 + 5, 26, g); cyl(M.steel, .8, 10, 60, Y0 + 5, 26, g); cyl(M.cyan, .18, 30, 45, Y0 + 9.5, 26, g, 0, 0, Math.PI / 2);
        // vidros novos empilhados
        for (var gv = 0; gv < 4; gv++) box(basic(0x7df9ff, .22), 8, .5, 16, 88, Y0 + .4 + gv * .7, 26, g);
        box(M.steel, 34, 8, 26, -64, Y0 + 4, -8, g); box(M.black, 28, 1, 18, -64, Y0 + 8.5, -8, g);
        cyl(M.black, 1.6, 1.4, -76, Y0 + 4.4, 5.3, g, Math.PI / 2); cyl(M.black, 1.6, 1.4, -52, Y0 + 4.4, 5.3, g, Math.PI / 2);
        box(M.black, 8, .8, 16, -64, Y0 + 9.4, -8, g, 0, Math.PI / 2);
        pln(scr(lcd("80°C", "#00f0ff")), 8, 3.4, -64, Y0 + 4.4, 5.1, g);
        cyl(M.metal, 12, 32, 6, Y0 + 13, -14, g, 0, 0, Math.PI / 2); cyl(M.glass, 7.5, .6, 22.4, Y0 + 13, -14, g, 0, 0, Math.PI / 2);
        ring(M.cyan, 7.8, 22.6, Y0 + 13, -14, g, 0, Math.PI / 2);
        box(M.dark, 14, 10, 6, 6, Y0 + 5, 8, g); pln(scr(lcd("0.5MPa", "#fcee0a")), 10, 3.6, 6, Y0 + 6.5, 11.1, g);
        cyl(M.steel, 1, 14, 60, Y0 + 7, -6, g); cyl(M.steel, 1, 14, 82, Y0 + 7, -6, g);
        box(M.dark, 26, 5, 16, 71, Y0 + 16, -6, g); pln(M.uv, 22, 12, 71, Y0 + 13.4, -6, g, Math.PI / 2);
        pln(M.uvGlow, 30, 20, 71, Y0 + .2, -6, g, -Math.PI / 2);
        // exploded screen hologram: vidro, OCA, LCD, moldura
        var h = new T.Group(); h.position.set(0, Y0 + 96, 0); g.add(h);
        [[0x7df9ff, .28, 18], [0xff2bd6, .22, 6], [0x0b1a3a, .8, -6], [0xfcee0a, .2, -18]].forEach(function(q){
          var m = new T.MeshBasicMaterial({ color: q[0], transparent: true, opacity: q[1], side: T.DoubleSide, depthWrite: false });
          var pl = new T.Mesh(GP, m); pl.scale.set(34, 70, 1); pl.position.z = q[2]; h.add(pl);
          var ed = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(34, 70)), new T.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: .8 }));
          ed.position.z = q[2]; h.add(ed);
        });
        h.rotation.x = -.25; anim.holos.push(h);
      },
      E: function(g){ // bancada ao vivo
        box(M.dark, 6, 8, 6, -60, Y0 + 4, -38, g); cyl(M.steel, 1.4, 72, -60, Y0 + 40, -38, g);
        cyl(M.steel, 1.2, 40, -60, Y0 + 75, -18, g, Math.PI / 2);
        box(M.black, 9, 5, 7, -60, Y0 + 72, 1, g); cyl(M.black, 2.2, 3, -60, Y0 + 68.5, 1, g);
        ring(M.cyan, 7, -60, Y0 + 67.5, 1, g, Math.PI / 2);
        var rec = add(GS, M.rec, 1.3, 1.3, 1.3, -55.5, Y0 + 74, 4.6, g); anim.recs.push(rec);
        phoneOpen(g, -65, 2, Y0);
        box(M.steel, .8, .4, 13, -40, Y0 + .3, 12, g, 0, .5); box(M.steel, .8, .4, 13, -38.8, Y0 + .3, 12.4, g, 0, .45);
        monitor(g, 30, -28, liveTex, 56, 32);
        for (var k = 0; k < 5; k++) box([M.pink, M.blue, M.pink, M.yellow, M.blue][k], 7, 4, 9, 88 + (k % 3) * 9, Y0 + 2, 8 + Math.floor(k / 3) * 11, g);
      },
      S: function(g){ // suporte digital: mesa de aula
        monitor(g, -40, -28, aulaTex, 64, 36);
        for (var k = 0; k < 3; k++) {
          box(M.steel, 7, 1, 7, 30 + k * 24, Y0 + .5, 0, g);
          box([M.black, M.white, M.blue][k], 7.5, 15, 1, 30 + k * 24, Y0 + 8.5, -1, g, -.28);
        }
        box(M.black, 26, 1, 18, 88, Y0 + .5, 16, g); pln(scr(aulaTex), 24, 13.5, 88, Y0 + 1.05, 16, g, -Math.PI / 2);
        for (var st = 0; st < 2; st++) {
          var sx = -50 + st * 70;
          cyl(M.steel, 1.6, 60, sx, 30, 74, g); cyl(M.pink, 15, 4, sx, 62, 74, g); ring(M.cyan, 12, sx, 3, 74, g, Math.PI / 2);
        }
      },
      F: function(g){ // ultrassom / limpeza
        box(M.metal, 28, 14, 18, -62, Y0 + 7, -10, g); pln(M.liquid, 24, 14, -62, Y0 + 14.2, -10, g, -Math.PI / 2);
        pln(scr(lcd("03:00", "#00f0ff")), 9, 3.6, -62, Y0 + 5, -.9, g);
        box(M.dark, 34, 10, 14, 10, Y0 + 5, -16, g);
        for (var k = 0; k < 6; k++) { box(M.black, 4, 1, 8, -2 + k * 5, Y0 + 10.5, -16, g); box(M.led, 1, .6, .6, -2 + k * 5, Y0 + 7, -8.8, g); }
        box(M.steel, 40, 1.5, 24, 70, Y0 + .75, 4, g);
        for (var j = 0; j < 4; j++) box([M.black, M.white, M.black, M.blue][j], 7.5, .9, 15, 56 + j * 9.5, Y0 + 2, 4, g);
        box(M.black, 18, 22, 8, -104, Y0 + 11, -22, g); cyl(M.steel, 7, 1, -104, Y0 + 12, -17.5, g, Math.PI / 2);
      }
    };
    var NAMES = { A: "MICROSOLDA", B: "RETRABALHO BGA", C: "DIAGNÓSTICO", D: "TROCA DE VIDRO", E: "BANCADA AO VIVO", F: "LIMPEZA ULTRASSOM", S: "SUPORTE DIGITAL" };
    var LAYOUT = { "-1": ["D", "S", "A", "C", "F", "E"], "1": ["A", "E", "B", "D", "C", "F"] };

    var stations = [];
    var dummy = new T.Object3D();
    var drawerColors = [0x2a6df4, 0xd8262f, 0xf2c511, 0x8e98aa, 0x2fbf71, 0xff2bd6];
    [-1, 1].forEach(function(s){
      for (var i = 0; i < NB; i++) {
        var g = new T.Group(); g.position.set(s * AX, 0, benchZ[i]); g.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g);
        box(M.bench, L, 5, D, 0, H, 0, g); box(M.mat, L - 10, .6, D - 12, 0, H + 2.8, 0, g);
        box((i + (s > 0 ? 1 : 0)) % 2 ? M.magenta : M.cyan, L, 1.2, 1.2, 0, H - 1.6, D / 2 + .7, g);
        box(M.dark, L - 20, 3, D - 20, 0, 28, 0, g);
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function(c){ box(M.frame, 5, H - 2, 5, c[0] * (L / 2 - 8), (H - 2) / 2, c[1] * (D / 2 - 7), g); });
        // wall kit: drawers or pegboard, plus shelf of phones waiting
        if ((i + (s > 0 ? 0 : 1)) % 2) {
          box(M.frame, 150, 96, 22, -40, 170, -58, g);
          var dr = new T.InstancedMesh(GB, new T.MeshPhongMaterial({ shininess: 40 }), 60), n = 0;
          for (var r = 0; r < 6; r++) for (var c2 = 0; c2 < 10; c2++) {
            dummy.position.set(-40 - 66 + c2 * 14.6, 128 + r * 14.6, -46.4); dummy.scale.set(13, 12.6, 1.6); dummy.updateMatrix();
            dr.setMatrixAt(n, dummy.matrix); dr.setColorAt(n, new T.Color(drawerColors[(rnd() * drawerColors.length) | 0])); n++;
          }
          g.add(dr);
        } else {
          pln(M.peg, 150, 90, -40, 170, -60, g);
          for (var tl = 0; tl < 7; tl++) {
            var tx = -104 + tl * 13;
            cyl(handleMats[tl], 2.3, 15, tx, 190, -57, g);
            cyl(M.metal, .6, 19, tx, 173, -57, g);
          }
          box(M.red, 2.4, 20, 1.5, -6, 180, -57, g, 0, 0, .28); box(M.red, 2.4, 20, 1.5, 2, 180, -57, g, 0, 0, -.28);
          box(M.metal, 2, 8, 1.5, -2, 194, -57, g);
          box(M.metal, 1, 18, 1, 14, 180, -57, g, 0, 0, .06); box(M.metal, 1, 18, 1, 16, 180, -57, g, 0, 0, -.06);
          ring(M.metal, 6, 30, 182, -57, g);
        }
        box(M.frame, 110, 2, 22, 70, 222, -D / 2 - 4, g);
        for (var ph2 = 0; ph2 < 7; ph2++) {
          box([M.black, M.white, M.black, M.blue, M.black, M.pink, M.black][ph2], 7.5, 15, 1, 24 + ph2 * 14, 230.5, -D / 2 - 4 + (ph2 % 2) * 3, g);
          box(M.white, 4, 2.4, .3, 24 + ph2 * 14, 225, -D / 2 - 3.2 + (ph2 % 2) * 3, g);
        }
        var key = LAYOUT[String(s)][i]; ST[key](g);
        stations.push({ key: key, name: NAMES[key], s: s, z: benchZ[i], num: (s < 0 ? i * 2 + 1 : i * 2 + 2) });
        toolKit(g, TOOLS[key][0], TOOLS[key][1]);
        // hanging sign facing the aisle
        var num = (s < 0 ? i * 2 + 1 : i * 2 + 2);
        var col = key === "E" ? "#ff2a45" : (num % 2 ? "#00f0ff" : "#ff2bd6");
        var sg = new T.Mesh(GP, new T.MeshBasicMaterial({ map: signTex(NAMES[key], "BANCADA " + (num < 10 ? "0" : "") + num + (key === "E" ? "  ● REC" : ""), col), transparent: true, opacity: .82 }));
        sg.scale.set(112, 24.5, 1); sg.position.set(s * 150, 292, benchZ[i] + 80); sg.rotation.y = -s * .32; scene.add(sg);
        var th = -s * .32, ex = Math.cos(th) * 50, ez = -Math.sin(th) * 50;
        cyl(M.steel, .5, 28, s * 150 - ex, 318, benchZ[i] + 80 - ez);
        cyl(M.steel, .5, 28, s * 150 + ex, 318, benchZ[i] + 80 + ez);
      }
    });

    /* room */
    pln(M.floor, 820, len, 0, 0, midZ, scene, -Math.PI / 2);
    var grid = new T.GridHelper(len, Math.round(len / 50), 0x00f0ff, 0x17324a);
    grid.material.transparent = true; grid.material.opacity = .16; grid.material.depthWrite = false; grid.position.set(0, .4, midZ); scene.add(grid);
    var lineMat = basic(0xfcee0a, .28); box(lineMat, 3, .3, len, -168, .5, midZ); box(lineMat, 3, .3, len, 168, .5, midZ);
    pln(M.wall, len, 360, -(AX + 70), 180, midZ, scene, 0, Math.PI / 2);
    var WX = AX + 70, DZ = 400, DW = 160, DH = 240;
    var zF = 700, aLen = zF - (DZ + DW / 2 + 6), bLen = (DZ - DW / 2 - 6) - backZ;
    pln(M.wall, aLen, 360, WX, 180, zF - aLen / 2, scene, 0, -Math.PI / 2);
    pln(M.wall, bLen, 360, WX, 180, backZ + bLen / 2, scene, 0, -Math.PI / 2);
    pln(M.wall, DW + 12, 360 - DH - 8, WX, DH + 8 + (360 - DH - 8) / 2, DZ, scene, 0, -Math.PI / 2);
    pln(M.wall, 820, 360, 0, 180, zF, scene, 0, Math.PI);
    pln(M.wall, 820, len, 0, 332, midZ, scene, Math.PI / 2);
    box(basic(0x00f0ff, .6), 3, 2, len, -112, 326, midZ); box(basic(0xff2bd6, .6), 3, 2, len, 112, 326, midZ);
    var crossC = basic(0x00f0ff, .4), crossM = basic(0xff2bd6, .4);
    benchZ.forEach(function(z, k){ box(k % 2 ? crossM : crossC, 460, 1.4, 1.4, 0, 322, z - SP / 2); });
    pln(M.wall, 820, 360, 0, 180, backZ, scene);
    var logoMat = new T.MeshBasicMaterial({ color: 0x0b0e1a });
    new T.TextureLoader().load("yaxum-cubo.jpg", function(t){ t.anisotropy = 4; logoMat.map = t; logoMat.color.set(0xffffff); logoMat.needsUpdate = true; });
    function poster(x, z, size, ry){
      var m = new T.Mesh(GP, logoMat); m.scale.set(size, size, 1); m.position.set(x, 176, z); m.rotation.y = ry; scene.add(m);
      var h = size / 2 + 4, fr = new T.Group(); fr.position.set(x, 176, z); fr.rotation.y = ry; scene.add(fr);
      box(M.cyan, size + 10, 2, 2, 0, h, 1, fr); box(M.magenta, size + 10, 2, 2, 0, -h, 1, fr);
      box(M.cyan, 2, size + 10, 2, -h, 0, 1, fr); box(M.magenta, 2, size + 10, 2, h, 0, 1, fr);
    }
    poster(0, backZ + 2, 290, 0);
    poster(0, zF - 2, 290, Math.PI);

    /* flower vases in the lounge, on both side walls */
    var petalGeo = new T.SphereGeometry(1, 8, 6), stemGeo = new T.CylinderGeometry(.35, .5, 1, 5);
    var FLOR = [0xff5fa2, 0xff8cc6, 0xe03fd8, 0xfff2f7, 0xffd84d, 0xb98cff, 0xff7a59, 0xff3d6e];
    var vasoBranco = new T.MeshPhongMaterial({ color: 0xf4f1ec, shininess: 90, specular: 0x666666 });
    var vasoPreto = new T.MeshPhongMaterial({ color: 0x17171d, shininess: 110, specular: 0x888888 });
    function lamb(color){ return new T.MeshLambertMaterial({ color: color, emissive: 0x1c1c1c }); }
    function vaso(x, z, sc, mat, n, prof){
      var g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      box(M.dark, 46 * sc, 36, 46 * sc, 0, 18, 0, g); box(M.magenta, 46 * sc + 2, 1.2, 46 * sc + 2, 0, 36.6, 0, g);
      var pts = prof.map(function(p){ return new T.Vector2(p[0] * sc, p[1] * sc); });
      var v = new T.Mesh(new T.LatheGeometry(pts, 32), mat); v.position.y = 37; g.add(v);
      ring(M.yel, 11.5 * sc, 0, 37 + prof[prof.length - 1][1] * sc - 3 * sc, 0, g, Math.PI / 2);
      var top = 37 + prof[prof.length - 1][1] * sc;
      var stems = new T.InstancedMesh(stemGeo, lamb(0x3f7f3a), n);
      var petals = new T.InstancedMesh(petalGeo, lamb(0xffffff), n * 6);
      var cores = new T.InstancedMesh(petalGeo, lamb(0xffffff), n);
      var leaves = new T.InstancedMesh(petalGeo, lamb(0x2f8a4a), n * 2);
      var q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), dv = new T.Vector3(), off = new T.Vector3(), c = new T.Color(), cc = new T.Color(0xffb020);
      for (var i = 0; i < n; i++) {
        var a = rnd() * Math.PI * 2, tilt = .12 + rnd() * .5, L = (34 + rnd() * 40) * sc;
        dv.set(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a)); q.setFromUnitVectors(up, dv);
        var bx = dv.x * L, by = top + dv.y * L, bz = dv.z * L;
        dummy.position.set(dv.x * L / 2, top + dv.y * L / 2, dv.z * L / 2); dummy.quaternion.copy(q); dummy.scale.set(sc, L, sc); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
        c.set(FLOR[(rnd() * FLOR.length) | 0]);
        var ps = (2.8 + rnd() * 1.4) * sc;
        for (var k = 0; k < 6; k++) {
          var pa = k / 6 * Math.PI * 2;
          off.set(Math.cos(pa) * ps, 0, Math.sin(pa) * ps).applyQuaternion(q);
          dummy.position.set(bx + off.x, by + off.y, bz + off.z); dummy.quaternion.copy(q); dummy.rotateY(-pa); dummy.rotateZ(.35);
          dummy.scale.set(ps * 1.1, .9 * sc, ps * .6); dummy.updateMatrix(); petals.setMatrixAt(i * 6 + k, dummy.matrix); petals.setColorAt(i * 6 + k, c);
        }
        dummy.position.set(bx, by + .5 * sc, bz); dummy.quaternion.copy(q); dummy.scale.set(1.5 * sc, 1.1 * sc, 1.5 * sc); dummy.updateMatrix(); cores.setMatrixAt(i, dummy.matrix); cores.setColorAt(i, cc);
        for (var l = 0; l < 2; l++) {
          var t2 = .3 + l * .25, la = a + (l ? 1.7 : -1.7);
          dummy.position.set(dv.x * L * t2 + Math.cos(la) * 4 * sc, top + dv.y * L * t2, dv.z * L * t2 + Math.sin(la) * 4 * sc);
          dummy.quaternion.setFromEuler(new T.Euler(0, -la, .55)); dummy.scale.set(6.5 * sc, .7 * sc, 2.4 * sc); dummy.updateMatrix(); leaves.setMatrixAt(i * 2 + l, dummy.matrix);
        }
      }
      [stems, petals, cores, leaves].forEach(function(m){ g.add(m); });
      dummy.quaternion.set(0, 0, 0, 1); dummy.scale.set(1, 1, 1);
    }
    var ALTO = [[0, 0], [13, 0], [17, 6], [19, 20], [15, 38], [9, 50], [10, 56], [12, 60]];
    var BAIXO = [[0, 0], [16, 0], [22, 8], [24, 18], [22, 26], [20, 30]];
    [-1, 1].forEach(function(s){
      vaso(s * (WX - 42), backZ + 340, 1.25, s < 0 ? vasoPreto : vasoBranco, 20, ALTO);
      vaso(s * (WX - 42), backZ + 230, 1.1, s < 0 ? vasoBranco : vasoPreto, 16, BAIXO);
      if (!low) { var fl = new T.PointLight(0xffd6b0, .9, 260, 2); fl.position.set(s * (WX - 80), 190, backZ + 285); scene.add(fl); }
    });
    // server / charging racks in the back corners
    [-1, 1].forEach(function(s){
      box(M.black, 70, 210, 60, s * 268, 105, backZ + 36);
      for (var k = 0; k < 14; k++) box(k % 3 ? M.cyan : M.led, 50, 1.2, 1, s * 268, 20 + k * 13.5, backZ + 66.5);
    });

    /* ---------- automatic glass door + view of Lagoa da Conceição ---------- */
    function out(color){ return new T.MeshBasicMaterial({ color: color, fog: false }); }
    box(M.metal, 10, DH + 8, 6, WX, (DH + 8) / 2, DZ + DW / 2 + 3); box(M.metal, 10, DH + 8, 6, WX, (DH + 8) / 2, DZ - DW / 2 - 3);
    box(M.dark, 14, 16, DW + 12, WX - 3, DH + 8, DZ);
    var ledOn = basic(0x3dff9c), ledOff = basic(0xff2a45), led = box(ledOff, 2, 2, 8, WX - 10.5, DH + 6, DZ);
    var bandTex = ctex(512, 64, function(g, w, h){
      g.clearRect(0, 0, w, h); g.fillStyle = "rgba(230,245,255,.55)"; g.fillRect(0, 12, w, 40);
      g.fillStyle = "rgba(10,20,40,.9)"; g.font = '700 28px "Chakra Petch", "Barlow", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("YAXUM  ·  ASSISTÊNCIA TÉCNICA", w / 2, 33);
    }, false, true);
    var glassMat = new T.MeshPhongMaterial({ color: 0xa8ecff, transparent: true, opacity: .17, shininess: 120, specular: 0xffffff, depthWrite: false, side: T.DoubleSide });
    function doorPanel(sign){
      var gp = new T.Group(); gp.position.set(WX - 3, 0, DZ + sign * DW / 4); scene.add(gp);
      box(glassMat, 1.2, DH - 6, DW / 2 - 2, 0, DH / 2, 0, gp);
      box(M.metal, 2.6, 4, DW / 2, 0, DH - 2, 0, gp); box(M.metal, 2.6, 4, DW / 2, 0, 3, 0, gp);
      box(M.metal, 2.6, DH, 3, 0, DH / 2, sign * (DW / 4 - 1.5), gp);
      var band = new T.Mesh(GP, new T.MeshBasicMaterial({ map: bandTex, transparent: true, depthWrite: false, side: T.DoubleSide }));
      band.scale.set(DW / 2 - 6, 9, 1); band.position.set(-1, 150, 0); band.rotation.y = -Math.PI / 2; gp.add(band);
      return gp;
    }
    var doorA = doorPanel(1), doorB = doorPanel(-1), doorT = 0;
    var glowTex = ctex(128, 128, function(g, w, h){
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,246,222,1)"); gr.addColorStop(.18, "rgba(255,212,146,.95)"); gr.addColorStop(.45, "rgba(255,146,96,.35)"); gr.addColorStop(1, "rgba(255,120,80,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    function glow(x, y, z, sc, op){ var sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, fog: false, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: op })); sp.scale.set(sc, sc, 1); sp.position.set(x, y, z); scene.add(sp); return sp; }
    var doorGlow = glow(WX - 20, 120, DZ, 300, 0);

    /* flower wall facing the glass door */
    (function(){
      var PW = 270, PH = 190, py = 180, g = new T.Group(); g.position.set(-WX + 2, 0, DZ); scene.add(g);
      box(M.dark, 4, PH + 16, PW + 16, 0, py, 0, g);
      box(M.cyan, 3, 2, PW + 20, 3, py + PH / 2 + 9, 0, g); box(M.magenta, 3, 2, PW + 20, 3, py - PH / 2 - 9, 0, g);
      box(M.cyan, 3, PH + 20, 2, 3, py, -(PW / 2 + 9), g); box(M.magenta, 3, PH + 20, 2, 3, py, PW / 2 + 9, g);
      var NL = low ? 300 : 580, NF = low ? 70 : 125, i, k;
      var GREENS = [0x2f8a4a, 0x3fa65a, 0x23703c, 0x4fbf6a, 0x1d5e33, 0x5cc474, 0x2a7a55];
      var leaves = new T.InstancedMesh(petalGeo, lamb(0xffffff), NL), c = new T.Color();
      for (i = 0; i < NL; i++) {
        dummy.position.set(3 + rnd() * 8, py - PH / 2 + 4 + rnd() * (PH - 8), -PW / 2 + 4 + rnd() * (PW - 8));
        dummy.rotation.set(rnd() * Math.PI * 2, (rnd() - .5) * .9, (rnd() - .5) * .9);
        dummy.scale.set(1.3, 7 + rnd() * 6, 3 + rnd() * 2.2); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
        leaves.setColorAt(i, c.set(GREENS[(rnd() * GREENS.length) | 0]));
      }
      var petals = new T.InstancedMesh(petalGeo, lamb(0xffffff), NF * 6), cores = new T.InstancedMesh(petalGeo, lamb(0xffffff), NF), cc = new T.Color(0xffc23a);
      for (i = 0; i < NF; i++) {
        var fy = py - PH / 2 + 8 + Math.pow(rnd(), .8) * (PH - 16), fz = -PW / 2 + 8 + rnd() * (PW - 16), fx = 11 + rnd() * 4, ps = 3 + rnd() * 3.4;
        c.set(FLOR[(rnd() * FLOR.length) | 0]);
        for (k = 0; k < 6; k++) {
          var pa = k / 6 * Math.PI * 2 + rnd() * .3;
          dummy.position.set(fx, fy + Math.cos(pa) * ps, fz + Math.sin(pa) * ps); dummy.rotation.set(pa, 0, 0);
          dummy.scale.set(1, ps * 1.1, ps * .62); dummy.updateMatrix(); petals.setMatrixAt(i * 6 + k, dummy.matrix); petals.setColorAt(i * 6 + k, c);
        }
        dummy.rotation.set(0, 0, 0); dummy.position.set(fx + 1.2, fy, fz); dummy.scale.set(1.4, ps * .42, ps * .42); dummy.updateMatrix();
        cores.setMatrixAt(i, dummy.matrix); cores.setColorAt(i, cc);
      }
      [leaves, petals, cores].forEach(function(m){ g.add(m); });
      // low planter along the wall, full of flowers
      box(M.dark, 44, 30, PW + 10, 24, 15, 0, g); box(lamb(0x2b1e16), 42, 1, PW + 6, 24, 30.2, 0, g); box(M.magenta, 1.4, 1.4, PW + 12, 46.4, 30.4, 0, g);
      var NS = low ? 34 : 60, q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), dv = new T.Vector3();
      var stems = new T.InstancedMesh(stemGeo, lamb(0x3f7f3a), NS), bp = new T.InstancedMesh(petalGeo, lamb(0xffffff), NS * 6), bc = new T.InstancedMesh(petalGeo, lamb(0xffffff), NS);
      for (i = 0; i < NS; i++) {
        var ox = 10 + rnd() * 30, oz = -PW / 2 + 6 + rnd() * (PW - 12), a = rnd() * Math.PI * 2, tilt = .05 + rnd() * .35, L = 22 + rnd() * 34;
        dv.set(Math.abs(Math.sin(tilt) * Math.cos(a)), Math.cos(tilt), Math.sin(tilt) * Math.sin(a)); q.setFromUnitVectors(up, dv);
        dummy.position.set(ox + dv.x * L / 2, 30 + dv.y * L / 2, oz + dv.z * L / 2); dummy.quaternion.copy(q); dummy.scale.set(1, L, 1); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
        var tx = ox + dv.x * L, ty = 30 + dv.y * L, tz = oz + dv.z * L, bs = 3 + rnd() * 1.8;
        c.set(FLOR[(rnd() * FLOR.length) | 0]);
        for (k = 0; k < 6; k++) {
          var pb = k / 6 * Math.PI * 2, off = new T.Vector3(Math.cos(pb) * bs, 0, Math.sin(pb) * bs).applyQuaternion(q);
          dummy.position.set(tx + off.x, ty + off.y, tz + off.z); dummy.quaternion.copy(q); dummy.rotateY(-pb); dummy.rotateZ(.35);
          dummy.scale.set(bs * 1.1, .9, bs * .6); dummy.updateMatrix(); bp.setMatrixAt(i * 6 + k, dummy.matrix); bp.setColorAt(i * 6 + k, c);
        }
        dummy.position.set(tx, ty + .5, tz); dummy.quaternion.copy(q); dummy.scale.set(1.5, 1.1, 1.5); dummy.updateMatrix(); bc.setMatrixAt(i, dummy.matrix); bc.setColorAt(i, cc);
      }
      [stems, bp, bc].forEach(function(m){ g.add(m); });
      dummy.quaternion.set(0, 0, 0, 1); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      // tall vases framing the wall
      vaso(-(WX - 42), DZ + PW / 2 + 52, 1.2, vasoBranco, 18, ALTO);
      vaso(-(WX - 42), DZ - PW / 2 - 40, 1.05, vasoPreto, 14, BAIXO);
      var wl = new T.PointLight(0xffe2c4, 1.15, 340, 2); wl.position.set(-WX + 110, 215, DZ); scene.add(wl);
      glow(-WX + 30, py, DZ, 360, .16);
    })();

    // sidewalk, street and waterfront (Av. das Rendeiras)
    var OX = WX;
    var tileTex = ctex(128, 128, function(g, w, h){
      g.fillStyle = "#c4b8aa"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(70,60,55,.35)"; g.lineWidth = 2;
      for (var i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    }, true);
    tileTex.repeat.set(4, 70);
    var sideMat = new T.MeshBasicMaterial({ map: tileTex, fog: false, color: 0xf0d8c4 });
    pln(sideMat, 152, 2800, OX + 76, 3.2, DZ, scene, -Math.PI / 2);
    box(out(0x8f877f), 8, 14, 2800, OX + 154, 0, DZ);
    var roadTex = ctex(128, 512, function(g, w, h){
      g.fillStyle = "#3b3b42"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 900; i++) { g.fillStyle = "rgba(255,255,255," + (rnd() * .07).toFixed(3) + ")"; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
      g.fillStyle = "#f2c230"; for (var y = 0; y < h; y += 128) g.fillRect(w / 2 - 3, y + 24, 6, 70);
      g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
    }, true);
    roadTex.repeat.set(1, 6);
    pln(new T.MeshBasicMaterial({ map: roadTex, fog: false, color: 0xe8d6c8 }), 300, 2800, OX + 308, .5, DZ, scene, -Math.PI / 2);
    box(out(0x8f877f), 8, 14, 2800, OX + 462, 0, DZ);
    pln(new T.MeshBasicMaterial({ map: tileTex, fog: false, color: 0xffe2c8 }), 104, 2800, OX + 514, 3.2, DZ, scene, -Math.PI / 2);
    box(out(0x6e675f), 6, 22, 2800, OX + 568, -8, DZ);
    var railMat = out(0xe6e2dc);
    for (var rz = DZ - 1400; rz <= DZ + 1400; rz += 80) cyl(railMat, 1.3, 92, OX + 560, 46, rz);
    box(railMat, 3, 3, 2800, OX + 560, 92, DZ); box(railMat, 1.6, 1.6, 2800, OX + 560, 58, DZ);

    // street lamps and palm trees on the waterfront
    var poleMat = out(0x2b2e35), bulbMat = out(0xffd49a);
    [DZ - 560, DZ - 80, DZ + 420, DZ + 920].forEach(function(z){
      cyl(poleMat, 2.4, 360, OX + 476, 180, z); box(poleMat, 40, 3, 4, OX + 458, 358, z); box(bulbMat, 18, 4, 10, OX + 442, 354, z);
      glow(OX + 442, 348, z, 100, .6);
    });
    function palm(x, z, h){
      var tr = cyl(out(0x6b5236), 4.5, h, x, h / 2, z); tr.rotation.z = .07;
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2, lf = box(out(i % 2 ? 0x2f6b3c : 0x3f8f4c), 78, 2, 16, x + 20 + Math.cos(a) * 32, h - 10 - (i % 2) * 6, z + Math.sin(a) * 32);
        lf.rotation.set(0, -a, -.38);
      }
    }
    palm(OX + 520, DZ - 300, 430); palm(OX + 520, DZ + 250, 390); palm(OX + 520, DZ + 1100, 410);
    var streetSign = ctex(512, 128, function(g, w, h){
      g.fillStyle = "#1c6b3a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.strokeRect(9, 9, w - 18, h - 18);
      g.fillStyle = "#ffffff"; g.font = '700 50px "Barlow", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Av. das Rendeiras", w / 2, h / 2 + 2);
    }, false, true);
    cyl(poleMat, 1.6, 250, OX + 142, 125, DZ + 150);
    pln(new T.MeshBasicMaterial({ map: streetSign, fog: false, side: T.DoubleSide }), 92, 23, OX + 140, 238, DZ + 150, scene, 0, -Math.PI / 2);

    // a car passing on the avenue
    var car = new T.Group(); car.position.set(OX + 380, 0, DZ); scene.add(car);
    box(out(0xd9263b), 80, 40, 190, 0, 36, 0, car); box(out(0x151922), 70, 30, 96, 0, 70, -12, car);
    [[-42, -62], [42, -62], [-42, 62], [42, 62]].forEach(function(w){ cyl(out(0x0e0e10), 17, 12, w[0], 17, w[1], car, 0, 0, Math.PI / 2); });
    box(out(0xfff2c4), 64, 8, 2, 0, 42, 96, car); box(out(0xff3040), 64, 6, 2, 0, 46, -96, car);

    // the lagoon: animated water
    var W0 = OX + 571, W1 = 3600, WWID = W1 - W0, WLEN = 9000, WCX = (W0 + W1) / 2, SUNZ = DZ - 520;
    function waterTex(){
      return ctex(512, 1024, function(g, w, h){
        var gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, "#0e3a4d"); gr.addColorStop(.5, "#2a5874"); gr.addColorStop(.82, "#b56f7c"); gr.addColorStop(1, "#f2a37c");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 1500; i++) { g.fillStyle = "rgba(255,255,255," + (rnd() * .09).toFixed(3) + ")"; g.fillRect(rnd() * w, rnd() * h, 1, 6 + rnd() * 20); }
        var sy = (SUNZ - DZ) / WLEN + .5;
        for (var j = 0; j < 1000; j++) {
          var xx = rnd() * w, spread = (1 - xx / w) * .06 + .01, yy = (sy + (rnd() - .5) * 2 * spread) * h;
          g.fillStyle = "rgba(255," + (180 + (rnd() * 70 | 0)) + ",140," + (.25 + rnd() * .65).toFixed(2) + ")";
          g.fillRect(xx, yy, 1.5 + rnd() * 2, 4 + rnd() * 18);
        }
      });
    }
    pln(new T.MeshBasicMaterial({ map: waterTex(), fog: false }), WWID, WLEN, WCX, -15, DZ, scene, -Math.PI / 2);
    var water2 = pln(new T.MeshBasicMaterial({ map: waterTex(), fog: false, transparent: true, opacity: .5, depthWrite: false }), WWID, WLEN, WCX, -14.6, DZ, scene, -Math.PI / 2);

    // sky dome with sunset gradient, sun behind the hills
    var skyGeo = new T.SphereGeometry(5400, 40, 22), sp = skyGeo.attributes.position, skyCols = [];
    var cH = new T.Color(0xffb27a), cP = new T.Color(0xe06f8e), cV = new T.Color(0x5a3a8a), cT = new T.Color(0x0d1233), cW = new T.Color(0x10303e), tc = new T.Color();
    for (var q = 0; q < sp.count; q++) {
      var yy = sp.getY(q) / 5400;
      if (yy < 0) tc.copy(cW); else if (yy < .06) tc.copy(cH).lerp(cP, yy / .06); else if (yy < .24) tc.copy(cP).lerp(cV, (yy - .06) / .18); else tc.copy(cV).lerp(cT, Math.min(1, (yy - .24) / .5));
      skyCols.push(tc.r, tc.g, tc.b);
    }
    skyGeo.setAttribute("color", new T.Float32BufferAttribute(skyCols, 3));
    var sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10; sky.position.set(0, -15, DZ); scene.add(sky);
    glow(4700, 300, SUNZ, 1000, 1);

    // hills around the lagoon and the dunes
    function ridge(x, z0, z1, base, amp, col, sv, smooth){
      var sh = new T.Shape(), n = 48; sh.moveTo(-z0, -30);
      for (var i = 0; i <= n; i++) {
        var z = z0 + (z1 - z0) * i / n, t = i / n;
        var hgt = smooth ? base + amp * Math.sin(t * Math.PI) * (.8 + .2 * Math.sin(i * .7 + sv))
                         : base + amp * (.55 * Math.sin(i * .42 + sv) + .3 * Math.sin(i * 1.27 + sv * 2) + .15 * Math.sin(i * 3.1 + sv));
        sh.lineTo(-z, Math.max(8, hgt));
      }
      sh.lineTo(-z1, -30); sh.lineTo(-z0, -30);
      var m = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color: col, fog: false, side: T.DoubleSide }));
      m.rotation.y = Math.PI / 2; m.position.set(x, -15, 0); scene.add(m); return m;
    }
    ridge(3500, DZ - 4400, DZ + 4400, 310, 230, 0x4d4f88, 1);
    ridge(3000, DZ - 3800, DZ + 3200, 170, 160, 0x2e3f60, 3);
    ridge(2500, DZ + 500, DZ + 4200, 120, 150, 0x1f3a34, 5);
    ridge(2000, DZ - 3400, DZ - 900, 18, 120, 0xd9b27f, 2, true);
    ridge(1985, DZ - 3100, DZ - 1300, 10, 55, 0xe8c99a, 4, true);
    var hl = [], NH = 90;
    for (var hq = 0; hq < NH; hq++) hl.push(2980 - rnd() * 20, -10 + rnd() * 70, DZ - 3000 + rnd() * 5600);
    var hg = new T.BufferGeometry(); hg.setAttribute("position", new T.Float32BufferAttribute(hl, 3));
    scene.add(new T.Points(hg, new T.PointsMaterial({ color: 0xffd27a, size: 9, fog: false })));

    // sailboats
    var boats = [];
    [[1500, DZ - 380], [2150, DZ + 520], [1850, DZ + 1400], [2600, DZ - 1300]].forEach(function(b, k){
      var gb = new T.Group(); gb.position.set(b[0], -12, b[1]); scene.add(gb);
      box(out(0xf2efe8), 44, 7, 14, 0, 0, 0, gb); cyl(out(0x9aa0a8), .9, 52, 0, 28, 0, gb);
      var ss = new T.Shape(); ss.moveTo(0, 0); ss.lineTo(0, 46); ss.lineTo(-28, 0); ss.lineTo(0, 0);
      var sail = new T.Mesh(new T.ShapeGeometry(ss), new T.MeshBasicMaterial({ color: k % 2 ? 0xffffff : 0xffe1c4, fog: false, side: T.DoubleSide }));
      sail.position.set(2, 6, 0); sail.rotation.y = Math.PI / 2; gb.add(sail);
      boats.push({ g: gb, ph: k * 1.7, z0: b[1] });
    });
    var lastF = 0;
    function updateOutside(still){
      var now = performance.now(), k = lastF ? Math.min(4, (now - lastF) / 16.67) : 1; lastF = now;
      var d = Math.hypot(camera.position.x - WX, camera.position.z - DZ);
      var want = ex.on ? (d < 330 ? 1 : 0) : (progress() > .001 && d < 345 ? 1 : 0);
      doorT = still ? want : doorT + (want - doorT) * Math.min(1, .07 * k);
      var off = DW / 4 + doorT * (DW / 2 - 6);
      doorA.position.z = DZ + off; doorB.position.z = DZ - off;
      led.material = doorT > .5 ? ledOn : ledOff;
      doorGlow.material.opacity = doorT * .45;
      if (still || doorT < .01) return;
      var t = now / 1000;
      water2.material.opacity = .5 + .5 * Math.sin(t * 2.2);
      boats.forEach(function(b){ b.g.position.y = -12 + Math.sin(t * 1.3 + b.ph) * 1.6; b.g.rotation.x = Math.sin(t * 1.1 + b.ph) * .04; b.g.position.z = b.z0 + Math.sin(t * .05 + b.ph) * 120; });
      car.position.z = DZ - 2600 + ((t * 900) % 7000);
    }

    /* lights */
    scene.add(new T.AmbientLight(0x3d4668, .6));
    scene.add(new T.HemisphereLight(0x6a84d0, 0x1a0a22, .55));
    var dl = new T.DirectionalLight(0xcfdcff, .35); dl.position.set(150, 400, 300); scene.add(dl);
    benchZ.forEach(function(z, k){
      if (low && k % 2) return;
      var pl = new T.PointLight(k % 2 ? 0xff5ce0 : 0x5cf6ff, low ? 1.3 : 1.05, 720, 2); pl.position.set(0, 280, z + 60); scene.add(pl);
    });
    var endLight = new T.PointLight(0x00f0ff, 1.2, 700, 2); endLight.position.set(0, 220, backZ + 160); scene.add(endLight);

    /* floating dust */
    var ND = low ? 260 : 600, dp = new Float32Array(ND * 3);
    for (var d = 0; d < ND; d++) { dp[d * 3] = (rnd() - .5) * 520; dp[d * 3 + 1] = 20 + rnd() * 300; dp[d * 3 + 2] = backZ + rnd() * (700 - backZ); }
    var dg = new T.BufferGeometry(); dg.setAttribute("position", new T.BufferAttribute(dp, 3));
    var dust = new T.Points(dg, new T.PointsMaterial({ color: 0x9fe8ff, size: 1.8, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending }));
    scene.add(dust);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ redraws.forEach(function(f){ f(); }); });

    /* camera path through the aisle */
    var startZ = 560, endZ = backZ + 540, cp = 0, clock = 0, lastSec = -1;
    var pD = new T.Vector3(), pC = new T.Vector3(), pF = new T.Vector3(), qD = new T.Quaternion(), qC = new T.Quaternion(), qF = new T.Quaternion();
    var DOORC = new T.Vector3(WX, 128, DZ), heroN = { x: .46, y: -.2 }, lastFim = false, peCache = .9, peN = 0;
    function sstep(a, b, x){ var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function poseLook(pos, lx, ly, lz){ camera.position.copy(pos); camera.lookAt(lx, ly, lz); return camera.quaternion; }
    function poseDoor(pos){
      camera.position.copy(pos); camera.lookAt(DOORC);
      var tv = Math.tan(camera.fov * Math.PI / 360);
      camera.rotateY(Math.atan(heroN.x * tv * camera.aspect)); camera.rotateX(Math.atan(-heroN.y * tv));
      return camera.quaternion;
    }
    function distLogo(){
      var tv = Math.tan(camera.fov * Math.PI / 360);
      return Math.max((290 / .62) / 2 / tv, (290 / .86) / 2 / (tv * camera.aspect));
    }
    function fimInicio(){
      if (peN++ % 30 === 0) {
        var max = document.documentElement.scrollHeight - innerHeight, el = document.getElementById("fimLogo");
        if (max > 0 && el) peCache = Math.max(.3, Math.min(.97, (max - el.offsetHeight * .92) / max));
      }
      return peCache;
    }
    /* where the phone sits in the hero, so the door frames it like a portal */
    function heroNdc(){
      var el = document.querySelector(".hero .phone"); if (!el) return;
      var r = el.getBoundingClientRect(), top = r.top + scrollY;
      if (innerWidth < 1021 || top > innerHeight * .85) { heroN.x = .12; heroN.y = -.04; return; }
      heroN.x = Math.max(-.2, Math.min(.72, ((r.left + r.width / 2) / innerWidth) * 2 - 1));
      heroN.y = Math.max(-.5, Math.min(.3, -(((top + r.height * .45) / innerHeight) * 2 - 1)));
    }
    heroNdc();
    function progress(){ var max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; }
    /* ---- free walk through the lab ---- */
    var ex = { on: false, x: 0, y: 172, z: 560, yaw: 0, pitch: -.12, vx: 0, vz: 0, push: 0, fly: null, blend: 0, t: 0, stillT: 0, moveT: 0, panel: null };
    var keys = { f: 0, b: 0, l: 0, r: 0 };
    var exitPos = new T.Vector3(), exitQuat = new T.Quaternion(), scrollQuat = new T.Quaternion();
    var near = { cb: null, last: "" }, panel = { cb: null, pos: null, st: null }, pv = new T.Vector3();
    function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
    function angDiff(a, b){ var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
    function setExplore(on){
      if (on === ex.on) return;
      if (on) {
        var dir = new T.Vector3(); camera.getWorldDirection(dir);
        ex.x = clamp(camera.position.x, -160, 160); ex.z = clamp(camera.position.z, backZ + 90, 640);
        ex.yaw = Math.atan2(-dir.x, -dir.z); ex.pitch = clamp(Math.asin(dir.y), -.6, .4);
        ex.vx = ex.vz = ex.push = 0; ex.fly = null; near.last = ""; lastT = 0; ex.stillT = ex.moveT = 0; ex.panel = null;
      } else {
        exitPos.copy(camera.position); exitQuat.copy(camera.quaternion); ex.blend = 1;
        if (ex.panel && panel.cb) panel.cb(null); ex.panel = null;
        keys.f = keys.b = keys.l = keys.r = 0;
      }
      ex.on = on;
    }
    function goTo(key){
      if (key === "YAXUM") { ex.fly = { x: 0, z: backZ + 420, yaw: 0, pitch: .05 }; return; }
      if (key === "LAGOA") { ex.fly = { x: 235, z: DZ, yaw: -Math.PI / 2, pitch: .02 }; return; }
      var best = null, bd = 1e9;
      stations.forEach(function(st){ if (st.key !== key) return; var d = Math.abs(st.z - ex.z); if (d < bd) { bd = d; best = st; } });
      if (!best) return;
      var tx = best.s * 70, tz = best.z + 25, lx = best.s * AX, lz = best.z;
      ex.fly = { x: tx, z: tz, yaw: Math.atan2(-(lx - tx), -(lz - tz)), pitch: -.3 };
    }
    var lastT = 0;
    function walk(){
      var now = performance.now(), k60 = lastT ? Math.min(4, (now - lastT) / 16.67) : 1; lastT = now;
      function ease(a){ return 1 - Math.pow(1 - a, k60); }
      if (ex.fly) {
        ex.x += (ex.fly.x - ex.x) * ease(.08); ex.z += (ex.fly.z - ex.z) * ease(.08);
        ex.yaw += angDiff(ex.yaw, ex.fly.yaw) * ease(.09); ex.pitch += (ex.fly.pitch - ex.pitch) * ease(.09);
        if (Math.abs(ex.fly.x - ex.x) + Math.abs(ex.fly.z - ex.z) < 6 && Math.abs(angDiff(ex.yaw, ex.fly.yaw)) < .03) ex.fly = null;
        ex.vx = ex.vz = 0;
      }
      var f = keys.f - keys.b + ex.push, r = keys.r - keys.l;
      ex.push *= Math.pow(.88, k60);
      var fx = -Math.sin(ex.yaw), fz = -Math.cos(ex.yaw), rx = Math.cos(ex.yaw), rz = -Math.sin(ex.yaw);
      var damp = Math.pow(.85, k60);
      ex.vx = (ex.vx + (fx * f + rx * r) * .55 * k60) * damp; ex.vz = (ex.vz + (fz * f + rz * r) * .55 * k60) * damp;
      var nx = clamp(ex.x + ex.vx, -245, 245), nz = clamp(ex.z + ex.vz, backZ + 90, 640);
      var bancadas = function(z){ return z < 205 && z > benchZ[NB - 1] - 165; };
      if (Math.abs(nx) > 160 && bancadas(nz)) { if (!bancadas(ex.z)) nz = ex.z; else nx = clamp(nx, -160, 160); }
      ex.x = nx; ex.z = nz;
      var speed = Math.min(1, Math.hypot(ex.vx, ex.vz) / (3 * k60)); ex.t += speed * .16 * k60;
      camera.rotation.order = "YXZ";
      camera.position.set(ex.x, ex.y + (reduce ? 0 : Math.sin(ex.t) * 1.4 * speed), ex.z);
      camera.rotation.set(ex.pitch, ex.yaw, 0);
      /* parou na frente de uma bancada? */
      var sp2 = Math.hypot(ex.vx, ex.vz) / k60;
      if (sp2 < .35 && !ex.fly) { ex.stillT += k60 / 60; ex.moveT = 0; } else { ex.moveT += k60 / 60; ex.stillT = 0; }
      var fwx = -Math.sin(ex.yaw), fwz = -Math.cos(ex.yaw), cand = null, cd = 1e9;
      stations.forEach(function(st){
        var dx = st.s * AX - ex.x, dz = st.z - ex.z, d = Math.hypot(dx, dz);
        if (d < 270 && (dx * fwx + dz * fwz) / d > .5 && d < cd) { cd = d; cand = st; }
      });
      var naPorta = ex.x > 110 && Math.abs(ex.z - DZ) < 170 && fwx > .55;
      var want = cand ? "st" + cand.num : naPorta ? "LAGOA" : (ex.z < backZ + 470 && Math.abs(ex.x) < 150 && fwz < -.6 ? "YAXUM" : null);
      if (want && ex.stillT > .35) {
        if (want !== ex.panel) { ex.panel = want; panel.st = cand || { key: want }; if (panel.cb) panel.cb(panel.st); }
      } else if (ex.panel && (want !== ex.panel || ex.moveT > .45)) {
        ex.panel = null; panel.st = null; if (panel.cb) panel.cb(null);
      }
      if (ex.panel && panel.st && panel.pos) {
        if (panel.st.key === "YAXUM") pv.set(-150, 300, backZ); else if (panel.st.key === "LAGOA") pv.set(WX, 290, DZ + 70); else pv.set(panel.st.s * (AX - 40), 250, panel.st.z + 40);
        camera.updateMatrixWorld(); pv.project(camera);
        panel.pos((pv.x + 1) / 2 * innerWidth, (1 - pv.y) / 2 * innerHeight, pv.z < 1);
      }
      near.n = (near.n || 0) + 1;
      if (near.cb && near.n % 8 === 0) {
        var nm = "Corredor", nd = 1e9;
        stations.forEach(function(st){ var d = Math.hypot(st.s * AX - ex.x, st.z - ex.z); if (d < nd) { nd = d; nm = st.name; } });
        if (ex.z < backZ + 470 && Math.abs(ex.x) < 150) nm = "Letreiro YAXUM";
        else if (ex.x > 110 && Math.abs(ex.z - DZ) < 200) nm = "Vista da Lagoa";
        else if (ex.x < -110 && Math.abs(ex.z - DZ) < 200) nm = "Jardim";
        else if (nd > 330) nm = "Corredor";
        if (nm !== near.last) { near.last = nm; near.cb(nm); }
      }
    }
    var drag = null;
    canvas.addEventListener("pointerdown", function(e){
      if (!ex.on) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; ex.fly = null;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", function(e){
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      ex.yaw -= dx * .0045; ex.pitch = clamp(ex.pitch - dy * .0035, -.95, .7);
    });
    function endDrag(){ drag = null; canvas.style.cursor = ""; }
    canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
    addEventListener("wheel", function(e){
      if (!ex.on) return;
      e.preventDefault(); ex.fly = null;
      ex.push = clamp(ex.push - e.deltaY * .012, -6, 6);
    }, { passive: false });
    var KEYMAP = { w: "f", arrowup: "f", s: "b", arrowdown: "b", a: "l", arrowleft: "l", d: "r", arrowright: "r" };
    addEventListener("keydown", function(e){
      if (!ex.on) return; var k = KEYMAP[(e.key || "").toLowerCase()];
      if (k) { keys[k] = 1; ex.fly = null; e.preventDefault(); }
    });
    addEventListener("keyup", function(e){ var k = KEYMAP[(e.key || "").toLowerCase()]; if (k) keys[k] = 0; });
    addEventListener("blur", function(){ keys.f = keys.b = keys.l = keys.r = 0; });

    function frame(still, dtms){
      var kf = Math.min(4, (dtms || 16.67) / 16.67);
      clock += kf / 60;
      updateOutside(still);
      if (ex.on) {
        if (lastFim) { lastFim = false; document.documentElement.classList.remove("fim"); }
        walk();
      } else {
      var target = progress();
      cp = still ? target : cp + (target - cp) * (1 - Math.pow(.93, kf));
      camera.rotation.order = "XYZ";
      var pe = fimInicio();
      var turn = sstep(.012, .075, cp), fin = sstep(pe, .995, cp);
      var wp = Math.min(1, Math.max(0, (cp - .06) / Math.max(.1, pe - .06)));
      var w = Math.PI * 3, par = 1 - fin;
      // 1) de frente para a porta de vidro
      pD.set(20 + cmx * 30, 176 - cmy * 16, 470);
      qD.copy(poseDoor(pD));
      // 2) andando pelo corredor
      var czC = 430 + ((backZ + 760) - 430) * wp;
      pC.set(Math.sin(wp * w) * 55 + cmx * 40, 184 - wp * 12 + Math.sin(wp * Math.PI * 4) * 6 - cmy * 20, czC);
      var lookSide = Math.sin(wp * w + .9) * (1 - Math.pow(wp, 4));
      qC.copy(poseLook(pC, lookSide * 150 + cmx * 30, 118 - wp * 6 + wp * wp * 50 - cmy * 20, czC - 440));
      // 3) parado de frente para o logo no fim
      pF.set(cmx * 12 * par, 176, backZ + distLogo());
      qF.copy(poseLook(pF, 0, 176, backZ));
      camera.position.copy(pD).lerp(pC, turn).lerp(pF, fin);
      camera.quaternion.copy(qD).slerp(qC, turn).slerp(qF, fin);
      camera.rotateZ(Math.sin(wp * w) * .02 * turn * par);
      var fimOn = fin > .72;
      if (fimOn !== lastFim) { lastFim = fimOn; document.documentElement.classList.toggle("fim", fimOn); }
      if (ex.blend > 0) {
        ex.blend = still ? 0 : Math.max(0, ex.blend - .035 * kf);
        var e2 = ex.blend * ex.blend * (3 - 2 * ex.blend);
        scrollQuat.copy(camera.quaternion);
        camera.position.lerp(exitPos, e2);
        camera.quaternion.copy(scrollQuat).slerp(exitQuat, e2);
      }
      }
      if (!still) {
        scopeTex.offset.x -= .004 * kf;
        for (var i = 0; i < anim.holos.length; i++) anim.holos[i].rotation.y += .01 * kf;
        var on = (clock % 1.3) < .8; for (var j = 0; j < anim.recs.length; j++) anim.recs[j].visible = on;
        var arr = dg.attributes.position.array;
        for (var k = 1; k < arr.length; k += 3) { arr[k] += .06 * kf; if (arr[k] > 320) arr[k] = 20; }
        dg.attributes.position.needsUpdate = true;
        var sec = Math.floor(clock); if (sec !== lastSec) { lastSec = sec; tcSec++; liveTex.__redraw(); }
      }
      renderer.render(scene, camera);
      return ex.on || ex.blend > 0 || Math.abs(target - cp) > .0004 || (doorT > .01 && doorT < .99);
    }
    function resize(){
      low = small() || YX.movel;
      renderer.setPixelRatio(baseDpr() * escala);
      renderer.setSize(innerWidth, innerHeight, false);
      camera.fov = low ? 74 : 58; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      peN = 0; heroNdc();
    }
    var seen = {}, lista = [];
    ["A", "D", "E", "S", "C", "B", "F"].forEach(function(k){ if (!seen[k] && stations.some(function(st){ return st.key === k; })) { seen[k] = 1; lista.push({ key: k, name: NAMES[k] }); } });
    lista.push({ key: "LAGOA", name: "Vista da Lagoa" });
    lista.push({ key: "YAXUM", name: "Letreiro YAXUM" });
    function qualidade(e){ escala = e; renderer.setPixelRatio(baseDpr() * escala); renderer.setSize(innerWidth, innerHeight, false); }
    function desligar(){ try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} }
    return { frame: frame, resize: resize, qualidade: qualidade, desligar: desligar, explore: setExplore, goTo: goTo, list: lista, onNear: function(fn){ near.cb = fn; }, onPanel: function(fn){ panel.cb = fn; }, onPanelPos: function(fn){ panel.pos = fn; }, press: function(k, v){ keys[k] = v ? 1 : 0; if (v) ex.fly = null; }, exploring: function(){ return ex.on; } };
  }
  var space = null;
  var cv = document.getElementById("space"), poster = document.getElementById("labPoster");
  var entrarBtns = document.querySelectorAll("[data-explorar]");
  function botoesLab(on){ Array.prototype.forEach.call(entrarBtns, function(b){ b.hidden = !on; }); }
  botoesLab(false);

  /* ---------- quadro a quadro ----------
     Nada roda à toa: sem 3D, a página só redesenha o palco do topo quando a
     pessoa rola ou mexe o mouse. Com 3D, o laboratório tem um teto de quadros
     (60 no computador, 30 no celular) e um governador que baixa a resolução
     se o aparelho não acompanhar; se nem assim der, liga o modo leve. */
  var dirty = true, rafId = 0, ultimo = 0, ultimoRender = 0, mexendo = true;
  var G = { passos: [1, .8, .65, .5], i: 0, t0: 0, quadros: 0, ruins: 0, pausaAte: 0 };
  function alvoFps(){ return YX.movel || small() ? 30 : 60; }
  function pedir(){ if (!rafId) rafId = requestAnimationFrame(quadro); }
  function heroPerto(){ return scrollY < innerHeight * 1.6; }
  function quadro(now){
    rafId = 0;
    if (document.hidden) return;
    var dt = ultimo ? Math.min(100, now - ultimo) : 16.7; ultimo = now;
    var continuar = false;
    if (dirty) { apply(); dirty = false; }
    if (!reduce && heroPerto()) continuar = stageFrame() || continuar;
    if (space) {
      if (reduce) { space.frame(true, dt); }
      else {
        var desde = now - ultimoRender;
        if (desde >= 1000 / alvoFps() - 3) { mexendo = space.frame(false, desde); ultimoRender = now; governar(now); }
        continuar = true;
      }
    }
    if (continuar) pedir();
  }
  function governar(now){
    if (now < G.pausaAte || space.exploring()) { G.t0 = 0; return; }
    if (!G.t0) { G.t0 = now; G.quadros = 0; return; }
    G.quadros++;
    var span = now - G.t0;
    if (span < 2000) return;
    var fps = G.quadros * 1000 / span;
    G.t0 = now; G.quadros = 0;
    if (fps < alvoFps() * .62) G.ruins++; else G.ruins = 0;
    if (G.ruins < 2) return;
    G.ruins = 0; G.pausaAte = now + 1500;
    if (G.i < G.passos.length - 1) { G.i++; space.qualidade(G.passos[G.i]); }
    else if (YX.escolha !== "3d") ligarLeve(true);
  }
  addEventListener("scroll", function(){ dirty = true; pedir(); }, { passive: true });
  addEventListener("resize", function(){ measure(); if (space) space.resize(); G.pausaAte = performance.now() + 1500; pedir(); });
  addEventListener("load", measure);
  if (!reduce && matchMedia("(pointer: fine)").matches) addEventListener("pointermove", pedir, { passive: true });
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) { ultimo = 0; G.t0 = 0; pedir(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
  pedir();

  /* animações que repintam (borda do plano recomendado, grade do convite final) param fora da tela */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ e.target.classList.toggle("fora", !e.isIntersecting); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".plan-wrap.hot, .cta"), function(el){ el.classList.add("fora"); io.observe(el); });
  }

  /* ---------- carregar o laboratório 3D (só no modo completo) ---------- */
  var tresP = null;
  function carregarTres(){
    if (window.THREE) return Promise.resolve();
    if (!tresP) tresP = new Promise(function(ok, falhou){
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      sc.async = true; sc.crossOrigin = "anonymous";
      sc.onload = function(){ window.THREE ? ok() : falhou(); };
      sc.onerror = function(){ tresP = null; falhou(); };
      document.head.appendChild(sc);
    });
    return tresP;
  }
  function quandoOcioso(fn){ if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 1800 }); else setTimeout(fn, 300); }
  function iniciarLab(){
    if (YX.leve || space) return;
    carregarTres().then(function(){
      quandoOcioso(function(){
        if (YX.leve || space) return;
        var t0 = performance.now();
        try { space = initSpace(); } catch (e) { space = null; }
        if (!space) { ligarLeve(false); return; }
        if (cv) cv.hidden = false;
        /* montar a cena demorou demais: o aparelho é fraco, começa com menos resolução */
        if (performance.now() - t0 > 1400) { G.i = 2; space.qualidade(G.passos[G.i]); }
        G.pausaAte = performance.now() + 2500; ultimoRender = 0;
        space.frame(true, 16.7);
        requestAnimationFrame(function(){
          document.documentElement.classList.add("lab-on");
          setTimeout(function(){ if (space && poster) poster.hidden = true; }, 900);
        });
        ligarLab();
        pedir();
      });
    }, function(){ ligarLeve(false); });
  }

  /* ---------- modo leve: sem 3D, imagem parada do laboratório ---------- */
  function guardar(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  var toast = document.getElementById("modoAviso"), modoBtns = document.querySelectorAll("[data-modo]");
  function rotulos(){
    Array.prototype.forEach.call(modoBtns, function(b){
      b.textContent = YX.leve ? "Ver o laboratório em 3D" : "Usar o modo leve";
      b.setAttribute("aria-pressed", String(!!YX.leve));
    });
  }
  function ligarLeve(automatico){
    if (space && space.exploring()) sairDoLab();
    YX.leve = true;
    var d = document.documentElement;
    d.classList.add("leve"); d.classList.remove("tres", "lab-on", "fim");
    if (poster) poster.hidden = false;
    if (space) {
      space.desligar(); space = null;
      /* um canvas que perdeu o contexto não ganha outro: troca por um novo para poder voltar ao 3D */
      if (cv) { var novo = cv.cloneNode(false); cv.parentNode.replaceChild(novo, cv); cv = novo; }
    }
    if (cv) cv.hidden = true;
    botoesLab(false);
    if (automatico) {
      guardar("yx-leve-auto", String(Date.now()));
      if (toast) { toast.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function(){ toast.hidden = true; }, 9000); }
    }
    rotulos(); dirty = true; pedir();
  }
  function ligarTres(){
    YX.leve = false;
    guardar("yx-leve-auto", null);
    var d = document.documentElement;
    d.classList.remove("leve"); d.classList.add("tres");
    if (toast) toast.hidden = true;
    G.i = 0; G.ruins = 0;
    rotulos(); dirty = true; tiltLimpo = false; measure();
    iniciarLab();
  }
  Array.prototype.forEach.call(modoBtns, function(b){
    b.addEventListener("click", function(){
      if (YX.leve) { guardar("yx-modo", "3d"); YX.escolha = "3d"; ligarTres(); }
      else { guardar("yx-modo", "leve"); YX.escolha = "leve"; ligarLeve(false); }
    });
  });
  var toastX = document.getElementById("modoAvisoX"); if (toastX) toastX.addEventListener("click", function(){ toast.hidden = true; });
  rotulos();
  if (!YX.leve) { if (document.readyState === "complete") iniciarLab(); else addEventListener("load", iniciarLab); }

  /* ---------- walk the lab ---------- */
  var hud = document.getElementById("exHud");
  function exLoop(){ if (!space || !space.exploring()) return; space.frame(false); requestAnimationFrame(exLoop); }
  var voltarY = 0;
  function entrar(){
    if (!space) return;
    voltarY = scrollY;
    document.documentElement.classList.add("explorar");
    hud.hidden = false;
    space.explore(true);
    if (reduce) exLoop();
    var sair = document.getElementById("exSair"); if (sair) sair.focus({ preventScroll: true });
  }
  function sairDoLab(){
    if (!space || !space.exploring()) return;
    space.explore(false);
    document.documentElement.classList.remove("explorar");
    hud.hidden = true;
    scrollTo(0, voltarY);
    if (reduce) space.frame(true);
  }
  /* os avisos do passeio ficam guardados para religar se o 3D for desligado e ligado de novo */
  var labLigado = false, CBS = {};
  function regCb(k, fn){ CBS[k] = fn; space[k](fn); }
  function ligarLab(){
    botoesLab(true);
    if (labLigado) { for (var k in CBS) space[k](CBS[k]); return; }
    labLigado = true;
    Array.prototype.forEach.call(entrarBtns, function(b){ b.addEventListener("click", entrar); });
    document.getElementById("exSair").addEventListener("click", sairDoLab);
    addEventListener("keydown", function(e){ if (e.key === "Escape") sairDoLab(); });
    var chips = document.getElementById("exChips");
    chips.textContent = "";
    space.list.forEach(function(st){
      var b = document.createElement("button"); b.type = "button"; b.textContent = st.name;
      b.addEventListener("click", function(){ space.goTo(st.key); });
      chips.appendChild(b);
    });
    var INFO = {
      A: { desc: "Reparo de placa com o microscópio. O monitor mostra a solda ampliada em 45x.", sec: "bancada",
           eq: ["Microscópio com luz em anel", "Monitor da câmera", "Estação de solda 350°C", "Suporte de placa", "Fluxo e estanho"],
           yx: ["O cronômetro mede o tempo do reparo e vira ponto do técnico.", "A câmera transmite o conserto ao vivo no link da Ordem de Serviço.", "Fotos de entrada e saída e o vídeo ficam guardados na Ordem de Serviço."] },
      D: { desc: "Troca só do vidro, mantendo a tela original do cliente.", sec: "ferramentas",
           eq: ["Congeladora -170°C", "Separadora aquecida a vácuo", "Fio de molibdênio", "Laminadora de OCA", "Autoclave para bolhas", "Lâmpada UV"],
           yx: ["O comparador de telas explica no link do orçamento a diferença entre as qualidades.", "O laboratório de películas mostra vidro, OCA e película lado a lado.", "Garantia digital gerada na entrega e garantia da peça acompanhada com o fornecedor."] },
      E: { desc: "A bancada que o cliente assiste do celular, de onde ele estiver.", sec: "bancada",
           eq: ["Webcam em braço articulado", "Luz de anel", "Luz de gravação", "Monitor do que o cliente vê", "Manta antiestática"],
           yx: ["Transmissão ao vivo no link da Ordem de Serviço, sem baixar aplicativo.", "Começa e termina junto com o cronômetro do técnico.", "O vídeo fica salvo para garantia e para tirar dúvida depois."] },
      S: { desc: "Mesa de aulas para quem tem dificuldade com o celular.", sec: "suporte",
           eq: ["Monitor de aula", "Celulares de demonstração", "Tablet", "Bancos para o cliente"],
           yx: ["Planos mensais de 4 a 8 atendimentos, a partir de R$ 59,90 na tabela de uma assistência da Ilha.", "O cliente marca a aula pelo link que já vai com o código dele.", "Pagamento por Pix ou cartão e controle do vencimento para renovar."] },
      C: { desc: "Onde se descobre o defeito antes de abrir o aparelho.", sec: "ferramentas",
           eq: ["Fonte de bancada 4,20 V", "Osciloscópio", "Multímetro", "Cabos de prova", "Celular em teste"],
           yx: ["Diagnóstico guiado com o cliente na frente, e o pré-diagnóstico monta sozinho.", "Teste do aparelho pelo navegador: toque, tela, som, câmeras e rede.", "Limpeza de apps de propaganda por cabo. Laudo completo em breve."] },
      B: { desc: "Troca de chip e solda de componentes com ar quente.", sec: "encomendas",
           eq: ["Estação de ar quente 380°C", "Pré-aquecedor de placa", "Suporte de placa", "Multímetro", "Exaustor de fumaça"],
           yx: ["A peça que falta vira encomenda, e o cliente é avisado quando pede e quando chega.", "A lista da semana vira um pedido pronto para o fornecedor.", "Estoque de peças com o custo de cada uma."] },
      F: { desc: "Limpeza, carga e conferência antes de devolver o aparelho.", sec: "agenda",
           eq: ["Lavadora ultrassônica", "Testador de bateria", "Carregadores", "Bandeja de prontos", "Exaustor"],
           yx: ["Mudou para Pronto, o cliente recebe aviso no WhatsApp.", "A retirada fica marcada na agenda, com lembrete.", "Meses depois, o lembrete de manutenção traz o cliente de volta."] },
      LAGOA: { desc: "A porta abre sozinha, mas daqui ninguém sai. É só para olhar a vista da Ilha, onde o YAXUM nasceu.", sec: "contato", sub1: "Na vista",
           eq: ["Avenida das Rendeiras", "Lagoa da Conceição", "Dunas", "Pôr do sol nos morros"],
           yx: ["Implantação presencial em Florianópolis.", "30 dias grátis para testar na sua loja.", "Fora da Ilha, a implantação é online."] },
      YAXUM: { desc: "Todo esse laboratório organizado num sistema só, do balcão à bancada e ao WhatsApp.", sec: "contato", sub1: "No sistema",
           eq: ["Bancada ao vivo", "WhatsApp com IA", "Suporte Digital", "App do cliente", "Caixa e estoque"],
           yx: ["30 dias grátis para testar na sua loja.", "Implantação presencial em Florianópolis.", "Fora da Ilha, a implantação é online."] }
    };
    var card = document.getElementById("exCard"), cardLink = document.getElementById("exLink"), hole = card.querySelector(".ex-hole");
    var saiTimer = 0, cardW = 0, cardH = 0;
    function letras(el, text){
      el.textContent = "";
      text.split(" ").forEach(function(word, wi){
        if (wi) el.appendChild(document.createTextNode(" "));
        var w = document.createElement("span"); w.className = "w";
        Array.prototype.forEach.call(word, function(c){ var sp = document.createElement("span"); sp.className = "ch"; sp.textContent = c; w.appendChild(sp); });
        el.appendChild(w);
      });
    }
    function palavras(el, text){
      text.split(" ").forEach(function(word, wi){
        if (wi) el.appendChild(document.createTextNode(" "));
        var sp = document.createElement("span"); sp.className = "wd"; sp.textContent = word; el.appendChild(sp);
      });
    }
    function lancar(){
      var h = hole.getBoundingClientRect(), hx = h.left + h.width / 2, hy = h.top + h.height / 2;
      var peças = card.querySelectorAll(".ch, .wd"), n = 0;
      Array.prototype.forEach.call(peças, function(el){
        var r = el.getBoundingClientRect();
        el.style.setProperty("--dx", (hx - (r.left + r.width / 2)).toFixed(1) + "px");
        el.style.setProperty("--dy", (hy - (r.top + r.height / 2)).toFixed(1) + "px");
        el.style.setProperty("--r", Math.round(Math.random() * 440 - 220) + "deg");
        el.style.setProperty("--d", Math.min(1.7, .25 + n * .007).toFixed(3) + "s"); n++;
      });
      void card.offsetWidth; card.classList.add("go");
      cardW = card.offsetWidth; cardH = card.offsetHeight;
    }
    regCb("onPanelPos", function(x, y, frente){
      if (card.hidden || innerWidth <= 700) return;
      var g = 16, cx = Math.min(Math.max(x - 10, g), innerWidth - cardW - g), cy = Math.min(Math.max(y - 18, 140), innerHeight - cardH - 190);
      card.style.transform = "translate(" + cx.toFixed(0) + "px," + Math.max(140, cy).toFixed(0) + "px)";
    });
    regCb("onPanel", function(st){
      clearTimeout(saiTimer);
      if (!st) {
        if (card.hidden) return;
        card.classList.remove("go"); card.classList.add("sai");
        saiTimer = setTimeout(function(){ card.hidden = true; card.classList.remove("sai"); }, 460);
        return;
      }
      var info = INFO[st.key]; if (!info) { card.hidden = true; return; }
      card.classList.remove("go", "sai");
      var nome = st.key === "YAXUM" ? "YAXUM Lab" : st.key === "LAGOA" ? "Lagoa da Conceição" : (st.name.charAt(0) + st.name.slice(1).toLowerCase()).replace(" bga", " BGA");
      letras(document.getElementById("exCode"), st.key === "YAXUM" ? "Fim do corredor" : st.key === "LAGOA" ? "Porta de vidro" : "Bancada " + (st.num < 10 ? "0" : "") + st.num);
      letras(document.getElementById("exNome"), nome);
      letras(document.getElementById("exDesc"), info.desc);
      letras(document.getElementById("exSub1"), info.sub1 || "Na bancada");
      letras(document.getElementById("exSub2"), "Com o YAXUM");
      var eq = document.getElementById("exEq"); eq.textContent = "";
      info.eq.forEach(function(t, i){ if (i) { var sp = document.createElement("span"); sp.className = "wd sep"; sp.textContent = "·"; eq.appendChild(document.createTextNode(" ")); eq.appendChild(sp); eq.appendChild(document.createTextNode(" ")); } palavras(eq, t); });
      var ul = document.getElementById("exYx"); ul.textContent = "";
      info.yx.forEach(function(t){ var li = document.createElement("li"), tx = document.createElement("span"); palavras(tx, t); li.appendChild(tx); ul.appendChild(li); });
      cardLink.setAttribute("data-sec", info.sec);
      if (st.key === "YAXUM" || st.key === "LAGOA") {
        cardLink.textContent = "Testar 30 dias grátis";
        cardLink.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Olá! Andei pelo laboratório do YAXUM e quero testar 30 dias grátis na minha assistência.");
        cardLink.target = "_blank"; cardLink.rel = "noopener";
      } else {
        cardLink.textContent = "Ver na página"; cardLink.href = "#" + info.sec; cardLink.removeAttribute("target");
      }
      /* the hole restarts its animation each time */
      hole.style.animation = "none"; void hole.offsetWidth; hole.style.animation = "";
      card.hidden = false;
      requestAnimationFrame(lancar);
    });
    cardLink.addEventListener("click", function(e){
      if (cardLink.target === "_blank") return;
      e.preventDefault();
      var alvo = document.getElementById(cardLink.getAttribute("data-sec"));
      sairDoLab();
      if (alvo) scrollTo(0, alvo.getBoundingClientRect().top + scrollY - 70);
    });
    var nearEl = document.getElementById("exNear");
    regCb("onNear", function(nm){ nearEl.textContent = nm; });
    Array.prototype.forEach.call(document.querySelectorAll("#exPad [data-k]"), function(b){
      var k = b.getAttribute("data-k");
      var on = function(e){ e.preventDefault(); space.press(k, true); };
      var off = function(){ space.press(k, false); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
    });
  }
})();
