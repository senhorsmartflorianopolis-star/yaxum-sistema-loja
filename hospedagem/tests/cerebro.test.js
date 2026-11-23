/* O cérebro: acerta o assunto, respeita reserva, idioma e as travas de segurança. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { RAIZ } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';
import { classificar, detectarIdioma, soConfirmacao } from '../src/texto.js';

const cerebro = carregarCerebro(path.join(RAIZ, 'cerebro'));
const ex = cerebro.imovel('exemplo');
const r = (texto, op = {}) => cerebro.responder(ex, texto, { temReserva: true, nomeHospede: 'Maria Souza', ...op });

const ACERTOS = [
  ['oi, qual a senha do wifi?', 'wifi'],
  ['Boa noite! Que horas podemos fazer o check in?', 'checkin-horario'],
  ['tem lugar pra estacionar?', 'estacionamento'],
  ['posso levar minha cachorrinha?', 'animais'],
  ['a que horas temos que sair no último dia?', 'checkout-horario'],
  ['E que horas é o checkout?', 'checkout-horario'],
  ['onde fica o mercado mais próximo?', 'arredores'],
  ['qual o endereço do ap?', 'endereco'],
  ['como pego a chave?', 'como-entrar'],
  ['dá pra chegar umas 10h da manhã?', 'checkin-antecipado'],
  ['vamos chegar umas 23h', 'aviso-de-chegada'],
  ['tem toalha de banho?', 'roupa-de-cama'],
  ['a praia é perto?', 'praia'],
  ['como chego do aeroporto?', 'transporte'],
  ['tem netflix na tv?', 'tv'],
  ['você é um robô?', 'assistente-automatico'],
  ['posso deixar a mala antes?', 'guardar-malas'],
  ['precisa mandar RG?', 'cadastro-portaria'],
  ['posso sair às 14h no dia do checkout?', 'checkout-tarde'],
  ['¡Hola! ¿Cuál es la clave del wifi?', 'wifi'],
  ['¿Hay cochera?', 'estacionamento'],
  ['¿A qué hora es el check out?', 'checkout-horario'],
  ['Hi! What time is check in?', 'checkin-horario'],
  ['Is there a parking spot?', 'estacionamento'],
  ['what is the wifi password?', 'wifi'],
  ['obrigada!', 'agradecimento'],
  ['oi', 'saudacao'],
];

test('acerta o assunto das perguntas comuns (pt, es, en)', () => {
  for (const [texto, nota] of ACERTOS) {
    const d = r(texto);
    assert.equal(d.acao, 'responder', `"${texto}" deveria ser respondida (${d.motivo})`);
    assert.deepEqual(d.notas, [nota], `"${texto}" foi para ${d.notas}`);
    assert.doesNotMatch(d.resposta, /\{\{|\}\}/, 'sobrou variável sem preencher');
  }
});

test('duas perguntas numa frase viram duas respostas', () => {
  assert.deepEqual(r('que horas é o check-in e tem estacionamento?').notas, ['checkin-horario', 'estacionamento']);
  const d = r('Oi! Qual a senha do wifi? E que horas é o checkout?');
  assert.deepEqual(d.notas, ['wifi', 'checkout-horario']);
  assert.match(d.resposta, /^Oi, Maria! A rede do Wi-Fi é ApExemplo_5G/);
});

test('o que o cérebro não sabe vai para a anfitriã, sem chute', () => {
  for (const texto of ['tem secador de cabelo?', 'vocês têm piscina?', 'tem elevador?', 'qual a voltagem das tomadas?', 'tem shampoo?', 'quanto custa a diária?']) {
    assert.equal(r(texto).acao, 'escalar', texto);
  }
});

test('pergunta ambígua não é respondida ("qual a senha?" é do Wi-Fi ou da porta?)', () => {
  assert.equal(r('qual a senha?').acao, 'escalar');
  assert.equal(r('onde fica?').acao, 'escalar');
});

test('sem reserva: nada de senha, código ou endereço completo', () => {
  const wifi = r('qual a senha do wifi?', { temReserva: false });
  assert.equal(wifi.acao, 'responder');
  assert.doesNotMatch(wifi.resposta, /praia2026/);
  const end = r('qual o endereço?', { temReserva: false });
  assert.doesNotMatch(end.resposta, /Rua Exemplo/);
  assert.match(end.resposta, /Canasvieiras/);
  const porta = r('qual o código da porta?', { temReserva: false });
  assert.match(porta.resposta, /depois da reserva confirmada/);
});

test('responde no idioma do hóspede, com a saudação dele', () => {
  const es = r('¡Hola! ¿Hay estacionamiento?', { nomeHospede: 'juan pérez' });
  assert.equal(es.idioma, 'es');
  assert.match(es.resposta, /^¡Hola, Juan! Hay una cochera/);
  const en = r('Good morning! Is there wifi?', { nomeHospede: 'John' });
  assert.equal(en.idioma, 'en');
  assert.match(en.resposta, /^Good morning, John! The Wi-Fi network is ApExemplo_5G/);
});

test('travas: emergência, pessoa, reserva/dinheiro, contato por fora e problema', () => {
  const casos = [
    ['socorro, cheiro de gás na cozinha', 'emergencia'], ['there is a gas leak', 'emergencia'], ['nos robaron el auto', 'emergencia'],
    ['quero falar com a anfitriã', 'humano'], ['can I talk to a real person?', 'humano'],
    ['quero cancelar', 'reserva'], ['tem desconto pra semana?', 'reserva'], ['podemos ficar mais uma noite?', 'reserva'], ['can we add a guest?', 'reserva'],
    ['me passa seu whatsapp', 'fora'], ['posso pagar no pix?', 'fora'],
    ['o chuveiro não esquenta', 'problema'], ['the AC is not working', 'problema'], ["the shower doesn't work", 'problema'], ['está todo sucio', 'problema'], ['não consigo entrar', 'problema'],
  ];
  for (const [texto, tipo] of casos) assert.equal((classificar(texto) || {}).tipo, tipo, texto);
  /* "você é um robô?" não pode cair em "robo" (roubo em espanhol) */
  assert.equal(classificar('você é um robô?'), null);
  assert.equal(r('socorro, cheiro de gás').acao, 'emergencia');
  assert.match(r('socorro, cheiro de gás').resposta, /193/);
  assert.equal(r('quero cancelar a reserva').acao, 'escalar');
});

test('confirmação sem pergunta não recebe resposta', () => {
  for (const t of ['ok', 'Ok!', 'beleza', '👍', 'perfeito 🙏', 'dale', 'got it']) assert.ok(soConfirmacao(t), t);
  assert.equal(r('ok 👍').acao, 'ignorar');
  assert.ok(!soConfirmacao('ok, qual a senha do wifi?'));
});

test('detecta o idioma', () => {
  assert.equal(detectarIdioma('Qual a senha do wifi?'), 'pt');
  assert.equal(detectarIdioma('¿Cuál es la contraseña?'), 'es');
  assert.equal(detectarIdioma('What is the password?'), 'en');
  assert.equal(detectarIdioma('tem estacionamento?'), 'pt');
});

test('imóvel sem dados preenchidos passa tudo para a anfitriã e diz o que falta', () => {
  const vazio = cerebro.imovel('imovel-1');
  const d = cerebro.responder(vazio, 'qual a senha do wifi?', { temReserva: true });
  assert.equal(d.acao, 'escalar');
  assert.match(d.motivo, /falta preencher wifi_nome, wifi_senha/);
  assert.ok(vazio.faltando.wifi_senha);
});
