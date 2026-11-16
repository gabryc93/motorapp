#!/usr/bin/env python3
"""AutoHub build — assembla src/ in un unico index.html.

Uso:  python build.py            (genera index.html e sw.js)
      python build.py --check    (controlla soltanto, non scrive)
      python build.py --test     (genera e lancia i test automatici in tests/)

Cosa fa:
  1. unisce src/css/*.css (in ordine alfabetico) dentro <style>
  2. inserisce ogni src/js/<nome>.js nel proprio <script> (segnaposto nel template)
  3. controlla la sintassi di ogni file JS con `node --check` (se Node e' installato)
  4. blocca la build se trova testo dopo </html> o un segnaposto non risolto
"""
import re, sys, subprocess, shutil, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

def read(p):
    return p.read_text(encoding="utf-8")

def main():
    check_only = "--check" in sys.argv
    errors = []
    tpl = read(SRC / "index.template.html")

    css_files = sorted((SRC / "css").glob("*.css"))
    css = "".join(read(f) for f in css_files)
    if "</style" in css.lower():
        errors.append("un file CSS contiene '</style'")
    html = tpl.replace("/*@CSS@*/", css)

    node = shutil.which("node")
    used = set()
    def js(m):
        name = m.group(1)
        f = SRC / "js" / (name + ".js")
        if not f.exists():
            errors.append("manca src/js/%s.js" % name)
            return m.group(0)
        code = read(f)
        used.add(f.name)
        if "</script" in code.lower():
            errors.append("%s contiene '</script' (spezzalo: '<\\/script')" % f.name)
        if node:
            r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
            if r.returncode != 0:
                errors.append("SINTASSI %s:\n%s" % (f.name, r.stderr.strip()))
        return code
    html = re.sub(r"/\*@JS:([\w.-]+)@\*/", js, html)

    for f in sorted((SRC / "js").glob("*.js")):
        if f.name not in used:
            errors.append("%s non e' referenziato nel template (aggiungi <script>/*@JS:%s@*/</script>)" % (f.name, f.stem))
    if "/*@" in html:
        errors.append("segnaposto non risolto nel template")
    tail = html[html.rfind("</html>") + 7:].strip()
    if tail:
        errors.append("c'e' testo dopo </html> (%d caratteri)" % len(tail))

    stamp = datetime.datetime.now().strftime("%Y-%m-%d-%H%M")
    html = re.sub(r'(<meta name="autohub-build" content=")[^"]*(")', r"\g<1>%s\g<2>" % stamp, html)

    if errors:
        print("BUILD FALLITA:")
        for e in errors:
            print("  - " + e)
        sys.exit(1)
    if not node:
        print("ATTENZIONE: Node non trovato, controllo sintassi saltato.")
    if check_only:
        print("OK (solo controllo): %d CSS, %d JS" % (len(css_files), len(used)))
        return
    (ROOT / "index.html").write_text(html, encoding="utf-8", newline="")
    # Service worker: stesso numero di build della pagina, così ogni pubblicazione aggiorna la cache
    sw = SRC / "sw.js"
    if sw.exists():
        (ROOT / "sw.js").write_text(read(sw).replace("__BUILD__", stamp), encoding="utf-8", newline="")
    print("OK index.html  %d KB  build %s  (%d CSS, %d JS)" % (len(html.encode("utf-8")) // 1024, stamp, len(css_files), len(used)))

def run_tests():
    """python build.py --test : build + test automatici nel browser (serve Node e `npm install` in tests/)."""
    tests = ROOT / "tests"
    node = shutil.which("node")
    if not node or not (tests / "node_modules").exists():
        print("Test saltati: installa Node.js e poi, nella cartella tests, esegui  npm install  e  npx playwright install chromium")
        return 0
    return subprocess.run([node, str(tests / "run.js")], cwd=str(ROOT)).returncode

if __name__ == "__main__":
    main()
    if "--test" in sys.argv:
        sys.exit(run_tests())
