/* Cliente da API v3 da Hostex (https://api-doc.hostex.io).
   Detalhes que importam:
   - Autenticação pelo cabeçalho Hostex-Access-Token.
   - Erros vêm com HTTP 200 e o código no corpo (error_code). Limite de uso
     vem como error_code 429 com o cabeçalho Retry-After.
   - Enviar mensagem não é idempotente: se a conexão cair no meio, a
     mensagem pode ter saído. Por isso o envio nunca é repetido sozinho,
     a não ser quando a Hostex diz com todas as letras que não enviou (429). */

export class ErroHostex extends Error {
  constructor(mensagem, { codigo = null, http = null, talvezEnviado = false, esperarSeg = null } = {}) {
    super(mensagem);
    this.name = 'ErroHostex';
    this.codigo = codigo;
    this.http = http;
    this.talvezEnviado = talvezEnviado;
    this.esperarSeg = esperarSeg;
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export function criarHostex({ url, token, fetch: buscar = globalThis.fetch, esperar = dormir, timeoutMs = 15000 } = {}) {
  if (!url) throw new Error('Falta a URL da API da Hostex.');

  async function chamar(metodo, caminho, corpo, { idempotente = true, repetirSeLimite = true } = {}) {
    if (!token) throw new ErroHostex('Falta o HOSTEX_TOKEN no .env.');
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), timeoutMs);
    let resp;
    try {
      resp = await buscar(url + caminho, {
        method: metodo,
        headers: { 'Hostex-Access-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new ErroHostex(`Sem resposta da Hostex em ${metodo} ${caminho}: ${e.message}`, { talvezEnviado: !idempotente });
    } finally {
      clearTimeout(relogio);
    }

    const texto = await resp.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { /* corpo não-JSON: tratado abaixo */ }

    if (!resp.ok) {
      throw new ErroHostex(`A Hostex respondeu HTTP ${resp.status} em ${metodo} ${caminho}.`, { http: resp.status, talvezEnviado: !idempotente && resp.status >= 500 });
    }
    const codigo = dados && typeof dados.error_code === 'number' ? dados.error_code : null;
    if (codigo === 429) {
      const seg = Number(resp.headers.get('retry-after')) || 60;
      if (repetirSeLimite && seg <= 120) {
        await esperar(seg * 1000);
        return chamar(metodo, caminho, corpo, { idempotente, repetirSeLimite: false });
      }
      throw new ErroHostex(`Limite de uso da Hostex atingido; liberar em ${seg}s.`, { codigo, esperarSeg: seg });
    }
    if (codigo === 420) throw new ErroHostex('A assinatura da Hostex expirou (código 420).', { codigo });
    if (codigo !== null && codigo !== 200 && codigo !== 0) {
      throw new ErroHostex(`Hostex: ${(dados && dados.error_msg) || 'erro'} (código ${codigo}) em ${metodo} ${caminho}.`, { codigo });
    }
    return dados || {};
  }

  const enc = encodeURIComponent;
  return {
    /** Detalhes da conversa: hóspede, imóvel, reserva/consulta e mensagens. */
    async conversa(id) {
      return (await chamar('GET', `/conversations/${enc(id)}`)).data || null;
    },
    /** Conversas recentes (para a varredura que pega avisos perdidos). */
    async conversas({ offset = 0, limit = 50 } = {}) {
      const r = await chamar('GET', `/conversations?offset=${offset}&limit=${limit}`);
      return (r.data && r.data.conversations) || [];
    },
    /** Envia texto ao hóspede pelo canal da conversa (Airbnb, Booking…). */
    async enviar(id, mensagem) {
      await chamar('POST', `/conversations/${enc(id)}`, { message: mensagem }, { idempotente: false });
    },
    /** Grava a nota privada da conversa (só a anfitriã vê). */
    async anotar(id, nota) {
      return (await chamar('PATCH', `/conversations/${enc(id)}/note`, { note: nota })).data || null;
    },
    /** Lista todos os imóveis da conta. */
    async imoveis() {
      const todos = [];
      for (let offset = 0; offset < 10000; offset += 100) {
        const r = await chamar('GET', `/properties?offset=${offset}&limit=100`);
        const lote = (r.data && r.data.properties) || [];
        todos.push(...lote);
        if (lote.length < 100) break;
      }
      return todos;
    },
    /** Cria o webhook; a Hostex devolve o secret_token uma única vez. */
    async criarWebhook(urlWebhook, eventos = ['message_created']) {
      return (await chamar('POST', '/webhooks', { url: urlWebhook, events: eventos })).data || null;
    },
  };
}
