"""
Alignment audit for thatsgoodedesign.com.

The contract: a .band establishes the measure with its own padding, and every
direct child inherits one left edge. A .hero does the same. So on any page, at
any width, the left edge of the content in every band should be identical.

This walks every page at seven widths, measures the left edge of each band's
direct children, and reports anything off the page's dominant edge. It also
reports horizontal overflow, which is the other thing that silently breaks
on narrow screens.

    pip install playwright && playwright install chromium
    python3 scripts/audit-align.py

Bands that centre their own text (.book-call) are skipped: those are centred
on purpose. Children of a band that is itself a grid or flex container are
skipped too, because they are columns rather than stacked blocks.

Clean run as of 12 September 2026: 0 misaligned, 0 overflow.
"""
import asyncio, json, pathlib
from collections import Counter
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTHS = [1440, 1280, 1024, 860, 768, 600, 390]
TOL = 1.5

JS = r"""
() => {
  const out = [];
  const push = (scope, el, note) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (getComputedStyle(el).display === 'none') return;
    out.push({
      scope,
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
           (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      left: Math.round(r.left * 10) / 10,
      note: note || ''
    });
  };
  document.querySelectorAll('main .band, main .hero').forEach((band, bi) => {
    const cs = getComputedStyle(band);
    if (cs.textAlign === 'center') return;
    const isTrack = (cs.display === 'grid' || cs.display === 'flex');
    const scope = (band.className || '').trim().split(/\s+/).join('.') + '#' + bi;
    [...band.children].forEach(ch => push(scope, ch, isTrack ? 'in-track' : ''));
  });
  const doc = document.documentElement;
  return {
    items: out,
    overflow: doc.scrollWidth > doc.clientWidth + 1
      ? { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth } : null
  };
}
"""

async def main():
    pages = sorted(p for p in ROOT.rglob("*.html"))
    findings, overflows = [], []
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w in WIDTHS:
            ctx = await b.new_context(viewport={"width": w, "height": 900})
            pg = await ctx.new_page()
            for f in pages:
                await pg.goto(f.as_uri(), wait_until="load")
                res = await pg.evaluate(JS)
                rel = f.relative_to(ROOT).as_posix()
                if res["overflow"]:
                    overflows.append((rel, w, res["overflow"]))
                items = [i for i in res["items"] if i["note"] != "in-track"]
                if not items:
                    continue
                base = Counter(i["left"] for i in items).most_common(1)[0][0]
                for i in items:
                    if abs(i["left"] - base) > TOL:
                        findings.append({"page": rel, "width": w, "expected": base,
                                         "got": i["left"], "delta": round(i["left"] - base, 1),
                                         "scope": i["scope"], "el": i["sel"]})
            await ctx.close()
        await b.close()

    print(f"pages: {len(pages)}   widths: {WIDTHS}")
    print(f"misaligned elements: {len(findings)}")
    for rel, w, o in overflows:
        print(f"OVERFLOW  {rel:30} @{w:>5}  {o['scrollWidth']} vs {o['clientWidth']}")
    by_el = {}
    for f in findings:
        by_el.setdefault((f["el"], f["scope"]), []).append(f)
    for (el, scope), rows in sorted(by_el.items(), key=lambda kv: -len(kv[1])):
        print(f"\n  {el}\n    in {scope}")
        print(f"    off by {sorted({r['delta'] for r in rows})} px "
              f"at widths {sorted({r['width'] for r in rows})}")
        print(f"    pages: {', '.join(sorted({r['page'] for r in rows}))}")
    json.dump(findings, open(ROOT / "scripts" / "align-findings.json", "w"), indent=1)

asyncio.run(main())
