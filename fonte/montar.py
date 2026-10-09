"""Monta a página de vendas do YAXUM (index.html) a partir dos arquivos desta pasta.

    node fonte/gerar-dados-site.js    # só se o cérebro mudou: refaz cerebro*.json e o mapa
    python3 fonte/montar.py           # junta tudo em index.html (e fonte/pagina-legivel.html)

O cérebro não entra no HTML: a página fica leve e baixa cerebro-mapa.json,
cerebro-compactado.txt (ou cerebro.json) só quando a pessoa chega na seção."""
import json, html as H, os, re, shutil, subprocess
S = os.path.dirname(os.path.abspath(__file__)) + '/'
RAIZ = os.path.dirname(S.rstrip('/')) + '/'
def ler(n): return open(S + n, encoding='utf-8').read()
base, css, sec = ler('yaxum.base.html'), ler('cb-style.css'), ler('cb-section.html')
eng = ler('cb-engine.js').replace('if (typeof module !== "undefined") module.exports = CBEngine;', '')
ui, main = ler('cb-ui.js'), ler('src-main.js')
gcss, gsec, gjs = ler('gp-style.css'), ler('gp-section.html'), ler('gp-ui.js')
mapa = json.load(open(RAIZ + 'cerebro-mapa.json', encoding='utf-8'))

COLORS = ["#00F0FF", "#FCEE0A", "#FF2BD6", "#3DFFA2", "#4DA3FF", "#FF8A3D", "#8A6CFF", "#B8FF3D", "#FF5C7A", "#34D8C4", "#FFD27A", "#FF7AC8", "#7DF9FF", "#FF3B55", "#C9D3F0", "#E879F9", "#FDE68A"]
def br(n): return f'{n:,}'.replace(',', '.')
st = mapa['st']
stats = ''.join(f'<div><dt>{t}</dt><dd>{v}</dd></div>' for v, t in [
    (br(st['notas']), 'notas'), (br(st['perguntas']), 'perguntas de clientes'), (br(st['respostas']), 'respostas modelo'),
    (br(st['ligacoes']), 'ligações'), (f"{round(st['palavras'] / 1000)} mil", 'palavras')])
cont = [0] * len(mapa['p'])
for n in mapa['n']: cont[n[2]] += 1
leg = ''.join(f'<button type="button" data-c="{i}" aria-pressed="false" style="color:{COLORS[i % len(COLORS)]}"><i style="background:{COLORS[i % len(COLORS)]}"></i><span style="color:var(--ink-2)">{H.escape(p)}</span><small>{cont[i]}</small></button>'
              for i, p in enumerate(mapa['p']))
sec = sec.replace('{{CB_STATS}}', stats).replace('{{CB_LEGENDA}}', leg)

h = base.replace('</style>', css + gcss + '</style>', 1)
wa = '  <section class="section" id="whatsapp">'
assert h.count(wa) == 1
h = h.replace(wa, '<!-- GP:START -->\n' + gsec + '<!-- GP:END -->\n\n' + wa)
anchor = '  <section class="section" id="funil">'
assert h.count(anchor) == 1
h = h.replace(anchor, '<!-- CB:START -->\n' + sec + '<!-- CB:END -->\n\n' + anchor)
nav = '      <a href="#whatsapp">WhatsApp com IA</a>\n'
assert nav in h
h = h.replace(nav, nav + '      <a href="#cerebro">Cérebro</a>\n', 1)
hero = '        <a class="btn btn-ghost" href="#precos">Ver planos</a>\n'
assert hero in h
h = h.replace(hero, '        <button class="btn btn-ghost" type="button" data-cb-open>Converse com a IA agora</button>\n' + hero, 1)
assert h.count('/*MAIN-JS*/') == 1
h = h.replace('/*MAIN-JS*/', main)
h = h.rstrip() + '\n<script>\n' + eng + '\n' + ui + '</script>\n<script>\n' + gjs + '</script>\n'
# Documento completo, com o mesmo esqueleto que a página tem quando é publicada como artefato
# (sem o <!doctype html> o navegador entra em modo de compatibilidade e o layout muda).
TOPO = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#04050C;color:#EAF2FF}'
        'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n')
FIM = '\n</body></html>\n'
open(S + 'pagina-legivel.html', 'w', encoding='utf-8').write(TOPO + h + FIM)

# compactar: JS com terser (npx terser, se houver Node) e CSS sem comentários e espaços
TERSER = shutil.which('terser') or shutil.which('npx')
def js_min(code):
    if not TERSER: return code
    cmd = ([TERSER] if TERSER.endswith('terser') else [TERSER, '--yes', 'terser']) + ['--compress', 'passes=2', '--mangle', '--ecma', '5', '--comments', 'false']
    r = subprocess.run(cmd, input=code, capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0: raise SystemExit('terser falhou: ' + r.stderr[:400])
    return r.stdout
def css_min(c):
    c = re.sub(r'/\*.*?\*/', '', c, flags=re.S); c = re.sub(r'\s+', ' ', c)
    c = re.sub(r'\s*([{};])\s*', r'\1', c); return c.replace(';}', '}').strip()
def troca_script(m):
    attrs, code = m.group(1), m.group(2)
    if 'src=' in attrs or 'json' in attrs or not code.strip(): return m.group(0)
    return '<script' + attrs + '>' + js_min(code) + '</script>'
h = re.sub(r'<script([^>]*)>(.*?)</script>', troca_script, h, flags=re.S)
h = re.sub(r'<style>(.*?)</style>', lambda m: '<style>' + css_min(m.group(1)) + '</style>', h, flags=re.S)
open(RAIZ + 'index.html', 'w', encoding='utf-8').write(TOPO + h + FIM)
open(S + 'pagina-artefato.html', 'w', encoding='utf-8').write(h)   # sem esqueleto: para publicar como artefato
print('index.html:', len(h.encode()), 'bytes')
