"""Lingue di DietApp.

Le chiavi sono i testi italiani: nel codice si scrive T('testo', {segnaposto}),
nell'HTML statico basta il testo (lo traduce l'avvio dell'app).
I dizionari sono in src/i18n/<lingua>.json ({"testo italiano": "traduzione"});
gli alimenti in src/i18n/foods_<lingua>.json ({"nome italiano": ["nome", "unità", "sinonimi"]}).

Uso: python3 src/i18n.py            -> elenca le chiavi mancanti per ogni lingua
     python3 src/i18n.py --chiavi   -> scrive src/i18n/_chiavi.json con tutte le chiavi
"""
import json, pathlib, re, sys
from html.parser import HTMLParser

S = pathlib.Path(__file__).resolve().parent
LINGUE = ["en", "fr", "es", "de"]

_T = re.compile(r"""(?<![A-Za-z0-9_$.])T\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.|\$(?!\{))*)`)""", re.S)


def _unescape(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            n = s[i + 1]
            if n == "u" and re.match(r"[0-9a-fA-F]{4}", s[i + 2:i + 6]):
                out.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
            out.append({"n": "\n", "t": "\t"}.get(n, n)); i += 2; continue
        out.append(c); i += 1
    return "".join(out)


class _Static(HTMLParser):
    def __init__(self):
        super().__init__(); self.keys = []; self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "svg"): self.skip += 1
        for a, v in attrs:
            if a in ("placeholder", "aria-label", "title") and v and re.search(r"[A-Za-zÀ-ÿ]", v):
                self.keys.append(v.strip())

    def handle_endtag(self, tag):
        if tag in ("script", "style", "svg") and self.skip: self.skip -= 1

    def handle_data(self, d):
        d = d.strip()
        if not self.skip and d and re.search(r"[A-Za-zÀ-ÿ]{2,}", d): self.keys.append(d)


def chiavi(template):
    """Tutte le chiavi da tradurre, in ordine di comparsa."""
    ks = []
    a = template.find("<!--SPLASH-->"); b = template.find("<script>", a)
    if a >= 0 and b > a:
        p = _Static(); p.feed(template[a:b]); ks += p.keys
    for m in _T.finditer(template):
        g = m.group(1) if m.group(1) is not None else m.group(2) if m.group(2) is not None else m.group(3)
        ks.append(_unescape(g))
    seen, out = set(), []
    for k in ks:
        if k not in seen: seen.add(k); out.append(k)
    return out


def carica(l):
    f = S / "i18n" / f"{l}.json"
    return json.loads(f.read_text()) if f.exists() else {}


def genera(template, pub):
    """Scrive public/lang/<l>.js per ogni lingua con un dizionario. Restituisce {lingua: chiavi mancanti}."""
    ks = chiavi(template); mancanti = {}
    (pub / "lang").mkdir(exist_ok=True)
    for l in LINGUE:
        d = carica(l)
        ff = S / "i18n" / f"foods_{l}.json"
        fd = json.loads(ff.read_text()) if ff.exists() else {}
        if not d and not fd: continue
        mancanti[l] = [k for k in ks if k not in d]
        out = {k: d[k] for k in ks if k in d}
        (pub / "lang" / f"{l}.js").write_text(
            "window.__I18N=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) +
            ";window.__I18NF=" + json.dumps(fd, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return mancanti


if __name__ == "__main__":
    t = (S / "app_template.html").read_text(); ks = chiavi(t)
    if "--chiavi" in sys.argv:
        (S / "i18n").mkdir(exist_ok=True)
        (S / "i18n" / "_chiavi.json").write_text(json.dumps(ks, ensure_ascii=False, indent=0))
    print(len(ks), "chiavi")
    for l in LINGUE:
        d = carica(l); m = [k for k in ks if k not in d]
        print(l, "mancanti:", len(m))
