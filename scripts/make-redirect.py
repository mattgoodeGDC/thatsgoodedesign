#!/usr/bin/env python3
"""
Generate a redirect page for a dead URL from the old Wix site.

GitHub Pages serves static files only, so there is no 301 available. The next
best thing is a page carrying a zero-delay meta refresh plus a canonical tag
pointing at the destination, which Google treats as a permanent redirect, and
a visible link for anyone whose browser ignores the refresh.

Why bother: the old Wix URLs are what Google currently has indexed. Every one
of them 404s today, which wastes whatever authority they had and drops anyone
arriving from a search result onto an error page.

Usage:
    python3 scripts/make-redirect.py /about-5 /about/
    python3 scripts/make-redirect.py /product-page/foo /products/

Get the full list of dead URLs from Search Console:
    Indexing > Pages > "Not found (404)"
"""
import sys, pathlib

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moved – Goode Design &amp; Consulting</title>
<meta name="description" content="This page has moved. Redirecting to {dest}.">
<link rel="canonical" href="https://thatsgoodedesign.com{dest}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=https://thatsgoodedesign.com{dest}">
<link rel="icon" href="/favicon.ico" sizes="any">
<style>
  body {{ margin:0; min-height:100vh; display:grid; place-items:center;
         background:#FBFAF7; color:#242427;
         font:400 17px/1.6 Montserrat, system-ui, -apple-system, sans-serif; }}
  main {{ max-width:44ch; padding:32px; text-align:center; }}
  a {{ color:#856521; }}
</style>
</head>
<body>
<main>
  <p>This page has moved.</p>
  <p><a href="https://thatsgoodedesign.com{dest}">Continue to
    thatsgoodedesign.com{dest}</a></p>
</main>
</body>
</html>
"""

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(1)
    old, dest = sys.argv[1], sys.argv[2]
    if not old.startswith("/") or not dest.startswith("/"):
        print("both paths must start with /"); sys.exit(1)
    if not dest.endswith("/"):
        dest += "/"
    out = pathlib.Path("." + old.rstrip("/")) / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(TEMPLATE.format(dest=dest))
    print(f"{old}  ->  {dest}   ({out})")

if __name__ == "__main__":
    main()
