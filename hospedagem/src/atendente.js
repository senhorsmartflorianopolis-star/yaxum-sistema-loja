/* O atendente: recebe o aviso da Hostex, espera o hóspede terminar de
   escrever, lê a conversa, decide com o cérebro e responde (ou passa para
   a anfitriã). Todas as dependências entram por parâmetro, para os testes
   rodarem com uma Hostex falsa. */
import { textoDaVariavel } from './cerebro.js';

const fmtHora = (ms) => new Date(ms).toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});
const cortar = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

/** Junta uma linha à nota da conversa sem apagar o que a anfitriã escreveu. */
export function juntarNota(atual, linha, limite = 5000) {
  const linhas = [...String(atual || '').split('\n').filter((l) => l.trim() !== ''), linha];
  let texto = linhas.join('\n');
  while (texto.length > limite) {
    const i = linhas.findIndex((l) => l.startsWith('[YAXUM'));
    if (i < 0 || i === linhas.length - 1) { texto = texto.slice(texto.length - limite); break; }
    linhas.splice(i, 1);
    texto = linhas.join('\n');
  }
  return texto;
}

export function criarAtendente({
  config, hostex, cerebro, estado,
  log = console,
  agora = () => Date.now(),
  agendar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (t) => clearTimeout(t),
  avisar = null,
}) {
  const timers = new Map();
  const emAndamento = new Set();
  const registro = [];
  const teste = config.modo !== 'automatico';

  function registrar(item) {
    const linha = { quando: new Date(agora()).toISOString(), modo: config.modo, ...item };
    registro.unshift(linha);
    if (registro.length > 200) registro.length = 200;
    const texto = `[${linha.acao}] conversa ${item.conversa}${item.hospede ? ` (${item.hospede})` : ''}: ${item.motivo}`;
    (item.acao === 'erro' ? log.error : log.info).call(log, texto);
    return linha;
  }

  const canalPermitido = (canal) => config.canais.includes('todos') || config.canais.includes(String(canal || '').toLowerCase());

  /* ---------- entrada: aviso da Hostex ---------- */
  function receberEvento(evento) {
    if (!evento || typeof evento !== 'object') return { ok: false, motivo: 'aviso sem corpo' };
    if (estado.eventoVisto(evento.event_id)) return { ok: true, motivo: 'aviso repetido' };
    if (evento.event !== 'message_created') return { ok: true, motivo: `evento ${evento.event || '?'} ignorado` };
    if (!evento.conversation_id) return { ok: false, motivo: 'aviso sem conversation_id' };
    agendarConversa(String(evento.conversation_id));
    return { ok: true, motivo: 'agendado' };
  }

  /* Espera alguns segundos: o hóspede costuma mandar "oi" e a pergunta
     em mensagens separadas. Cada mensagem nova reinicia a espera. */
  function agendarConversa(id, ms = config.aguardarSegundos * 1000) {
    if (timers.has(id)) cancelar(timers.get(id));
    timers.set(id, agendar(() => {
      timers.delete(id);
      return processar(id).catch((e) => registrar({ conversa: id, acao: 'erro', motivo: e.message }));
    }, ms));
  }

  async function processar(id) {
    if (emAndamento.has(id)) { agendarConversa(id, 5000); return null; }
    emAndamento.add(id);
    try { return await processarAgora(id); } finally { emAndamento.delete(id); }
  }

  /* ---------- o coração ---------- */
  async function processarAgora(id) {
    const conv = await hostex.conversa(id);
    if (!conv) return registrar({ conversa: id, acao: 'ignorado', motivo: 'conversa não encontrada na Hostex' });
    const hospede = (conv.guest && conv.guest.name) || '';
    const base = { conversa: id, hospede, canal: conv.channel_type };
    const fim = (acao, motivo, extra = {}) => registrar({ ...base, acao, motivo, ...extra });

    if (!canalPermitido(conv.channel_type)) return fim('ignorado', `canal ${conv.channel_type} fora de CANAIS`);
    if (/yaxum\s*(off|pausa|pausado|desligad)/i.test(conv.note || '')) return fim('ignorado', 'pausado pela nota da conversa ("yaxum off")');

    const msgs = [...(conv.messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let i = msgs.length;
    while (i > 0 && msgs[i - 1].sender_role === 'guest') i--;
    const pendentes = msgs.slice(i).filter((m) => !estado.mensagemTratada(m.id));
    if (!pendentes.length) return fim('ignorado', 'nenhuma mensagem nova do hóspede');

    const t = agora();
    const ultima = pendentes[pendentes.length - 1];
    if (t - new Date(ultima.created_at).getTime() > config.idadeMaximaMin * 60000) {
      estado.marcarTratadas(pendentes.map((m) => m.id));
      return fim('ignorado', 'mensagem antiga demais para resposta automática');
    }
    const humanoAgora = msgs.slice(0, i).some((m) => m.sender_role === 'host'
      && t - new Date(m.created_at).getTime() < config.pausaSeHumanoMin * 60000
      && !estado.enviadaPorNos(id, m.content));
    if (humanoAgora) {
      estado.marcarTratadas(pendentes.map((m) => m.id));
      return fim('ignorado', 'a anfitriã respondeu há pouco; a conversa fica com ela');
    }

    const atividades = conv.activities || [];
    const atividade = atividades.find((a) => a.activity_type === 'reservation' && a.property) || atividades.find((a) => a.property) || null;
    const propriedade = atividade && atividade.property ? atividade.property : null;
    const imovel = propriedade ? cerebro.imovelPorHostexId(propriedade.id) : null;
    const temReserva = atividades.some((a) => a.activity_type === 'reservation');
    const texto = pendentes.map((m) => m.content || '').join('\n').trim();
    const naoTexto = pendentes.find((m) => m.display_type && m.display_type !== 'Text');

    let decisao;
    if (!imovel) {
      decisao = { acao: 'escalar', motivo: propriedade ? `o imóvel "${propriedade.title || propriedade.id}" (Hostex ${propriedade.id}) não está ligado a nenhum cérebro` : 'conversa sem imóvel identificado', aviso: 'imóvel não ligado ao YAXUM' };
    } else if (naoTexto) {
      decisao = { acao: 'escalar', motivo: naoTexto.display_type === 'FileAttachment' ? 'o hóspede mandou foto ou arquivo' : `pedido do tipo ${naoTexto.display_type} precisa de você`, aviso: naoTexto.display_type === 'FileAttachment' ? 'foto ou arquivo do hóspede' : 'pedido de reserva ou oferta' };
    } else if (!texto) {
      decisao = { acao: 'ignorar', motivo: 'mensagem vazia', aviso: '' };
    } else if (estado.respostasHoje(id) >= config.limiteRespostasDia) {
      decisao = { acao: 'escalar', motivo: `já respondi ${config.limiteRespostasDia} vezes hoje nessa conversa`, aviso: 'limite diário de respostas automáticas' };
    } else {
      decisao = cerebro.responder(imovel, texto, { temReserva, nomeHospede: hospede });
    }
    estado.marcarTratadas(pendentes.map((m) => m.id));
    return executar(conv, { ...base, imovel: imovel ? imovel.nome : null, pergunta: cortar(texto, 500) }, decisao, imovel);
  }

  /* ---------- saída ---------- */
  async function anotar(conv, linha) {
    if (!config.anotar) return;
    try { await hostex.anotar(conv.id, juntarNota(conv.note, linha)); } catch (e) {
      log.error(`[nota] não consegui anotar na conversa ${conv.id}: ${e.message}`);
    }
  }

  async function alertar(titulo, texto, urgente = false) {
    if (!avisar) return;
    try { await avisar({ titulo: teste ? `[teste] ${titulo}` : titulo, texto, urgente }); } catch (e) {
      log.error(`[aviso] falhou: ${e.message}`);
    }
  }

  async function enviar(conv, base, texto) {
    await hostex.enviar(base.conversa, texto);
    estado.registrarEnviada(base.conversa, texto);
  }

  async function executar(conv, base, d, imovel) {
    conv.id = conv.id || base.conversa;
    const quando = fmtHora(agora());
    /* o aviso no celular passa por um serviço de fora: só o imóvel, sem nome do hóspede */
    const quem = imovel ? imovel.titulo : 'Hostex';
    const extra = { pergunta: base.pergunta, resposta: d.resposta || null, notas: d.notas || null, imovel: base.imovel };
    const reg = (acao, motivo) => registrar({ ...base, ...extra, acao, motivo });

    if (d.acao === 'ignorar') return reg('ignorado', d.motivo);

    if (teste) {
      if (d.acao === 'responder') {
        await anotar(conv, `[YAXUM teste ${quando}] Eu responderia: "${cortar(d.resposta, 400)}"`);
        return reg('responderia', d.motivo);
      }
      await anotar(conv, `[YAXUM teste ${quando}] ${d.acao === 'emergencia' ? `POSSÍVEL EMERGÊNCIA: ${d.motivo}. Eu mandaria os telefones de emergência e passaria para você` : `Passaria para você: ${d.motivo}`}.`);
      await alertar(`${quem}: ${d.acao === 'emergencia' ? 'possível emergência' : 'precisa de você'}`, d.aviso || 'precisa de você', d.acao === 'emergencia');
      return reg(d.acao === 'emergencia' ? 'emergencia' : 'escalaria', d.motivo);
    }

    try {
      if (d.acao === 'responder') {
        await enviar(conv, base, d.resposta);
        estado.contarResposta(base.conversa);
        if (d.avisar) {
          await anotar(conv, `[YAXUM ${quando}] Respondi sobre ${d.motivo}. Confira e confirme com o hóspede.`);
          await alertar(`${quem}: confira`, `Respondi sobre ${d.aviso || d.motivo}. Confirme com o hóspede.`);
        }
        return reg('respondido', d.motivo);
      }
      if (d.acao === 'emergencia') {
        if (d.resposta) await enviar(conv, base, d.resposta);
        await anotar(conv, `[YAXUM ${quando}] POSSÍVEL EMERGÊNCIA: ${d.motivo}. Mandei os telefones de emergência. Fale com o hóspede agora.`);
        await alertar(`URGENTE: ${quem}`, 'Possível emergência. Abra a Hostex agora.', true);
        return reg('emergencia', d.motivo);
      }
      /* escalar */
      const espera = imovel ? textoDaVariavel(imovel, 'mensagem_espera', d.idioma || 'pt') : '';
      let mandouEspera = false;
      if (espera && !estado.esperaRecente(base.conversa, config.esperaRepetirHoras)) {
        await enviar(conv, base, espera);
        estado.marcarEspera(base.conversa);
        mandouEspera = true;
      }
      await anotar(conv, `[YAXUM ${quando}] Não respondi: ${d.motivo}. Responda você${mandouEspera ? ' (mandei a mensagem de espera)' : ''}.`);
      await alertar(`${quem}: precisa de você`, d.aviso || 'precisa de você');
      return reg('escalado', d.motivo);
    } catch (e) {
      const talvez = e && e.talvezEnviado ? ' A mensagem pode ter saído; confira antes de reenviar.' : '';
      await anotar(conv, `[YAXUM ${quando}] Tentei responder mas deu erro na Hostex: ${e.message}.${talvez}`);
      await alertar(`${quem}: erro ao responder`, 'Deu erro na Hostex ao responder. Confira a conversa.');
      return reg('erro', `${d.acao}: ${e.message}`);
    }
  }

  /* ---------- varredura: pega avisos que a Hostex não entregou ---------- */
  async function varrer() {
    const lista = await hostex.conversas({ limit: 50 });
    const corte = agora() - config.idadeMaximaMin * 60000;
    let vistas = 0;
    for (const c of lista) {
      if (!c || !c.id || !canalPermitido(c.channel_type)) continue;
      const ultima = new Date(c.last_message_at).getTime();
      if (!(ultima >= corte)) continue;
      const id = String(c.id);
      if (timers.has(id) || emAndamento.has(id)) continue;
      vistas++;
      if (agora() - ultima < config.aguardarSegundos * 1000) agendarConversa(id);
      else await processar(id).catch((e) => registrar({ conversa: id, acao: 'erro', motivo: e.message }));
    }
    return vistas;
  }

  return {
    receberEvento,
    processar,
    varrer,
    registro: () => registro.slice(),
    pendentes: () => timers.size,
  };
}

/** Aviso no celular pelo ntfy (app gratuito). Só vai o motivo, nunca a conversa. */
export function criarAvisoNtfy({ servidor, topico, fetch: buscar = globalThis.fetch }) {
  if (!topico) return null;
  return async ({ titulo, texto, urgente }) => {
    const r = await buscar(`${servidor}/${encodeURIComponent(topico)}`, {
      method: 'POST',
      /* cabeçalho HTTP não aceita acento: o ntfy entende o formato RFC 2047 */
      headers: {
        Title: /[^\x20-\x7e]/.test(titulo) ? `=?UTF-8?B?${Buffer.from(titulo).toString('base64')}?=` : titulo,
        Priority: urgente ? 'urgent' : 'default',
        Tags: urgente ? 'rotating_light' : 'house',
      },
      body: texto,
    });
    if (!r.ok) throw new Error(`ntfy respondeu HTTP ${r.status}`);
  };
}
