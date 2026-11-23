/* Memória do servidor, gravada num JSON pequeno:
   - avisos (event_id) e mensagens já tratados, para nunca responder duas vezes;
   - textos que o YAXUM enviou, para saber quando quem escreveu foi a anfitriã;
   - quantas respostas automáticas cada conversa recebeu hoje;
   - quando foi mandada a "mensagem de espera" em cada conversa. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIA = 24 * 60 * 60 * 1000;
const resumo = (texto) => crypto.createHash('sha1')
  .update(String(texto || '').replace(/\s+/g, ' ').trim().toLowerCase())
  .digest('hex').slice(0, 16);

export function criarEstado(arquivo, { agora = () => Date.now(), log = console } = {}) {
  let d = { eventos: {}, mensagens: {}, enviadas: {}, respostas: {}, esperas: {} };
  if (arquivo && fs.existsSync(arquivo)) {
    try { d = { ...d, ...JSON.parse(fs.readFileSync(arquivo, 'utf8')) }; } catch (e) {
      log.warn(`[estado] não consegui ler ${arquivo} (${e.message}); começando do zero.`);
    }
  }

  function hoje() {
    return new Date(agora()).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  }

  let pendente = null;
  function gravarAgora() {
    if (pendente) { clearTimeout(pendente); pendente = null; }
    if (!arquivo) return;
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const tmp = `${arquivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(d));
    fs.renameSync(tmp, arquivo);
  }
  function salvar() {
    if (!arquivo || pendente) return;
    pendente = setTimeout(() => { pendente = null; try { gravarAgora(); } catch (e) { log.error(`[estado] erro ao gravar: ${e.message}`); } }, 300);
    if (pendente.unref) pendente.unref();
  }

  function limpar() {
    const corte = agora() - 7 * DIA;
    for (const k of ['eventos', 'mensagens', 'esperas']) {
      for (const [id, t] of Object.entries(d[k])) if (t < corte) delete d[k][id];
    }
    for (const [c, lista] of Object.entries(d.enviadas)) {
      d.enviadas[c] = lista.filter((x) => x.t >= corte);
      if (!d.enviadas[c].length) delete d.enviadas[c];
    }
    const dia = hoje();
    for (const [c, r] of Object.entries(d.respostas)) if (r.dia !== dia) delete d.respostas[c];
  }
  limpar();

  return {
    /** true se o aviso já chegou antes (e marca como visto). */
    eventoVisto(id) {
      if (!id) return false;
      if (d.eventos[id]) return true;
      d.eventos[id] = agora(); salvar();
      return false;
    },
    mensagemTratada: (id) => Boolean(id && d.mensagens[id]),
    marcarTratadas(ids) {
      for (const id of ids) if (id) d.mensagens[id] = agora();
      salvar();
    },
    registrarEnviada(conversa, texto) {
      (d.enviadas[conversa] = d.enviadas[conversa] || []).push({ h: resumo(texto), t: agora() });
      salvar();
    },
    enviadaPorNos: (conversa, texto) => (d.enviadas[conversa] || []).some((x) => x.h === resumo(texto)),
    respostasHoje(conversa) {
      const r = d.respostas[conversa];
      return r && r.dia === hoje() ? r.n : 0;
    },
    contarResposta(conversa) {
      const dia = hoje();
      const r = d.respostas[conversa];
      d.respostas[conversa] = r && r.dia === dia ? { dia, n: r.n + 1 } : { dia, n: 1 };
      salvar();
    },
    esperaRecente: (conversa, horas) => Boolean(d.esperas[conversa] && agora() - d.esperas[conversa] < horas * 3600000),
    marcarEspera(conversa) { d.esperas[conversa] = agora(); salvar(); },
    limpar() { limpar(); salvar(); },
    gravarAgora,
  };
}
