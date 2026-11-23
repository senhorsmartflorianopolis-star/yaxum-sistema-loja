/* Cadastra na Hostex o endereço que recebe os avisos de mensagem nova.
   npm run webhook -- https://SEU-ENDERECO/webhook/hostex
   A Hostex mostra o segredo uma única vez: copie para HOSTEX_WEBHOOK_SECRET no .env. */
import { lerEnv, carregarConfig } from '../src/config.js';
import { criarHostex } from '../src/hostex.js';

lerEnv();
const config = carregarConfig();
const destino = process.argv[2];
if (!destino || !/^https:\/\/.+\/webhook\/hostex$/.test(destino)) {
  console.error('Use: npm run webhook -- https://SEU-ENDERECO/webhook/hostex  (precisa ser https e terminar em /webhook/hostex)');
  process.exit(1);
}

try {
  const r = await criarHostex({ url: config.hostexUrl, token: config.hostexToken }).criarWebhook(destino, ['message_created']);
  console.log(`Webhook criado (id ${r.id}).`);
  console.log('\nCole esta linha no .env e reinicie o servidor:\n');
  console.log(`HOSTEX_WEBHOOK_SECRET=${r.secret_token}\n`);
  console.log('A Hostex não mostra esse segredo de novo. Se perder, apague o webhook no painel e rode este comando outra vez.');
} catch (e) {
  console.error(`Não consegui criar o webhook: ${e.message}`);
  console.error('Lembre: o token precisa ser do tipo "writable" e o plano precisa ter a API aberta (Pró).');
  process.exit(1);
}
