"""
Alignment audit.

The site's contract: inside a .band, every direct child sits on the same
measure, capped at --maxw and centred. A .hero pads itself instead. So on any
page, at any width, the LEFT EDGE of the content in every band should be
identical, and should match the hero's.

This walks every page at several widths, measures the left edge of each
band's direct children (and each hero's), and reports anything that does not
land on the page's dominant left edge.
"""
import asyncio, json, pathlib, sys
from collections import Counter
from playwright.async_api import async_playwright

ROOT = pathlib.Path("/home/claude/audit")
WIDTHS = [1440, 1280, 1024, 860, 768, 600, 390]
TOL = 1.5   # px

JS = r"""
() => {
  const out = [];
  const push = (scope, el, note) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;                 // hidden
    if (getComputedStyle(el).display === 'none') return;
    out.push({
      scope,
      sel: el.tagName.toLowerCase() +
           (el.id ? '#' + el.id : '') +
           (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      left: Math.round(r.left * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      note: note || ''
    });
  };

  document.querySelectorAll('main .band, main .hero').forEach((band, bi) => {
    const scope = (band.className || '').trim().split(/\s+/).join('.') + '#' + bi;
    // a band that is itself a grid or flex container of several children is a
    // different animal: its children are columns, not stacked blocks
    const cs = getComputedStyle(band);
    const isTrack = (cs.display === 'grid' || cs.display === 'flex');
    // a band that centres its own text is centred on purpose
    if (cs.textAlign === 'center') return;
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
    # Redirect stubs carry a zero-delay meta refresh, which navigates the tab
    # out from under page.evaluate and kills the execution context. They have
    # no bands to measure anyway.
    pages = sorted(p for p in ROOT.rglob("*.html")
                   if 'http-equiv="refresh"' not in p.read_text())
    findings = []
    overflows = []
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
                # the page's dominant left edge is the contract
                counts = Counter(i["left"] for i in items)
                base = counts.most_common(1)[0][0]
                for i in items:
                    if abs(i["left"] - base) > TOL:
                        findings.append({
                            "page": rel, "width": w, "expected": base,
                            "got": i["left"], "delta": round(i["left"] - base, 1),
                            "scope": i["scope"], "el": i["sel"],
                        })
            await ctx.close()
        await b.close()

    print(f"pages: {len(pages)}   widths: {WIDTHS}")
    print(f"misaligned elements: {len(findings)}")
    if overflows:
        print("\nHORIZONTAL OVERFLOW")
        for rel, w, o in overflows:
            print(f"  {rel:30} @{w:>5}  scrollWidth {o['scrollWidth']} vs {o['clientWidth']}")
    if findings:
        print("\nMISALIGNED (grouped by element)")
        by_el = {}
        for f in findings:
            by_el.setdefault((f["el"], f["scope"]), []).append(f)
        for (el, scope), rows in sorted(by_el.items(), key=lambda kv: -len(kv[1])):
            widths = sorted({r["width"] for r in rows})
            pages_hit = sorted({r["page"] for r in rows})
            deltas = sorted({r["delta"] for r in rows})
            print(f"\n  {el}")
            print(f"    in {scope}")
            print(f"    off by {deltas} px at widths {widths}")
            print(f"    pages: {', '.join(pages_hit[:6])}{' …' if len(pages_hit) > 6 else ''}")
    json.dump(findings, open("/home/claude/align-findings.json", "w"), indent=1)

asyncio.run(main())
