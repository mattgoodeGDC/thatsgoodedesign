#!/usr/bin/env python3
"""Build the product cards on /lineup/ from scripts/lineup/products.json.

Rewrites two marked blocks in lineup/index.html and nothing else:
  <!-- build-lineup:picker -->  ...  <!-- /build-lineup:picker -->
  <!-- build-lineup:groups -->  ...  <!-- /build-lineup:groups -->
The hero, the talks list, the book band, the styles and the footer stay
hand-written.

To change a product: edit its entry in products.json (name, tier, desc,
facts, price, link, button label, quote), run
    python3 scripts/build-lineup.py
from the repo root, look at /lineup/ locally, then commit.
    python3 scripts/build-lineup.py --check
reports whether the page is out of date without writing it.

Text fields are HTML, written as they appear on the page: use &rsquo; for
an apostrophe, &middot; between tier words, &ndash; with spaces for a
dash. Never an em dash.

Colours live in the stylesheets, not here: a card's "classes" pick them
(product--obd and so on, from assets/products.css; lu-card--hotk and the
other framework-keyed cards, from the <style> block on the lineup page).
A new product with new colours needs its class added there too.

Icons: {"symbol": "m-obd"} uses a symbol from the sprite at the top of the
lineup page; {"sprite": "icon-delegate"} uses one from
assets/icons/icons-clutch-sprite.svg; {"img": "../assets/gdc/gdc-mark.svg", "w": 40, "h": 40,
"class": "..."} uses an image file.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "lineup", "index.html")
DATA = os.path.join(ROOT, "scripts", "lineup", "products.json")
RATES = '<p class="lu-rates">Schools and nonprofits: <a href="../schools/rates/">see published rates</a></p>'


def icon(spec):
    if "symbol" in spec:
        return '<svg class="icon" aria-hidden="true"><use href="#%s"/></svg>' % spec["symbol"]
    if "sprite" in spec:
        return '<svg class="icon" aria-hidden="true"><use href="../assets/icons/icons-clutch-sprite.svg#%s"/></svg>' % spec["sprite"]
    cls = ' class="%s"' % spec["class"] if spec.get("class") else ""
    return '<img src="%s" alt="" width="%s" height="%s"%s>' % (spec["img"], spec["w"], spec["h"], cls)


def card(c):
    free = '<span class="lu-free">FREE</span>' if c.get("free") else ""
    out = [
        '        <li class="lu-card %s">' % c["classes"],
        '          <div class="lu-band" aria-hidden="true"><span></span><span></span><span></span></div>',
        '          <div class="lockup">%s<div><p class="lockup-ey">GOODE DESIGN</p><h3 class="lockup-name">%s%s</h3><p class="product__tier">%s</p></div></div>'
        % (icon(c["icon"]), c["name"], free, c["tier"]),
        '          <p class="lu-desc">%s</p>' % c["desc"],
        '          <ul class="lu-facts">',
    ]
    for label, value in c["facts"]:
        out.append('            <li><b>%s</b><span>%s</span></li>' % (label, value))
    out.append('          </ul>')
    if c.get("rates"):
        out.append('          ' + RATES)
    if c.get("quote"):
        q = c["quote"]
        out.append('          <figure class="lu-cq"><blockquote>%s</blockquote><figcaption>%s</figcaption></figure>' % (q["text"], q["credit"]))
    out.append('          <a class="lu-go" href="%s">%s</a>' % (c["href"], c["label"]))
    out.append('        </li>')
    return "\n".join(out)


def group(g):
    out = [
        '    <div class="lu-group" id="%s">' % g["id"],
        '      <h3 class="lu-group-h">%s</h3>' % g["title"],
        '      <p class="lu-group-line">%s</p>' % g["line"],
    ]
    if g.get("note"):
        out.append('      <p class="lu-note">%s</p>' % g["note"])
    grid = "lu-grid lu-grid--2" if g.get("layout") == "two" else "lu-grid"
    out.append('      <ul class="%s">' % grid)
    out.extend(card(c) for c in g["cards"])
    out.append('      </ul>')
    if g.get("quote"):
        q = g["quote"]
        out += [
            '      <figure class="pullquote lu-proof">',
            '        <blockquote>%s</blockquote>' % q["text"],
            '        <figcaption class="attrib">%s</figcaption>' % q["credit"],
            '      </figure>',
        ]
    out.append('    </div>')
    return "\n".join(out)


def picker(groups):
    out = ['    <ul class="lu-jump" aria-label="Start with the problem">']
    for g in groups:
        p = g["picker"]
        out.append('      <li><a href="#%s"><strong>%s</strong>%s<em>%s</em></a></li>' % (g["id"], p["headline"], p["sub"], g["title"]))
    out.append('    </ul>')
    return "\n".join(out)


def replace_block(html, name, body):
    start, end = "<!-- build-lineup:%s -->" % name, "<!-- /build-lineup:%s -->" % name
    i, j = html.find(start), html.find(end)
    if i < 0 or j < i:
        sys.exit("lineup/index.html is missing the %s markers" % name)
    return html[: i + len(start)] + "\n" + body + "\n" + html[j:]


def lint(data):
    problems = []
    blob = json.dumps(data, ensure_ascii=False)
    if "\u2014" in blob or "&mdash;" in blob:
        problems.append("an em dash is in products.json")
    for g in data["groups"]:
        for c in g["cards"]:
            for k in ("classes", "icon", "name", "tier", "desc", "facts", "href", "label"):
                if k not in c:
                    problems.append("%s is missing %s" % (c.get("name", "a card"), k))
            if c.get("href", "").startswith("https://calendly.com"):
                problems.append("%s: card buttons open the product page, not Calendly" % c["name"])
    return problems


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    problems = lint(data)
    if problems:
        sys.exit("Not built:\n  " + "\n  ".join(problems))
    html = open(PAGE, encoding="utf-8").read()
    new = replace_block(html, "picker", picker(data["groups"]))
    new = replace_block(new, "groups", "\n\n".join(group(g) for g in data["groups"]))
    if "--check" in sys.argv:
        print("lineup/index.html is up to date" if new == html else "lineup/index.html is out of date: run without --check")
        sys.exit(0 if new == html else 1)
    if new != html:
        open(PAGE, "w", encoding="utf-8").write(new)
        print("lineup/index.html rebuilt: %d groups, %d cards" % (len(data["groups"]), sum(len(g["cards"]) for g in data["groups"])))
    else:
        print("lineup/index.html already up to date")


if __name__ == "__main__":
    main()
