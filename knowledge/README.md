# Corpus de conhecimento YAXUM

Este diretório mantém o corpus de pesquisa separado do `cerebro.json` operacional. O navegador continua carregando somente respostas curadas; o material extenso fica preparado para indexação vetorial e recuperação por RAG.

## Fluxo

1. Lotes revisados ficam em `knowledge/seed/`; coletas ainda não aprovadas ficam em `knowledge/raw/`.
2. Registre uma fonte por linha conforme `schema/corpus-record.schema.json`.
3. Execute `npm run corpus:build`.
4. Use `knowledge/processed/chunks.jsonl` como entrada do indexador vetorial.
5. Consulte `knowledge/reports/manifest.json` antes de publicar ou indexar.

Por padrão, o construtor aceita apenas domínio público marcado e licenças CC0, CC BY e CC BY-SA. Conteúdo sem licença verificável ou com restrição comercial é rejeitado.

## Separação dos cérebros

- `cerebro.json`: regras, respostas e ações operacionais revisadas.
- `knowledge/raw/`: documentos de origem e seus metadados.
- `knowledge/processed/chunks.jsonl`: trechos deduplicados para busca semântica.
- Banco vetorial: índice externo; não deve ser empacotado na landing page.

O objetivo configurado é de 10 milhões de palavras. Quantidade não substitui qualidade: toda fonte precisa ter licença, autoria, URL e temas verificáveis.

## Coleta progressiva

Cada lote recebe um `batch_id`. O relatório agrupa documentos por lote, tema e nível de evidência, permitindo interromper, revisar ou remover uma etapa sem contaminar as demais. O primeiro lote cobre anatomia, consciência, processamento não consciente, memória, interocepção e o modelo psicanalítico.

O histórico aprovado e o próximo lote planejado ficam em `batches.json`.

### Coleta enciclopédica rastreável

`npm run corpus:collect:wikipedia -- --target-words=1000000 --batch=wikipedia-exemplo-001 "--categories=Psychology|Neuroscience"` cria um lote recomeçável pela API MediaWiki. Cada artigo mantém URL canônica, ID da revisão, link para o histórico de autores e licença CC BY-SA 4.0. Artigos já presentes em qualquer lote `wikipedia-*.jsonl` são ignorados. O texto é fonte terciária colaborativa: respostas de alto impacto devem confirmar a afirmação em revisões científicas, fontes oficiais ou literatura primária.

### Fontes históricas integrais

Obras em domínio público podem ser mantidas em `knowledge/source-texts/` e convertidas em registros rastreáveis. Execute `npm run corpus:import:freud-dreams` para reproduzir o lote histórico 008 e `npm run corpus:import:historical-library` para os lotes 009–014 antes de reconstruir o corpus. Essas fontes devem usar `knowledge_kind: fonte-primaria-historica`, `model_status` histórico e uma nota epistêmica explícita. Elas servem para pesquisa da história das ideias e nunca devem ser apresentadas como anatomia, diagnóstico ou consenso experimental contemporâneo.

## Persuasão ética

O corpus pode abordar argumentação, negociação, confiança, comunicação e tomada de decisão. Não deve incluir instruções destinadas a coerção, fraude, exploração de vulnerabilidades ou manipulação enganosa. Esses escopos estão bloqueados em `config.json` e devem continuar bloqueados na camada de resposta.
