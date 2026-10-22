#!/usr/bin/env python3
"""Rewrite the Services menu on every page from scripts/nav/services.json.

The menu (the "Services" drop-down in the header) is copied into each page,
because the site has no shared templates. This script keeps every copy the
same: it finds the <ul ... id="menu-services"> panel in each HTML file and
replaces it with one built from services.json.

    python3 scripts/update-nav.py           rewrite every page
    python3 scripts/update-nav.py --check   list pages that are out of date

Each page keeps its own link style (../ on a subpage, / on 404.html, none on
the home page), and the link to the page you are on is marked
aria-current="page" so it shows in gold. Only the Services panel changes:
"The system", "Who I help", Books, Writing and About are untouched.

When the menu's CSS changes too, bump gdc-nav.css?v=N across the pages.
"""
import glob
import json
import os
import posixpath
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "scripts", "nav", "services.json")
PANEL = re.compile(r'<ul class="navmenu-panel navmenu-wide" id="menu-services" hidden>.*?\n      </ul>\n', re.S)
SPRITE = "assets/icons/icons-clutch-sprite.svg"


def prefix_for(page_rel, panel):
    """How this page writes site links: read it from the panel it already has."""
    m = re.search(r'<a href="([^"]*?)(products/|schools/|obd/|goodestart/)', panel)
    if m:
        return m.group(1)
    depth = page_rel.count("/")
    return "../" * depth


def current_dir(page_rel):
    d = posixpath.dirname(page_rel)
    return d + "/" if d else ""


def build(data, prefix, here):
    marked = [False]

    def link(item):
        target = item["href"].split("#")[0]
        cur = ""
        if not marked[0] and here and target == here:
            cur, marked[0] = ' aria-current="page"', True
        ic = ""
        if item.get("icon"):
            ic = '<svg class="nmp-ic" aria-hidden="true"><use href="%s%s#%s"/></svg>' % (prefix, SPRITE, item["icon"])
        return '<a href="%s%s"%s>%s%s<span>%s</span></a>' % (prefix, item["href"], cur, ic, item["label"], item["sub"])

    out = ['<ul class="navmenu-panel navmenu-wide" id="menu-services" hidden>']
    for g in data["groups"]:
        out += ['        <li class="nmp-group %s">' % g["class"], '          <p class="nmp-head">%s</p>' % g["head"], '          <ul>']
        out += ['            <li>%s</li>' % link(i) for i in g["links"]]
        out += ['          </ul>', '        </li>']
    for i in data["foot"]:
        out += ['        <li class="nmp-foot">', '          %s' % link(i), '        </li>']
    out.append('      </ul>\n')
    return "\n".join(out)


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    if "\u2014" in json.dumps(data, ensure_ascii=False) or "&mdash;" in json.dumps(data):
        sys.exit("Not run: an em dash is in services.json")
    check = "--check" in sys.argv
    changed, total = [], 0
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        html = open(path, encoding="utf-8").read()
        m = PANEL.search(html)
        if not m:
            continue
        total += 1
        new_panel = build(data, prefix_for(rel, m.group(0)), current_dir(rel))
        if new_panel != m.group(0):
            changed.append(rel)
            if not check:
                open(path, "w", encoding="utf-8").write(html[: m.start()] + new_panel + html[m.end():])
    verb = "out of date" if check else "rewritten"
    print("%d of %d pages %s" % (len(changed), total, verb))
    for rel in changed[:20]:
        print("  " + rel)
    if len(changed) > 20:
        print("  ... and %d more" % (len(changed) - 20))
    if check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
