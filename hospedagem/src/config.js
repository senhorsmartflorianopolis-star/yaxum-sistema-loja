/* Configuração do YAXUM Hospedagem: lê o .env (sem dependências) e
   transforma as variáveis de ambiente num objeto com valores padrão. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Lê um arquivo .env simples (CHAVE=valor). Não sobrescreve o que já
   estiver definido no ambiente do servidor. */
export function lerEnv(arquivo = path.join(RAIZ, '.env')) {
  if (!fs.existsSync(arquivo)) return false;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(linha)) continue;
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha);
    if (!m) continue;
    let valor = m[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
  return true;
}

export function carregarConfig(env = process.env) {
  const numero = (chave, padrao) => {
    if (env[chave] === undefined || env[chave] === '') return padrao;
    const v = Number(env[chave]);
    if (!Number.isFinite(v) || v < 0) throw new Error(`${chave} precisa ser um número (veio "${env[chave]}").`);
    return v;
  };
  const modo = (env.MODO || 'teste').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!['teste', 'automatico'].includes(modo)) {
    throw new Error(`MODO inválido: "${env.MODO}". Use "teste" ou "automatico".`);
  }
  return {
    porta: numero('PORTA', numero('PORT', 3000)),
    modo,
    hostexToken: (env.HOSTEX_TOKEN || '').trim(),
    hostexUrl: (env.HOSTEX_URL || 'https://api.hostex.io/v3').replace(/\/+$/, ''),
    segredoWebhook: (env.HOSTEX_WEBHOOK_SECRET || '').trim(),
    tokenAdmin: (env.TOKEN_ADMIN || '').trim(),
    aguardarSegundos: numero('AGUARDAR_SEGUNDOS', 20),
    pausaSeHumanoMin: numero('PAUSA_SE_HUMANO_MINUTOS', 60),
    idadeMaximaMin: numero('IDADE_MAXIMA_MINUTOS', 180),
    limiteRespostasDia: numero('LIMITE_RESPOSTAS_DIA', 15),
    varreduraMin: numero('VARREDURA_MINUTOS', 10),
    esperaRepetirHoras: numero('ESPERA_REPETIR_HORAS', 6),
    canais: (env.CANAIS || 'airbnb').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    anotar: !/^(nao|não|0|false|off)$/i.test((env.ANOTAR || 'sim').trim()),
    avisoNtfyTopico: (env.AVISO_NTFY_TOPICO || '').trim(),
    avisoNtfyServidor: (env.AVISO_NTFY_SERVIDOR || 'https://ntfy.sh').replace(/\/+$/, ''),
    arquivoEstado: env.ARQUIVO_ESTADO || path.join(RAIZ, 'dados', 'estado.json'),
    pastaCerebro: env.PASTA_CEREBRO || path.join(RAIZ, 'cerebro'),
  };
}
