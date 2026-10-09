/* Gera os arquivos do cérebro que a página de vendas baixa sob demanda:
     pub/cerebro-mapa.json  mapa leve (títulos, pastas, posições já calculadas, ligações e números)
     pub/cerebro.json       o cérebro completo (notas em markdown) para o chat e a leitura das notas
     pub/cerebro-compactado.txt  o mesmo cérebro em gzip + base64 (o navegador descompacta quando sabe)
   O layout do mapa é calculado aqui, uma vez, para o celular não ter que calcular. */
var fs = require("fs"), zlib = require("zlib"), path = require("path");
var CBEngine = require("./cb-engine.js");
var SRC = process.argv[2] || path.join(__dirname, "..", "cerebro.json");
var OUT = process.argv[3] || path.join(__dirname, "..");
fs.mkdirSync(OUT, { recursive: true });

var raw = fs.readFileSync(SRC, "utf8");
var DATA = JSON.parse(raw);
var E = CBEngine.build(DATA);
var NOTES = E.notes, BY = E.byId;
var PASTAS = DATA.p.map(function (p) { return p.replace(/^\d+\s+/, ""); });

/* mesmas ligações e números que a página mostrava */
var edgesSet = {}, EDGES = [];
NOTES.forEach(function (n) {
  n.links.forEach(function (l) {
    if (!BY[l] || l === n.id) return;
    var k = n.id < l ? n.id + "|" + l : l + "|" + n.id;
    if (!edgesSet[k]) { edgesSet[k] = 1; EDGES.push([n, BY[l]]); }
  });
});
NOTES.forEach(function (n) { n.deg = 0; });
EDGES.forEach(function (e) { e[0].deg++; e[1].deg++; });
var nQ = 0, nA = 0, nW = 0;
NOTES.forEach(function (n) { nQ += n.q.length; nA += n.a.length; nW += (n.md.match(/[A-Za-zÀ-ú0-9]+/g) || []).length; });

/* layout por força: o mesmo algoritmo que rodava no navegador */
var C = PASTAS.length;
NOTES.forEach(function (n, i) {
  var a = (n.c / C) * Math.PI * 2 - Math.PI / 2;
  n.cx = Math.cos(a) * 560; n.cy = Math.sin(a) * 340;
  var j = (i * 137.5) * Math.PI / 180, rr = 20 + (i % 7) * 9;
  n.x = n.cx + Math.cos(j) * rr; n.y = n.cy + Math.sin(j) * rr; n.vx = 0; n.vy = 0;
});
var alpha = 1;
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
  NOTES.forEach(function (n) {
    n.vx += (n.cx - n.x) * 0.012 * alpha; n.vy += (n.cy - n.y) * 0.012 * alpha;
    n.vx *= 0.82; n.vy *= 0.82; var sp = Math.hypot(n.vx, n.vy); if (sp > 25) { n.vx *= 25 / sp; n.vy *= 25 / sp; } n.x += n.vx; n.y += n.vy;
  });
  alpha = Math.max(alpha * 0.985, 0.0);
}
for (var k = 0; k < 420; k++) tick();
alpha = 0.02;
while (alpha > 0.004) tick();

var idx = {}; NOTES.forEach(function (n, i) { idx[n.id] = i; });
var mapa = {
  v: 1,
  p: PASTAS,
  /* [id, título, pasta, principal, x, y] */
  n: NOTES.map(function (n) { return [n.id, n.t, n.c, n.s, Math.round(n.x * 10) / 10, Math.round(n.y * 10) / 10]; }),
  e: EDGES.map(function (e) { return [idx[e[0].id], idx[e[1].id]]; }),
  st: { notas: NOTES.length, perguntas: nQ, respostas: nA, ligacoes: EDGES.length, palavras: nW }
};
var mapaTxt = JSON.stringify(mapa);
var cheio = JSON.stringify(DATA);
fs.writeFileSync(path.join(OUT, "cerebro-mapa.json"), mapaTxt);
fs.writeFileSync(path.join(OUT, "cerebro.json"), cheio);
/* o cérebro em gzip, escrito em base64 num .txt (o artefato só serve tipos de texto e mídia):
   ~1,2 MB em vez de 3,2 MB para quem tem internet lenta e o servidor não compacta */
fs.writeFileSync(path.join(OUT, "cerebro-compactado.txt"), zlib.gzipSync(Buffer.from(cheio, "utf8"), { level: 9 }).toString("base64"));
try { fs.unlinkSync(path.join(OUT, "cerebro.bin")); } catch (e) {}
function kb(f) { return Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + " KB"; }
console.log("mapa", kb("cerebro-mapa.json"), "· cérebro", kb("cerebro.json"), "· compactado", kb("cerebro-compactado.txt"), "·", NOTES.length, "notas,", EDGES.length, "ligações,", nQ, "perguntas,", Math.round(nW / 1000), "mil palavras");
