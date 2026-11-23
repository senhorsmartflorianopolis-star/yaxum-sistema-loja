/* YAXUM · motor do cérebro (busca + montagem da resposta) */
var CBEngine = (function () {
  var ABBR = {vc:"voce",vcs:"voces",voce:"voce",voces:"voces",c:"voce",ce:"voce",qnto:"quanto",qnt:"quanto",qto:"quanto",qt:"quanto",qnta:"quanta",
    q:"que",oq:"que",pq:"porque",pk:"porque",tb:"tambem",tbm:"tambem",hj:"hoje",amnh:"amanha",cel:"celular",cell:"celular",celu:"celular",
    msm:"mesmo",obg:"obrigado",obgd:"obrigado",brigado:"obrigado",vlw:"valeu",td:"tudo",tds:"todos",n:"nao",ñ:"nao",eh:"e",dps:"depois",agr:"agora",
    mt:"muito",mto:"muito",muinto:"muito",zap:"whatsapp",wpp:"whatsapp",whats:"whatsapp",zapzap:"whatsapp",watsapp:"whatsapp",ifone:"iphone",ipone:"iphone",
    iphne:"iphone",sansung:"samsung",samsumg:"samsung",sansumg:"samsung",xiomi:"xiaomi",xaomi:"xiaomi",motorolla:"motorola",pelicula:"pelicula",
    celu1ar:"celular",fone:"fone",cabo:"cabo",tela:"tela",display:"tela",visor:"tela",frontal:"frontal",carregado:"carregador",carregardor:"carregador",
    bat:"bateria",bataria:"bateria",baterria:"bateria",robo:"robo",bot:"robo",ia:"robo",humano:"humano",sab:"sabado",dom:"domingo",
    orcamento:"orcamento",orsamento:"orcamento",grana:"dinheiro",reais:"real",conto:"real",cartao:"cartao",credito:"credito",debito:"debito",
    qndo:"quando",qnd:"quando",qdo:"quando",ond:"onde",aonde:"onde",end:"endereco",ender:"endereco",agua:"agua",molhou:"molhou",
    ta:"esta",tá:"esta",to:"estou",tô:"estou",tao:"estao",tão:"estao",d:"de",p:"para",pra:"para",pro:"para",pros:"para",pras:"para",num:"nao"};
  var STOP = ("a o e de da do das dos em no na nos nas um uma uns umas que para por com se me te lhe meu minha meus minhas seu sua seus suas "+
    "ele ela eles elas eu voce voces nos isso esse essa este esta estes estas isto aqui ai la ja mais ter tem tenho tinha ta esta estou estao foi ser sou era "+
    "ao aos as os ou mas como qual quais so tambem entao ne ah la le vai vou ir fazer faz favor por gostaria queria quero saber "+
    "sim algum alguma alguem alguns tudo muito pouco mesmo agora ainda bem ok certo tipo coisa assim dai kkk kkkk kkkkk haha rs hein "+
    "pode posso podem consigo consegue da dar tipo seria sera vcs vc pq porque sobre desse dessa deste desta nesse nessa neste nesta nele nela "+
    "o que qualquer cada todo toda todos todas outro outra quando aquele aquela aqueles aquelas aquilo sai for fosse vez vezes ali nada nem daqui gente mano cara tal ta").split(" ");
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  var GREET = /^\s*(oi+e?|ola+|opa+|oie|eai|e ai|salve|hey|hello|hi|hola|bom dia|boa tarde|boa noite|boa madrugada|buen dia|buenos dias|buenas tardes|buenas noches|buenas|good morning|good afternoon|good evening|tudo bem\??|td bem\??|tudo bom\??)([\s,!.?]+|$)/;

  function fold(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function words(s) { return fold(s).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter(Boolean); }
  var SUF = ["zinhos","zinhas","zinho","zinha","inhos","inhas","inho","inha","mente","acoes","acao","cao","coes","ando","endo","indo","aram","eram","iram","ados","adas","idos","idas","ado","ada","ido","ida","ador","edor","ava","ou","eu","iu","ei","ar","er","ir","am","em","ao","as","es","os","is","a","e","o","s"];
  function stem(w) {
    if (/\d/.test(w) || w.length <= 3) return w;
    for (var i = 0; i < SUF.length; i++) {
      var x = SUF[i];
      if (w.length - x.length >= 3 && w.slice(-x.length) === x) { w = w.slice(0, -x.length); break; }
    }
    return w.length > 6 ? w.slice(0, 6) : w;
  }
  var SYN = {aquario:"agua",piscina:"agua",privada:"agua",vaso:"agua",chuva:"agua",mar:"agua",banheira:"agua",pia:"agua",lavar:"agua",molhou:"agua",molhado:"agua",molhada:"agua",
    pelando:"esquentando",fervendo:"esquentando",quente:"esquentando",quentao:"esquentando",morreu:"liga",morto:"liga",apagou:"liga",
    anuncio:"propaganda",anuncios:"propaganda",popup:"propaganda",zerar:"formatar",zerado:"formatar",zerada:"formatar",resetar:"formatar",reset:"formatar",restaurar:"formatar",
    copia:"paralela",xing:"paralela",similar:"paralela",generica:"paralela",gel:"hidrogel",credito:"cartao",debito:"cartao",cnpj:"empresa",sedex:"correio",correios:"correio",
    transportadora:"correio",jbl:"caixa",robo:"atendente",pessoa:"atendente",humano:"atendente",gaveta:"chip",bandeja:"chip",barrinha:"sinal",lanterna:"flash","4g":"sinal","5g":"sinal","3g":"sinal",operadora:"sinal"};
  /* "mãe" só é assunto em "placa-mãe". "O note da minha mãe não liga" fala de
     notebook, e sem esta linha casava com a nota de placa-mãe. Os outros
     parentes ficam: "minha irmã pode buscar?" e "meu neto mexeu" apontam para
     as notas de retirada e de cliente idoso. */
  var PARENTES = ["filho", "filha", "filhos", "pai", "avo", "vovo", "neto", "neta", "esposa", "marido",
    "namorada", "namorado", "sogra", "sogro", "tia", "tio", "sobrinho", "sobrinha", "primo", "prima"];
  /* Cada palavra vira sempre os mesmos termos, então o resultado fica guardado:
     o cérebro repete as mesmas palavras milhares de vezes e montar o índice no
     celular fica bem mais rápido. */
  var HAS = Object.prototype.hasOwnProperty;
  var TW = typeof Map === "function" ? [new Map(), new Map()] : null;
  function termWord(w, keepStop) {
    var C = TW && TW[keepStop ? 1 : 0], hit = C && C.get(w);
    if (hit) return hit;
    var w0 = w, out = [];
    if (HAS.call(ABBR, w)) w = ABBR[w];
    if (/^\d{1,2}x$/.test(w)) w = w + " parcelar";
    if (HAS.call(SYN, w)) w = w + " " + SYN[w];
    w.split(" ").forEach(function (x) { if (!x) return; if (!keepStop && STOPSET[x]) return; if (x.length < 2 && !/\d/.test(x)) return; out.push(stem(x)); });
    if (C) C.set(w0, out);
    return out;
  }
  function terms(s, keepStop) {
    var out = [], ws = words(s);
    for (var i = 0; i < ws.length; i++) {
      if (ws[i] === "mae" && ws[i - 1] !== "placa") continue;
      var r = termWord(ws[i], keepStop);
      for (var j = 0; j < r.length; j++) out.push(r[j]);
    }
    return out;
  }

  function parseNote(md) {
    var sec = {}, cur = "_intro"; sec[cur] = [];
    md.split("\n").forEach(function (l) {
      var m = /^## (.+)$/.exec(l);
      if (m) { cur = m[1].trim(); sec[cur] = []; return; }
      if (/^# /.test(l)) return;
      sec[cur].push(l);
    });
    function bl(k) { return (sec[k] || []).filter(function (l) { return /^[-*] /.test(l); }).map(function (l) { return l.replace(/^[-*] /, "").trim(); }); }
    var ans = [], g = null;
    (sec["Como responder"] || []).concat([""]).forEach(function (l) {
      if (/^>/.test(l)) {
        if (!g) g = [[]];
        var t = l.replace(/^>\s?/, "").trim();
        if (!t) { if (g[g.length - 1].length) g.push([]); } else g[g.length - 1].push(t);
      } else if (g) { ans.push(g.filter(function (b) { return b.length; }).map(function (b) { return b.join(" "); })); g = null; }
    });
    var acts = [];
    (sec["Ação no sistema"] || []).join(" ").replace(/`([a-z_]+)\(([^`]*)\)`/g, function (_, n, a) { acts.push(n + "(" + a + ")"); });
    var links = [];
    md.replace(/\[\[([^\]|#]+)/g, function (_, id) { if (links.indexOf(id) < 0) links.push(id); });
    return {
      intro: (sec._intro || []).join(" ").trim(),
      q: bl("O cliente costuma perguntar"), a: ans.filter(function (x) { return x.length; }),
      k: bl("O que a IA precisa saber"), acts: acts, links: links,
      h: bl("Quando chamar um humano"), tri: bl("Perguntas que a IA faz")
    };
  }

  var P = { k1: 1.2, b: 0.6, wT: 3, wId: 2, wQ: 2.2, wIntro: 0.5, wK: 0.35, wA: 0.3, wSim: 3, wBm: 0.6, wTcov: 2, wStar: 0.8, wDeg: 0.35, wQbm: 0, wBig: 1, thScore: 6, thQcov: 0.25, thSim: 0.2, thBm: 5.5,
    wSegSim: 1.5, wSegGeral: 0.3, wSegCelGeral: 1.5, wSegOutro: 4, wSegPrinc: 2.5, wSegFora: 8, wSegGeralCel: 0.8, wSegNaoFaz: 3, wSegNaoFazOff: 2.5 };
  
  /* A montagem do índice é feita em passos (uma nota por vez), para o site
     poder montar aos poucos, sem travar a página em celular fraco.
     build() faz tudo de uma vez; buildAsync() faz os mesmos passos em fatias. */
  function mkNote(data, a, i) {
    var p = parseNote(a[4]);
    var num = parseInt(String((data.p || [])[a[2]] || "0"), 10);
    return { id: a[0], t: a[1], c: a[2], s: a[3], md: a[4], i: i, q: p.q, a: p.a, k: p.k, acts: p.acts, links: p.links, intro: p.intro, h: p.h, tri: p.tri, seg: SEG_PASTA[num] || "geral" };
  }
  function indexNote(n, st) {
    var tf = {};
    function add(txt, w) { terms(txt).forEach(function (t) { tf[t] = (tf[t] || 0) + w; }); }
    add(n.t, P.wT); add(n.id.replace(/-/g, " "), P.wId);
    n.q.forEach(function (q) { add(q, P.wQ); });
    add(n.intro, P.wIntro); n.k.forEach(function (k) { add(k, P.wK); });
    n.a.forEach(function (g) { g.forEach(function (b) { add(b.replace(/\{\{[a-z_]+\}\}/g, " "), P.wA); }); });
    n.tf = tf; var len = 0; for (var t in tf) { len += tf[t]; st.df[t] = (st.df[t] || 0) + 1; } n.len = len; st.tot += len;
    n.qs = n.q.map(function (q) { var s = {}; terms(stripModel(q)).forEach(function (t) { s[t] = 1; }); return s; });
    n.qd = n.q.map(function (q) { var ts = terms(stripModel(q)), tf = {}, bg = {}; ts.forEach(function (t, i) { tf[t] = (tf[t] || 0) + 1; if (i) bg[ts[i - 1] + "_" + t] = 1; }); return { tf: tf, len: ts.length, bg: bg }; });
  }
  function finishBuild(notes, st) {
    var df = st.df, N = notes.length, tot = st.tot;
    var avg = tot / N, idf = {};
    for (var t in df) idf[t] = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
    var qdf = {}, qN = 0, qTot = 0;
    notes.forEach(function (n) { n.qd.forEach(function (d) { qN++; qTot += d.len; for (var t in d.tf) qdf[t] = (qdf[t] || 0) + 1; }); });
    var qidf = {}; for (var t2 in qdf) qidf[t2] = Math.log(1 + (qN - qdf[t2] + 0.5) / (qdf[t2] + 0.5));
    /* Parente pesa pouco: é raro no cérebro (então teria peso alto), mas quase
       nunca é o assunto. "O note do meu filho não liga" é sobre notebook, não
       sobre a nota em que um filho derrubou suco no note. Peso baixo, e não
       zero: "minha irmã pode buscar?" ainda precisa dele. */
    PARENTES.forEach(function (w) { var t = stem(w); if (idf[t] > 1) idf[t] = 1; if (qidf[t] > 1) qidf[t] = 1; });
    var byId = notes.reduce(function (m, n) { m[n.id] = n; return m; }, {});
    notes.forEach(function (n) { n.indeg = 0; n.tt = {}; terms(n.t).forEach(function (t) { n.tt[t] = 1; }); });
    notes.forEach(function (n) { n.links.forEach(function (l) { if (byId[l] && l !== n.id) byId[l].indeg++; }); });
    return { qidf: qidf, qavg: qTot / Math.max(qN, 1), notes: notes, byId: notes.reduce(function (m, n) { m[n.id] = n; return m; }, {}), idf: idf, avg: avg, N: N };
  }
  function build(data) {
    var notes = data.n.map(function (a, i) { return mkNote(data, a, i); });
    var st = { df: {}, tot: 0 };
    notes.forEach(function (n) { indexNote(n, st); });
    return finishBuild(notes, st);
  }
  /* Mesmo resultado de build(), em fatias de ~fatia ms com pausa entre elas. */
  function buildAsync(data, opts) {
    opts = opts || {};
    var fatia = opts.fatia || 10, now = (typeof performance !== "undefined" && performance.now) ? function () { return performance.now(); } : Date.now;
    var pausa = opts.pausa || function (fn) { setTimeout(fn, 0); };
    return new Promise(function (resolve, reject) {
      var N = data.n.length, notes = new Array(N), st = { df: {}, tot: 0 }, i = 0, fase = 0;
      function passo() {
        try {
          var t0 = now();
          while (now() - t0 < fatia) {
            if (fase === 0) { notes[i] = mkNote(data, data.n[i], i); i++; if (i >= N) { fase = 1; i = 0; } }
            else if (fase === 1) { indexNote(notes[i], st); i++; if (i >= N) { fase = 2; break; } }
          }
          if (opts.progresso) opts.progresso(fase === 0 ? i / N / 2 : fase === 1 ? 0.5 + i / N / 2 : 1);
          if (fase === 2) { pausa(function () { try { resolve(finishBuild(notes, st)); } catch (e) { reject(e); } }); return; }
          pausa(passo);
        } catch (e) { reject(e); }
      }
      pausa(passo);
    });
  }

  var META = { "variaveis-da-loja": 1, "como-a-ia-usa-o-sistema": 1, "regras-de-ouro": 1, "persona-e-tom": 1 };

  /* ---------- segmentos: de que aparelho o cliente está falando ----------
     Cada pasta pertence a um segmento. "geral" serve a qualquer aparelho;
     "celgeral" são as notas antigas de atendimento/pagamento escritas para loja
     de celular, que também servem de geral quando a loja é de celular. */
  var SEG_PASTA = { 1: "celgeral", 2: "celgeral", 3: "celular", 4: "celular", 5: "celular", 6: "celular", 7: "celular", 8: "celular",
    9: "celgeral", 10: "celgeral", 11: "celgeral", 12: "celular", 13: "celgeral", 14: "celgeral", 15: "celular", 16: "celular", 17: "celgeral",
    18: "geral", 19: "geral", 20: "visita", 21: "informatica", 22: "impressora", 23: "console", 24: "tv", 25: "geladeira", 26: "lavadora",
    27: "cozinha", 28: "ar", 29: "portatil", 30: "relogio", 31: "bike", 32: "ferramenta", 33: "camera", 34: "seguranca", 35: "eletrica",
    36: "auto", 37: "otica", 38: "geral", 39: "musica", 40: "academia" };
  var SEG_RX = {
    celular: /\b(celular|cel|cell|celu|smartphone|iphone|samsung|galaxy|xiaomi|redmi|poco|motorola|moto [ge]\d|android|zenfone|realme|infinix|chip|imei)\b/,
    informatica: /\b(notebook|note|laptop|computador|pc|desktop|macbook|imac|windows|ssd|hd externo|placa mae|placa de video|monitor|roteador|tablet|ipad|gabinete|ram)\b/,
    impressora: /\b(impressora|cartucho|toner|ecotank|scanner|multifuncional)\b/,
    console: /\b(videogame|video game|vídeo game|ps[2-5]|playstation|xbox|nintendo|switch|dualsense|steam deck|console)\b/,
    tv: /\b(tv|televisao|televisor|smart tv|soundbar|home theater|caixa de som|jbl|projetor|tv box|antena|receiver)\b/,
    geladeira: /\b(geladeira|freezer|refrigerador|frost free|expositor|frigobar)\b/,
    lavadora: /\b(maquina de lavar|lavadora|lava e seca|lava-e-seca|tanquinho|centrifuga|lava loucas|lava-loucas|lavalouca)\b/,
    cozinha: /\b(micro-?ondas|microondas|fogao|forno|cooktop|coifa|depurador|botijao)\b/,
    ar: /\b(ar condicionado|ar-condicionado|split|condensadora|evaporadora|btus?|climatizador|o ar|do ar|meu ar|pmoc)\b/,
    portatil: /\b(air ?fryer|airfryer|liquidificador|aspirador|cafeteira|batedeira|mixer|ferro de passar|secador|chapinha|panela eletrica|purificador|bebedouro|processador de alimentos)\b/,
    relogio: /\b(relogio|smartwatch|apple watch|galaxy watch|mi band|amazfit)\b/,
    bike: /\b(bicicleta|bike|patinete|e-?bike)\b/,
    ferramenta: /\b(furadeira|parafusadeira|esmerilhadeira|lixadeira|serra circular|lavadora de alta pressao|wap|karcher|rocadeira|cortador de grama|motosserra|maquina de costura|compressor|gerador)\b/,
    camera: /\b(camera fotografica|camera digital|maquina fotografica|canon|nikon|lente|objetiva|drone|dji|gopro|instax)\b/,
    seguranca: /\b(camera de seguranca|cameras de seguranca|cftv|dvr|nvr|intelbras|hikvision|portao|interfone|video porteiro|cerca eletrica|alarme da casa|fechadura digital|nobreak|estabilizador)\b/,
    eletrica: /\b(disjuntor|chuveiro|tomada|interruptor|fiacao|eletricista|encanador|encanamento|desentup\w*|aquecedor|bomba d.?agua|descarga|caixa acoplada|ventilador de teto|quadro de luz|quadro de energia)\b/,
    auto: /\b(automotivo|multimidia|som do carro|som automotivo|radio do carro|chave do carro|chave da moto|chave canivete|chave codificada|chaveiro|copia de chave|cadeado|bateria do carro|alarme do carro|trava do carro|trava eletrica|camera de re|sensor de re|sensor de estacionamento)\b/,
    otica: /\b(oculos|armacao|joia|anel|corrente de ouro|corrente de prata|costureira|barra da calca|ziper|sapato|sapataria|sola|salto|mala|mochila)\b/,
    musica: /\b(guitarra|violao|contrabaixo|cordas|captador|teclado musical|amplificador|pedal|mesa de som)\b/,
    academia: /\b(esteira|ergometrica|eliptico|balanca|maquininha|impressora termica|cadeira gamer|cadeira de escritorio|brinquedo|carrinho eletrico)\b/
  };
  function segmentos(text) {
    var f = " " + fold(text).replace(/[^a-z0-9 -]+/g, " ").replace(/\s+/g, " ") + " ", out = {};
    for (var k in SEG_RX) if (SEG_RX[k].test(f)) out[k] = 1;
    if (detectModel(text) && !out.informatica) out.celular = 1;
    if (VISITA_RX.test(f)) out.visita = 1;
    return out;
  }
  var VISITA_RX = /\b(visita|visitas|em casa|a domicilio|domicilio|na minha casa|aqui em casa|vir aqui|vem aqui|vir em casa|venha aqui|tecnico vem|tecnico ir|taxa de visita|instalacao|instalar|instala)\b/;
  function segPrior(n, det, ctx) {
    /* `principal`: o segmento-carro-chefe da loja. Sem informar, vale celular
       (a origem do cérebro); `null` = loja multisserviço, sem preferência. */
    var sg = n.seg, princ = ctx.principal === undefined ? "celular" : ctx.principal;
    var serve = function (x) { return !ctx.segmentos || ctx.segmentos.indexOf(x) >= 0; };
    /* "A loja não faz esse serviço" só ganha quando o cliente fala de um
       aparelho que a loja não atende; fora disso, ela perde para a nota do
       assunto ("vcs fazem micro solda?" é sobre microsolda, não sobre recusa). */
    if (n.id === "segmento-que-a-loja-nao-faz") {
      var fora = Object.keys(det).some(function (k) { return k !== "visita" && !serve(k); });
      return fora ? P.wSegNaoFaz : -P.wSegNaoFazOff;
    }
    if (sg === "visita") {
      if (!serve("visita")) return -P.wSegFora;
      return det.visita ? P.wSegSim : -P.wSegPrinc;
    }
    if (sg !== "geral" && sg !== "celgeral" && !serve(sg)) return -P.wSegFora;
    var aparelhos = Object.keys(det).filter(function (k) { return k !== "visita"; });
    if (aparelhos.length) {
      if (det[sg]) return P.wSegSim;
      if (sg === "geral") return P.wSegGeral;
      if (sg === "celgeral") return det.celular ? P.wSegSim * 0.5 : -P.wSegCelGeral;
      return -P.wSegOutro;
    }
    if (!princ) return 0;
    if (sg === "celgeral") return princ === "celular" ? 0 : -P.wSegCelGeral;
    if (sg === "geral") return princ === "celular" ? -P.wSegGeralCel : 0;
    return sg === princ ? 0 : -P.wSegPrinc;
  }

  var SCOPE = { "iphone-xr-e-11": /iphone (xr|11)\b/, "iphone-12": /iphone 12/, "iphone-13": /iphone 13/, "iphone-14": /iphone 14/, "iphone-15-e-16": /iphone 1[56]/,
    "iphone-17-e-mais-novos": /iphone (1[789]|air)/, "iphone-se": /iphone se/, "iphones-antigos": /iphone ([4-8]|x|xs)\b/, "galaxy-linha-a": /galaxy a/, "galaxy-linha-s": /galaxy s/ };
  function search(E, text, ctx) {
    ctx = ctx || {};
    var qt = terms(text), qs = {}, qbg = {}; qt.forEach(function (t, i) { qs[t] = 1; if (i) qbg[qt[i - 1] + "_" + t] = 1; });
    var uq = Object.keys(qs);
    if (!uq.length) return [];
    var qidf = 0; uq.forEach(function (t) { qidf += E.idf[t] || 2; });
    var last = ctx.last && E.byId[ctx.last];
    /* O segmento vale pra conversa toda: "e quanto fica?" depois de "minha
       geladeira não gela" continua sendo sobre geladeira. */
    var det = segmentos(text);
    if (Object.keys(det).length) ctx.seg = det; else if (ctx.seg) det = ctx.seg;
    var res = E.notes.filter(function (n) { return !META[n.id]; }).map(function (n) {
      var s = 0;
      uq.forEach(function (t) {
        var f = n.tf[t]; if (!f) return;
        s += (E.idf[t] || 0) * (f * (P.k1 + 1)) / (f + P.k1 * (1 - P.b + P.b * n.len / E.avg));
      });
      var best = 0, bq = 0, mi = 0, mc = 0;
      uq.forEach(function (t) { if (n.tf[t]) { mi += E.idf[t] || 2; mc++; } });
      var qcov = mi / qidf, tcov = 0;
      uq.forEach(function (t) { if (n.tt[t]) tcov++; });
      tcov /= uq.length;
      n.qs.forEach(function (set, qi) {
        var inter = 0, sz = 0, w = 0, wi = 0;
        for (var t in set) { sz++; w += E.idf[t] || 1; if (qs[t]) { inter++; wi += E.idf[t] || 1; } }
        if (!sz) return;
        var d = (2 * inter) / (sz + uq.length);
        var cov = wi / (w || 1);
        var sv = (0.55 * d + 0.45 * cov) * (qi === 0 ? 1.1 : 1); if (sv > best) { best = sv; bq = qi; }
      });
      var qbm = 0, big = 0;
      n.qd.forEach(function (d) {
        var v = 0, b = 0;
        uq.forEach(function (t) { var f = d.tf[t]; if (f) v += (E.qidf[t] || 0) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / E.qavg)); });
        for (var g in d.bg) if (qbg[g]) b++;
        if (v > qbm) qbm = v; if (b > big) big = b;
      });
      var prior = (n.s ? P.wStar : 0) + P.wDeg * Math.log(1 + n.indeg) + P.wTcov * tcov;
      if (SCOPE[n.id] && ctx.modelo && !SCOPE[n.id].test(fold(ctx.modelo))) prior -= 6;
      prior += segPrior(n, det, ctx);
      if (last) { if (last.id === n.id) prior += 1.2; else if (last.links.indexOf(n.id) >= 0) prior += 0.6; }
      return { n: n, score: P.wBm * s + P.wSim * best + P.wQbm * qbm + P.wBig * big + prior, bm: s, sim: best, bq: bq, qbm: qbm, big: big, tcov: tcov, qcov: qcov, mc: mc, nq: uq.length };
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res;
  }

  /* ---------- montagem da resposta ---------- */
  var MODEL_RX = [
    [/\biphone\s*(\d{1,2}|x[rs]?|se)(\s*(pro\s*max|pro|plus|mini|max|e))?\b/, function (m) { return "iPhone " + m[1].toUpperCase().replace(/^X([RS]?)$/, function (_, s) { return "X" + s.toUpperCase(); }) + (m[2] ? " " + m[3].replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/\s+/g, " ") : ""); }],
    [/\bipad(\s*(air|pro|mini))?(\s*\d+)?/, function (m) { return "iPad" + (m[2] ? " " + m[2][0].toUpperCase() + m[2].slice(1) : "") + (m[3] || ""); }],
    [/\bapple\s*watch/, function () { return "Apple Watch"; }],
    [/\b(galaxy\s*)?([asmjz])\s?(\d{2,3})(\s*(ultra|plus|fe|5g))?\b/, function (m, raw) { if (!m[1] && !/[asmjz]\d/.test(raw)) return null; return "Galaxy " + m[2].toUpperCase() + m[3] + (m[5] ? " " + m[5][0].toUpperCase() + m[5].slice(1) : ""); }],
    [/\bmoto\s*(g|e|edge)\s*(\d{1,3})?(\s*(power|play|plus|5g))?/, function (m) { return "Moto " + (m[1] === "edge" ? "Edge" : m[1].toUpperCase()) + (m[2] || "") + (m[4] ? " " + m[4][0].toUpperCase() + m[4].slice(1) : ""); }],
    [/\bredmi\s*(note\s*)?(\d{1,2}[a-z]?)(\s*pro)?/, function (m) { return "Redmi " + (m[1] ? "Note " : "") + m[2].toUpperCase() + (m[3] ? " Pro" : ""); }],
    [/\bpoco\s*([xfmc]\d)(\s*pro)?/, function (m) { return "Poco " + m[1].toUpperCase() + (m[2] ? " Pro" : ""); }],
    [/\biphone\b/, function () { return "seu iPhone"; }]
  ];
  var FAM = ["iphone", null, null, "", "", "", "", null];
  function stripModel(text) {
    var m = detectModel(text), f = fold(text);
    if (m && m.fam != null) f = f.replace(m.raw, " " + m.fam + " ");
    return f;
  }
  function detectModel(text) {
    var f = fold(text);
    for (var i = 0; i < MODEL_RX.length; i++) {
      var m = MODEL_RX[i][0].exec(f);
      if (m) { var r = MODEL_RX[i][1](m, f); if (r) return { name: r, raw: m[0], fam: FAM[i] }; }
    }
    return null;
  }
  var SERV = [
    [/tela|display|vidro|touch|trinc|quebr|linha|mancha|pisca|screen|pantalla/, "troca de tela", ["R$ 329,00", "R$ 489,00"], "1 dia útil"],
    [/bateria|descarreg|estuf|saude|battery/, "troca de bateria", ["R$ 189,00", "R$ 289,00"], "2 horas"],
    [/conector|carreg|entrada|charg|carga/, "troca do conector de carga", ["R$ 169,00", "R$ 229,00"], "2 horas"],
    [/camera|lente|flash|foto/, "troca da câmera", ["R$ 259,00", "R$ 389,00"], "1 dia útil"],
    [/tampa|traseir/, "troca da tampa traseira", ["R$ 149,00", "R$ 249,00"], "1 dia útil"],
    [/microfone|alto.?falante|auricular|som|ouv|escut/, "troca do alto-falante", ["R$ 149,00", "R$ 199,00"], "1 dia útil"],
    [/botao|botoes|volume|ligar/, "troca do botão", ["R$ 139,00", "R$ 179,00"], "1 dia útil"],
    [/agua|molh|oxid|placa|microsold|nao liga|reinici/, "análise e limpeza da placa", ["R$ 249,00", "R$ 349,00"], "3 a 5 dias úteis"],
    [/format|backup|lento|virus|dados|transfer|atualiz|senha/, "formatação com backup", ["R$ 99,00", "R$ 129,00"], "1 dia útil"],
    [/pelicul/, "película 3D", ["R$ 39,90", "R$ 49,90"], "10 minutos"],
    [/capa|capinha/, "capa antichoque", ["R$ 49,90", "R$ 69,90"], "na hora"]
  ];
  var PROD = [[/pelicul/, "película 3D"], [/capa|capinha/, "capa antichoque"], [/carregador|cabo|fonte/, "carregador turbo 20W"],
    [/caixinha|caixa de som|jbl/, "caixinha de som bluetooth"], [/fone|airpod/, "fone bluetooth"], [/cartao de memoria|memoria|pendrive/, "cartão de memória 64GB"],
    [/seminovo|usado/, "iPhone 12 seminovo, 128GB"]];
  var SHOP = {
    nome_loja: "Loja Exemplo", nome_atendente: "Bia", endereco: "Rua Exemplo, 100, Centro", referencia: "ao lado da padaria",
    link_maps: "maps.app/lojaexemplo", horario_semana: "de segunda a sexta, das 9h às 18h", horario_sabado: "das 9h às 13h",
    horario_domingo_feriado: "fechado", estacionamento: "vaga na rua e estacionamento pago a uma quadra", telefone_loja: "(48) 0000-0000",
    instagram: "@lojaexemplo", garantia_dias: "90 dias", taxa_diagnostico: "grátis", prazo_diagnostico: "até 1 dia útil",
    formas_pagamento: "Pix, dinheiro, débito e crédito", parcelas_max: "6x", desconto_pix: "5%",
    chave_pix: "CNPJ 00.000.000/0001-00, em nome de Loja Exemplo Ltda", link_agendamento: "lojaexemplo.yaxum.app/agenda",
    taxa_entrega: "R$ 15,00 por trecho", area_entrega: "até 5 km da loja", prazo_guarda: "90 dias após o aviso de pronto",
    planos_suporte: "o Plano Básico, com 2 aulas por mês", sobre_loja: "atende no bairro desde 2015, com bancada à vista do cliente", servicos_extras: "impressão, cópias, chip e recarga",
    segmentos_atendidos: "celular, tablet, notebook e computador, impressora, videogame, TV, smartwatch, geladeira, máquina de lavar e ar-condicionado (com visita técnica)",
    parceiros_indicados: "a Oficina Exemplo (bicicleta e ferramentas) e a Ótica Exemplo", taxa_visita: "R$ 80,00, abatida se você aprovar o conserto",
    area_visita: "Centro e bairros vizinhos, até 10 km da loja", periodos_visita: "manhã (8h às 12h) ou tarde (13h às 18h)", taxa_urgencia: "R$ 50,00",
    emite_nota: "sim, nota fiscal de serviço", taxa_armazenagem: "nenhuma nos primeiros 90 dias"
  };
  /* A loja da demonstração é multisserviço: atende estes segmentos e indica
     parceiro para o resto. Mude aqui para testar outra loja. */
  var LOJA_DEMO = { segmentos: ["celular", "informatica", "impressora", "console", "tv", "relogio", "geladeira", "lavadora", "ar", "visita"], principal: null };
  function sysVals(ctx, text, note) {
    var f = fold(text + " " + (note ? note.t + " " + note.id : ""));
    var model = ctx.modelo, iph = /iphone|ipad|apple/i.test(model || "");
    var sv = null;
    for (var i = 0; i < SERV.length; i++) if (SERV[i][0].test(fold(text))) { sv = SERV[i]; break; }
    if (!sv) for (i = 0; i < SERV.length; i++) if (SERV[i][0].test(f)) { sv = SERV[i]; break; }
    var prod = null;
    for (i = 0; i < PROD.length; i++) if (PROD[i][0].test(f)) { prod = PROD[i][1]; break; }
    return {
      modelo: model || "", servico: sv ? sv[1] : "o conserto", preco: sv ? sv[2][iph ? 1 : 0] : "R$ 199,00", prazo: sv ? sv[3] : "1 dia útil",
      metodo_protecao: "Modo de manutenção", link_termo: "lojaexemplo.yaxum.app/termo/4821", link_senha: "lojaexemplo.yaxum.app/senha/4821", hora_aceite: "14:32", numero_os: "4821", status_os: "reparo na bancada", link_acompanhamento: "lojaexemplo.yaxum.app/acompanhe/4821", pontos: "320",
      cupom: "VOLTA10", horarios_livres: "amanhã às 10h ou às 15h", produto: prod || "película 3D", estoque: "3 unidades", nome_cliente: ctx.nome || ""
    };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var SHOP_L = {
    en: { horario_semana: "Monday to Friday, 9am to 6pm", horario_sabado: "9am to 1pm", horario_domingo_feriado: "closed", formas_pagamento: "Pix, cash, debit and credit card",
      garantia_dias: "90 days", prazo_diagnostico: "up to 1 business day", taxa_diagnostico: "free", estacionamento: "street parking and a paid lot one block away", referencia: "next to the bakery", taxa_entrega: "R$ 15,00 each way", area_entrega: "up to 5 km from the store",
      segmentos_atendidos: "phones, tablets, laptops and computers, printers, game consoles, TVs, smartwatches, fridges, washing machines and air conditioning (home visits)", taxa_visita: "R$ 80,00, deducted if you approve the repair", periodos_visita: "morning (8am to 12pm) or afternoon (1pm to 6pm)" },
    es: { horario_semana: "de lunes a viernes, de 9 a 18 h", horario_sabado: "de 9 a 13 h", horario_domingo_feriado: "cerrado", formas_pagamento: "Pix, efectivo, débito y crédito",
      garantia_dias: "90 días", prazo_diagnostico: "hasta 1 día hábil", taxa_diagnostico: "gratis", estacionamento: "lugar en la calle y un estacionamiento pago a una cuadra", referencia: "al lado de la panadería", taxa_entrega: "R$ 15,00 por trayecto", area_entrega: "hasta 5 km de la tienda",
      segmentos_atendidos: "celulares, tablets, notebooks y computadoras, impresoras, consolas, TV, smartwatch, heladeras, lavarropas y aire acondicionado (con visita)", taxa_visita: "R$ 80,00, descontada si aprobás el arreglo", periodos_visita: "mañana (8 a 12 h) o tarde (13 a 18 h)" }
  };
  var PRAZO_L = { en: { "1 dia útil": "1 business day", "2 horas": "2 hours", "3 a 5 dias úteis": "3 to 5 business days", "10 minutos": "10 minutes", "na hora": "right away" },
    es: { "1 dia útil": "1 día hábil", "2 horas": "2 horas", "3 a 5 dias úteis": "3 a 5 días hábiles", "10 minutos": "10 minutos", "na hora": "en el momento" } };
  function fill(txt, ctx, vals, html) {
    var L = ctx && ctx.lang;
    if (L) {
      vals = Object.assign({}, vals);
      if (vals.prazo && PRAZO_L[L][vals.prazo]) vals.prazo = PRAZO_L[L][vals.prazo];
      vals.modelo = (vals.modelo || "").replace(/^seu /, "");
      if (!vals.modelo) vals.modelo = L === "en" ? "phone" : "celular";
    }
    var s = txt;
    if (!vals.nome_cliente) s = s.replace(/^\{\{nome_cliente\}\},?\s*/, "").replace(/,?\s*\{\{nome_cliente\}\}/g, "");
    if (/^seu /.test(vals.modelo || "")) s = s.replace(/\b(seu|teu) \{\{modelo\}\}/g, "$1 " + vals.modelo.slice(4));
    if (!vals.modelo) s = s.replace(/\b(seu|o seu|teu) \{\{modelo\}\}/g, "$1 aparelho").replace(/\{\{modelo\}\}/g, "seu aparelho");
    s = s.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[\[([^\]|#]+)(\|[^\]]+)?\]\]/g, "");
    s = s.replace(/^\s*([a-zà-ú])/, function (c) { return c.toUpperCase(); });
    var parts = s.split(/(\{\{[a-z_]+\}\})/g);
    return parts.map(function (p) {
      var m = /^\{\{([a-z_]+)\}\}$/.exec(p);
      if (!m) return html ? esc(p) : p;
      var k = m[1], shop = k in SHOP, v = shop ? ((L && SHOP_L[L][k]) || SHOP[k]) : vals[k];
      if (v == null || v === "") v = k.replace(/_/g, " ");
      if (!html) return v;
      return '<span class="v ' + (shop ? "v-loja" : "v-sis") + '" title="' + (shop ? "Configurado pela loja na implantação" : "Vem do sistema YAXUM na hora (valor ilustrativo)") + '">' + esc(v) + "</span>";
    }).join("");
  }
  function pickAnswer(n, text, ctx, E) {
    if (!n.a.length) return null;
    var qs = {}; terms(text).forEach(function (t) { if (!n.tt[t] && (E.idf[t] || 0) >= 1.2) qs[t] = 1; });
    n.id.split("-").forEach(function (w) { delete qs[stem(w)]; });
    var ft = fold(text), wantPrice = /\b(quanto|qnto|qnt|qto|valor|preco|custa|cobra|fica)\b/.test(ft), wantTime = /\b(demora|tempo|prazo|quando fica|fica pronto|hoje)\b/.test(ft);
    var scores = n.a.map(function (g) {
      var s = 0, seen = {}, gj = g.join(" ");
      if (wantPrice && /\{\{preco\}\}/.test(gj)) s += /\{\{preco\}\}/.test(g[0]) ? 2 : 0.8;
      if (wantTime && /\{\{prazo\}\}/.test(gj)) s += /\{\{prazo\}\}/.test(g[0]) ? 1.5 : 0.6;
      terms(g.join(" ").replace(/\{\{([a-z_]+)\}\}/g, function (_, v) { return " " + v.replace(/_/g, " ") + " "; })).forEach(function (t) { if (qs[t] && !seen[t]) { seen[t] = 1; s++; } });
      return s;
    });
    var used = (ctx.used[n.id] = (ctx.used[n.id] || 0));
    var idx = used % n.a.length, best = idx;
    scores.forEach(function (s, i) { if (s > scores[best]) best = i; });
    ctx.used[n.id]++;
    return n.a[best];
  }
  /* ---------- segurança primeiro ----------
     Emergência não disputa pontuação com nota de conserto: "cheiro de gás"
     perdia para "recarga de gás da geladeira" porque a palavra "gás" aparece
     mais lá. Quando a frase descreve um risco, a nota de segurança responde,
     seja qual for o segmento da loja. Para cada risco, a primeira nota cujo
     segmento bate com o que o cliente falou; senão, a primeira da lista. */
  var SEGURANCA = [
    [/\b(cheir\w* (forte )?(de |a )?gas|gas (vazando|escapando)|vazamento de gas|vazando gas|escapamento de gas|fedendo (a )?gas|fedor de gas)\b/, ["vazamento-de-gas-emergencia"]],
    [/\b(levou (um )?choque|levei (um )?choque|tomei (um )?choque|tomou (um )?choque|leva(ndo)? choque|dando choque|da choque|deu choque|fio desencapado|fio exposto|faisca na tomada|tomada (soltando |dando )?faisca|tomada derret\w*)\b/, ["choque-eletrico-emergencia"]],
    [/\b(cheiro de queimado|cheirando a queimado|saindo fumaca|soltando fumaca|fumaca saindo|fumacando|pegou fogo|pegando fogo|esta queimando|ta queimando)\b/, ["curto-e-cheiro-de-queimado", "cheiro-de-queimado-geral"]],
    [/\bbateria\b.*\b(estufad\w*|inchad\w*|estufou|inchou)\b|\b(estufou|inchou) a bateria\b/, ["bateria-estufada"]]
  ];
  function notaDeSeguranca(E, f, ctx) {
    for (var i = 0; i < SEGURANCA.length; i++) {
      if (!SEGURANCA[i][0].test(f)) continue;
      var ids = SEGURANCA[i][1].filter(function (id) { return E.byId[id]; });
      if (!ids.length) return null;
      var det = segmentos(f), apar = Object.keys(det).filter(function (k) { return k !== "visita"; });
      var certo = ids.filter(function (id) { var sg = E.byId[id].seg; return apar.length ? det[sg] : sg === "geral" || sg === "eletrica" || sg === "cozinha"; })[0];
      return E.byId[certo || ids[ids.length - 1]];
    }
    return null;
  }

  function answer(E, text, ctx) {
    ctx.used = ctx.used || {};
    var f = fold(text).trim();
    var nm = /\b(meu nome e|me chamo|aqui e (o|a)|sou (o|a))\s+([a-z]{3,})/.exec(f);
    if (nm && !/^(cliente|dono|dona|tecnico)$/.test(nm[4])) ctx.nome = nm[4][0].toUpperCase() + nm[4].slice(1);
    var mdl = detectModel(text); if (mdl) { ctx.modelo = mdl.name; if (mdl.fam != null) f = f.replace(mdl.raw, " " + mdl.fam + " ").replace(/\s+/g, " ").trim(); }
    if (nm) f = f.replace(nm[0], " ").trim();
    var greet = GREET.exec(f), rest = f;
    if (greet) rest = f.slice(greet[0].length);
    var restTerms = terms(rest);
    var target = restTerms.length ? rest : f;
    var res = search(E, target, ctx), top = res[0];
    var greetOnly = greet && !restTerms.length;
    if (greetOnly) top = { n: E.byId["saudacao-e-primeiro-contato"], score: 99, sim: 1 };
    var risco = notaDeSeguranca(E, f, ctx);
    if (risco) {
      var achado = res.filter(function (r) { return r.n.id === risco.id; })[0];
      top = achado || { n: risco, score: 99, sim: 1, qcov: 1, mc: 9, nq: 1, bm: 99 };
      res = [top].concat(res.filter(function (r) { return r.n.id !== risco.id; }));
      top = { n: top.n, score: Math.max(top.score, 99), sim: Math.max(top.sim, 1), qcov: 1, mc: 9, nq: 1, bm: 99 };
    }
    /* Aparelho que a loja não atende: a nota de recusa gentil vale mesmo com
       a pergunta curta ("vcs arrumam óculos?") — e vale também quando a nota
       que ganhou é de um segmento fora da lista. Responder "recarga de gás do
       ar" numa loja só de celular seria prometer um serviço que ela não faz. */
    var recusa = E.byId["segmento-que-a-loja-nao-faz"];
    if (!risco && recusa && top && ctx.segmentos) {
      var sgTop = top.n.seg, foraDaLista = sgTop !== "geral" && sgTop !== "celgeral" && ctx.segmentos.indexOf(sgTop) < 0;
      var pediuFora = Object.keys(segmentos(f)).some(function (k) { return k !== "visita" && ctx.segmentos.indexOf(k) < 0; });
      if (top.n.id === recusa.id ? pediuFora : foraDaLista) {
        res = [res.filter(function (r) { return r.n.id === recusa.id; })[0] || { n: recusa, score: 99, sim: 1 }].concat(res.filter(function (r) { return r.n.id !== recusa.id; }));
        top = { n: recusa, score: 99, sim: 1, qcov: 1, mc: 9, nq: 1, bm: 99 };
      }
    }
    var ok = top && ((top.score >= P.thScore && (greetOnly || top.qcov >= P.thQcov) && (top.sim >= P.thSim || top.bm >= P.thBm) && (greetOnly || top.mc >= 2 || top.nq === 1 || top.sim >= 0.5)) || (top.sim >= 0.55 && top.qcov >= 0.5) || (top.nq <= 2 && top.sim >= 0.45 && top.qcov >= 0.99 && top.score >= 3) || (!greetOnly && res[1] && top.score >= 4.5 && top.score - res[1].score >= 0.8 && top.qcov >= 0.6 && top.mc >= 2));
    if (!ok) return { res: res, greetOnly: greetOnly, ok: false, alts: res.slice(0, 3).map(function (r) { return r.n; }), bubbles: [
      "Essa eu prefiro confirmar com o técnico, pra não te passar nada errado.",
      "Quer que eu chame alguém da equipe? Se for sobre conserto, me conta o modelo e o que aconteceu."] };
    var n = top.n; ctx.last = n.id;
    ctx.lang = n.id === "cliente-que-fala-ingles" ? "en" : n.id === "cliente-que-fala-espanhol" ? "es" : null;
    var vals = sysVals(ctx, text, n), g = pickAnswer(n, target, ctx, E) || [];
    var bubbles = g.map(function (b) { return fill(b, ctx, vals, true); });
    if (!greet && bubbles.length) {
      bubbles[0] = bubbles[0].replace(/^(Oi|Olá|Opa)[!,.]?\s+/, "").replace(/^([a-zà-ú])/, function (c) { return c.toUpperCase(); });
    }
    if (greet && !greetOnly && bubbles.length) {
      var gw = /bom dia/.test(greet[0]) ? "Bom dia!" : /boa tarde/.test(greet[0]) ? "Boa tarde!" : /boa noite/.test(greet[0]) ? "Boa noite!" : "Oi!";
      if (ctx.lang === "en") gw = /morning/.test(greet[0]) ? "Good morning!" : /afternoon/.test(greet[0]) ? "Good afternoon!" : /evening/.test(greet[0]) ? "Good evening!" : "Hi!";
      if (ctx.lang === "es") gw = /buen(os)? dia/.test(greet[0]) ? "¡Buen día!" : /tardes/.test(greet[0]) ? "¡Buenas tardes!" : /noches/.test(greet[0]) ? "¡Buenas noches!" : "¡Hola!";
      if (!/^(oi|ol|bom|boa|hi|hello|good|hola|buen|¡)/i.test(fold(bubbles[0]))) bubbles[0] = gw + " " + bubbles[0];
    }
    return { res: res, greetOnly: greetOnly, ok: true, note: n, score: top.score, bubbles: bubbles, acts: n.acts, alts: res.slice(1, 4).map(function (r) { return r.n; }) };
  }
  /* O AUTOTREINO: perguntas aprendidas nas conversas da loja entram na nota
     como se tivessem sido escritas nela. O idf não é recalculado (é uma
     aproximação boa: são poucas frases perto das milhares que já existem). */
  function addQuestions(E, id, frases) {
    var n = E.byId[id]; if (!n || !frases || !frases.length) return 0;
    var feitas = 0;
    frases.forEach(function (q) {
      q = String(q || "").trim(); if (!q || n.q.indexOf(q) >= 0) return;
      n.q.push(q); feitas++;
      terms(q).forEach(function (t) { n.tf[t] = (n.tf[t] || 0) + P.wQ; n.len += P.wQ; });
      var s = {}; terms(stripModel(q)).forEach(function (t) { s[t] = 1; }); n.qs.push(s);
      var ts = terms(stripModel(q)), tf = {}, bg = {};
      ts.forEach(function (t, i) { tf[t] = (tf[t] || 0) + 1; if (i) bg[ts[i - 1] + "_" + t] = 1; });
      n.qd.push({ tf: tf, len: ts.length, bg: bg });
    });
    return feitas;
  }
  return { P: P, segmentos: segmentos, addQuestions: addQuestions, build: build, buildAsync: buildAsync, search: search, answer: answer, parseNote: parseNote, fill: fill, terms: terms, fold: fold, SHOP: SHOP, LOJA_DEMO: LOJA_DEMO, detectModel: detectModel };
})();
if (typeof module !== "undefined") module.exports = CBEngine;
