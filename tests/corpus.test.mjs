import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../knowledge/config.json" with { type: "json" };
import { chunkRecord, validateRecord } from "../tools/corpus/build-corpus.mjs";

const base = {
  id: "fonte-valida-001",
  title: "Fonte válida",
  text: "Texto autorizado e rastreável para testar a construção do corpus de conhecimento do YAXUM com metadados suficientes.",
  source_name: "Fonte de teste",
  source_url: "https://example.com/fonte",
  license: "CC-BY-4.0",
  language: "pt-BR",
  topics: ["psicanalise"]
};

test("aceita registro rastreável e licenciado", () => {
  assert.doesNotThrow(() => validateRecord(base, config));
});

test("rejeita licença não autorizada", () => {
  assert.throws(() => validateRecord({ ...base, license: "ARR" }, config), /licença não permitida/);
});

test("rejeita escopo de manipulação enganosa", () => {
  assert.throws(() => validateRecord({ ...base, topics: ["manipulacao-enganosa"] }, config), /escopo ético bloqueado/);
});

test("divide texto com sobreposição e metadados", () => {
  const words = Array.from({ length: 250 }, (_, index) => `palavra${index}`).join(" ");
  const chunks = chunkRecord({ ...base, text: words }, { ...config, chunk_words: 100, chunk_overlap_words: 20 });
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].word_count, 100);
  assert.equal(chunks[1].text.split(" ")[0], "palavra80");
  assert.equal(chunks[0].metadata.license, "CC-BY-4.0");
});

test("preserva classificação científica e lote", () => {
  const [chunk] = chunkRecord({
    ...base,
    batch_id: "brain-foundations-001",
    knowledge_kind: "neurociencia",
    evidence_level: "revisao-cientifica",
    model_status: "funcional",
    epistemic_note: "Associação funcional, não localização exclusiva."
  }, config);
  assert.equal(chunk.metadata.batch_id, "brain-foundations-001");
  assert.equal(chunk.metadata.knowledge_kind, "neurociencia");
  assert.match(chunk.metadata.epistemic_note, /não localização/);
});
