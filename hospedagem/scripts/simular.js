/* Simulação ponta a ponta, sem internet: uma Hostex falsa, o servidor de
   verdade em modo AUTOMÁTICO e hóspedes escrevendo. Mostra o que cada
   hóspede recebe e o que fica anotado para a Yasmim.
   npm run simular */
import { carregarConfig, RAIZ } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';
import { criarHostex } from '../src/hostex.js';
import { criarEstado } from '../src/estado.js';
import { criarAtendente } from '../src/atendente.js';
import { criarHostexFalsa } from '../tests/hostex-falsa.js';
import path from 'node:path';

const falsa = await criarHostexFalsa();
const config = {
  ...carregarConfig({ MODO: 'automatico', AGUARDAR_SEGUNDOS: '0' }),
  pastaCerebro: path.join(RAIZ, 'cerebro'),
};
const cerebro = carregarCerebro(config.pastaCerebro, { ligacoes: { 111: 'exemplo' } });
const hostex = criarHostex({ url: falsa.url, token: falsa.token, esperar: () => Promise.resolve() });
const estado = criarEstado(null);
const silencioso = { info() {}, warn() {}, error: console.error };
const fila = [];
const atendente = criarAtendente({ config, hostex, cerebro, estado, log: silencioso, agendar: (fn) => { fila.push(fn); return fila.length; }, cancelar: () => {} });

async function rodarFila() { while (fila.length) await fila.shift()(); await new Promise((r) => setTimeout(r, 20)); }

const maria = falsa.novaConversa({ hospede: 'Maria Souza' });
const juan = falsa.novaConversa({ hospede: 'Juan Pérez', tipo: 'inquiry' });
const pedro = falsa.novaConversa({ hospede: 'Pedro Lima' });

const roteiro = [
  [maria, 'Oi! Qual a senha do wifi?'],
  [maria, 'E que horas é o check-out?'],
  [maria, 'Tem piscina no prédio?'],
  [juan, '¡Hola! ¿Hay estacionamiento? ¿Cuál es la contraseña del wifi?'],
  [pedro, 'Boa tarde, preciso cancelar a reserva'],
  [maria, 'Socorro, tá com cheiro de gás na cozinha'],
  [maria, 'ok 👍'],
];

const hospedeDe = (id) => falsa.conversas.get(id).guest.name;
for (const [conv, texto] of roteiro) {
  const antes = falsa.enviadas.length;
  const notasAntes = falsa.notas.length;
  atendente.receberEvento(falsa.hospedeEscreve(conv, texto, { quando: Date.now() }));
  await rodarFila();
  console.log(`\n${hospedeDe(conv)}: ${texto}`);
  const novas = falsa.enviadas.slice(antes);
  if (!novas.length) console.log('  (YAXUM não respondeu)');
  for (const m of novas) console.log(`  YAXUM → ${m.texto.replace(/\n+/g, '\n          ')}`);
  for (const n of falsa.notas.slice(notasAntes)) console.log(`  Nota para a Yasmim: ${n.nota.split('\n').pop()}`);
}
await falsa.fechar();
