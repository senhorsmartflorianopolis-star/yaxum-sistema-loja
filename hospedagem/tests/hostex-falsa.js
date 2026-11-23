/* Uma Hostex de mentira, com a mesma cara da API v3, para testar o
   servidor inteiro sem conta, sem Airbnb e sem mandar nada a ninguém.
   Usada pelos testes e pelo "npm run simular". */
import http from 'node:http';

export async function criarHostexFalsa({ token = 'token-de-teste' } = {}) {
  const conversas = new Map();
  const enviadas = [];
  const notas = [];
  const webhooks = [];
  let seq = 1;
  let bloquearEnvios = 0;
  const imoveis = [
    { id: 111, title: 'Apartamento Exemplo', address: 'Canasvieiras', channels: [{ channel_type: 'airbnb', listing_id: 'L-111' }] },
    { id: 222, title: 'Casa sem cérebro', address: '', channels: [{ channel_type: 'airbnb', listing_id: 'L-222' }] },
  ];

  function novaConversa({ id = `c${seq++}`, canal = 'airbnb', hospede = 'Maria Souza', imovelId = 111, tipo = 'reservation', nota = '' } = {}) {
    const imovel = imoveis.find((p) => p.id === imovelId) || { id: imovelId, title: `Imóvel ${imovelId}` };
    conversas.set(id, {
      id,
      channel_type: canal,
      guest: { name: hospede, phone: null, email: null },
      activities: [{
        activity_type: tipo, reservation_code: tipo === 'reservation' ? `R-${id}` : null,
        check_in_date: '2026-12-20', check_out_date: '2026-12-27', listing_id: `L-${imovelId}`,
        property: { id: imovel.id, title: imovel.title, cover_url: null, room_type: null },
      }],
      note: nota,
      messages: [],
    });
    return id;
  }

  function mensagem(id, papel, texto, { quando = Date.now(), tipo = 'Text', nome = null } = {}) {
    const conv = conversas.get(id);
    if (!conv) throw new Error(`conversa ${id} não existe`);
    const m = { id: `m${seq++}`, sender_role: papel, sender_name: nome, sources: [], display_type: tipo, content: texto, attachment: null, created_at: new Date(quando).toISOString() };
    conv.messages.push(m);
    return m;
  }
  /** O hóspede escreve; devolve o aviso que a Hostex mandaria ao webhook. */
  function hospedeEscreve(id, texto, opcoes = {}) {
    const m = mensagem(id, 'guest', texto, opcoes);
    return { event: 'message_created', event_id: `01EV${String(seq++).padStart(22, '0')}`, conversation_id: id, message_id: m.id, timestamp: new Date().toISOString() };
  }
  const anfitriaEscreve = (id, texto, opcoes = {}) => mensagem(id, 'host', texto, { nome: 'Yasmim', ...opcoes });

  const responder = (res, corpo, cabecalhos = {}) => {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cabecalhos });
    res.end(JSON.stringify({ request_id: `req-${seq++}`, error_code: 200, error_msg: 'Done.', ...corpo }));
  };

  const servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (c) => { corpo += c; });
    req.on('end', () => {
      if (req.headers['hostex-access-token'] !== token) return responder(res, { error_code: 401, error_msg: 'Invalid access token' });
      const url = new URL(req.url, 'http://x');
      const dados = corpo ? JSON.parse(corpo) : {};
      let m;
      if (req.method === 'GET' && url.pathname === '/v3/conversations') {
        return responder(res, { data: { conversations: [...conversas.values()].map((c) => ({
          id: c.id, channel_type: c.channel_type, guest: c.guest,
          last_message_at: (c.messages[c.messages.length - 1] || { created_at: new Date(0).toISOString() }).created_at,
          property_title: c.activities[0].property.title,
        })) } });
      }
      if ((m = /^\/v3\/conversations\/([^/]+)$/.exec(url.pathname))) {
        const conv = conversas.get(decodeURIComponent(m[1]));
        if (!conv) return responder(res, { error_code: 404, error_msg: 'Conversation not found' });
        if (req.method === 'GET') return responder(res, { data: structuredClone(conv) });
        if (req.method === 'POST') {
          if (bloquearEnvios > 0) {
            bloquearEnvios--;
            return responder(res, { error_code: 429, error_msg: 'Too many messages. Try again in 1 seconds.' }, { 'Retry-After': '1', 'X-RateLimit-Scope': 'endpoint' });
          }
          mensagem(conv.id, 'host', dados.message, { nome: 'Open API' });
          enviadas.push({ conversa: conv.id, texto: dados.message });
          return responder(res, {});
        }
      }
      if ((m = /^\/v3\/conversations\/([^/]+)\/note$/.exec(url.pathname)) && req.method === 'PATCH') {
        const conv = conversas.get(decodeURIComponent(m[1]));
        if (!conv) return responder(res, { error_code: 404, error_msg: 'Conversation not found' });
        conv.note = dados.note;
        notas.push({ conversa: conv.id, nota: dados.note });
        return responder(res, { data: { id: conv.id, note: conv.note, updated_at: new Date().toISOString() } });
      }
      if (req.method === 'GET' && url.pathname === '/v3/properties') {
        return responder(res, { data: { total: imoveis.length, properties: imoveis } });
      }
      if (req.method === 'POST' && url.pathname === '/v3/webhooks') {
        webhooks.push(dados);
        return responder(res, { data: { id: webhooks.length, secret_token: 'segredo-da-hostex-falsa' } });
      }
      return responder(res, { error_code: 404, error_msg: 'Not found' });
    });
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const { port } = servidor.address();

  return {
    url: `http://127.0.0.1:${port}/v3`,
    token,
    conversas,
    enviadas,
    notas,
    webhooks,
    novaConversa,
    hospedeEscreve,
    anfitriaEscreve,
    bloquearProximosEnvios(n = 1) { bloquearEnvios = n; },
    fechar: () => new Promise((r) => { servidor.close(r); servidor.closeAllConnections(); }),
  };
}
