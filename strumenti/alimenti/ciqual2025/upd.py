"""Aggiorna ai valori di Ciqual 2025 le voci di foods6.js e foods7.js che vengono da Ciqual 2020 (stesso codice)."""
import json,glob,re,sys
new={x['id']:x for x in json.load(open('ciq25.json'))}
idof={}
for f in glob.glob('../out/*.txt')+glob.glob('../v2/out/c*.txt'):
    for l in open(f):
        if l.strip():
            r=l.split('|')
            if r[0].startswith('c'): idof[r[1].replace("\\'","'")]=r[0]
def vals(x):
    p,c,g=x['p'],x['c'],x['g']
    if None in (p,c,g): return None
    k=x['k']
    if k is None: k=4*p+4*c+9*g+2*(x['fi'] or 0)
    return [round(k),round(p,1),round(c,1),round(g,1)]
tot=0;chg=0;big=[]
for fn in ['foods6.js','foods7.js']:
    pth='/home/claude/dietapp/src/'+fn; L=open(pth,encoding='utf8').read().split('\n'); out=[]
    for l in L:
        m=re.match(r'^(\[.*\])(,?)$',l)
        if not m: out.append(l); continue
        row=json.loads(m.group(1)); i=idof.get(row[0])
        if i and i in new:
            v=vals(new[i]); tot+=1
            if v and v!=row[1:5]:
                if abs(v[0]-row[1])>max(15,0.1*row[1]): big.append((row[0],row[1],v[0]))
                row[1:5]=v; chg+=1
        out.append(json.dumps(row,ensure_ascii=False)+m.group(2))
    if '--write' in sys.argv: open(pth,'w',encoding='utf8').write('\n'.join(out))
print('voci Ciqual trovate:',tot,'aggiornate:',chg,'con kcal molto diverse:',len(big))
