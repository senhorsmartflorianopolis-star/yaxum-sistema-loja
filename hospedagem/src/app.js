/* Rotas HTTP do servidor:
   POST /webhook/hostex   avisos da Hostex (confere o Hostex-Webhook-Secret-Token)
   GET  /saude            se está no ar, modo e imóveis carregados
   GET  /registro         últimas decisões (precisa do TOKEN_ADMIN)
   POST /testar           pergunta de teste ao cérebro (precisa do TOKEN_ADMIN) */
import crypto from 'node:crypto';

function iguais(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function lerCorpo(req, limite = 1_000_000) {
  return new Promise((resolve, reject) => {
    let tam = 0;
    const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > limite) { reject(new Error('corpo grande demais')); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function paginaRegistro(itens, modo) {
  const cor = { respondido: '#16794a', responderia: '#16794a', escalado: '#a15c00', escalaria: '#a15c00', emergencia: '#b3261e', erro: '#b3261e', ignorado: '#666' };
  const linhas = itens.map((r) => `<tr>
    <td>${esc(new Date(r.quando).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</td>
    <td>${esc(r.hospede || r.conversa)}<br><small>${esc(r.imovel || '')}</small></td>
    <td><b style="color:${cor[r.acao] || '#333'}">${esc(r.acao)}</b><br><small>${esc(r.motivo)}</small></td>
    <td>${esc(r.pergunta || '')}</td>
    <td>${esc(r.resposta || '')}</td></tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YAXUM Hospedagem · registro</title><style>
body{font:14px/1.45 system-ui,sans-serif;margin:16px;color:#222}h1{font-size:18px}table{border-collapse:collapse;width:100%}
td,th{border-bottom:1px solid #ddd;padding:8px;vertical-align:top;text-align:left;white-space:pre-wrap}th{background:#f4f4f4}small{color:#666}
</style></head><body><h1>YAXUM Hospedagem · modo ${esc(modo)}</h1>
<table><tr><th>Quando</th><th>Hóspede</th><th>Decisão</th><th>Mensagem</th><th>Resposta</th></tr>${linhas || '<tr><td colspan="5">Nada ainda.</td></tr>'}</table>
</body></html>`;
}

export function criarApp({ config, atendente, cerebro, log = console }) {
  const admin = (req, url) => {
    if (!config.tokenAdmin) return false;
    const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return iguais(auth || url.searchParams.get('token'), config.tokenAdmin);
  };

  return async function rotas(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'POST' && url.pathname === '/webhook/hostex') {
        if (config.segredoWebhook && !iguais(req.headers['hostex-webhook-secret-token'], config.segredoWebhook)) {
          log.warn('[webhook] aviso recusado: segredo errado');
          return json(res, 401, { ok: false });
        }
        const corpo = await lerCorpo(req);
        let evento = null;
        try { evento = JSON.parse(corpo || '{}'); } catch { /* responde 2xx mesmo assim: a Hostex só reenvia em falha de conexão */ }
        json(res, 200, { ok: true });
        setImmediate(() => {
          try {
            const r = atendente.receberEvento(evento);
            if (!r.ok) log.warn(`[webhook] ${r.motivo}`);
          } catch (e) { log.error(`[webhook] ${e.message}`); }
        });
        return undefined;
      }

      if (req.method === 'GET' && url.pathname === '/saude') {
        return json(res, 200, {
          ok: true,
          modo: config.modo,
          imoveis: [...cerebro.imoveis.values()].map((i) => ({ nome: i.nome, titulo: i.titulo, hostex: i.hostexIds, faltando: Object.keys(i.faltando) })),
          aguardando: atendente.pendentes(),
        });
      }

      if (url.pathname === '/registro' || url.pathname === '/testar') {
        if (!admin(req, url)) return json(res, 403, { ok: false, motivo: config.tokenAdmin ? 'token inválido' : 'defina TOKEN_ADMIN no .env' });
        if (req.method === 'GET' && url.pathname === '/registro') {
          const itens = atendente.registro();
          if (url.searchParams.get('formato') === 'json') return json(res, 200, itens);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(paginaRegistro(itens, config.modo));
        }
        if (req.method === 'POST' && url.pathname === '/testar') {
          const corpo = JSON.parse((await lerCorpo(req)) || '{}');
          const imovel = cerebro.imovel(corpo.imovel || 'exemplo');
          if (!imovel) return json(res, 404, { ok: false, motivo: `imóvel "${corpo.imovel}" não existe` });
          return json(res, 200, cerebro.responder(imovel, String(corpo.texto || ''), { temReserva: corpo.reserva !== false, nomeHospede: corpo.nome || '' }));
        }
      }

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`YAXUM Hospedagem no ar (modo ${config.modo}).\n`);
      }
      return json(res, 404, { ok: false });
    } catch (e) {
      log.error(`[http] ${req.method} ${url.pathname}: ${e.message}`);
      if (!res.headersSent) return json(res, 500, { ok: false });
      return undefined;
    }
  };
}
