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

## Persuasão ética

O corpus pode abordar argumentação, negociação, confiança, comunicação e tomada de decisão. Não deve incluir instruções destinadas a coerção, fraude, exploração de vulnerabilidades ou manipulação enganosa. Esses escopos estão bloqueados em `config.json` e devem continuar bloqueados na camada de resposta.
