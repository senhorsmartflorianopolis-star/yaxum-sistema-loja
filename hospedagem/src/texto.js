/* Leitura da mensagem do hóspede: idioma, saudação, assuntos que sempre
   vão para a anfitriã e divisão da mensagem em perguntas. */

export const dobrar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- idioma ----------
   Só contam palavras que existem num idioma e não nos outros. Empate fica
   com português. */
const MARCAS = {
  pt: 'voce voces obrigado obrigada valeu nao onde qual quais tem posso senha estacionamento oi ola chave chegar chegada chegamos saida toalhas cachorro praia preciso gostaria amanha apartamento eu meu minha uma um com isso esta estou vamos podemos sim ate cafe tudo bem horario entrar levar',
  es: 'hola gracias buenas buenos donde cual cuales contrasena llave llaves llegar llegamos llegada salida cochera puedo tienen hay habitacion toallas sabanas mascota mascotas perro playa necesito quisiera manana ustedes usted departamento el los las y es muy con pero tambien estacionamiento aire queremos somos estamos nosotros hasta desde hora horario llevamos todo bien',
  en: 'the is are what where how when can could do does you your we our hi hello thanks thank please password parking there any have has it and of for to with my me i im arrive arriving time get key keys bring dog beach late early',
};
const CONJ = Object.fromEntries(Object.entries(MARCAS).map(([k, v]) => [k, new Set(v.split(' '))]));

export function detectarIdioma(texto) {
  const bruto = String(texto || '');
  const pts = { pt: 0, es: 0, en: 0 };
  if (/[¿¡ñ]/i.test(bruto)) pts.es += 2;
  if (/[ãõç]/i.test(bruto)) pts.pt += 2;
  for (const w of dobrar(bruto).replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)) {
    const p = w.replace(/'/g, '');
    for (const k of ['pt', 'es', 'en']) if (CONJ[k].has(p)) pts[k] += 1;
  }
  if (pts.es > pts.pt && pts.es >= pts.en) return 'es';
  if (pts.en > pts.pt && pts.en > pts.es) return 'en';
  return 'pt';
}

/* ---------- assuntos que a IA nunca resolve sozinha ----------
   A ordem importa: emergência primeiro. Cada regra tem um motivo curto,
   que aparece na nota da conversa para a anfitriã. */
export const REGRAS = [
  {
    tipo: 'emergencia',
    motivo: 'possível EMERGÊNCIA',
    /* cuidado: "robo" em espanhol é roubo, mas dobrado também é "robô" em
       português; por isso só entra "robaron"/"asalto". */
    rx: /\b(pegando fogo|pegou fogo|incendio (na|no|em|aqui|en)|fogo (na|no) (casa|apartamento|apto|cozinha|quarto)|fumaca saindo|saindo fumaca|cheiro (forte )?de (gas|queimado)|vazamento de gas|vazando gas|socorro|auxilio|emergencia|assalt\w*|roubaram|fomos roubad\w*|ladra?o\w*|invadi\w*|policia|ambulancia|passando mal|desmai\w*|sangrando|machuc\w*|fire|smell(s)? (of )?gas|gas leak|emergency|robbed|break.?in|police|ambulance|injured|olor a gas|fuga de gas|humo|robaron|nos robaron|herid[oa])\b/,
  },
  {
    tipo: 'humano',
    motivo: 'pediu para falar com uma pessoa',
    rx: /\b((falar|conversar) com (a |o |uma |um |alguma |algum )?(anfitri\w*|dona|dono|proprietari\w*|pessoa|humano|alguem|responsavel|atendente)|atendimento humano|(hablar|charlar) con (el |la |una |un |alguna |algun )?(anfitri\w*|duen\w*|persona|humano|alguien|responsable)|(talk|speak) (to|with) (a |the |an )?(real )?(human|person|host|owner|someone|somebody|manager))\b/,
  },
  {
    tipo: 'reserva',
    motivo: 'mudança de reserva, cancelamento ou dinheiro',
    rx: /\b(cancel\w*|reembols\w*|estorn\w*|devolu\w* (do |de |del )?(dinheiro|valor|pagamento|dinero|pago)|devolver (o |el )?(dinheiro|dinero|valor)|desconto|descuento|discount|mais barat\w*|mas barat\w*|cheaper|negoci\w*|refund\w*|(mudar|trocar|alterar|antecipar|adiar|estender|prolongar|prorrogar|cambiar|extender|change|extend|modify) (a |as |la |las |the |my |our |mi |nuestra )?(data|datas|reserva|estadia|fecha|fechas|dates?|reservation|booking|stay)|(mais|otra|outra|one more|another|extra) (uma |un |una )?(noite|diaria|noche|night)|(noite|diaria|noche|night) (a mais|extra|mas)|(adicionar|incluir|acrescentar|agregar|add) (um |mais um |mais uma |uma |otro |otra |a |another |one more )?(hospede|huesped|guest|pessoa|persona|person)|(mais|otra|outra|another|one more) (uma |un |una )?(pessoa|persona|person|hospede|huesped|guest))\b/,
  },
  {
    tipo: 'fora',
    motivo: 'contato ou pagamento por fora da plataforma',
    rx: /\b(whats ?app|whats|zap|wpp|pix|transferencia|deposito|e-?mail|correo|instagram|telefone|telefono|phone|numero (de |do )?(celular|telefone|contato|telefono)|me (liga|ligue|chama no)|call me|por fora|fuera de airbnb|outside (of )?airbnb|en efectivo|in cash|paypal|venmo)\b/,
  },
  {
    tipo: 'problema',
    motivo: 'problema, reclamação ou algo quebrado',
    rx: /\b(suj[oa]s?|sujeira|imund\w*|quebrad\w*|quebrou|estragad\w*|estragou|(nao|n|no|not|doesn.?t|does not|isn.?t|can.?t|cannot|won.?t|don.?t) (esta )?(funciona|funcionando|liga|ligou|esquenta|gela|acende|abre|fecha|anda|prende|sale|work|working|open|turn on|consigo entrar|consigo abrir|podemos entrar|get in)|parou de funcionar|dejo de funcionar|sem (agua|luz|energia|internet|gas)|sin (agua|luz|internet|gas)|no (water|power|hot water|internet)|vazamento|vazando|goteira|entupi\w*|tapad[oa]|barata|cucaracha|cockroach|rato|raton|rata|mouse|inseto|insecto|formiga|hormiga|mofo|moho|mold|cheiro ruim|fedendo|mal olor|smells? bad|barulh\w*|ruido|noise|noisy|reclam\w*|queja|complain\w*|decepcion\w*|disappoint\w*|pessim\w*|horrivel|horrible|terrible|absurdo|insatisfeit\w*|problema|problem|issue|locked out|dirty|broken|broke|leak\w*|roto|rota|rompi\w*|sucio|sucia)\b/,
  },
];

export function classificar(texto) {
  const f = ' ' + dobrar(texto).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const r of REGRAS) {
    const m = r.rx.exec(f);
    if (m) return { tipo: r.tipo, motivo: r.motivo, trecho: m[0].trim() };
  }
  return null;
}

/* ---------- confirmação sem pergunta ("ok", "beleza", 👍) ---------- */
const CONFIRMA = /^(ok(ay|ey|ei)?|okk+|blz|beleza|certo|certinho|perfeito|show|combinado|entendi|entendido|ta bom|ta|ta certo|fechado|joia|top|sim|isso|vale|dale|genial|perfecto|listo|bueno|claro|great|perfect|cool|got it|sounds good|alright|all right|fine|sure|yes|yep)( (ok|entao|obg|valeu|gracias|thanks))?$/;

export function soConfirmacao(texto) {
  const semEmoji = String(texto || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, ' ');
  const f = dobrar(semEmoji).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!f) return true; /* só emoji, figurinha ou pontuação */
  return CONFIRMA.test(f);
}

/* ---------- saudação no começo da mensagem ---------- */
const SAUDACAO = /^\s*(oi+e?|ola+|opa+|e ?ai|salve|hey|hello|hi|hola|bom dia|boa tarde|boa noite|buen dia|buenos dias|buenas tardes|buenas noches|buenas|good morning|good afternoon|good evening)\b[\s,!.?]*/;
const COMO_VAI = /^\s*(tudo (bem|bom|certo|tranquilo)|como (vai|vc esta|voce esta|estas|esta)|que tal|todo bien|how are you( doing)?|how s it going)\b[\s,!.?]*/;

/* Devolve o resto no texto original (com acento): "a praia é perto" não pode
   virar "a praia e perto", senão o "e" parece conjunção. A busca casa no
   texto dobrado, que tem o mesmo tamanho do original em NFC. */
export function tirarSaudacao(texto) {
  let orig = String(texto || '').normalize('NFC').replace(/^[\s¡¿"'“”(]+/, '').trim();
  let tipo = null;
  const cortar = (rx) => {
    const f = dobrar(orig);
    const m = rx.exec(f);
    if (!m) return null;
    /* se algum caractere raro mudou de tamanho ao dobrar, segue com o dobrado */
    orig = f.length === orig.length ? orig.slice(m[0].length) : f.slice(m[0].length);
    return m;
  };
  const m = cortar(SAUDACAO);
  if (m) {
    const s = m[1];
    tipo = /bom dia|buen(os)? dia|morning/.test(s) ? 'dia' : /boa tarde|buenas tardes|afternoon/.test(s) ? 'tarde' : /boa noite|buenas noches|evening/.test(s) ? 'noite' : 'oi';
  }
  if (cortar(COMO_VAI)) tipo = tipo || 'oi';
  /* "E que horas é o checkout?": a conjunção no começo da frase não conta */
  orig = orig.replace(/^\s*(e|y|and|tambem|também|also)\s+/i, '');
  return { tipo, resto: orig.trim() };
}

/* ---------- divisão em perguntas ----------
   Uma frase por pergunta; dentro da frase, tenta separar por "e"/"y"/"and"
   ("que horas é o check-in e tem estacionamento?"). */
export function dividirFrases(texto) {
  return String(texto || '')
    .split(/\n+|(?<=[?!.;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function dividirConjuncao(frase) {
  return frase.split(/\s+(?:e|y|and|tambem|también|also|ademas|além disso)\s+/i).map((s) => s.trim()).filter(Boolean);
}
