import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seedDir = path.join(ROOT, "knowledge/seed");
const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "YAXUMKnowledgeCorpus/1.0 (research corpus; https://github.com/senhorsmartflorianopolis-star/yaxum-sistema-loja)";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const targetWords = Number(args["target-words"] || 1_000_000);
const maxDepth = Number(args["max-depth"] || 2);
const batchId = args.batch || "wikipedia-behavior-015";
const output = path.join(seedDir, `${batchId}.jsonl`);
const roots = (args.categories || "Neuroscience|Cognitive science|Psychology|Human behavior|Psychoanalysis")
  .split("|")
  .map((item) => item.trim())
  .filter(Boolean);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(params) {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (response.ok) {
      await delay(80);
      return response.json();
    }
    if (attempt === 5) throw new Error(`Wikipedia API ${response.status}: ${url}`);
    await delay(attempt * 500);
  }
}

async function existingWikipediaIds() {
  const ids = new Set();
  const files = (await readdir(seedDir)).filter((name) => name.startsWith("wikipedia-") && name.endsWith(".jsonl"));
  for (const file of files) {
    const raw = await readFile(path.join(seedDir, file), "utf8");
    for (const line of raw.split(/\r?\n/).filter(Boolean)) {
      const match = line.match(/"id":"wikipedia-en-(\d+)"/);
      if (match) ids.add(Number(match[1]));
    }
  }
  return ids;
}

async function discoverPages() {
  const pages = new Map();
  const visitedCategories = new Set();
  const queue = roots.map((title) => ({ title: title.startsWith("Category:") ? title : `Category:${title}`, depth: 0 }));
  while (queue.length && pages.size < 15000) {
    const current = queue.shift();
    if (visitedCategories.has(current.title)) continue;
    visitedCategories.add(current.title);
    let cmcontinue;
    do {
      const data = await api({
        action: "query",
        list: "categorymembers",
        cmtitle: current.title,
        cmtype: "page|subcat",
        cmprop: "ids|title|type",
        cmlimit: "500",
        ...(cmcontinue ? { cmcontinue } : {})
      });
      for (const member of data.query?.categorymembers || []) {
        if (member.type === "page" && member.ns === 0) pages.set(member.pageid, member.title);
        if (member.type === "subcat" && current.depth < maxDepth) queue.push({ title: member.title, depth: current.depth + 1 });
      }
      cmcontinue = data.continue?.cmcontinue;
    } while (cmcontinue && pages.size < 15000);
    if (visitedCategories.size % 50 === 0) console.log(`Categorias: ${visitedCategories.size}; páginas candidatas: ${pages.size}`);
  }
  return pages;
}

function cleanExtract(text) {
  return String(text || "")
    .replace(/\n(?:See also|References|Further reading|External links|Notes)\n[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

await mkdir(seedDir, { recursive: true });
const usedIds = await existingWikipediaIds();
const candidates = await discoverPages();
const pending = [...candidates.keys()].filter((pageid) => !usedIds.has(pageid));
console.log(`Descobertas ${candidates.size} páginas; ${pending.length} ainda não coletadas.`);

const records = [];
let wordsCollected = 0;
for (let index = 0; index < pending.length && wordsCollected < targetWords; index += 20) {
  const pageids = pending.slice(index, index + 20).join("|");
  const data = await api({
    action: "query",
    prop: "extracts|revisions|pageprops",
    pageids,
    exlimit: "20",
    explaintext: "1",
    redirects: "1",
    rvprop: "ids|timestamp"
  });
  for (const page of data.query?.pages || []) {
    if (wordsCollected >= targetWords || page.missing || page.pageprops?.disambiguation !== undefined) continue;
    const text = cleanExtract(page.extract);
    const wordCount = text ? text.split(/\s+/).length : 0;
    if (wordCount < 120) continue;
    const revision = page.revisions?.[0];
    const encodedTitle = encodeURIComponent(page.title.replace(/ /g, "_"));
    records.push({
      id: `wikipedia-en-${page.pageid}`,
      title: page.title,
      text,
      source_name: `Wikipedia contributors — ${page.title}`,
      source_url: `https://en.wikipedia.org/wiki/${encodedTitle}`,
      source_history_url: `https://en.wikipedia.org/w/index.php?title=${encodedTitle}&action=history`,
      source_revision: revision?.revid || null,
      author: "Wikipedia contributors",
      license: "CC-BY-SA-4.0",
      language: "en",
      topics: ["psicologia", "neurociencia", "comportamento-humano", "referencia-enciclopedica"],
      batch_id: batchId,
      knowledge_kind: "referencia-enciclopedica",
      evidence_level: "fonte-terciaria",
      model_status: "referencia-requer-verificacao",
      epistemic_note: "Fonte enciclopédica terciária e colaborativa; afirmações importantes devem ser verificadas nas referências primárias ou revisões científicas citadas.",
      source_rights_note: "Texto reutilizado sob CC BY-SA 4.0, com atribuição e links para a página e seu histórico; espaços em branco foram normalizados.",
      retrieved_at: "2026-11-04"
    });
    wordsCollected += wordCount;
  }
  if (records.length && records.length % 100 < 20) console.log(`Coletados ${records.length} artigos; ${wordsCollected} palavras.`);
}

if (!records.length) throw new Error("Nenhum artigo novo foi coletado");
await writeFile(output, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
console.log(`Lote ${batchId}: ${records.length} artigos, ${wordsCollected} palavras.`);
