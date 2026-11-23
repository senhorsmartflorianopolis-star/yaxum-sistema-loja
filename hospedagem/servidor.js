/* YAXUM Hospedagem: sobe o servidor que recebe os avisos da Hostex.
   Rode: npm start   (lê o .env desta pasta) */
import http from 'node:http';
import { lerEnv, carregarConfig } from './src/config.js';
import { carregarCerebro } from './src/cerebro.js';
import { criarHostex } from './src/hostex.js';
import { criarEstado } from './src/estado.js';
import { criarAtendente, criarAvisoNtfy } from './src/atendente.js';
import { criarApp } from './src/app.js';

lerEnv();
const config = carregarConfig();
const log = console;

const cerebro = carregarCerebro(config.pastaCerebro);
const hostex = criarHostex({ url: config.hostexUrl, token: config.hostexToken });
const estado = criarEstado(config.arquivoEstado, { log });
const avisar = criarAvisoNtfy({ servidor: config.avisoNtfyServidor, topico: config.avisoNtfyTopico });
const atendente = criarAtendente({ config, hostex, cerebro, estado, log, avisar });
const servidor = http.createServer(criarApp({ config, atendente, cerebro, log }));

servidor.listen(config.porta, () => {
  log.info(`YAXUM Hospedagem na porta ${config.porta}, modo ${config.modo.toUpperCase()}.`);
  log.info(`Imóveis: ${[...cerebro.imoveis.values()].map((i) => `${i.nome}${i.hostexIds.length ? ` (Hostex ${i.hostexIds.join(', ')})` : ''}`).join(' · ')}`);
  for (const a of cerebro.avisos) log.warn(`Atenção: ${a}`);
  if (!config.hostexToken) log.warn('Atenção: sem HOSTEX_TOKEN. Só /saude e /testar funcionam.');
  if (!config.segredoWebhook) log.warn('Atenção: sem HOSTEX_WEBHOOK_SECRET. Qualquer um pode chamar /webhook/hostex. Rode "npm run webhook" e preencha.');
  if (!config.tokenAdmin) log.warn('Atenção: sem TOKEN_ADMIN, a página /registro fica desligada.');
  if (config.modo === 'teste') log.info('Modo TESTE: nada é enviado ao hóspede; o que eu responderia vai na nota da conversa e em /registro.');
});

let varredura = null;
if (config.hostexToken && config.varreduraMin > 0) {
  const rodar = () => atendente.varrer().catch((e) => log.error(`[varredura] ${e.message}`));
  setTimeout(rodar, 30_000).unref();
  varredura = setInterval(rodar, config.varreduraMin * 60_000);
}

function desligar(sinal) {
  log.info(`Recebi ${sinal}; desligando.`);
  if (varredura) clearInterval(varredura);
  try { estado.gravarAgora(); } catch (e) { log.error(e.message); }
  servidor.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => desligar('SIGTERM'));
process.on('SIGINT', () => desligar('SIGINT'));
