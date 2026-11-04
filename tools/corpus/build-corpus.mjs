import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG_PATH = path.join(ROOT, "knowledge/config.json");
const DEFAULT_INPUT = path.join(ROOT, "knowledge/raw");
const SEED_INPUT = path.join(ROOT, "knowledge/seed");
const DEFAULT_OUTPUT = path.join(ROOT, "knowledge/processed/chunks.jsonl");
const DEFAULT_REPORT = path.join(ROOT, "knowledge/reports/manifest.json");

const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex");

export function validateRecord(record, config, location = "registro") {
  const errors = [];
  const required = ["id", "title", "text", "source_name", "source_url", "license", "language", "topics"];
  for (const key of required) if (record[key] == null || record[key] === "") errors.push(`${key} ausente`);
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(record.id || "")) errors.push("id inválido");
  if (normalize(record.text).length < 40) errors.push("text precisa ter ao menos 40 caracteres");
  try {
    const url = new URL(record.source_url);
    if (url.protocol !== "https:") errors.push("source_url precisa usar HTTPS");
  } catch {
    errors.push("source_url inválida");
  }
  if (!config.allowed_licenses.includes(record.license)) errors.push(`licença não permitida: ${record.license || "vazia"}`);
  if (!Array.isArray(record.topics) || record.topics.length === 0) errors.push("topics precisa ser uma lista não vazia");
  const topics = Array.isArray(record.topics) ? record.topics : [];
  const forbidden = topics.filter((topic) => config.excluded_scopes.includes(topic));
  if (forbidden.length) errors.push(`escopo ético bloqueado: ${forbidden.join(", ")}`);
  if (record.knowledge_kind === "fonte-primaria-historica") {
    if (!record.model_status?.includes("historico")) errors.push("fonte histórica precisa de model_status histórico");
    if (!normalize(record.epistemic_note).toLocaleLowerCase("pt-BR").includes("históric")) {
      errors.push("fonte histórica precisa de nota epistêmica explícita");
    }
  }
  if (record.knowledge_kind === "referencia-enciclopedica") {
    if (record.license !== "CC-BY-SA-4.0") errors.push("referência enciclopédica precisa preservar CC-BY-SA-4.0");
    if (!Number.isInteger(record.source_revision)) errors.push("referência enciclopédica precisa de revisão rastreável");
    try {
      const historyUrl = new URL(record.source_history_url);
      if (historyUrl.protocol !== "https:") errors.push("histórico da fonte precisa usar HTTPS");
    } catch {
      errors.push("referência enciclopédica precisa de histórico de autoria");
    }
  }
  if (errors.length) throw new Error(`${location}: ${errors.join("; ")}`);
}

export function chunkRecord(record, config) {
  const words = normalize(record.text).split(" ").filter(Boolean);
  const size = config.chunk_words;
  const overlap = config.chunk_overlap_words;
  if (!Number.isInteger(size) || size < 100) throw new Error("chunk_words precisa ser inteiro >= 100");
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) throw new Error("chunk_overlap_words precisa estar entre 0 e chunk_words - 1");
  const chunks = [];
  for (let start = 0, index = 0; start < words.length; start += size - overlap, index += 1) {
    const text = words.slice(start, start + size).join(" ");
    const contentHash = hash(normalize(text).toLocaleLowerCase("pt-BR"));
    chunks.push({
      chunk_id: `${record.id}:${String(index).padStart(5, "0")}:${contentHash.slice(0, 12)}`,
      document_id: record.id,
      text,
      word_count: text ? text.split(" ").length : 0,
      content_sha256: contentHash,
      metadata: {
        title: record.title,
        source_name: record.source_name,
        source_url: record.source_url,
        author: record.author || null,
        license: record.license,
        language: record.language,
        topics: record.topics,
        published_at: record.published_at || null,
        retrieved_at: record.retrieved_at || null,
        batch_id: record.batch_id || null,
        knowledge_kind: record.knowledge_kind || null,
        evidence_level: record.evidence_level || null,
        model_status: record.model_status || null,
        epistemic_note: record.epistemic_note || null,
        source_rights_note: record.source_rights_note || null,
        source_history_url: record.source_history_url || null,
        source_revision: record.source_revision || null
      }
    });
    if (start + size >= words.length) break;
  }
  return chunks;
}

async function listJsonl(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonl(full));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(full);
  }
  return files.sort();
}

export async function buildCorpus({ input = [SEED_INPUT, DEFAULT_INPUT], output = DEFAULT_OUTPUT, report = DEFAULT_REPORT } = {}) {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const inputs = Array.isArray(input) ? input : [input];
  const files = (await Promise.all(inputs.map(async (directory) => {
    try { return await listJsonl(directory); } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }))).flat().sort();
  if (!files.length) throw new Error(`Nenhum arquivo .jsonl encontrado em ${inputs.join(", ")}`);

  const documentIds = new Set();
  const documentHashes = new Set();
  const chunkHashes = new Set();
  const chunks = [];
  let documents = 0;
  let duplicateDocuments = 0;
  let duplicateChunks = 0;
  let inputWords = 0;
  const byBatch = {};
  const byTopic = {};
  const byEvidence = {};

  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      if (!lines[lineNumber].trim()) continue;
      const location = `${path.relative(ROOT, file)}:${lineNumber + 1}`;
      let record;
      try { record = JSON.parse(lines[lineNumber]); } catch (error) { throw new Error(`${location}: JSON inválido (${error.message})`); }
      validateRecord(record, config, location);
      if (documentIds.has(record.id)) throw new Error(`${location}: id duplicado: ${record.id}`);
      documentIds.add(record.id);
      const normalizedText = normalize(record.text);
      const documentHash = hash(normalizedText.toLocaleLowerCase("pt-BR"));
      if (documentHashes.has(documentHash)) { duplicateDocuments += 1; continue; }
      documentHashes.add(documentHash);
      documents += 1;
      inputWords += normalizedText.split(" ").filter(Boolean).length;
      const batch = record.batch_id || "sem-lote";
      byBatch[batch] = (byBatch[batch] || 0) + 1;
      for (const topic of record.topics) byTopic[topic] = (byTopic[topic] || 0) + 1;
      const evidence = record.evidence_level || "nao-informado";
      byEvidence[evidence] = (byEvidence[evidence] || 0) + 1;
      for (const chunk of chunkRecord(record, config)) {
        if (chunkHashes.has(chunk.content_sha256)) { duplicateChunks += 1; continue; }
        chunkHashes.add(chunk.content_sha256);
        chunks.push(chunk);
      }
    }
  }

  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(path.dirname(report), { recursive: true });
  await writeFile(output, chunks.map((chunk) => JSON.stringify(chunk)).join("\n") + (chunks.length ? "\n" : ""), "utf8");
  const manifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    target_words: config.target_words,
    input_words: inputWords,
    progress_percent: Number((inputWords / config.target_words * 100).toFixed(4)),
    documents,
    chunks: chunks.length,
    duplicate_documents_removed: duplicateDocuments,
    duplicate_chunks_removed: duplicateChunks,
    documents_by_batch: byBatch,
    documents_by_topic: byTopic,
    documents_by_evidence: byEvidence,
    allowed_licenses: config.allowed_licenses,
    output: path.relative(ROOT, output).replaceAll("\\", "/")
  };
  await writeFile(report, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : [SEED_INPUT, DEFAULT_INPUT];
  const output = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT;
  try {
    const manifest = await buildCorpus({ input, output });
    console.log(`Corpus: ${manifest.documents} documentos, ${manifest.chunks} trechos, ${manifest.input_words} palavras (${manifest.progress_percent}% da meta).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
