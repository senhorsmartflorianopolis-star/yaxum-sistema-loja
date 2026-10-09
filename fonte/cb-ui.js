/* YAXUM · cérebro da IA: mapa estilo Obsidian + chat de demonstração */
(function () {
  var stage = document.getElementById("cbStage");
  if (!stage || typeof CBEngine === "undefined") return;
  /* O cérebro (3 MB de notas) não vem dentro da página: o mapa leve chega
     quando a pessoa se aproxima da seção, e o cérebro completo quando ela
     chega no chat ou mexe em alguma coisa. O índice é montado em fatias,
     para a página não travar em celular fraco. */
  var E = null, NOTES = [], BY = {}, EDGES = [], PASTAS = [];
  var COLORS = ["#00F0FF", "#FCEE0A", "#FF2BD6", "#3DFFA2", "#4DA3FF", "#FF8A3D", "#8A6CFF", "#B8FF3D", "#FF5C7A", "#34D8C4", "#FFD27A", "#FF7AC8", "#7DF9FF", "#FF3B55", "#C9D3F0", "#E879F9", "#FDE68A"];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || {}, economia = !!conn.saveData;
  function leve() { return document.documentElement.classList.contains("leve"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var carga = document.getElementById("cbCarga"), onPill = document.getElementById("cbOn");
  function aviso(txt) { if (carga) { carga.textContent = txt || ""; carga.hidden = !txt; } }

  var mapaP = null, cerebroP = null;
  function baixarMapa() {
    if (!mapaP) mapaP = fetch("cerebro-mapa.json").then(function (r) { if (!r.ok) throw new Error("mapa " + r.status); return r.json(); })
      .then(montarMapa).catch(function (e) { mapaP = null; aviso("Não consegui abrir o mapa. Confira a internet e role de novo até aqui."); throw e; });
    return mapaP;
  }
  function textoDoCerebro() {
    function simples() { return fetch("cerebro.json").then(function (r) { if (!r.ok) throw new Error("cerebro " + r.status); return r.text(); }); }
    if (typeof DecompressionStream !== "function" || typeof Response !== "function" || !window.Blob || !Blob.prototype.stream) return simples();
    /* cerebro-compactado.txt = gzip em base64: um terço do tamanho */
    return fetch("cerebro-compactado.txt").then(function (r) { if (!r.ok) throw new Error("gz " + r.status); return r.text(); }).then(function (b64) {
      var bin = atob(b64.trim()), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      if (u[0] !== 0x1f || u[1] !== 0x8b) throw new Error("formato");
      return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    }).then(function (t) { if (t.charAt(0) !== "{") throw new Error("formato"); return t; }).catch(simples);
  }
  function carregarCerebro() {
    if (!cerebroP) {
      if (onPill) { onPill.textContent = "conectando"; onPill.classList.remove("ok"); }
      cerebroP = baixarMapa().then(textoDoCerebro).then(function (txt) {
        aviso("Montando o cérebro…");
        /* uma fatia por vez, nos intervalos livres do navegador: a rolagem continua lisa */
        var pausa = window.requestIdleCallback ? function (fn) { requestIdleCallback(fn, { timeout: 150 }); } : function (fn) { requestAnimationFrame(function () { setTimeout(fn, 0); }); };
        return CBEngine.buildAsync(JSON.parse(txt), { fatia: 8, pausa: pausa, progresso: function (p) { aviso("Montando o cérebro… " + Math.round(p * 100) + "%"); } });
      }).then(juntar).then(function () {
        aviso("");
        if (onPill) { onPill.textContent = "online"; onPill.classList.add("ok"); }
        document.dispatchEvent(new CustomEvent("cerebro-pronto"));
      }).catch(function (e) {
        cerebroP = null;
        if (onPill) { onPill.textContent = "sem conexão"; }
        aviso("");
        throw e;
      });
    }
    return cerebroP;
  }
  /* as notas do mapa ganham o conteúdo completo e passam a ser as notas do motor */
  function juntar(E2) {
    E2.notes.forEach(function (en, i) {
      var ln = BY[en.id];
      if (!ln) { BY[en.id] = en; return; }
      for (var k in en) if (k !== "x" && k !== "y" && k !== "r" && k !== "col" && k !== "nb" && k !== "deg") ln[k] = en[k];
      E2.notes[i] = ln; E2.byId[en.id] = ln;
    });
    NOTES.forEach(function (n) { n.hay = CBEngine.fold(n.t + " " + n.id + " " + (n.q || []).join(" ")); });
    E = E2;
  }

  /* ---------- mapa ---------- */
  var nW = 0;
  function montarMapa(m) {
    PASTAS = m.p;
    NOTES = m.n.map(function (a) { return { id: a[0], t: a[1], c: a[2], s: a[3], x: a[4], y: a[5], vx: 0, vy: 0, q: [], links: [], nb: {}, deg: 0 }; });
    BY = {}; NOTES.forEach(function (n) { BY[n.id] = n; n.hay = CBEngine.fold(n.t + " " + n.id); });
    EDGES = m.e.map(function (e) { return [NOTES[e[0]], NOTES[e[1]]]; });
    EDGES.forEach(function (e) { e[0].nb[e[1].id] = 1; e[1].nb[e[0].id] = 1; e[0].deg++; e[1].deg++; });
    NOTES.forEach(function (n) { n.r = 3.2 + Math.sqrt(n.deg) * 1.35 + (n.s ? 2.6 : 0); n.col = COLORS[n.c % COLORS.length]; });
    var stats = document.getElementById("cbStats");
    if (stats && !stats.children.length && m.st) stats.innerHTML = [[m.st.notas, "notas"], [m.st.perguntas, "perguntas de clientes"], [m.st.respostas, "respostas modelo"], [m.st.ligacoes, "ligações"], [Math.round(m.st.palavras / 1000) + " mil", "palavras"]]
      .map(function (s) { return "<div><dt>" + s[1] + "</dt><dd>" + (typeof s[0] === "number" ? s[0].toLocaleString("pt-BR") : s[0]) + "</dd></div>"; }).join("");
    montarLegenda();
    aviso("");
    resize();
  }
  /* posições já vêm calculadas; a física só roda quando alguém arrasta uma nota */
  var alpha = 0;
  function tick() {
    var i, j, a, b, dx, dy, d2, d, f;
    for (i = 0; i < NOTES.length; i++) {
      a = NOTES[i];
      for (j = i + 1; j < NOTES.length; j++) {
        b = NOTES[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy; if (d2 < 36) { dx += (i % 7) - 3 + 0.5; dy += (j % 5) - 2 + 0.5; d2 = Math.max(36, dx * dx + dy * dy); }
        if (d2 > 160000) continue;
        f = Math.min(2400 * alpha / d2, 3); d = Math.sqrt(d2);
        a.vx -= dx / d * f; a.vy -= dy / d * f; b.vx += dx / d * f; b.vy += dy / d * f;
      }
    }
    EDGES.forEach(function (e) {
      a = e[0]; b = e[1]; dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      var same = a.c === b.c;
      f = (d - (same ? 58 : 190)) * (same ? 0.028 : 0.004) * alpha;
      a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
    });
    var C = PASTAS.length || 1;
    NOTES.forEach(function (n) {
      if (n.cx == null) { var ang = (n.c / C) * Math.PI * 2 - Math.PI / 2; n.cx = Math.cos(ang) * 560; n.cy = Math.sin(ang) * 340; }
      n.vx = (n.vx || 0) + (n.cx - n.x) * 0.012 * alpha; n.vy = (n.vy || 0) + (n.cy - n.y) * 0.012 * alpha;
      if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; return; }
      n.vx *= 0.82; n.vy *= 0.82; var sp = Math.hypot(n.vx, n.vy); if (sp > 25) { n.vx *= 25 / sp; n.vy *= 25 / sp; } n.x += n.vx; n.y += n.vy;
    });
    alpha = Math.max(alpha * 0.985, 0.0);
  }

  /* ---------- canvas ---------- */
  var cv = document.getElementById("cbCanvas"), ctx = cv.getContext("2d");
  var W = 0, H = 0, DPR = 1, cam = { x: 0, y: 0, s: 1 }, camT = null;
  var hover = null, sel = null, focusCat = -1, findHits = null, pulses = [], sparks = [];
  var dirty = true, visible = false, userMoved = false, rafId = 0;
  function kick() { if (!rafId && visible && NOTES.length) rafId = requestAnimationFrame(loop); }
  function sujar() { dirty = true; kick(); }
  function resize() {
    var r = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, leve() ? 1.5 : 2); W = r.width; H = r.height;
    if (!NOTES.length || !W || !H) return;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (!userMoved) fit(false);
    sujar();
  }
  function bounds() {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    NOTES.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    return [x0, y0, x1, y1];
  }
  function fit(anim) {
    var b = bounds(), pad = 40, noteW = (sel && W > 700) ? Math.min(400, W) : 0;
    var s = Math.min((W - noteW - pad * 2) / (b[2] - b[0]), (H - pad * 2) / (b[3] - b[1]));
    s = Math.max(0.2, Math.min(s, 2));
    var t = { s: s, x: (b[0] + b[2]) / 2 - (noteW / 2) / s, y: (b[1] + b[3]) / 2 };
    if (anim && !reduce) camT = t; else { cam.x = t.x; cam.y = t.y; cam.s = t.s; }
    sujar();
  }
  function fitTo(list) {
    if (!list.length) return;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    var pad = 70, noteW = (sel && W > 700) ? Math.min(400, W) : 0;
    var s = Math.min((W - noteW - pad * 2) / Math.max(x1 - x0, 1), (H - pad * 2) / Math.max(y1 - y0, 1));
    s = Math.max(0.35, Math.min(s, 1.7));
    camT = { s: s, x: (x0 + x1) / 2 + (noteW / 2) / s, y: (y0 + y1) / 2 };
    if (reduce) { cam.x = camT.x; cam.y = camT.y; cam.s = camT.s; camT = null; }
    userMoved = true; sujar();
  }
  function toScreen(x, y) { return [(x - cam.x) * cam.s + W / 2, (y - cam.y) * cam.s + H / 2]; }
  function toWorld(x, y) { return [(x - W / 2) / cam.s + cam.x, (y - H / 2) / cam.s + cam.y]; }
  function hl() {
    var h = hover || sel;
    return h;
  }
  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.s, cam.s); ctx.translate(-cam.x, -cam.y);
    var h = hl(), lw = 1 / cam.s;
    function active(n) {
      if (findHits) return !!findHits[n.id];
      if (focusCat >= 0) return n.c === focusCat;
      if (h) return n === h || !!h.nb[n.id];
      return true;
    }
    // edges
    /* todas as ligações de um mesmo tom num traço só: milhares de traços
       viram dois, e o mapa fica leve até em celular antigo */
    ctx.lineWidth = 0.8 * lw;
    var pDim = new Path2D(), pOn = new Path2D(), temDim = false;
    EDGES.forEach(function (e) {
      var a = e[0], b = e[1];
      if (h && (a === h || b === h)) return;
      var alvo = (active(a) && active(b)) ? pOn : (temDim = true, pDim);
      alvo.moveTo(a.x, a.y); alvo.lineTo(b.x, b.y);
    });
    if (temDim) { ctx.strokeStyle = "rgba(130,160,255,.035)"; ctx.stroke(pDim); }
    ctx.strokeStyle = "rgba(130,160,255,.14)"; ctx.stroke(pOn);
    if (h) {
      ctx.lineWidth = 1.4 * lw;
      EDGES.forEach(function (e) {
        var a = e[0], b = e[1]; if (a !== h && b !== h) return;
        var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, a.col); g.addColorStop(1, b.col);
        ctx.strokeStyle = g; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1;
      });
    }
    // sparks (a IA "pensando")
    sparks = sparks.filter(function (sp) {
      var t = (now - sp.t0) / sp.dur; if (t >= 1) return false;
      var e = t < 0 ? 0 : t, x = sp.a.x + (sp.b.x - sp.a.x) * e, y = sp.a.y + (sp.b.y - sp.a.y) * e;
      if (t >= 0) { ctx.fillStyle = sp.a.col; ctx.globalAlpha = 1 - e * 0.6; ctx.beginPath(); ctx.arc(x, y, 2.4 * lw * 1.4, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
      return true;
    });
    // nodes
    /* notas comuns agrupadas por cor; as principais e a selecionada à parte, com brilho */
    var grupos = {}, especiais = [], semBrilho = leve();
    NOTES.forEach(function (n) {
      if (n.s || n === h || n === sel) { especiais.push(n); return; }
      var k = n.col + (active(n) ? "1" : "0"), g = grupos[k] || (grupos[k] = { col: n.col, on: active(n), p: new Path2D() });
      g.p.moveTo(n.x + n.r, n.y); g.p.arc(n.x, n.y, n.r, 0, 6.2832);
    });
    for (var gk in grupos) { var g = grupos[gk]; ctx.globalAlpha = g.on ? 1 : 0.14; ctx.fillStyle = g.col; ctx.fill(g.p); }
    especiais.forEach(function (n) {
      var on = active(n), r = n.r;
      ctx.globalAlpha = on ? 1 : 0.14;
      if (!semBrilho) { ctx.shadowColor = n.col; ctx.shadowBlur = (n === h || n === sel ? 22 : 12); }
      ctx.fillStyle = n.col;
      ctx.beginPath(); ctx.arc(n.x, n.y, (n === h ? r * 1.35 : r), 0, 6.2832); ctx.fill();
      ctx.shadowBlur = 0;
      if (n.s) { ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.2 * lw; ctx.beginPath(); ctx.arc(n.x, n.y, r + 3 * lw * 1.2, 0, 6.2832); ctx.stroke(); }
      if (n === sel) { ctx.strokeStyle = "#FCEE0A"; ctx.lineWidth = 2 * lw; ctx.beginPath(); ctx.arc(n.x, n.y, r + 6 * lw, 0, 6.2832); ctx.stroke(); }
    });
    ctx.globalAlpha = 1;
    // pulses
    pulses = pulses.filter(function (p) {
      var t = (now - p.t0) / 1400; if (t >= 1) return false;
      ctx.strokeStyle = p.n.col; ctx.globalAlpha = 1 - t; ctx.lineWidth = 2 * lw;
      ctx.beginPath(); ctx.arc(p.n.x, p.n.y, p.n.r + (8 + 40 * t) / Math.max(cam.s, 0.5), 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
      return true;
    });
    ctx.restore();
    // labels (em pixels de tela), sem sobreposição
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var cand = [];
    NOTES.forEach(function (n) {
      var on = active(n), show = false, pr = 0;
      if (n === h || n === sel) { show = true; pr = 4; }
      else if (h && h.nb[n.id]) { show = true; pr = 2; }
      else if (findHits && findHits[n.id]) { show = true; pr = 2; }
      else if (focusCat >= 0 && n.c === focusCat && cam.s > 0.45) { show = true; pr = 1; }
      else if (!h && !findHits && focusCat < 0 && (n.s || cam.s > 1.15)) { show = true; pr = n.s ? 1 : 0; }
      if (!show || (!on && pr < 4)) return;
      cand.push({ n: n, pr: pr + n.deg / 100 });
    });
    cand.sort(function (a, b) { return b.pr - a.pr; });
    var boxes = [];
    cand.forEach(function (c) {
      var n = c.n, strong = c.pr >= 4, p = toScreen(n.x, n.y), y = p[1] + n.r * cam.s + 4;
      if (p[0] < -80 || p[0] > W + 80 || p[1] < -20 || p[1] > H + 20) return;
      ctx.font = (strong ? "600 13px " : "500 11.5px ") + "Barlow, system-ui, sans-serif";
      var w = ctx.measureText(n.t).width, bx = [p[0] - w / 2 - 3, y - 1, p[0] + w / 2 + 3, y + (strong ? 16 : 14)];
      for (var i = 0; i < boxes.length; i++) { var o = boxes[i]; if (bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1]) { if (!strong) return; } }
      boxes.push(bx);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(4,5,12,.9)"; ctx.strokeText(n.t, p[0], y);
      ctx.fillStyle = strong ? "#fff" : n.s ? "rgba(234,242,255,.92)" : "rgba(186,198,230,.85)";
      ctx.fillText(n.t, p[0], y);
    });
  }
  /* só desenha quando algo muda: parado, o mapa não gasta bateria */
  function loop(now) {
    rafId = 0;
    if (!visible || !NOTES.length) return;
    var mais = false;
    if (camT) {
      var k2 = 0.16;
      cam.x += (camT.x - cam.x) * k2; cam.y += (camT.y - cam.y) * k2; cam.s += (camT.s - cam.s) * k2;
      if (Math.abs(camT.x - cam.x) < 0.3 && Math.abs(camT.y - cam.y) < 0.3 && Math.abs(camT.s - cam.s) < 0.002) { cam.x = camT.x; cam.y = camT.y; cam.s = camT.s; camT = null; }
      dirty = true; mais = true;
    }
    if (alpha > 0.004 || (drag && drag.n)) { tick(); dirty = true; mais = true; }
    if (pulses.length || sparks.length) { dirty = true; mais = true; }
    if (dirty) { draw(now); dirty = false; }
    if (mais) kick();
  }

  /* ---------- interação ---------- */
  var drag = null, ptrs = {}, pinch = null;
  function pick(mx, my) {
    var w = toWorld(mx, my), best = null, bd = 1e9;
    NOTES.forEach(function (n) {
      var dx = n.x - w[0], dy = n.y - w[1], d = dx * dx + dy * dy, rr = Math.max(n.r + 4 / cam.s, 11 / cam.s);
      if (d < rr * rr && d < bd) { bd = d; best = n; }
    });
    return best;
  }
  function local(ev) { var r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  cv.addEventListener("pointerdown", function (ev) {
    var p = local(ev); ptrs[ev.pointerId] = p;
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: cam.s }; drag = null; return;
    }
    var n = pick(p[0], p[1]);
    drag = { n: n, x: p[0], y: p[1], cx: cam.x, cy: cam.y, moved: false, touch: ev.pointerType === "touch" };
    userMoved = true;
    if (n && !drag.touch) { n.fx = n.x; n.fy = n.y; }
    if (!drag.touch) { try { cv.setPointerCapture(ev.pointerId); } catch (e) {} cv.classList.add("is-drag"); }
    camT = null;
  });
  cv.addEventListener("pointermove", function (ev) {
    var p = local(ev);
    if (ptrs[ev.pointerId]) ptrs[ev.pointerId] = p;
    if (pinch) {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      cam.s = Math.max(0.25, Math.min(4, pinch.s * d / pinch.d)); sujar(); return;
    }
    if (drag) {
      var dx = p[0] - drag.x, dy = p[1] - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      if (drag.touch) { if (Math.abs(dx) > Math.abs(dy)) { cam.x = drag.cx - dx / cam.s; sujar(); } return; }
      if (drag.n) { var w = toWorld(p[0], p[1]); drag.n.fx = w[0]; drag.n.fy = w[1]; alpha = Math.max(alpha, 0.12); }
      else { cam.x = drag.cx - dx / cam.s; cam.y = drag.cy - dy / cam.s; }
      sujar(); return;
    }
    var n = pick(p[0], p[1]);
    if (n !== hover) { hover = n; sujar(); cv.classList.toggle("is-node", !!n); }
  });
  function up(ev) {
    delete ptrs[ev.pointerId];
    if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; drag = null; return; }
    if (!drag) return;
    var d = drag; drag = null; cv.classList.remove("is-drag");
    if (d.n) { d.n.fx = d.n.fy = null; }
    if (!d.moved && ev.type === "pointerup") {
      var p = local(ev), n = pick(p[0], p[1]);
      if (n) openNote(n, true); else if (sel) closeNote();
    }
  }
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", function () { if (!drag && hover) { hover = null; sujar(); } });
  cv.addEventListener("wheel", function (ev) {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault(); userMoved = true;
    var p = local(ev), w = toWorld(p[0], p[1]);
    var s = Math.max(0.25, Math.min(4, cam.s * Math.exp(-ev.deltaY * 0.0022)));
    cam.x = w[0] - (p[0] - W / 2) / s; cam.y = w[1] - (p[1] - H / 2) / s; cam.s = s; camT = null; sujar();
  }, { passive: false });
  Array.prototype.forEach.call(document.querySelectorAll(".cb-zoom button"), function (b) {
    b.addEventListener("click", function () {
      var z = b.getAttribute("data-z"); userMoved = true;
      if (z === "fit") return fit(true);
      var s = Math.max(0.25, Math.min(4, cam.s * (z === "in" ? 1.35 : 1 / 1.35)));
      camT = { x: cam.x, y: cam.y, s: s }; if (reduce) { cam.s = s; camT = null; } sujar();
    });
  });

  /* ---------- legenda e busca ---------- */
  var legend = document.getElementById("cbLegend");
  function montarLegenda() {
    if (!legend || legend.children.length) return;
    var counts = PASTAS.map(function () { return 0; }); NOTES.forEach(function (n) { counts[n.c]++; });
    legend.innerHTML = PASTAS.map(function (p, i) {
      return '<button type="button" data-c="' + i + '" aria-pressed="false" style="color:' + COLORS[i % COLORS.length] + '"><i style="background:' + COLORS[i % COLORS.length] + '"></i><span style="color:var(--ink-2)">' + esc(p) + "</span><small>" + counts[i] + "</small></button>";
    }).join("");
  }
  if (legend) legend.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b || !NOTES.length) return;
    var c = +b.getAttribute("data-c");
    focusCat = focusCat === c ? -1 : c;
    Array.prototype.forEach.call(legend.children, function (x) { x.setAttribute("aria-pressed", String(+x.getAttribute("data-c") === focusCat)); });
    if (focusCat >= 0) { find.value = ""; findHits = null; fitTo(NOTES.filter(function (n) { return n.c === focusCat; })); }
    else fit(true);
    if (window.innerWidth < 1040 && focusCat >= 0) stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    sujar();
  });
  var find = document.getElementById("cbFind");
  find.addEventListener("focus", function () { baixarMapa().then(carregarCerebro).catch(function () {}); });
  document.addEventListener("cerebro-pronto", function () { if (find.value.trim().length > 1) find.dispatchEvent(new Event("input")); });
  find.addEventListener("input", function () {
    var q = CBEngine.fold(find.value).trim();
    if (q.length < 2 || !NOTES.length) { findHits = null; sujar(); return; }
    findHits = {}; var any = 0;
    NOTES.forEach(function (n) {
      if (n.hay.indexOf(q) >= 0) { findHits[n.id] = 1; any++; }
    });
    if (!any && E) E_search(q);
    if (focusCat >= 0) { focusCat = -1; Array.prototype.forEach.call(legend.children, function (x) { x.setAttribute("aria-pressed", "false"); }); }
    clearTimeout(find.t);
    find.t = setTimeout(function () { var hs = NOTES.filter(function (n) { return findHits && findHits[n.id]; }); if (hs.length) fitTo(hs); }, 250);
    sujar();
  });
  function E_search(q) { CBEngine.search(E, q).slice(0, 6).forEach(function (r) { if (r.score > 3) findHits[r.n.id] = 1; }); }
  find.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      var first = findHits && NOTES.filter(function (n) { return findHits[n.id]; })[0];
      if (first) openNote(first, true);
    } else if (ev.key === "Escape") { find.value = ""; findHits = null; sujar(); }
  });

  /* ---------- nota ---------- */
  var noteEl = document.getElementById("cbNote"), noteBody = document.getElementById("cbNoteBody");
  var SYSV = /^(nome_cliente|modelo|servico|preco|prazo|numero_os|status_os|link_acompanhamento|pontos|cupom|horarios_livres|produto|estoque)$/;
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    s = s.replace(/\{\{([a-z_]+)\}\}/g, function (_, v) { return '<span class="tv' + (SYSV.test(v) ? " s" : "") + '">{{' + v + "}}</span>"; });
    s = s.replace(/\[\[([^\]|#]+)(\|([^\]]+))?\]\]/g, function (_, id, __, lbl) { var n = BY[id]; return '<button type="button" class="wl" data-id="' + esc(id) + '">' + esc(lbl || (n ? n.t : id)) + "</button>"; });
    return s;
  }
  function renderMd(md) {
    var out = [], lines = md.split("\n"), i = 0, sec = "";
    while (i < lines.length) {
      var l = lines[i];
      if (/^# /.test(l) || !l.trim()) { i++; continue; }
      var h = /^## (.+)/.exec(l);
      if (h) { sec = h[1]; out.push("<h4>" + esc(h[1]) + "</h4>"); i++; continue; }
      if (/^>/.test(l)) {
        var bub = [[]];
        while (i < lines.length && /^>/.test(lines[i])) {
          var t = lines[i].replace(/^>\s?/, "");
          if (!t.trim()) { if (bub[bub.length - 1].length) bub.push([]); } else bub[bub.length - 1].push(t);
          i++;
        }
        out.push('<div class="cb-ans">' + bub.filter(function (b) { return b.length; }).map(function (b) { return '<p class="msg out">' + inline(b.join(" ")) + "</p>"; }).join("") + "</div>");
        continue;
      }
      if (/^[-*] /.test(l)) {
        var items = [];
        while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, "")); i++; }
        if (sec === "Relacionadas") out.push('<div class="rel">' + inline(items.join(" ").replace(/\s*·\s*/g, " ")) + "</div>");
        else out.push("<ul>" + items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + "</ul>");
        continue;
      }
      if (/^\|/.test(l)) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s\-:|]+\|$/.test(lines[i])) rows.push(lines[i]); i++; }
        out.push("<table>" + rows.map(function (r, ri) {
          var cells = r.replace(/^\||\|$/g, "").split("|");
          return "<tr>" + cells.map(function (c) { return (ri ? "<td>" : "<th>") + inline(c.trim()) + (ri ? "</td>" : "</th>"); }).join("") + "</tr>";
        }).join("") + "</table>");
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#|>|[-*] |\|)/.test(lines[i])) { para.push(lines[i]); i++; }
      out.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return out.join("");
  }
  function openNote(n, center) {
    sel = n;
    var cat = document.getElementById("cbNoteCat");
    cat.textContent = PASTAS[n.c] + (n.s ? " · principal" : ""); cat.style.color = n.col; cat.style.borderColor = n.col;
    document.getElementById("cbNoteTitle").textContent = n.t;
    if (n.md) noteBody.innerHTML = renderMd(n.md);
    else {
      noteBody.innerHTML = '<p class="muted">Abrindo a nota…</p>';
      carregarCerebro().then(function () { if (sel === n && n.md) noteBody.innerHTML = renderMd(n.md); })
        .catch(function () { if (sel === n) noteBody.innerHTML = '<p class="muted">Não consegui abrir a nota agora. Confira a internet e toque de novo.</p>'; });
    }
    noteEl.hidden = false; noteEl.scrollTop = 0;
    if (center) {
      var off = W > 700 ? Math.min(400, W) / 2 : 0, s = Math.max(cam.s, 1.1);
      camT = { x: n.x + off / s, y: n.y + (W > 700 ? 0 : H * 0.18 / s), s: s };
      if (reduce) { cam.x = camT.x; cam.y = camT.y; cam.s = camT.s; camT = null; }
    }
    pulses.push({ n: n, t0: performance.now() });
    sujar();
  }
  function closeNote() { sel = null; noteEl.hidden = true; sujar(); }
  document.getElementById("cbNoteX").addEventListener("click", closeNote);
  noteBody.addEventListener("click", function (ev) {
    var b = ev.target.closest(".wl"); if (!b) return;
    var n = BY[b.getAttribute("data-id")]; if (n) openNote(n, true);
  });
  document.getElementById("cbNoteAsk").addEventListener("click", function () {
    if (!sel) return;
    var q = sel.q[Math.floor(Math.random() * Math.min(3, sel.q.length))] || sel.t;
    ask(q);
    if (window.innerWidth < 1040) document.getElementById("cbForm").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && sel && !noteEl.hidden) closeNote(); });

  function think(n) {
    var t0 = performance.now();
    pulses.push({ n: n, t0: t0 });
    Object.keys(n.nb).forEach(function (id, i) {
      var b = BY[id];
      sparks.push({ a: n, b: b, t0: t0 + 120 + i * 60, dur: 700 });
    });
    sujar();
  }

  /* ---------- chat ---------- */
  var msgs = document.getElementById("cbMsgs"), form = document.getElementById("cbForm"), input = document.getElementById("cbIn"), sugs = document.getElementById("cbSugs");
  var chatCtx = Object.assign({}, CBEngine.LOJA_DEMO), busy = false, queue = [];
  var SUGS = ["Quanto fica a tela do iPhone 11?", "Minha geladeira parou de gelar", "O note não liga mais", "O ar tá pingando água", "Meu celular caiu na água",
    "Controle do PS5 andando sozinho", "Vocês consertam bicicleta?", "Tô sentindo cheiro de gás", "A máquina não centrifuga", "Você é um robô?", "Aceita Pix?", "Tem garantia?"];
  function setSugs(list) {
    sugs.innerHTML = list.map(function (s) { return '<button type="button">' + esc(s) + "</button>"; }).join("");
    sugs.scrollLeft = 0;
  }
  setSugs(SUGS);
  sugs.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) ask(b.textContent); });
  function hhmm() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  function add(html, cls, who) {
    var p = document.createElement(cls === "sys" ? "p" : "p");
    p.className = cls;
    p.innerHTML = html + (cls === "sys" ? "" : "<time>" + hhmm() + (who ? " · " + who : "") + "</time>");
    msgs.appendChild(p); scroll(); return p;
  }
  var ACT = { consultar_os: "consultou a Ordem de Serviço", consultar_preco: "consultou a tabela de preços", consultar_estoque: "consultou o estoque",
    consultar_agenda: "consultou a agenda", agendar: "agenda liberada", criar_orcamento: "orçamento pronto para abrir", enviar_localizacao: "enviou a localização",
    consultar_pontos: "consultou o clube de pontos", chamar_humano: "equipe avisada" };
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 150) : ms); }); }
  function typing() { var d = document.createElement("div"); d.className = "cb-typing"; d.setAttribute("aria-label", "Bia está digitando"); d.innerHTML = "<i></i><i></i><i></i>"; msgs.appendChild(d); scroll(); return d; }
  function say(bubbles, first) {
    var chain = Promise.resolve();
    bubbles.forEach(function (b, i) {
      chain = chain.then(function () {
        var t = typing(), plain = b.replace(/<[^>]+>/g, "");
        return wait((i === 0 && first ? 650 : 380) + Math.min(1500, plain.length * 16)).then(function () { t.remove(); add(b, "msg out", "IA"); });
      });
    });
    return chain;
  }
  var hist = [];
  function pct(x) { return Math.max(0, Math.min(100, Math.round(x * 100))); }
  function why(r) {
    var list = (r.res || []).slice(0, 3);
    if (!list.length) return;
    var top = list[0].score || 1;
    var d = document.createElement("details"); d.className = "cb-why";
    d.innerHTML = "<summary>ver análise da resposta</summary>" + list.map(function (x, i) {
      var q = x.n.q[x.bq] || x.n.q[0] || "";
      var rel = Math.max(0.08, Math.min(1, x.score / top));
      return '<div class="cb-why-row' + (i === 0 && r.ok ? " is-top" : "") + '"><div class="cb-why-h"><button type="button" data-id="' + esc(x.n.id) + '">' + esc(x.n.t) + "</button><span>" + pct(x.sim) + "% parecido</span></div>" +
        '<i style="--w:' + (rel * 100).toFixed(0) + '%;--c:' + x.n.col + '"></i><small>pergunta mais parecida no cérebro: “' + esc(q) + "”</small></div>";
    }).join("") + '<p class="cb-why-foot">' + (r.ok ? "A Bia usou a primeira nota. As outras ficaram de reserva." : "Nenhuma nota ficou segura o bastante, então a Bia prefere confirmar com a equipe.") + "</p>";
    msgs.appendChild(d); scroll();
  }
  function chipsFor(r) {
    var META = { "variaveis-da-loja": 1, "como-a-ia-usa-o-sistema": 1, "regras-de-ouro": 1 };
    var out = [];
    function push(n) { if (!n || META[n.id] || !n.q.length) return; var q = n.q[0]; q = q.charAt(0).toUpperCase() + q.slice(1); if (out.indexOf(q) < 0) out.push(q); }
    var res = r.res || [];
    if (res[1] && res[0] && res[1].score >= res[0].score * 0.85) { push(res[1].n); if (res[2] && res[2].score >= res[0].score * 0.8) push(res[2].n); }
    if (r.ok) r.note.links.forEach(function (id) { if (out.length < 5) push(BY[id]); });
    else (r.alts || []).forEach(push);
    return out.concat(SUGS.filter(function (s) { return out.indexOf(s) < 0; })).slice(0, 10);
  }
  function aiPrompt(text, r) {
    var notes = (r.res || []).slice(0, 5).map(function (x) { return x.n; });
    var V = CBEngine.SHOP;
    var loja = Object.keys(V).map(function (k) { return k + ": " + V[k]; }).join("\n");
    var h = hist.slice(-8).map(function (m) { return (m.role === "user" ? "Cliente: " : "Bia: ") + m.content; }).join("\n");
    return "Você é a Bia, atendente automática do WhatsApp da Loja Exemplo, uma assistência técnica multisserviço FICTÍCIA usada só para demonstração no site do YAXUM. A loja atende: " + V.segmentos_atendidos + "; para o resto, indica " + V.parceiros_indicados + ".\n" +
      "Regras: fale como atendente de balcão, simpática e direta; 1 a 3 balões curtos; sem listas, sem negrito, sem markdown; no máximo 1 emoji; termine com o próximo passo. " +
      "Use só o que está nas notas do cérebro abaixo e nos dados da loja; se não souber, diga que confirma com a equipe. Se perguntarem se é robô, diga que é o atendimento automático da loja e ofereça chamar alguém. " +
      "Nunca peça senha de banco ou código. Preço e prazo: valores ilustrativos da demonstração (tela R$ 329,00 Android / R$ 489,00 iPhone, bateria R$ 189,00 / R$ 289,00, prazo em geral 1 dia útil), sempre como 'fica' e oferecendo confirmar pelo sistema. " +
      "Sempre escreva 'Ordem de Serviço' por extenso. Responda no idioma do cliente.\n\n" +
      "DADOS DA LOJA (exemplo):\n" + loja + "\n\n" +
      "NOTAS DO CÉREBRO (as mais parecidas com a mensagem):\n" + notes.map(function (n) { return "### " + n.id + "\n" + n.md.slice(0, 1800); }).join("\n\n") + "\n\n" +
      (h ? "CONVERSA ATÉ AGORA:\n" + h + "\n\n" : "") +
      "MENSAGEM DO CLIENTE: " + text + "\n\n" +
      'Responda só com JSON: {"baloes": ["balão 1", "balão 2"], "nota": "id da nota que você mais usou"}';
  }
  function proximo() { busy = false; if (queue.length) ask(queue.shift()); }
  function ask(text) {
    text = String(text || "").trim().slice(0, 200);
    if (!text) return;
    if (busy) { queue.push(text); return; }
    busy = true;
    add(esc(text), "msg in");
    input.value = "";
    if (E) return responder(text);
    /* o cérebro ainda está chegando: a Bia "digita" enquanto ele carrega */
    var t = typing();
    carregarCerebro().then(function () { t.remove(); responder(text); }, function () {
      t.remove();
      add("Não consegui carregar o cérebro agora. Confira a internet e mande a pergunta de novo.", "sys");
      proximo();
    });
  }
  function responder(text) {
    var r = CBEngine.answer(E, text, chatCtx);
    hist.push({ role: "user", content: text });
    var chain = wait(260);
    if (aiOn && sample) {
      var t = typing();
      var usedNote = r.ok ? r.note : (r.res && r.res[0] ? r.res[0].n : null);
      if (usedNote) think(usedNote);
      chain = chain.then(function () { return sample.json(aiPrompt(text, r), { modelTier: "quick", cache: false }); }).then(function (out) {
        t.remove();
        var b = (out && out.baloes && out.baloes.length) ? out.baloes.slice(0, 4).map(function (x) { return esc(String(x)); }) : null;
        if (!b) throw { code: "bad_output" };
        var n = out.nota && BY[out.nota] ? BY[out.nota] : usedNote;
        hist.push({ role: "assistant", content: b.join(" ") });
        return b.reduce(function (p, bb) { return p.then(function () { add(bb, "msg out", "IA completa"); return wait(220); }); }, Promise.resolve()).then(function () {
          if (n) { var src = document.createElement("p"); src.className = "cb-src"; src.innerHTML = "IA completa · baseada em <button type=\"button\" data-id=\"" + esc(n.id) + "\">" + esc(n.t) + "</button>"; msgs.appendChild(src); }
          why(r); setSugs(chipsFor(r));
        });
      }).catch(function (e) {
        t.remove();
        if (e && (e.code === "not_granted" || e.code === "rate_limited")) setAi(false);
        return local();
      });
    } else chain = chain.then(local);
    function local() {
      var c = Promise.resolve();
      if (r.ok) {
        think(r.note);
        if (!sel || sel !== r.note) { hover = null; }
        /* Emergência não "consulta a agenda" antes de mandar a pessoa sair de
           casa; e ação marcada "depois" fica para depois. */
        var acts = /emergencia$/.test(r.note.id) ? [] : (r.acts || []).filter(function (a) { return !/depois|s[oó] quando/i.test(a); })
          .map(function (a) { return a.replace(/^[^`]*`/, "").split("(")[0]; }).filter(function (a) { return /^(consultar_|enviar_)/.test(a); });
        if (acts.length) c = c.then(function () { add("Sistema: " + acts.slice(0, 2).map(function (a) { return ACT[a] || a; }).join(" · "), "sys"); return wait(250); });
      }
      return c.then(function () { return say(r.bubbles, true); }).then(function () {
        hist.push({ role: "assistant", content: r.bubbles.join(" ").replace(/<[^>]+>/g, "") });
        if (r.ok) {
          var src = document.createElement("p"); src.className = "cb-src";
          var nb = Object.keys(r.note.nb).length;
          src.innerHTML = "consultou <button type=\"button\" data-id=\"" + esc(r.note.id) + "\">" + esc(r.note.t) + "</button> + " + nb + " notas ligadas";
          msgs.appendChild(src); scroll();
        }
        why(r);
        setSugs(chipsFor(r));
      });
    }
    chain.then(proximo, proximo);
  }
  /* ---------- IA completa (quando o Claude está disponível para quem vê) ---------- */
  var sample = null, aiOn = false, aiBtn = document.getElementById("cbAi");
  function setAi(on) {
    aiOn = !!on && !!sample;
    if (aiBtn) { aiBtn.setAttribute("aria-pressed", String(aiOn)); aiBtn.querySelector("span").textContent = aiOn ? "IA completa ligada" : "IA completa"; }
  }
  if (aiBtn) aiBtn.addEventListener("click", function () { setAi(!aiOn); if (aiOn) add("IA completa: agora quem escreve é o modelo de IA, lendo as 5 notas mais parecidas do cérebro. Pode demorar alguns segundos.", "sys"); });
  try {
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("sample").then(function (s) { sample = s; if (s && aiBtn) aiBtn.hidden = false; }).catch(function () {});
    }
  } catch (e) {}
  /* ---------- conversa flutuante ---------- */
  var chatEl = document.querySelector(".cb-chat"), home = document.getElementById("cbChatHome"), dock = document.getElementById("cbDock"), fab = document.getElementById("cbFab");
  function openDock() {
    if (!dock || !chatEl) return;
    dock.hidden = false; dock.appendChild(chatEl); chatEl.classList.add("is-docked");
    if (home) home.hidden = false;
    if (fab) fab.hidden = true;
    start(); preparar(); setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) {} }, 60); scroll();
  }
  function closeDock() {
    if (!dock || !chatEl || !home) return;
    home.parentNode.insertBefore(chatEl, home); chatEl.classList.remove("is-docked");
    dock.hidden = true; home.hidden = true; if (fab) fab.hidden = false;
  }
  if (fab) fab.addEventListener("click", openDock);
  if (fab && "IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (!chatEl.classList.contains("is-docked")) fab.classList.toggle("is-away", e.isIntersecting); }); }, { threshold: 0.25 }).observe(chatEl);
  document.addEventListener("click", function (ev) { var b = ev.target.closest("[data-cb-open]"); if (b) { ev.preventDefault(); openDock(); } });
  var dx = document.getElementById("cbDockX"); if (dx) dx.addEventListener("click", closeDock);
  var back = document.getElementById("cbChatBack"); if (back) back.addEventListener("click", closeDock);
  msgs.addEventListener("click", function (ev) {
    var b = ev.target.closest(".cb-src button, .cb-why-row button"); if (!b) return;
    if (chatEl && chatEl.classList.contains("is-docked")) closeDock();
    var n = BY[b.getAttribute("data-id")]; if (!n) return;
    openNote(n, true);
    if (window.innerWidth < 1040) stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  });
  form.addEventListener("submit", function (ev) { ev.preventDefault(); ask(input.value); });

  /* ---------- início ---------- */
  var started = false;
  function start() {
    if (started) return; started = true;
    add("Demonstração com uma loja de exemplo. A Bia só responde com o que está no cérebro ao lado.", "sys");
    busy = true;
    say([CBEngine.fill("Oi! Aqui é a {{nome_atendente}}, da {{nome_loja}}.", {}, {}, true),
      "Pode me perguntar como se fosse cliente: celular, notebook, videogame, TV, geladeira, máquina de lavar, ar-condicionado, garantia, horário, o que quiser da assistência."], true)
      .then(function () { busy = false; if (queue.length) ask(queue.shift()); });
  }
  /* quem economiza dados só baixa o cérebro quando mexe no chat ou no mapa */
  function preparar() { baixarMapa().then(function () { if (!economia) return carregarCerebro(); }).catch(function () {}); }
  ["focus", "pointerdown"].forEach(function (ev) { input.addEventListener(ev, preparar); });
  sugs.addEventListener("pointerdown", preparar);
  stage.addEventListener("pointerdown", function () { baixarMapa().then(carregarCerebro).catch(function () {}); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) baixarMapa().catch(function () {}); });
    }, { rootMargin: "1600px 0px" }).observe(stage);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible = e.isIntersecting; if (visible) { baixarMapa().then(function () { resize(); sujar(); }).catch(function () {}); } });
    }, { rootMargin: "120px" }).observe(stage);
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { start(); preparar(); } }); }, { threshold: 0.3 }).observe(msgs);
  } else { visible = true; start(); preparar(); }
  if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); }).observe(stage); else window.addEventListener("resize", resize);
})();
