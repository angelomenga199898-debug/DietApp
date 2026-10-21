"""Costruisce src/foods7.js (Ampliamento 6, v3.6) e aggiunge i nomi tradotti a src/i18n/foods_<lingua>.json.
Fonti: righe c* (Ciqual 2020/2025), u* (USDA SR Legacy), x* (etichette e valori pubblicati; xb prodotti di marca, xa alcolici), r* (piatti calcolati dalla ricetta)."""
import json, glob, re, sys, unicodedata, pathlib
V = pathlib.Path('/home/claude/fooddata/v2'); W = pathlib.Path('/home/claude/fooddata/work'); SRC = pathlib.Path('/home/claude/dietapp/src')
exec(open(V / 'recipes.py').read())
EX = json.load(open(V / 'existing.json'))
cand = {x['id']: x for x in json.load(open(W / 'ciq_cand.json'))}
# Ciqual 2025 ha la precedenza sulla 2020 per gli stessi codici (e per i codici nuovi)
C25 = pathlib.Path('/home/claude/fooddata/c25/ciq25.json')
if C25.exists():
    for x in json.load(open(C25)):
        if None not in (x['p'], x['c'], x['g']): cand[x['id']] = x
alls = {x['id']: x for x in json.load(open(W / 'ciq_all.json'))}
usda = {x['id']: x for x in json.load(open(W / 'usda_all.json'))}
def norm(s): return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())).strip()
exn = {norm(f[0]): f[0] for f in EX}
rows, probs = [], []
def num(v):
    try: return float(v)
    except: return None
for f in sorted(glob.glob(str(V / 'out' / '*.txt'))):
    for l in open(f, encoding='utf8'):
        l = l.rstrip('\n')
        if not l: continue
        r = l.split('|'); i = r[0]
        if i.startswith('x'):
            assert len(r) == 13, (f, l)
            k, p, c, g = map(float, r[9:13]); rows.append((i, r[1:6], r[6], float(r[7]), r[8], (k, p, c, g)))
        else:
            assert len(r) == 9, (f, l)
            x = cand.get(i) or alls.get(i) or usda.get(i)
            if not x: sys.exit('manca ' + i)
            k, p, c, g = (num(x.get(a)) for a in ('k', 'p', 'c', 'g'))
            if k is None: k = 4 * p + 4 * c + 9 * g + 2 * (num(x.get('fi')) or 0)
            rows.append((i, r[1:6], r[6], float(r[7] or 0), r[8], (k, p, c, g)))
# valori degli ingredienti per le ricette: database attuale + nuove voci
val = {f[0]: (f[1], f[2], f[3], f[4]) for f in EX if f[6] != -1}
for i, names, u, gr, syn, v in rows: val[names[0]] = v
for rid, it, en, fr, es, de, u, gr, syn, ing, fin in R:
    tot = [0, 0, 0, 0]; raw = 0
    for n, q in ing:
        if n not in val: sys.exit(f'{rid}: ingrediente sconosciuto {n}')
        for j in range(4): tot[j] += val[n][j] * q / 100
        raw += q
    k, p, c, g = (t / fin * 100 for t in tot)
    rows.append((rid, [it, en, fr, es, de], u, float(gr), syn, (k, p, c, g)))
# controlli
seen = {}
out = []; tr = {l: {} for l in ('en', 'fr', 'es', 'de')}
for i, names, u, gr, syn, (k, p, c, g) in rows:
    it = names[0]; n = norm(it)
    if n in exn: probs.append(f'ESISTE GIÀ: {i} {it} == {exn[n]}')
    if n in seen: probs.append(f'DOPPIONE: {i} {it} == {seen[n]}')
    seen[n] = i
    comp = 4 * p + 4 * c + 9 * g
    if k > 20 and abs(comp - k) / k > 0.25 and not i.startswith(('x10', 'xa')): probs.append(f'kcal vs macro: {i} {it} k={k:.0f} 4p+4c+9g={comp:.0f}')
    if k < 0 or k > 902: probs.append(f'kcal fuori scala {i} {it} {k}')
    gr2 = int(gr) if gr == int(gr) else gr
    out.append([it, round(k), round(p, 1), round(c, 1), round(g, 1), u, gr2, syn])
    for lg, v in zip(('en', 'fr', 'es', 'de'), names[1:]): tr[lg][it] = v
for p_ in probs: print(' !', p_)
if '--write' in sys.argv:
    if probs and '--force' not in sys.argv: sys.exit('problemi: niente scritto')
    js = ('// Ampliamento 6 (v3.6): valori per 100 g/ml. Fonti: Ciqual 2025 (ANSES, Licence Ouverte / Etalab), USDA FoodData Central\n'
          '// SR Legacy (dominio pubblico), valori pubblicati su etichette di prodotti tipici, integratori e prodotti di marca (siti dei\n'
          '// produttori e schede dei supermercati online, fonti in strumenti/alimenti/marche/raw.txt), e piatti italiani calcolati\n'
          '// dalle ricette (dosi per una porzione e peso del piatto finito in fooddata/v2/recipes.py) con i valori degli ingredienti.\n'
          'FOODS_RAW.push(\n' + ',\n'.join(json.dumps(o, ensure_ascii=False) for o in out) + '\n);\n')
    (SRC / 'foods7.js').write_text(js, encoding='utf8')
    for lg in tr:
        pth = SRC / 'i18n' / f'foods_{lg}.json'; d = json.load(open(pth))
        d['names'].update(tr[lg]); pth.write_text(json.dumps(d, ensure_ascii=False, indent=0), encoding='utf8')
    print('scritto foods7.js:', len(out), 'voci')
else:
    print(len(out), 'voci (prova, usa --write)')
    if '-v' in sys.argv:
        for o in out:
            if '-r' in sys.argv and not any(o[0] == r[1] for r in R): continue
            print(f'{o[0][:46]:46s} {o[1]:4d} P{o[2]:5.1f} C{o[3]:5.1f} G{o[4]:5.1f} | {o[5]} {o[6]} g → {round(o[1]*o[6]/100)} kcal')
