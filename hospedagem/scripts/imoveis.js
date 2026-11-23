/* Lista os imóveis da conta Hostex e mostra a qual cérebro cada um está ligado.
   npm run imoveis */
import { lerEnv, carregarConfig } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';
import { criarHostex } from '../src/hostex.js';

lerEnv();
const config = carregarConfig();
const cerebro = carregarCerebro(config.pastaCerebro);
const hostex = criarHostex({ url: config.hostexUrl, token: config.hostexToken });

try {
  const lista = await hostex.imoveis();
  if (!lista.length) console.log('A conta não tem imóveis.');
  for (const p of lista) {
    const ligado = cerebro.imovelPorHostexId(p.id);
    const canais = (p.channels || []).map((c) => c.channel_type).join(', ') || 'sem canal';
    console.log(`${String(p.id).padEnd(12)} ${p.title}  [${canais}]  →  ${ligado ? `cérebro "${ligado.nome}"` : 'NÃO LIGADO (cole este número em "hostex_ids" no imovel.json)'}`);
  }
} catch (e) {
  console.error(`Não consegui listar: ${e.message}`);
  process.exit(1);
}
