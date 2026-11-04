import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const input = path.join(ROOT, "knowledge/source-texts/freud-interpretation-dreams.txt");
const output = path.join(ROOT, "knowledge/seed/historical-freud-dreams-008.jsonl");
const sourceUrl = "https://www.gutenberg.org/ebooks/66048";
const segmentWords = 12000;

const raw = (await readFile(input, "utf8")).replace(/\r\n/g, "\n");
const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK THE INTERPRETATION OF DREAMS ***";
const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK THE INTERPRETATION OF DREAMS ***";
const start = raw.indexOf(startMarker);
const end = raw.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) throw new Error("Marcadores do Project Gutenberg não encontrados");

const body = raw
  .slice(start + startMarker.length, end)
  .replace(/\[(\d+|[A-Z])\]/g, "[$1]")
  .replace(/\s+/g, " ")
  .trim();
const words = body.split(" ").filter(Boolean);
const records = [];

for (let offset = 0, part = 1; offset < words.length; offset += segmentWords, part += 1) {
  const text = words.slice(offset, offset + segmentWords).join(" ");
  records.push({
    id: `historical-freud-dreams-008-part-${String(part).padStart(2, "0")}`,
    title: `The Interpretation of Dreams — parte ${part}`,
    text,
    source_name: "Project Gutenberg — The Interpretation of Dreams",
    source_url: sourceUrl,
    author: "Sigmund Freud; tradução inglesa de A. A. Brill",
    license: "PDM-1.0",
    language: "en",
    topics: ["psicanalise", "sonhos", "inconsciente", "fonte-historica"],
    batch_id: "historical-freud-dreams-008",
    knowledge_kind: "fonte-primaria-historica",
    evidence_level: "texto-historico-dominio-publico",
    model_status: "historico-nao-anatomico",
    epistemic_note: "Fonte primária histórica da psicanálise; não representa consenso neurocientífico contemporâneo nem evidência clínica isolada.",
    source_rights_note: "Texto integral disponibilizado pelo Project Gutenberg como domínio público nos Estados Unidos; cabe ao redistribuidor verificar a jurisdição aplicável.",
    retrieved_at: "2026-11-04"
  });
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
console.log(`Importado: ${records.length} partes, ${words.length} palavras.`);
