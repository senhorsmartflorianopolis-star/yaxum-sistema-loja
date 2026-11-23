# YAXUM Hospedagem

Responde os hóspedes do Airbnb da Yasmim pela **API oficial da Hostex** (plano Pró), usando o mesmo **cérebro e motor do atendente do YAXUM** (`motor/cb-engine.cjs` é cópia exata de `fonte/cb-engine.js`).

Não usa IA paga: as respostas saem das notas do cérebro, escritas por vocês. O que o cérebro não sabe com segurança, ele **não inventa**: passa para a Yasmim.

```
Hóspede escreve no Airbnb
   → Hostex avisa o servidor (webhook "message_created")
   → YAXUM espera ~20 s (o hóspede costuma mandar "oi" e depois a pergunta)
   → lê a conversa, descobre o imóvel e se tem reserva confirmada
   → cérebro do imóvel: acha a nota certa?
        sim → responde pela API da Hostex (sai no Airbnb)
        não → manda "Recebi sua mensagem, a Yasmim já responde" e anota para ela
```

## O que ele faz sozinho e o que passa para a Yasmim

**Responde** (30 notas prontas em `cerebro/comum/`): horário de check-in e check-out, como entrar, endereço, Wi-Fi, estacionamento, pet, fumar, festas e visitas, silêncio, regras, camas, toalhas, cozinha, ar-condicionado, lixo, mercado e farmácia, praia, transporte, guardar malas, check-in antecipado, late checkout, aviso de chegada, TV, máquina de lavar, crianças, documentos da portaria, "você é um robô?" (responde com honestidade). Em **português, espanhol e inglês**, com "Oi, Maria!" / "¡Hola, Juan!".

**Sempre passa para a Yasmim:**

| Situação | O que acontece |
|---|---|
| Pergunta que nenhuma nota responde com segurança, ou ambígua ("qual a senha?": do Wi-Fi ou da porta?) | Mensagem de espera + nota |
| Cancelamento, reembolso, desconto, mudar datas, noite extra, pessoa a mais | Mensagem de espera + nota |
| Pedir WhatsApp, telefone, Pix, pagar por fora (o Airbnb proíbe) | Mensagem de espera + nota |
| Reclamação ou algo quebrado ("o chuveiro não esquenta", "não consigo entrar") | Mensagem de espera + nota |
| Quer falar com uma pessoa | Mensagem de espera + nota |
| Foto/arquivo, pedido de reserva, oferta especial | Mensagem de espera + nota |
| **Emergência** (gás, fogo, assalto, passando mal) | Manda na hora Bombeiros 193 / SAMU 192 / Polícia 190, nota e alerta urgente |
| "ok", "beleza", 👍 | Não responde nada |

**Travas de segurança:**
- Senha do Wi-Fi, endereço completo e instruções de entrada **só para reserva confirmada**. Para quem só está consultando, vai a versão sem dados ("Fica em Canasvieiras…").
- Se a Yasmim respondeu na conversa na última hora, o YAXUM fica quieto. A conversa é dela.
- Escrever `yaxum off` na nota privada da conversa desliga o YAXUM só para aquele hóspede.
- Máximo de 15 respostas automáticas por conversa por dia. Mensagem com mais de 3 horas não recebe resposta automática.
- Nunca responde duas vezes a mesma mensagem, mesmo se a Hostex repetir o aviso.

## Passo a passo dos testes

Precisa do **Node.js 18 ou mais novo** instalado no PC.

### 1. Testar no PC, sem Hostex (5 minutos)

```bash
cd hospedagem
npm test            # 29 testes automáticos
npm run simular     # conversa inteira com uma Hostex de mentira
npm run testar      # você escreve como hóspede e vê a resposta
npm run testar -- --sem-reserva "qual a senha do wifi?"
```

O `testar` usa o imóvel `exemplo`, que já vem preenchido.

### 2. Os imóveis da Yasmim (já preenchidos)

A Yasmim tem **duas casas** no Centro e **13 anúncios** no Airbnb. Cada anúncio está vinculado a uma propriedade na Hostex e cada propriedade aponta para uma ficha aqui:

| Ficha (`cerebro/imoveis/`) | Casa | Anúncio do Airbnb | Propriedade na Hostex |
|---|---|---|---|
| `comfort` | alvenaria | Quarto com projetor e mesa | Cine Confort (12854066) |
| `homely` | alvenaria | Quarto com frigobar e Smart TV | Homely (12854067) |
| `office` | alvenaria | Quarto com ar-condicionado e mesa | Office (12854068) |
| `dormitorio` | alvenaria | Camas 1 a 7 do dormitório | Dormitório Cama 1…7 (12854072 a 12854078) |
| `urban-house` | alvenaria | Urban House para 10 (casa inteira) | Urban House (12854071) |
| `windows` | madeira | Quarto individual a 5 min da Beira-Mar | Urban Windows (12854069) |
| `closet` | madeira | Quarto individual com cama de casal e armário | Closet (12854070) |

O que vale para a casa toda (horários, regras, cozinha, lavanderia, Wi-Fi, endereço) fica uma vez só em `cerebro/imoveis/_casas/alvenaria.json` e `madeira.json`. A ficha do anúncio guarda só o que é dela (capacidade, TV, ar-condicionado…) e vence a casa. `null` num campo da ficha apaga o valor herdado (a Urban House usa isso na toalha, que o anúncio não menciona).

Tudo foi preenchido com o que está **público nos anúncios** (23/11/2026), em português, espanhol e inglês. Campo vazio continua indo para a Yasmim: lixo, transporte, crianças, documentos, TV do Office e do dormitório, toalha da Urban House. O servidor lista o que falta quando liga.

```bash
npm run testar -- --imovel office "tem ar condicionado?"
```

#### Senha do Wi-Fi, endereço e código do cofre: NUNCA no GitHub

Este repositório é **público**. Dado privado vai em um destes lugares (o servidor junta os dois):

- **`cerebro/privado.json`** no servidor (o git ignora esse arquivo). Modelo: `cerebro/privado.exemplo.json`.
- **Variável de ambiente `CEREBRO_PRIVADO`** com o mesmo JSON numa linha só (melhor para Railway, Render etc.).

```json
{"alvenaria":{"endereco":"Rua …, Centro","wifi_nome":"…","wifi_senha":"…"},"madeira":{"endereco":"…","wifi_nome":"…","wifi_senha":"…"}}
```

A chave é o nome da casa (`alvenaria`, `madeira`) ou da ficha (`office`…). Endereço, Wi-Fi e instruções de entrada só vão para hóspede com **reserva confirmada**. `checkin_instrucoes` já tem um texto genérico ("as instruções são enviadas pelo chat do Airbnb"); se quiser que o YAXUM mande o código do cofre, coloque a instrução real no privado.

**Não coloque telefone, WhatsApp ou links** nas respostas: o Airbnb bloqueia mensagens com contato externo.

### 3. Hostex Pró (feito em 23/11/2026)

- [x] Conta criada (teste grátis de 15 dias) e Airbnb da Yasmim conectado.
- [x] Os 13 anúncios vinculados, 1 propriedade por anúncio (o calendário de cada um continua como estava).
- [x] Token **YAXUM** criado em *Configurações → API aberta*, com permissão de ler e escrever. Copie o token de lá (ícone de copiar) para `HOSTEX_TOKEN`.
- [x] HostGPT (IA da Hostex) não está ligada; não ligue, para não responderem os dois.
- [ ] Rodar `npm run imoveis` com o token: confirma que os números da tabela acima batem com os da API.

### 4. Pôr no ar em MODO TESTE

O servidor precisa de um endereço público **https**.

- **Para testar** (grátis, no PC da loja): `npm start` e, em outra janela, `cloudflared tunnel --url http://localhost:3000`. Ele dá um endereço `https://….trycloudflare.com`, que muda a cada vez que roda.
- **Fixo**: qualquer servidor Node ou Docker (tem `Dockerfile`). Use um plano que **não hiberna**: a Hostex espera só 5 segundos e não reenvia, então servidor dormindo perde aviso. Monte um volume em `/app/dados`.

Variáveis do servidor: `MODO=teste`, `HOSTEX_TOKEN`, `TOKEN_ADMIN` (invente uma senha longa), `CEREBRO_PRIVADO` (ou o arquivo `cerebro/privado.json`) e, depois do passo abaixo, `HOSTEX_WEBHOOK_SECRET`. No Docker, monte um volume em `/app/dados`.

Com o servidor no ar, de qualquer PC com Node e o `.env` com o token:

```bash
npm run webhook -- https://SEU-ENDERECO/webhook/hostex
```

Cole o `HOSTEX_WEBHOOK_SECRET` que aparecer no servidor e reinicie. Confira em `https://SEU-ENDERECO/saude`.

Em `MODO=teste` **nada vai para o hóspede**. Em cada conversa, a nota privada da Hostex mostra:

```
[YAXUM teste 23/11 16:40] Eu responderia: "O check-in é a partir das 15h."
[YAXUM teste 23/11 18:02] Passaria para você: não tenho resposta segura para "tem piscina?".
```

Tudo também aparece em `https://SEU-ENDERECO/registro?token=SEU_TOKEN_ADMIN`.

### 5. Ligar de verdade

Depois de uns dias conferindo as notas, troque para `MODO=automatico` no `.env` e reinicie.

## Aviso no celular (opcional, grátis)

Instale o app **ntfy**, assine um tópico com nome difícil de adivinhar (ex.: `yaxum-yasmim-8f3k2q`) e coloque o mesmo nome em `AVISO_NTFY_TOPICO`. A Yasmim recebe "Apartamento X: precisa de você" quando o YAXUM passa a conversa para ela. Em emergência, o alerta é urgente. O aviso leva **só o imóvel e o tipo de assunto**, nunca o nome nem o texto do hóspede.

## Como escrever e editar notas

Mesmo formato das notas do YAXUM:

```markdown
# Wi-Fi

Nome da rede e senha.

## O cliente costuma perguntar
- qual a senha do wifi?
- ¿cuál es la contraseña del wifi?
- what's the wifi password?

## Como responder
> A rede é {{wifi_nome}} e a senha é {{wifi_senha}}. {{wifi_velocidade?}}

## Como responder (sem reserva)
> Tem Wi-Fi, sim! A senha vai junto com as instruções de entrada.

## Como responder (es)
> La red es {{wifi_nome}} y la contraseña es {{wifi_senha}}.

## Regras
- só com reserva confirmada
- avisar a anfitriã
```

- `{{variavel}}` vem do `imovel.json`. Com `?` no fim (`{{wifi_velocidade?}}`), ela é opcional e some se estiver vazia.
- Quanto mais jeitos de perguntar em "O cliente costuma perguntar", melhor ele acerta.
- `avisar a anfitriã`: responde **e** anota para a Yasmim conferir (usado em check-in antecipado, malas e late checkout).
- Nota só de um imóvel: crie o `.md` dentro da pasta do imóvel, com o mesmo nome da comum, para substituir. Para desligar uma comum num imóvel: `"notas_desligadas": ["animais"]`.
- Depois de mexer: `npm test` e reiniciar o servidor.

## Privacidade

O servidor não guarda conversas. Fica só um arquivo pequeno (`dados/estado.json`) com números de mensagens já tratadas e um resumo criptográfico das respostas enviadas, apagados depois de 7 dias. Os dados do hóspede ficam na Hostex. A nota privada da conversa (que só a anfitriã vê) cita a mensagem para ela entender o motivo.

## Arquivos

| Caminho | O que é |
|---|---|
| `servidor.js` | Liga tudo e sobe o servidor |
| `src/atendente.js` | Aviso → conversa → decisão → resposta, nota e alerta |
| `src/cerebro.js` | Carrega as notas, usa o motor do YAXUM e monta a resposta |
| `src/texto.js` | Idioma, saudação, travas (emergência, cancelamento, etc.) |
| `src/hostex.js` | Cliente da API v3 da Hostex |
| `src/app.js` | Rotas HTTP (`/webhook/hostex`, `/saude`, `/registro`, `/testar`) |
| `motor/cb-engine.cjs` | Motor do atendente YAXUM (cópia idêntica; o teste confere) |
| `cerebro/` | Notas comuns e os imóveis |
| `tests/` | Testes e a Hostex de mentira |
