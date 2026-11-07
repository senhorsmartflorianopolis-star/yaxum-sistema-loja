import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_VOICE_CONFIG,
  createSpeechPayload,
  prepareTextForSpeech
} from "../tools/audio/openai-natural-voice.mjs";

test("limpa símbolos, links, markdown e emojis antes da fala", () => {
  const text = prepareTextForSpeech("**Oi!** 😊 Veja [a Ordem](https://example.com/os)\nEstá pronta.");
  assert.equal(text, "Oi! Veja a Ordem. Está pronta.");
});

test("usa configuração natural em português e saída Opus", () => {
  const payload = createSpeechPayload("Seu aparelho ficou pronto.");
  assert.equal(payload.model, "gpt-4o-mini-tts");
  assert.equal(payload.voice, "marin");
  assert.equal(payload.response_format, "opus");
  assert.equal(payload.speed, 0.96);
  assert.match(payload.instructions, /português brasileiro natural/i);
  assert.equal(DEFAULT_VOICE_CONFIG.voice, "marin");
});

test("recusa texto vazio ou acima do limite da API", () => {
  assert.throws(() => createSpeechPayload("😊 ** **"), /vazio/);
  assert.throws(() => createSpeechPayload("a".repeat(4097)), /4096/);
});
