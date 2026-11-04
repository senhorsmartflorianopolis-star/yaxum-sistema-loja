import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceDir = path.join(ROOT, "knowledge/source-texts");
const outputDir = path.join(ROOT, "knowledge/seed");
const segmentWords = 12000;

const catalog = [
  {
    ebook: "57628",
    file: "william-james-principles-psychology-v1.txt",
    output: "historical-james-psychology-v1-009.jsonl",
    batch: "historical-james-psychology-v1-009",
    title: "The Principles of Psychology, Volume 1",
    author: "William James",
    topics: ["psicologia", "consciencia", "atencao", "habito", "memoria", "fonte-historica"]
  },
  {
    ebook: "57634",
    file: "william-james-principles-psychology-v2.txt",
    output: "historical-james-psychology-v2-010.jsonl",
    batch: "historical-james-psychology-v2-010",
    title: "The Principles of Psychology, Volume 2",
    author: "William James",
    topics: ["psicologia", "sensacao", "percepcao", "raciocinio", "vontade", "fonte-historica"]
  },
  {
    ebook: "67332",
    file: "freud-psychopathology-everyday-life.txt",
    output: "historical-freud-everyday-life-011.jsonl",
    batch: "historical-freud-everyday-life-011",
    title: "Psychopathology of Everyday Life",
    author: "Sigmund Freud; tradução inglesa de A. A. Brill",
    topics: ["psicanalise", "lapsos", "memoria", "inconsciente", "fonte-historica"]
  },
  {
    ebook: "1227",
    file: "darwin-expression-emotions.txt",
    output: "historical-darwin-expression-emotions-012.jsonl",
    batch: "historical-darwin-expression-emotions-012",
    title: "The Expression of the Emotions in Man and Animals",
    author: "Charles Darwin",
    topics: ["emocao", "expressao", "comportamento-comparado", "evolucao", "fonte-historica"]
  },
  {
    ebook: "35877",
    file: "freud-group-psychology.txt",
    output: "historical-freud-group-psychology-013.jsonl",
    batch: "historical-freud-group-psychology-013",
    title: "Group Psychology and The Analysis of The Ego",
    author: "Sigmund Freud; tradução inglesa de James Strachey",
    topics: ["psicanalise", "psicologia-social", "grupos", "identificacao", "ego", "fonte-historica"]
  },
  {
    ebook: "76031",
    file: "freud-beyond-pleasure-principle.txt",
    output: "historical-freud-beyond-pleasure-014.jsonl",
    batch: "historical-freud-beyond-pleasure-014",
    title: "Beyond the Pleasure Principle",
    author: "Sigmund Freud; tradução inglesa de C. J. M. Hubback",
    topics: ["psicanalise", "repeticao", "trauma", "pulsao", "prazer", "fonte-historica"]
  }
];

function extractBody(raw, title) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const startMatch = normalized.match(/^\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*$/im);
  const endMatch = normalized.match(/^\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*$/im);
  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    throw new Error(`Marcadores do Project Gutenberg não encontrados em ${title}`);
  }
  return normalized
    .slice(startMatch.index + startMatch[0].length, endMatch.index)
    .replace(/\s+/g, " ")
    .trim();
}

await mkdir(outputDir, { recursive: true });
let totalWords = 0;
let totalRecords = 0;

for (const book of catalog) {
  const raw = await readFile(path.join(sourceDir, book.file), "utf8");
  const body = extractBody(raw, book.title);
  const words = body.split(" ").filter(Boolean);
  const records = [];
  for (let offset = 0, part = 1; offset < words.length; offset += segmentWords, part += 1) {
    records.push({
      id: `${book.batch}-part-${String(part).padStart(2, "0")}`,
      title: `${book.title} — parte ${part}`,
      text: words.slice(offset, offset + segmentWords).join(" "),
      source_name: `Project Gutenberg — ${book.title}`,
      source_url: `https://www.gutenberg.org/ebooks/${book.ebook}`,
      author: book.author,
      license: "PDM-1.0",
      language: "en",
      topics: book.topics,
      batch_id: book.batch,
      knowledge_kind: "fonte-primaria-historica",
      evidence_level: "texto-historico-dominio-publico",
      model_status: "historico-nao-anatomico",
      epistemic_note: "Fonte histórica da psicologia ou do comportamento; pode conter conceitos e linguagem desatualizados e não representa consenso científico contemporâneo.",
      source_rights_note: "Texto integral disponibilizado pelo Project Gutenberg como domínio público nos Estados Unidos; cabe ao redistribuidor verificar a jurisdição aplicável.",
      retrieved_at: "2026-11-04"
    });
  }
  await writeFile(path.join(outputDir, book.output), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
  console.log(`${book.title}: ${records.length} partes, ${words.length} palavras.`);
  totalWords += words.length;
  totalRecords += records.length;
}

console.log(`Biblioteca importada: ${totalRecords} partes, ${totalWords} palavras.`);
