/* O cérebro da hospedagem: as mesmas notas em markdown do YAXUM, lidas
   pelo mesmo motor de busca do atendente (motor/cb-engine.cjs).

   cerebro/comum/*.md            notas que valem para todos os imóveis
   cerebro/imoveis/<nome>/       um imóvel: imovel.json (+ notas próprias .md,
                                 que substituem a comum de mesmo nome)

   A resposta sai das próprias notas, com as {{variáveis}} do imovel.json.
   Nada é inventado: se a pergunta não bate com nenhuma nota com segurança,
   ou se falta preencher alguma variável, a mensagem vai para a anfitriã. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  dobrar, detectarIdioma, classificar, soConfirmacao, tirarSaudacao, dividirFrases, dividirConjuncao,
} from './texto.js';

const require = createRequire(import.meta.url);
export const Motor = require('../motor/cb-engine.cjs');

/* No motor do YAXUM a pasta 18 é do segmento "geral": nenhuma nota de
   hospedagem ganha ou perde ponto por segmento de aparelho. */
const PASTA_MOTOR = '18 Hospedagem';

export const PADROES = {
  mensagem_emergencia: {
    pt: 'Se for uma emergência, ligue agora: Bombeiros 193, SAMU 192, Polícia 190. Sua mensagem já chegou para a anfitriã, que vai falar com você o quanto antes.',
    es: 'Si es una emergencia, llamá ahora: Bomberos 193, SAMU (ambulancia) 192, Policía 190. Tu mensaje ya le llegó a la anfitriona, que te va a contactar lo antes posible.',
    en: 'If this is an emergency, please call now: Fire department 193, Ambulance (SAMU) 192, Police 190. Your message has already reached the host, who will contact you as soon as possible.',
  },
};

const SAUDACOES = {
  pt: { dia: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite', oi: 'Oi' },
  es: { dia: '¡Buen día', tarde: '¡Buenas tardes', noite: '¡Buenas noches', oi: '¡Hola' },
  en: { dia: 'Good morning', tarde: 'Good afternoon', noite: 'Good evening', oi: 'Hi' },
};
const SOCIAIS = new Set(['saudacao', 'agradecimento']);

/* ---------- leitura das notas ---------- */
function lerNotasDaPasta(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta).filter((f) => f.endsWith('.md')).sort().map((arquivo) => {
    const md = fs.readFileSync(path.join(pasta, arquivo), 'utf8').replace(/\r\n/g, '\n');
    const id = arquivo.replace(/\.md$/, '').replace(/^\d+[-_ ]*/, '');
    const titulo = ((/^# (.+)$/m.exec(md) || [])[1] || id).trim();
    return { id, titulo, md, arquivo: path.join(pasta, arquivo) };
  });
}

function secoes(md) {
  const out = {};
  let atual = '_intro';
  out[atual] = [];
  for (const linha of md.split('\n')) {
    const m = /^## (.+)$/.exec(linha);
    if (m) { atual = m[1].trim(); out[atual] = []; continue; }
    if (/^# /.test(linha)) continue;
    out[atual].push(linha);
  }
  return out;
}

/* Mesmo formato do "Como responder" do YAXUM: cada bloco de linhas com ">"
   é uma resposta; uma linha ">" vazia separa balões da mesma resposta. */
function lerGrupos(linhas) {
  const grupos = [];
  let g = null;
  for (const l of [...linhas, '']) {
    if (/^>/.test(l)) {
      if (!g) g = [[]];
      const t = l.replace(/^>\s?/, '').trim();
      if (!t) { if (g[g.length - 1].length) g.push([]); } else g[g.length - 1].push(t);
    } else if (g) {
      grupos.push(g.filter((b) => b.length).map((b) => b.join(' ')));
      g = null;
    }
  }
  return grupos.filter((x) => x.length);
}

function analisarNota(nota) {
  const s = secoes(nota.md);
  const respostas = {};
  for (const [nome, linhas] of Object.entries(s)) {
    const m = /^como responder(?:\s*\((.+)\))?$/i.exec(nome);
    if (!m) continue;
    const tags = (m[1] || '').split(',').map((t) => dobrar(t).trim()).filter(Boolean);
    const idioma = tags.find((t) => ['pt', 'es', 'en'].includes(t)) || 'pt';
    const chave = idioma + (tags.includes('sem reserva') ? ':sem' : '');
    respostas[chave] = lerGrupos(linhas);
  }
  const regras = (s.Regras || []).filter((l) => /^[-*] /.test(l)).map((l) => dobrar(l.replace(/^[-*] /, '')));
  const usadas = new Set();
  for (const grupos of Object.values(respostas)) {
    /* {{variavel?}} com interrogação é opcional: se estiver vazia, some do texto */
    for (const g of grupos) for (const b of g) for (const m of b.matchAll(/\{\{([a-z_]+)(\?)?\}\}/g)) if (!m[2]) usadas.add(m[1]);
  }
  return {
    ...nota,
    respostas,
    variaveis: [...usadas],
    soComReserva: regras.some((r) => /reserva confirmada|so com reserva/.test(r)),
    avisar: regras.some((r) => /avisar/.test(r)),
  };
}

/* ---------- variáveis ---------- */
function valorBruto(imovel, chave, idioma) {
  const t = imovel.traducoes && imovel.traducoes[idioma];
  if (t && t[chave] != null && String(t[chave]).trim() !== '') return String(t[chave]);
  const v = imovel.variaveis[chave];
  if (v != null && String(v).trim() !== '') return String(v);
  if (PADROES[chave]) return PADROES[chave][idioma] || PADROES[chave].pt;
  return null;
}

function preencher(texto, imovel, idioma) {
  const faltam = [];
  let s = String(texto)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\[([^\]|#]+)(\|[^\]]+)?\]\]/g, '');
  for (let passo = 0; passo < 3 && /\{\{[a-z_]+\??\}\}/.test(s); passo++) {
    s = s.replace(/\{\{([a-z_]+)(\?)?\}\}/g, (_, k, opcional) => {
      const v = valorBruto(imovel, k, idioma);
      if (v == null) { if (!opcional && !faltam.includes(k)) faltam.push(k); return ''; }
      return v;
    });
  }
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?])/g, '$1').trim();
  return { texto: s, faltam };
}

/** Texto de uma variável já preenchido (ex.: mensagem_espera). */
export function textoDaVariavel(imovel, chave, idioma = 'pt') {
  const bruto = valorBruto(imovel, chave, idioma);
  if (bruto == null) return '';
  const r = preencher(bruto, imovel, idioma);
  return r.faltam.length ? '' : r.texto;
}

/* ---------- casas e dados privados ---------- */
function lerJson(arq, pasta) {
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) {
    throw new Error(`O arquivo ${path.relative(pasta, arq)} tem erro de formato: ${e.message}`);
  }
}

/**
 * Dados privados (senha do Wi-Fi, endereço, código da porta) não vão para o
 * GitHub. Ficam em cerebro/privado.json (fora do git) e/ou na variável de
 * ambiente CEREBRO_PRIVADO (o mesmo JSON numa linha só). Formato:
 *   { "<casa ou imóvel>": { "wifi_senha": "...", "traducoes": { "es": { ... } } } }
 * A variável de ambiente vence o arquivo.
 */
export function lerPrivado(pasta, env = process.env) {
  const dados = {};
  const somar = (obj, origem) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(`${origem} precisa ser um objeto JSON.`);
    for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) dados[k] = { ...(dados[k] || {}), ...v };
  };
  const arq = path.join(pasta, 'privado.json');
  if (fs.existsSync(arq)) somar(lerJson(arq, pasta), 'cerebro/privado.json');
  if (env.CEREBRO_PRIVADO && env.CEREBRO_PRIVADO.trim()) {
    let obj;
    try { obj = JSON.parse(env.CEREBRO_PRIVADO); } catch (e) { throw new Error(`CEREBRO_PRIVADO tem erro de formato: ${e.message}`); }
    somar(obj, 'CEREBRO_PRIVADO');
  }
  return dados;
}

/* Junta as camadas de dados de um imóvel, da mais geral para a mais
   específica. Campo vazio ("") não apaga o que veio antes; null apaga.
   Quando uma camada define o texto em português, as traduções antigas
   daquele campo caem, para o hóspede em espanhol/inglês não receber uma
   versão desatualizada. */
function juntarCamadas(camadas) {
  const variaveis = {};
  const traducoes = {};
  for (const c of camadas) {
    if (!c) continue;
    const { traducoes: tr = {}, ...vars } = c.variaveis ? { ...c.variaveis, traducoes: c.traducoes } : c;
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith('_')) continue;
      if (v === null) { delete variaveis[k]; } else if (String(v).trim() === '') { continue; } else { variaveis[k] = String(v); }
      for (const idioma of Object.keys(traducoes)) delete traducoes[idioma][k];
    }
    for (const [idioma, campos] of Object.entries(tr || {})) {
      traducoes[idioma] = traducoes[idioma] || {};
      for (const [k, v] of Object.entries(campos || {})) {
        if (v === null) delete traducoes[idioma][k];
        else if (String(v).trim() !== '') traducoes[idioma][k] = String(v);
      }
    }
  }
  return { variaveis, traducoes };
}

/* ---------- carga ---------- */
/**
 * @param {string} pasta  pasta do cérebro (com comum/ e imoveis/)
 * @param {{ ligacoes?: Record<string,string>, privado?: object }} [opcoes]
 *   ligacoes: ligações extras id-da-Hostex → imóvel (usado na simulação)
 *   privado: dados privados (padrão: cerebro/privado.json + CEREBRO_PRIVADO)
 *
 * Um imóvel pode herdar de uma casa: "casa": "alvenaria" no imovel.json lê
 * imoveis/_casas/alvenaria.json (Wi-Fi, endereço, horários de todos os
 * anúncios daquela casa). O que o imovel.json define vence a casa.
 */
export function carregarCerebro(pasta, { ligacoes = {}, privado } = {}) {
  const comuns = lerNotasDaPasta(path.join(pasta, 'comum'));
  const pastaImoveis = path.join(pasta, 'imoveis');
  const dadosPrivados = privado || lerPrivado(pasta);
  const imoveis = new Map();
  const porHostex = new Map();
  const avisos = [];
  const casas = new Map();
  const lerCasa = (casa, quem) => {
    if (!casas.has(casa)) {
      const arq = path.join(pastaImoveis, '_casas', `${casa}.json`);
      if (!/^[a-z0-9-]+$/i.test(casa) || !fs.existsSync(arq)) throw new Error(`${quem} usa "casa": "${casa}", mas não existe imoveis/_casas/${casa}.json.`);
      casas.set(casa, lerJson(arq, pasta));
    }
    return casas.get(casa);
  };
  const nomes = fs.existsSync(pastaImoveis) ? fs.readdirSync(pastaImoveis).sort() : [];
  for (const nome of nomes) {
    const dir = path.join(pastaImoveis, nome);
    const arq = path.join(dir, 'imovel.json');
    if (nome.startsWith('_') || !fs.statSync(dir).isDirectory() || !fs.existsSync(arq)) continue;
    const cfg = lerJson(arq, pasta);
    const casa = cfg.casa ? lerCasa(String(cfg.casa), `${nome}/imovel.json`) : null;
    const dados = juntarCamadas([
      casa,
      cfg.casa ? dadosPrivados[cfg.casa] : null,
      { variaveis: cfg.variaveis || {}, traducoes: cfg.traducoes || {} },
      dadosPrivados[nome],
    ]);
    const desligadas = new Set((cfg.notas_desligadas || []).map(String));
    const mapa = new Map(comuns.map((n) => [n.id, n]));
    for (const n of lerNotasDaPasta(dir)) mapa.set(n.id, n);
    const analisadas = [...mapa.values()].filter((n) => !desligadas.has(n.id)).map(analisarNota);
    if (!analisadas.length) { avisos.push(`${nome}: nenhuma nota encontrada.`); continue; }

    const E = Motor.build({ p: [PASTA_MOTOR], n: analisadas.map((n) => [n.id, n.titulo, 0, 0, n.md]) });
    const imovel = {
      nome,
      titulo: cfg.nome || nome,
      casa: cfg.casa || null,
      hostexIds: (cfg.hostex_ids || []).map(String).filter(Boolean),
      variaveis: dados.variaveis,
      traducoes: dados.traducoes,
      notas: Object.fromEntries(analisadas.map((n) => [n.id, n])),
      E,
    };
    const faltando = {};
    for (const n of analisadas) {
      for (const v of n.variaveis) if (valorBruto(imovel, v, 'pt') == null) (faltando[v] = faltando[v] || []).push(n.id);
    }
    imovel.faltando = faltando;
    if (Object.keys(faltando).length) {
      avisos.push(`${nome}: falta preencher ${Object.keys(faltando).join(', ')} (até lá, essas perguntas vão para a anfitriã).`);
    }
    if (!imovel.hostexIds.length && nome !== 'exemplo') {
      avisos.push(`${nome}: ainda não está ligado a nenhum imóvel da Hostex (preencha "hostex_ids" no imovel.json).`);
    }
    for (const hid of imovel.hostexIds) {
      if (porHostex.has(hid)) throw new Error(`O imóvel da Hostex ${hid} está em dois cérebros: ${porHostex.get(hid)} e ${nome}.`);
      porHostex.set(hid, nome);
    }
    imoveis.set(nome, imovel);
  }
  for (const chave of Object.keys(dadosPrivados)) {
    if (!casas.has(chave) && !imoveis.has(chave)) avisos.push(`dados privados para "${chave}", mas não existe casa nem imóvel com esse nome (erro de digitação?).`);
  }
  for (const [hid, nome] of Object.entries(ligacoes)) {
    if (!imoveis.has(nome)) throw new Error(`Ligação para imóvel inexistente: ${nome}`);
    porHostex.set(String(hid), nome);
  }
  return {
    imoveis,
    avisos,
    imovelPorHostexId: (id) => (id == null ? null : imoveis.get(porHostex.get(String(id))) || null),
    imovel: (nome) => imoveis.get(nome) || null,
    responder,
  };
}

/* ---------- busca (o motor do YAXUM) ---------- */
export function buscar(imovel, texto) {
  const res = Motor.search(imovel.E, texto, { principal: null });
  const top = res[0];
  if (!top) return { ok: false, res };
  const P = Motor.P;
  /* Mesmo critério de confiança do atendente do YAXUM (CBEngine.answer). */
  const ok = (top.score >= P.thScore && top.qcov >= P.thQcov && (top.sim >= P.thSim || top.bm >= P.thBm) && (top.mc >= 2 || top.nq === 1 || top.sim >= 0.5))
    || (top.sim >= 0.55 && top.qcov >= 0.5)
    || (top.nq <= 2 && top.sim >= 0.45 && top.qcov >= 0.99 && top.score >= 3)
    || (res[1] && top.score >= 4.5 && top.score - res[1].score >= 0.8 && top.qcov >= 0.6 && top.mc >= 2);
  /* Trava extra da hospedagem: com poucas notas, duas podem empatar ("qual a
     senha?" é do Wi-Fi ou da porta?). Empate técnico vai para a anfitriã. */
  const seg = res[1];
  const empate = Boolean(seg && seg.qcov >= top.qcov - 0.05
    && (top.score - seg.score < 0.6 || (top.score - seg.score < 1 && seg.sim >= top.sim - 0.08)));
  return { ok: Boolean(ok) && !empate, empate, nota: imovel.notas[top.n.id], top, res };
}

const temConteudo = (s) => Motor.terms(s).length > 0;
const resumir = (s) => (s.length > 80 ? s.slice(0, 77) + '…' : s);

/* Uma frase pode ter duas perguntas ("que horas é o check-in e tem
   estacionamento?"). Só separa quando cada pedaço acha a sua nota com
   segurança e a nota da frase inteira é uma delas: pedaço solto como "que
   horas" não pode ganhar sozinho. */
function entender(imovel, frase) {
  const inteira = buscar(imovel, frase);
  const partes = dividirConjuncao(frase).filter(temConteudo);
  if (partes.length > 1 && inteira.top) {
    const rs = partes.map((p) => buscar(imovel, p));
    const ids = rs.map((r) => r.nota && r.nota.id);
    if (rs.every((r) => r.ok) && ids.includes(inteira.top.n.id)) return rs.map((r) => r.nota);
  }
  return inteira.ok ? [inteira.nota] : null;
}

function escolherGrupo(nota, idioma, temReserva) {
  const ordem = [];
  if (!temReserva) ordem.push(`${idioma}:sem`, 'pt:sem');
  if (temReserva || !nota.soComReserva) ordem.push(idioma, 'pt');
  for (const k of ordem) if (nota.respostas[k] && nota.respostas[k].length) return nota.respostas[k][0];
  return null;
}

function abertura(idioma, tipo, nome) {
  const g = SAUDACOES[idioma][tipo || 'oi'];
  if (!nome) return `${g}!`;
  return idioma === 'en' && tipo === 'oi' ? `${g} ${nome}!` : `${g}, ${nome}!`;
}

function primeiroNome(nome) {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  if (!/^[\p{L}'-]{2,}$/u.test(p)) return '';
  return p[0].toUpperCase() + p.slice(1);
}

/**
 * Decide o que fazer com a mensagem do hóspede.
 * Devolve { acao: 'responder' | 'escalar' | 'emergencia' | 'ignorar', motivo, aviso, resposta?, notas?, avisar?, idioma }.
 * "motivo" pode citar o texto do hóspede (vai na nota privada da Hostex);
 * "aviso" é só a categoria (vai para o celular, sem dado do hóspede).
 */
export function responder(imovel, texto, { temReserva = false, nomeHospede = '' } = {}) {
  const idioma = detectarIdioma(texto);
  const escalar = (motivo, aviso) => ({ acao: 'escalar', motivo, aviso, idioma });

  const risco = classificar(texto);
  if (risco && risco.tipo === 'emergencia') {
    return { acao: 'emergencia', motivo: `o hóspede escreveu "${risco.trecho}"`, aviso: 'possível emergência', resposta: textoDaVariavel(imovel, 'mensagem_emergencia', idioma), idioma };
  }
  if (risco) return escalar(`${risco.motivo} ("${risco.trecho}")`, risco.motivo);
  if (soConfirmacao(texto)) return { acao: 'ignorar', motivo: 'só confirmação (ok, beleza, emoji)', aviso: '', idioma };

  let saud = null;
  const achadas = [];
  for (const frase of dividirFrases(texto)) {
    const { tipo, resto } = tirarSaudacao(frase);
    if (tipo && !saud) saud = tipo;
    if (!temConteudo(resto) || soConfirmacao(resto)) continue;
    const notas = entender(imovel, resto);
    if (!notas) return escalar(`não tenho resposta segura para "${resumir(resto)}"`, 'pergunta que eu não sei responder');
    achadas.push(...notas);
  }

  let notas = [...new Map(achadas.map((n) => [n.id, n])).values()];
  if (notas.length > 1) notas = notas.filter((n) => !SOCIAIS.has(n.id));
  if (!notas.length && saud && imovel.notas.saudacao) notas = [imovel.notas.saudacao];
  if (!notas.length) return escalar('não achei pergunta que eu reconheça', 'pergunta que eu não sei responder');
  if (notas.length > 4) return escalar('muitas perguntas numa mensagem só', 'muitas perguntas numa mensagem só');

  const corpos = [];
  for (const n of notas) {
    const grupo = escolherGrupo(n, idioma, temReserva);
    if (!grupo) return escalar(`"${n.titulo}" só vai para hóspede com reserva confirmada`, 'pergunta só para hóspede com reserva');
    const r = preencher(grupo.join('\n\n'), imovel, idioma);
    if (r.faltam.length) return escalar(`falta preencher ${r.faltam.join(', ')} em ${imovel.nome}${imovel.casa ? ` (casa ${imovel.casa})` : ''} (nota "${n.titulo}")`, `falta preencher ${r.faltam.join(', ')}`);
    corpos.push(r.texto);
  }
  if (saud) corpos[0] = `${abertura(idioma, saud, primeiroNome(nomeHospede))} ${corpos[0]}`;
  return {
    acao: 'responder',
    motivo: notas.map((n) => n.titulo).join(' + '),
    aviso: notas.map((n) => n.titulo).join(' + '),
    resposta: corpos.join('\n\n'),
    notas: notas.map((n) => n.id),
    avisar: notas.some((n) => n.avisar),
    idioma,
  };
}
