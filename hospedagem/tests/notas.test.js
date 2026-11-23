/* As notas e o motor: tudo bem escrito e igual ao do YAXUM. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../src/config.js';
import { carregarCerebro } from '../src/cerebro.js';

const cerebro = carregarCerebro(path.join(RAIZ, 'cerebro'));
const ex = cerebro.imovel('exemplo');

test('toda nota tem perguntas e resposta em português', () => {
  for (const n of Object.values(ex.notas)) {
    assert.ok(n.md.includes('## O cliente costuma perguntar'), `${n.id} sem perguntas`);
    assert.ok(n.respostas.pt && n.respostas.pt.length, `${n.id} sem "Como responder"`);
  }
});

test('o imóvel de exemplo tem todas as variáveis preenchidas', () => {
  assert.deepEqual(ex.faltando, {});
});

test('cada nota responde às próprias perguntas de exemplo', () => {
  for (const n of Object.values(ex.notas)) {
    const linhas = n.md.split('## O cliente costuma perguntar')[1].split('\n## ')[0].split('\n').filter((l) => l.startsWith('- '));
    for (const l of linhas) {
      const q = l.slice(2);
      const d = cerebro.responder(ex, q, { temReserva: true });
      if (d.acao !== 'responder') continue; /* algumas caem de propósito nas travas (ex.: "barulho") */
      assert.ok(d.notas.includes(n.id), `"${q}" (de ${n.id}) foi para ${d.notas}`);
    }
  }
});

test('o motor é a mesma cópia do atendente do YAXUM', (t) => {
  const original = path.join(RAIZ, '..', 'fonte', 'cb-engine.js');
  if (!fs.existsSync(original)) { t.skip('fora do repositório do YAXUM'); return; }
  assert.equal(fs.readFileSync(path.join(RAIZ, 'motor', 'cb-engine.cjs'), 'utf8'), fs.readFileSync(original, 'utf8'));
});
