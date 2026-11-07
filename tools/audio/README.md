# Voz automática natural do YAXUM

Este adaptador gera mensagens de voz em português brasileiro com a OpenAI Speech API. A configuração padrão usa `gpt-4o-mini-tts`, voz `marin`, velocidade `0.96` e formato `opus`, adequado para comunicação e envio pelo WhatsApp.

## Uso

Defina `OPENAI_API_KEY` somente no ambiente do servidor e execute:

```powershell
$env:OPENAI_API_KEY="sua-chave-no-servidor"
npm run voice:generate -- "Oi, seu aparelho ficou pronto. Pode retirar até as seis da tarde." "audio-pronto.opus"
```

Em uma automação Node.js, importe `generateNaturalVoice` e envie o arquivo `.opus` retornado pela integração oficial do WhatsApp. Nunca exponha a chave da OpenAI no navegador, no GitHub ou em mensagens.

Antes da geração, o adaptador remove URLs, Markdown e emojis que costumam deixar a leitura artificial. Mensagens devem ser curtas, com pontuação natural e uma ideia principal por áudio. O usuário precisa ser informado claramente de que a voz é gerada por inteligência artificial.

## Migração obrigatória

A documentação oficial da OpenAI informa que `gpt-4o-mini-tts` e a rota Speech serão desativados em **6 de janeiro de 2027**. A integração deverá migrar para `gpt-realtime-2.1-mini` pela Realtime API antes dessa data. Este adaptador mantém a rota atual porque ela retorna diretamente um arquivo Opus, apropriado ao fluxo existente de áudio automático.

Para uma voz exclusiva da loja, a OpenAI também oferece vozes personalizadas mediante gravação de consentimento e amostra correspondente. Não clone nem imite a voz de uma pessoa sem autorização explícita.
