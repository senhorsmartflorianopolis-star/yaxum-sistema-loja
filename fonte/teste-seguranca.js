/* Segurança primeiro: risco nunca perde para nota de conserto. Rode: node teste-seguranca.js */
const X = require('./cb-engine.js'); const E = X.build(require('../cerebro.json'))
const casos = [
  ['tô sentindo cheiro de gás', 'vazamento-de-gas-emergencia'], ['o fogao ta com cheiro de gas', 'vazamento-de-gas-emergencia'],
  ['cheiro forte de gas na cozinha o que faço', 'vazamento-de-gas-emergencia'], ['a tomada da cozinha tá dando choque', 'choque-eletrico-emergencia'],
  ['levei um choque no chuveiro', 'choque-eletrico-emergencia'], ['meu celular ta com cheiro de queimado', 'curto-e-cheiro-de-queimado'],
  ['a tv soltando fumaça', 'cheiro-de-queimado-geral'], ['a bateria do iphone estufou', 'bateria-estufada'],
  ['minha geladeira ta sem gas', 'geladeira-gas-recarga'], ['recarga de gas do ar', 'ar-gas-recarga-vazamento'],
]
let ok = 0, f = 0
for (const lojas of [{}, X.LOJA_DEMO, { segmentos: ['celular'] }]) for (const [q, esp] of casos) {
  /* Os dois últimos não são risco: numa loja só de celular, viram "não fazemos". */
  const esperado = (lojas.segmentos && lojas.segmentos.length === 1 && /gas-recarga/.test(esp)) ? 'segmento-que-a-loja-nao-faz' : esp
  const a = X.answer(E, q, Object.assign({}, lojas)); const veio = a.ok ? a.note.id : 'FALLBACK'
  if (veio === esperado) ok++; else { f++; console.error(`FALHOU (${JSON.stringify(lojas.segmentos || 'todas')}): "${q}" → ${veio} (esperado ${esperado})`) }
}
console.log(`${ok} conferência(s) passaram, ${f} falharam.`); process.exit(f ? 1 : 0)
