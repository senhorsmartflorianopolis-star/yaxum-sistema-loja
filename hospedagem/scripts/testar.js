/* Pergunte ao cérebro sem Hostex nenhuma.
   npm run testar -- "qual a senha do wifi?"
   npm run testar -- --imovel imovel-1 --sem-reserva "onde fica?"
   npm run testar                      (modo conversa: digite as perguntas) */
import readline from 'node:readline';
import { lerEnv, carregarConfig } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';

lerEnv();
const config = carregarConfig();
const cerebro = carregarCerebro(config.pastaCerebro);

const args = process.argv.slice(2);
let nomeImovel = 'exemplo';
let temReserva = true;
let nomeHospede = 'Maria';
const palavras = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--imovel') nomeImovel = args[++i];
  else if (args[i] === '--sem-reserva') temReserva = false;
  else if (args[i] === '--nome') nomeHospede = args[++i];
  else palavras.push(args[i]);
}

const imovel = cerebro.imovel(nomeImovel);
if (!imovel) {
  console.error(`Imóvel "${nomeImovel}" não existe. Opções: ${[...cerebro.imoveis.keys()].join(', ')}`);
  process.exit(1);
}

const ROTULO = { responder: 'RESPONDE', escalar: 'PASSA PARA A YASMIM', emergencia: 'EMERGÊNCIA', ignorar: 'NÃO RESPONDE' };
function perguntar(texto) {
  const d = cerebro.responder(imovel, texto, { temReserva, nomeHospede });
  console.log(`\n${ROTULO[d.acao] || d.acao} · ${d.motivo} · idioma ${d.idioma}`);
  if (d.resposta) console.log(`\n${d.resposta}\n`);
  else console.log('');
}

console.log(`Cérebro: ${imovel.titulo} · ${temReserva ? 'hóspede com reserva' : 'hóspede SEM reserva (só consulta)'}`);
if (palavras.length) {
  perguntar(palavras.join(' '));
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'Hóspede> ' });
  console.log('Escreva como se fosse o hóspede (Ctrl+C para sair).');
  rl.prompt();
  rl.on('line', (l) => { if (l.trim()) perguntar(l); rl.prompt(); });
}
