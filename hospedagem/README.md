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

### 2. Preencher os dois imóveis da Yasmim

Abra `cerebro/imoveis/imovel-1/imovel.json` (e o `imovel-2`) e preencha as `variaveis`: horários, Wi-Fi, estacionamento etc. **Campo vazio não quebra nada**: a pergunta sobre aquele assunto vai para a Yasmim até ser preenchido. O servidor lista o que falta quando liga.

```bash
npm run testar -- --imovel imovel-1 "que horas é o check-in?"
```

As `traducoes` (`es`, `en`) são opcionais. Sem elas, o texto em português aparece dentro da resposta em espanhol/inglês.

**Não coloque telefone, WhatsApp ou links** nas respostas: o Airbnb bloqueia mensagens com contato externo.

### 3. Hostex Pró (teste grátis de 15 dias)

1. Ative o teste e conecte o Airbnb da Yasmim.
2. **Desligue a HostGPT** (IA da própria Hostex) para não responderem os dois.
3. Painel → *Settings → OpenAPI Settings → + Add new*. Crie um token do tipo **writable**.
4. Copie `.env.exemplo` para `.env` e cole o token em `HOSTEX_TOKEN`. Invente um `TOKEN_ADMIN`.
5. `npm run imoveis` mostra o número de cada imóvel na Hostex. Cole em `"hostex_ids": [123456]` no `imovel.json` certo.

### 4. Pôr no ar em MODO TESTE

O servidor precisa de um endereço público **https**.

- **Para testar** (grátis, no PC da loja): `npm start` e, em outra janela, `cloudflared tunnel --url http://localhost:3000`. Ele dá um endereço `https://….trycloudflare.com`, que muda a cada vez que roda.
- **Fixo**: qualquer servidor Node ou Docker (tem `Dockerfile`). Use um plano que **não hiberna**: a Hostex espera só 5 segundos e não reenvia, então servidor dormindo perde aviso. Monte um volume em `/app/dados`.

Depois:

```bash
npm run webhook -- https://SEU-ENDERECO/webhook/hostex
```

Cole o `HOSTEX_WEBHOOK_SECRET` que aparecer no `.env` e reinicie.

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
