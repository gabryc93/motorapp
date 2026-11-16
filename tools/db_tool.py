#!/usr/bin/env python3
"""AutoHub — controllo, pulizia e divisione del database veicoli.

Uso:  python tools/db_tool.py db.json            (scrive db/ e tools/db-report.md)
      python tools/db_tool.py db.json --check    (solo report, non scrive db/)

Cosa fa:
  1. CONTROLLA la coerenza interna di ogni motore (potenza, cilindrata, kW,
     alimentazione, coppia, serie/anni) e scrive un report.
  2. CORREGGE solo ciò che si può correggere in modo certo:
     - alimentazione "Benzina" su motori diesel (118d, Multijet, D-4D, TDI…)
     - coppia_nm: nel db è potenza × coefficiente fisso (es. 2,4 per i benzina),
       quindi è un dato inventato → rimossa (null). Meglio nessun dato che uno falso.
     - motori elencati in serie in cui non esistevano (lista ESCLUSIONI qui sotto,
       verificata a mano)
  3. DIVIDE il database per marca in db/<marca>.json + db/index.json,
     così l'app scarica solo la marca che serve (il db intero è ~22 MB).
"""
import json, re, sys, unicodedata
from pathlib import Path
from collections import Counter, defaultdict

DIESEL_RE = re.compile(r"multijet|\bmjet\b|\bmjt\b|\bjtdm?\b|\btdi\b|\bcdti?\b|\bhdi\b|bluehdi|\bdci\b|tdci|\bcrdi\b|d-?4d|\bdiesel\b|\b\d{3}d\b|\b\d\.\dd\b|\bsd4\b|\bd[345]\b|i-dtec|\bdtec\b|ecoblue|bluetec|\bxdi\b|skyactiv-d|\btdv[68]\b|\bsdv[68]\b", re.I)

# Elettriche vere segnate "Benzina" nel db (E-Torq ed e-THP invece sono benzina: esclusi apposta)
EV_RE = re.compile(r"\bid\.\d|e-tron|\bi3s?\b|\bix\d?\b|\bniro\b.*\bev\b|^ev\b|e-golf|\bkwh\b|\bbev\b|\belectric\b", re.I)
EPOWER_RE = re.compile(r"e-power", re.I)

# Motori in serie sbagliate, verificati a mano: (chiave) → motivo
ESCLUSIONI = {
    "Fiat||Panda III||2012–2017||1.0 Hybrid 70cv": "il 1.0 Hybrid è arrivato nel 2020 (è già nella serie 2018–2024)",
}

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "db.json")
    check_only = "--check" in sys.argv
    root = Path(__file__).resolve().parent.parent
    db = json.loads(src.read_text(encoding="utf-8"))
    V, S, M = db["vehicles"], db["specs"], db["maintenance"]
    rep = []
    cnt = Counter()

    # ── Controlli e correzioni ─────────────────────────────────────
    nm_ratio = Counter()
    for k, sp in S.items():
        marca, modello, gen, mot = k.split("||")
        m = re.search(r"(\d{2,4})\s*cv", mot, re.I)
        if m and sp.get("potenza_cv") and abs(int(m.group(1)) - sp["potenza_cv"]) > 2:
            cnt["cv diverso dal nome"] += 1
            rep.append(f"- CV: `{k}` → db {sp['potenza_cv']}, nome {m.group(1)}")
        if sp.get("potenza_cv") and sp.get("potenza_kw") and abs(sp["potenza_cv"] * 0.7355 - sp["potenza_kw"]) > 3:
            cnt["kW incoerenti con CV"] += 1
        a = str(sp.get("alimentazione") or "")
        if DIESEL_RE.search(mot) and "diesel" not in a.lower():
            new = "Diesel mild hybrid" if re.search(r"ibrid|hev|mhev", a + " " + mot, re.I) else "Diesel"
            sp["alimentazione"] = new
            if k in V and isinstance(V[k], dict) and "alimentazione" in V[k]:
                V[k]["alimentazione"] = new
            cnt["alimentazione corretta in Diesel"] += 1
        if EV_RE.search(mot) and not re.search(r"phev|plug|tfsie|hybrid", mot + " " + a, re.I) and not a.lower().startswith("elettr"):
            sp["alimentazione"] = "Elettrico"
            cnt["alimentazione corretta in Elettrico"] += 1
            rep.append(f"- ELETTRICA: `{k}` era '{a}'")
        if EPOWER_RE.search(mot) and not re.search(r"ibrid", a, re.I):
            sp["alimentazione"] = "Ibrido (e-Power, motore termico che fa da generatore)"
            cnt["Nissan e-Power corrette in Ibrido"] += 1
        if str(sp.get("alimentazione") or "").lower().startswith("elettr") and "manuale" in str(sp.get("trasmissione") or "").lower():
            sp["trasmissione"] = "Automatico (rapporto unico)"
            cnt["elettriche con cambio manuale corrette"] += 1
        if sp.get("coppia_nm") and sp.get("potenza_cv"):
            nm_ratio[round(sp["coppia_nm"] / sp["potenza_cv"], 1)] += 1

    # La coppia è inventata se quasi tutte le righe sono CV × pochi coefficienti fissi
    tot_nm = sum(nm_ratio.values())
    top = sum(n for _, n in nm_ratio.most_common(6))
    if tot_nm and top / tot_nm > 0.9:
        for sp in S.values():
            if sp.get("coppia_nm") is not None:
                sp["coppia_nm"] = None
                cnt["coppia rimossa (calcolata, non reale)"] += 1
        rep.insert(0, f"- COPPIA: {top} valori su {tot_nm} sono CV × coefficiente fisso "
                      f"({', '.join(str(r) for r, _ in nm_ratio.most_common(6))}): rimossi tutti.")

    for k, why in ESCLUSIONI.items():
        for part in (V, S, M):
            if k in part:
                del part[k]
        cnt["motori rimossi da serie sbagliate"] += 1
        rep.append(f"- RIMOSSO `{k}`: {why}")

    # Segnalazioni da verificare a mano (non corrette)
    for k in S:
        marca, modello, gen, mot = k.split("||")
        y = re.search(r"(\d{4})\D+(\d{4})", gen)
        if y and re.search(r"hybrid|mhev|phev|e-tense|tfsie|\bbev\b", mot, re.I) and int(y.group(2)) < 2012:
            cnt["da verificare: ibrido in serie vecchia"] += 1
            rep.append(f"- VERIFICA: `{k}` (ibrido in una serie che finisce nel {y.group(2)})")
    stime = sum(1 for sp in S.values() if sp.get("acc_0_100_s"))
    rep.append(f"- STIME: 0-100 e velocità max sono intervalli per categoria su {stime} motori "
               "(es. '8.5–10.5'): mostrati come stima, mai usati come dato preciso.")

    # ── Report ─────────────────────────────────────────────────────
    lines = ["# Report database veicoli", "",
             f"Sorgente: `{src.name}` · {len(S)} motori", "", "## Riepilogo", ""]
    lines += [f"- {k}: **{v}**" for k, v in cnt.most_common()] + ["", "## Dettagli", ""] + rep
    (root / "tools" / "db-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:12 + len(cnt)]))
    if check_only:
        return

    # ── Divisione per marca ────────────────────────────────────────
    out = root / "db"
    out.mkdir(exist_ok=True)
    for f in out.glob("*.json"):
        f.unlink()
    per = defaultdict(lambda: {"vehicles": {}, "specs": {}, "maintenance": {}})
    for part in ("vehicles", "specs", "maintenance"):
        for k, v in db[part].items():
            per[k.split("||")[0]][part][k] = v
    brands = {}
    for marca, data in sorted(per.items()):
        name = slug(marca) + ".json"
        (out / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        brands[marca] = {"file": name, "motori": len(data["specs"]), "kb": (out / name).stat().st_size // 1024}
    meta = dict(db.get("_meta") or {})
    meta.update({"total_vehicles": len(S), "cleaned": dict(cnt), "split": True})
    # Misure gomme e pressioni per modello/serie (usate dal Garage)
    if db.get("tyre_pressures"):
        (out / "tyres.json").write_text(json.dumps(db["tyre_pressures"], ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (out / "index.json").write_text(json.dumps({"_meta": meta, "brands": brands}, ensure_ascii=False, indent=1), encoding="utf-8")
    big = max(brands.values(), key=lambda b: b["kb"])
    print(f"\nScritti {len(brands)} file in db/ (il più grande {big['kb']} KB) + db/index.json")

if __name__ == "__main__":
    main()
