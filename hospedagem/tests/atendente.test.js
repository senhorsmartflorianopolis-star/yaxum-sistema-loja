/* O servidor inteiro contra a Hostex falsa: aviso → leitura → decisão → resposta. */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { RAIZ, carregarConfig } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';
import { criarHostex } from '../src/hostex.js';
import { criarEstado } from '../src/estado.js';
import { criarAtendente, juntarNota } from '../src/atendente.js';
import { criarApp } from '../src/app.js';
import { criarHostexFalsa } from './hostex-falsa.js';

const cerebro = carregarCerebro(path.join(RAIZ, 'cerebro'), { ligacoes: { 111: 'exemplo' } });
const mudo = { info() {}, warn() {}, error() {} };

let falsa; let fila; let avisos;
function montar(env = {}) {
  const config = carregarConfig({ MODO: 'automatico', AGUARDAR_SEGUNDOS: '0', ...env });
  const hostex = criarHostex({ url: falsa.url, token: falsa.token, esperar: () => Promise.resolve() });
  const estado = criarEstado(null);
  const atendente = criarAtendente({
    config, hostex, cerebro, estado, log: mudo,
    agendar: (fn) => { fila.push(fn); return fila.length; }, cancelar: () => {},
    avisar: async (a) => { avisos.push(a); },
  });
  return { config, atendente, estado };
}
async function rodar() { while (fila.length) await fila.shift()(); }
const ultimaNota = (conv) => String(falsa.conversas.get(conv).note || '').split('\n').pop();

beforeEach(async () => { falsa = await criarHostexFalsa(); fila = []; avisos = []; });
afterEach(async () => { await falsa.fechar(); });

test('responde a pergunta do hóspede com reserva, uma vez só', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa({ hospede: 'Maria Souza' });
  const ev = falsa.hospedeEscreve(c, 'Oi! Qual a senha do wifi?');
  atendente.receberEvento(ev);
  atendente.receberEvento(ev); /* a Hostex pode repetir o aviso */
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
  assert.match(falsa.enviadas[0].texto, /^Oi, Maria! A rede do Wi-Fi é ApExemplo_5G e a senha é praia2026/);
  /* processar de novo (varredura) não responde outra vez */
  await atendente.processar(c);
  assert.equal(falsa.enviadas.length, 1);
});

test('junta mensagens seguidas do hóspede numa resposta', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(c, 'Boa tarde!'));
  atendente.receberEvento(falsa.hospedeEscreve(c, 'tem estacionamento?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
  assert.match(falsa.enviadas[0].texto, /^Boa tarde, Maria! Tem uma vaga de garagem/);
});

test('modo teste: não manda nada ao hóspede e anota o que responderia', async () => {
  const { atendente } = montar({ MODO: 'teste' });
  const c = falsa.novaConversa({ nota: 'Hóspede pediu berço.' });
  atendente.receberEvento(falsa.hospedeEscreve(c, 'que horas é o check-in?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 0);
  const nota = falsa.conversas.get(c).note;
  assert.match(nota, /^Hóspede pediu berço\./, 'a nota da anfitriã continua lá');
  assert.match(nota, /\[YAXUM teste .*\] Eu responderia: "O check-in é a partir das 15h\."/);
  assert.equal(atendente.registro()[0].acao, 'responderia');
});

test('pergunta que o cérebro não sabe: mensagem de espera (uma vez), nota e aviso', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(c, 'tem piscina?'));
  await rodar();
  assert.deepEqual(falsa.enviadas.map((m) => m.texto), ['Recebi sua mensagem! A Yasmim já vai te responder por aqui.']);
  assert.match(ultimaNota(c), /Não respondi: não tenho resposta segura para "tem piscina\?"/);
  assert.equal(avisos.length, 1);
  assert.doesNotMatch(avisos[0].texto + avisos[0].titulo, /piscina/, 'o aviso no celular não leva o texto do hóspede');
  /* a anfitriã ainda não respondeu e o hóspede insiste: não repete a espera */
  atendente.receberEvento(falsa.hospedeEscreve(c, 'tem academia?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
});

test('emergência: telefones na hora e alerta urgente', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(c, 'socorro, tá com cheiro de gás'));
  await rodar();
  assert.match(falsa.enviadas[0].texto, /Bombeiros 193, SAMU 192, Polícia 190/);
  assert.match(ultimaNota(c), /POSSÍVEL EMERGÊNCIA/);
  assert.equal(avisos[0].urgente, true);
});

test('se a anfitriã respondeu há pouco, o YAXUM fica quieto', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  falsa.hospedeEscreve(c, 'oi, tudo bem?', { quando: Date.now() - 10 * 60000 });
  falsa.anfitriaEscreve(c, 'Oi Maria! Tudo ótimo, me diz', { quando: Date.now() - 5 * 60000 });
  atendente.receberEvento(falsa.hospedeEscreve(c, 'qual a senha do wifi?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 0);
  assert.match(atendente.registro()[0].motivo, /anfitriã respondeu há pouco/);
});

test('mensagem do próprio YAXUM não conta como anfitriã respondendo', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(c, 'que horas é o check-in?'));
  await rodar();
  atendente.receberEvento(falsa.hospedeEscreve(c, 'e o check-out?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 2);
  assert.match(falsa.enviadas[1].texto, /check-out é até as 11h/);
});

test('consulta sem reserva nunca recebe a senha do Wi-Fi', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa({ tipo: 'inquiry', hospede: 'Juan' });
  atendente.receberEvento(falsa.hospedeEscreve(c, '¡Hola! ¿Cuál es la contraseña del wifi?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
  assert.doesNotMatch(falsa.enviadas[0].texto, /praia2026/);
  assert.match(falsa.enviadas[0].texto, /^¡Hola, Juan! ¡Sí, hay Wi-Fi!/);
});

test('imóvel sem cérebro, outro canal, nota "yaxum off", anexo e mensagem antiga: não responde', async () => {
  const { atendente } = montar();
  const semCerebro = falsa.novaConversa({ imovelId: 222 });
  atendente.receberEvento(falsa.hospedeEscreve(semCerebro, 'qual a senha do wifi?'));
  const booking = falsa.novaConversa({ canal: 'booking.com' });
  atendente.receberEvento(falsa.hospedeEscreve(booking, 'qual a senha do wifi?'));
  const pausada = falsa.novaConversa({ nota: 'yaxum off' });
  atendente.receberEvento(falsa.hospedeEscreve(pausada, 'qual a senha do wifi?'));
  const anexo = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(anexo, 'foto.jpg', { tipo: 'FileAttachment' }));
  const antiga = falsa.novaConversa();
  atendente.receberEvento(falsa.hospedeEscreve(antiga, 'qual a senha do wifi?', { quando: Date.now() - 5 * 3600000 }));
  await rodar();
  const textos = falsa.enviadas.map((m) => `${m.conversa}:${m.texto}`);
  assert.ok(!textos.some((t) => /praia2026/.test(t)), textos.join('\n'));
  assert.match(ultimaNota(semCerebro), /não está ligado a nenhum cérebro/);
  assert.match(ultimaNota(anexo), /mandou foto ou arquivo/);
  assert.equal(falsa.conversas.get(booking).note, '');
  assert.equal(falsa.conversas.get(pausada).note, 'yaxum off');
});

test('limite de envio da Hostex (429): espera e envia uma vez', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  falsa.bloquearProximosEnvios(1);
  atendente.receberEvento(falsa.hospedeEscreve(c, 'tem cafeteira?'));
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
  assert.match(falsa.enviadas[0].texto, /cafeteira/);
});

test('limite diário de respostas por conversa', async () => {
  const { atendente } = montar({ LIMITE_RESPOSTAS_DIA: '2' });
  const c = falsa.novaConversa();
  for (const q of ['tem cafeteira?', 'tem toalha?', 'pode fumar?']) {
    atendente.receberEvento(falsa.hospedeEscreve(c, q));
    await rodar();
  }
  assert.equal(falsa.enviadas.length, 3, 'duas respostas e a mensagem de espera');
  assert.match(falsa.enviadas[2].texto, /Recebi sua mensagem/);
  assert.match(ultimaNota(c), /já respondi 2 vezes hoje/);
});

test('varredura pega a mensagem cujo aviso se perdeu', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa();
  falsa.hospedeEscreve(c, 'tem ar condicionado?', { quando: Date.now() - 2 * 60000 }); /* aviso nunca chegou */
  await atendente.varrer();
  await rodar();
  assert.equal(falsa.enviadas.length, 1);
  assert.match(falsa.enviadas[0].texto, /ar-condicionado split/);
});

test('a nota nunca passa de 5000 caracteres e preserva o texto da anfitriã', () => {
  let nota = 'Combinado: berço no quarto.';
  for (let i = 0; i < 200; i++) nota = juntarNota(nota, `[YAXUM 01/01 10:${i}] Não respondi: ${'x'.repeat(40)}`);
  assert.ok(nota.length <= 5000);
  assert.match(nota, /^Combinado: berço no quarto\./);
});

test('webhook: recusa segredo errado e aceita o certo', async () => {
  const { config, atendente } = montar({ HOSTEX_WEBHOOK_SECRET: 'segredo-certo', TOKEN_ADMIN: 'adm' });
  const srv = http.createServer(criarApp({ config, atendente, cerebro, log: mudo }));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const c = falsa.novaConversa();
    const ev = falsa.hospedeEscreve(c, 'tem toalha?');
    const enviar = (segredo) => fetch(`${base}/webhook/hostex`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Hostex-Webhook-Secret-Token': segredo }, body: JSON.stringify(ev) });
    assert.equal((await enviar('errado')).status, 401);
    assert.equal((await enviar('segredo-certo')).status, 200);
    await new Promise((r) => setTimeout(r, 30));
    await rodar();
    assert.equal(falsa.enviadas.length, 1);

    assert.equal((await fetch(`${base}/registro`)).status, 403);
    const pagina = await (await fetch(`${base}/registro?token=adm`)).text();
    assert.match(pagina, /respondido/);
    const teste = await (await fetch(`${base}/testar`, { method: 'POST', headers: { Authorization: 'Bearer adm' }, body: JSON.stringify({ texto: 'tem netflix?' }) })).json();
    assert.equal(teste.acao, 'responder');
    const saude = await (await fetch(`${base}/saude`)).json();
    assert.equal(saude.modo, 'automatico');
  } finally {
    await new Promise((r) => { srv.close(r); srv.closeAllConnections(); });
  }
});

test('aviso no celular não leva nome nem texto do hóspede', async () => {
  const { atendente } = montar();
  const c = falsa.novaConversa({ hospede: 'Fulana de Tal' });
  atendente.receberEvento(falsa.hospedeEscreve(c, 'quero cancelar minha reserva'));
  await rodar();
  assert.equal(avisos.length, 1);
  const tudo = avisos[0].titulo + ' ' + avisos[0].texto;
  assert.doesNotMatch(tudo, /Fulana|cancelar minha/);
  assert.match(tudo, /Apartamento Exemplo/);
});
