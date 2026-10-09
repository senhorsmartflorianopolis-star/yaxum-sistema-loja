# YAXUM · página de vendas

Página de vendas do **YAXUM**, o sistema para assistências técnicas: Ordem de Serviço, WhatsApp com IA, cérebro de atendimento, Galeria Protegida e planos.

A página roda sozinha, sem servidor: é um `index.html` mais os arquivos do cérebro, que ela só baixa quando a pessoa chega na seção.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página pronta (compactada). É o que vai para o ar. |
| `cerebro-mapa.json` | Mapa leve do cérebro (títulos, áreas, posições, ligações). |
| `cerebro-compactado.txt` | O cérebro inteiro em gzip + base64 (~1,2 MB). |
| `cerebro.json` | O mesmo cérebro sem compactar (reserva para navegador antigo). |
| `lab-poster*.jpg`, `yaxum-cubo*` | Imagens da página. |
| `fonte/` | O código-fonte, para editar. |

## Como colocar no ar

Qualquer hospedagem de site estático serve (GitHub Pages, Netlify, Vercel, Cloudflare Pages, uma hospedagem comum). Suba **todos os arquivos da raiz juntos**, na mesma pasta do `index.html`.

- **GitHub Pages:** Settings → Pages → Branch `main`, pasta `/ (root)`. No plano grátis, o GitHub Pages só funciona em repositório público.
- **Netlify:** arraste a pasta inteira em app.netlify.com/drop.

## Como editar

Edite os arquivos de `fonte/` e depois monte de novo:

```bash
python3 fonte/montar.py            # gera index.html e fonte/pagina-legivel.html
```

Se o Node.js estiver instalado, o `montar.py` compacta o JavaScript com o terser (via `npx`). Sem Node, a página sai sem compactar e funciona do mesmo jeito.

Se o cérebro mudar (novo `cerebro.json`), refaça o mapa e o arquivo compactado antes:

```bash
node fonte/gerar-dados-site.js     # lê cerebro.json e regrava cerebro-mapa.json e cerebro-compactado.txt
node fonte/teste-seguranca.js      # conferência: risco (gás, choque, bateria estufada) vem sempre primeiro
```

### Onde fica cada parte

- `fonte/yaxum.base.html`: o esqueleto da página, os textos, o CSS e o script do topo que escolhe o modo (3D ou leve).
- `fonte/src-main.js`: o 3D do topo, o modo leve, o controle de desempenho e os botões.
- `fonte/cb-*.{html,css,js}`: a seção do cérebro (mapa, busca e chat de teste).
- `fonte/gp-*.{html,css,js}`: a seção da Galeria Protegida.
- `fonte/cb-engine.js`: o motor que acha a nota certa para cada pergunta (é o mesmo do atendente).

## Desempenho

- O cérebro é baixado sob demanda: a abertura da página pesa cerca de 0,45 MB.
- Em celular fraco ou com "economia de dados", a página entra sozinha no modo leve, sem 3D.
- O 3D baixa a própria resolução quando o aparelho não aguenta. Se ainda assim não der conta, passa para o modo leve.

## Observações

- Os preços dos planos na página são exemplo.
- O botão de WhatsApp usa o número da variável `WHATSAPP`, na linha 6 de `fonte/src-main.js`.
