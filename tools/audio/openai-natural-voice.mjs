import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_VOICE_CONFIG = Object.freeze({
  model: "gpt-4o-mini-tts",
  voice: "marin",
  response_format: "opus",
  speed: 0.96,
  instructions: [
    "Fale em português brasileiro natural.",
    "Soa como uma atendente humana, adulta, acolhedora e segura conversando por WhatsApp.",
    "Use ritmo conversacional, pausas curtas entre ideias e entonação variada, sem pressa.",
    "Evite voz de locutor, entusiasmo exagerado, cantado, sussurro ou tom robótico.",
    "Dê ênfase discreta somente ao que ajuda o cliente a entender o próximo passo.",
    "Pronuncie números, valores, horários, siglas e nomes de marcas de forma clara.",
    "Não leia emojis, Markdown, endereços de internet ou símbolos de formatação.",
    "Leia somente o conteúdo fornecido, sem acrescentar comentários."
  ].join(" ")
});

const EMOJI_RE = /[\p{Extended_Pictographic}\uFE0F]/gu;

export function prepareTextForSpeech(value) {
  return String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[*_~#>|]/g, " ")
    .replace(EMOJI_RE, " ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSpeechPayload(text, overrides = {}) {
  const input = prepareTextForSpeech(text);
  if (!input) throw new Error("O texto do áudio está vazio após a limpeza.");
  if (input.length > 4096) throw new Error("O texto ultrapassa o limite de 4096 caracteres da Speech API.");
  return { ...DEFAULT_VOICE_CONFIG, ...overrides, input };
}

export async function generateNaturalVoice({
  text,
  outputPath,
  apiKey = process.env.OPENAI_API_KEY,
  config = {},
  fetchImpl = fetch
}) {
  if (!apiKey) throw new Error("Defina OPENAI_API_KEY no ambiente; não coloque a chave no código.");
  if (!outputPath) throw new Error("Informe outputPath para salvar o áudio.");

  const payload = createSpeechPayload(text, config);
  const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI Speech API ${response.status}: ${detail.slice(0, 600)}`);
  }

  const absoluteOutput = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, Buffer.from(await response.arrayBuffer()));
  return { outputPath: absoluteOutput, input: payload.input, config: payload };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const text = process.argv[2];
  const outputPath = process.argv[3] || "audio-yaxum.opus";
  if (!text) {
    console.error('Uso: npm run voice:generate -- "Texto do áudio" caminho/audio.opus');
    process.exitCode = 1;
  } else {
    generateNaturalVoice({ text, outputPath })
      .then((result) => console.log(`Áudio criado: ${result.outputPath}`))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  }
}
