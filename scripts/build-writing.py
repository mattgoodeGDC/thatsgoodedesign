#!/usr/bin/env python3
"""Build the Leadership Lab blog from scripts/writing/posts.json.

Writes one page per post at /writing/<slug>/, rewrites the archive list and
"New in the Lab" cards on /writing/, the three newest posts on the homepage,
/writing/feed.xml (for Kit's RSS-to-email) and the writing entries in
sitemap.xml.

To publish a new piece: add an entry to the top of posts.json (slug, title,
subtitle, date, words, tags, series, html), run
    python3 scripts/build-writing.py
from the repo root, check the page, then commit.

Tags are fixed (TAGS below). Posts come from Substack, which stays live as a
mirror; each page's canonical URL is this site.
"""
import datetime
import html
import json
import os
import re
import sys
from email.utils import format_datetime
from urllib.parse import quote

from bs4 import BeautifulSoup, NavigableString

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://thatsgoodedesign.com"
CALENDLY = "https://calendly.com/matt-thatsgoodedesign/chatt-with-matt"

# Pattern tags are phrased as the problem the reader has.
TAGS = {
    "bottleneck": "Everything runs through me",
    "growth-gap": "Growing faster than it's getting clearer",
    "drift": "The culture is drifting",
    "stall": "Winning feels like a near miss",
    "new-seat": "My role is changing",
    "create": "CREATE",
    "voices": "VOICES",
    "6c": "6C",
    "delegate": "DELEGATE",
    "eq": "EQ",
    "psych-safety": "Psychological safety",
    "neuroinclusion": "Neuroinclusion",
    "schools": "Schools",
    "ai": "AI",
    "coaching": "Coaching",
    "off-the-clock": "Off the clock",
}
GROUPS = [
    ("Do you have this problem?", ["bottleneck", "growth-gap", "drift", "stall", "new-seat"]),
    ("By framework", ["create", "voices", "6c", "delegate", "eq"]),
    ("By topic", ["psych-safety", "neuroinclusion", "schools", "ai", "coaching", "off-the-clock"]),
]

KIT_FORM = """<script src="https://f.convertkit.com/ck.5.js" async></script>
        <form action="https://app.kit.com/forms/9910445/subscriptions"
              class="seva-form formkit-form" method="post"
              data-sv-form="9910445" data-uid="906eaeb714" data-format="inline" data-version="5"
              style="width:100%">
          <div data-style="clean">
            <ul class="formkit-alert formkit-alert-error" data-element="errors" data-group="alert"></ul>
            <div data-element="fields" data-stacked="false" class="seva-fields formkit-fields">
              <div class="formkit-field">
                <input class="formkit-input" name="email_address" aria-label="Email address"
                       placeholder="Email address" required type="email">
              </div>
              <button data-element="submit" class="formkit-submit formkit-submit">
                <div class="formkit-spinner"><div></div><div></div><div></div></div>
                <span>Subscribe</span>
              </button>
            </div>
          </div>
        </form>"""


def esc(s):
    return html.escape(s or "", quote=True)


def dashes(s):
    """House style: spaced en dashes, never em dashes."""
    s = re.sub(r"\s*—\s*", " – ", s or "")
    return s


def clean_title(s):
    return dashes((s or "").strip().rstrip(":").strip())


def mins(words):
    return max(1, round((words or 0) / 230))


def pdate(p):
    return datetime.datetime.fromisoformat(p["date"].replace("Z", "+00:00"))


def nice(p):
    return pdate(p).strftime("%-d %B %Y")


def clean_body(raw):
    s = BeautifulSoup(raw, "html.parser")
    # Substack furniture: subscribe and share buttons, widgets, image toolbars.
    for sel in [".button-wrapper", ".subscription-widget-wrap-editor", ".subscription-widget-wrap",
                ".image-link-expand", "button", "svg", "form", "input"]:
        for el in s.select(sel):
            el.decompose()
    # Images: one plain figure per image, captions kept.
    for box in s.select(".captioned-image-container"):
        img = box.find("img")
        cap = box.find("figcaption")
        if not img:
            box.decompose()
            continue
        fig = s.new_tag("figure", attrs={"class": "post-fig"})
        new = s.new_tag("img", attrs={"src": img.get("src", ""), "alt": img.get("alt", "") or "",
                                      "loading": "lazy", "decoding": "async"})
        if img.get("width") and img.get("height"):
            new["width"], new["height"] = img["width"], img["height"]
        fig.append(new)
        if cap and cap.get_text(strip=True):
            fc = s.new_tag("figcaption")
            fc.string = dashes(cap.get_text(" ", strip=True))
            fig.append(fc)
        box.replace_with(fig)
    for y in s.select(".youtube-wrap"):
        f = y.find("iframe")
        if not f:
            y.decompose()
            continue
        w = s.new_tag("div", attrs={"class": "post-video"})
        w.append(s.new_tag("iframe", attrs={"src": f["src"], "title": "Video", "loading": "lazy",
                                             "allow": "fullscreen", "allowfullscreen": "true"}))
        y.replace_with(w)
    # Unwrap presentational spans and divs that carry nothing.
    for el in s.find_all(["span"]):
        el.unwrap()
    for el in s.find_all("div"):
        if not el.get("class"):
            el.unwrap()
    for el in s.find_all(True):
        for a in list(el.attrs):
            if a not in ("href", "src", "alt", "width", "height", "loading", "decoding", "class",
                         "title", "allow", "allowfullscreen", "start", "datetime"):
                del el[a]
        if el.name not in ("figure", "div") and "class" in el.attrs:
            del el["class"]
    # Headings: the page has one h1; post headings start at h2.
    for el in s.find_all(["h1"]):
        el.name = "h2"
    for el in s.find_all(["h4", "h5", "h6"]):
        el.name = "h3"
    # Links open normally; bare URLs become links.
    for p in s.find_all("p"):
        t = p.get_text(strip=True)
        if re.fullmatch(r"https?://\S+", t) and not p.find("a"):
            a = s.new_tag("a", href=t)
            a.string = t
            p.clear()
            p.append(a)
    for a in s.find_all("a"):
        if "substack.com/subscribe" in a.get("href", ""):
            a["href"] = "#subscribe"
        if not a.get_text(strip=True) and not a.find("img"):
            a.decompose()
    # Empty paragraphs.
    for p in s.find_all("p"):
        if not p.get_text(strip=True) and not p.find(["img", "iframe", "br"]):
            p.decompose()
    out = str(s)
    out = out.replace("—", " – ")
    out = re.sub(r"  –  ", " – ", out)
    return out


def chrome(depth):
    """Header and footer from /writing/, with relative links fixed for depth."""
    src = open(os.path.join(ROOT, "writing", "index.html"), encoding="utf-8").read()
    head = src[src.index('<a class="skip"'):src.index("</header>") + len("</header>")]
    foot = src[src.index('<footer class="foot">'):src.index("</footer>") + len("</footer>")]
    pre = "../" * depth
    fix = lambda t: t.replace('href="../', 'href="' + pre).replace('src="../', 'src="' + pre)
    return fix(head), fix(foot)


def tag_links(tags, pre):
    return "".join(
        f'<a class="post-tag" href="{pre}?tag={t}#archive">#&nbsp;{esc(TAGS[t])}</a>' for t in tags)


def page(p, posts, i, header, footer):
    title = clean_title(p["title"])
    sub = dashes(p["subtitle"].strip())
    desc = sub or dashes(BeautifulSoup(p["html"], "html.parser").get_text(" ", strip=True)[:155])
    url = f"{SITE}/writing/{p['slug']}/"
    cover = p.get("cover") or f"{SITE}/assets/og-default.jpg"
    body = clean_body(p["html"])
    newer = posts[i - 1] if i > 0 else None
    older = posts[i + 1] if i + 1 < len(posts) else None
    series = ""
    if p["series"]:
        parts = sorted([q for q in posts if q["series"] == p["series"]], key=pdate)
        items = "".join(
            (f'<li aria-current="page"><b>{esc(clean_title(q["title"]))}</b></li>' if q is p else
             f'<li><a href="../{q["slug"]}/">{esc(clean_title(q["title"]))}</a></li>') for q in parts)
        n = parts.index(p) + 1
        series = f"""
    <aside class="post-series" aria-label="{esc(p['series'])}">
      <p class="eyebrow">{esc(p['series'])} &middot; part {n} of {max([q.get('series_total') or 0 for q in parts] + [len(parts)])}</p>
      <ol>{items}</ol>
    </aside>"""
    nav = ""
    if newer or older:
        nav = '<nav class="post-pn" aria-label="More from the Lab">'
        if older:
            nav += f'<a class="pn-old" href="../{older["slug"]}/"><span>Older</span>{esc(clean_title(older["title"]))}</a>'
        if newer:
            nav += f'<a class="pn-new" href="../{newer["slug"]}/"><span>Newer</span>{esc(clean_title(newer["title"]))}</a>'
        nav += "</nav>"
    ld = {
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": title,
        "description": desc, "datePublished": p["date"], "url": url, "image": cover,
        "mainEntityOfPage": url, "inLanguage": "en-US",
        "author": {"@type": "Person", "@id": f"{SITE}/#matt", "name": "Matt Goode", "url": f"{SITE}/about/"},
        "publisher": {"@id": f"{SITE}/#org"},
        "isPartOf": {"@type": "Blog", "name": "The Leadership Lab", "url": f"{SITE}/writing/"},
        "keywords": ", ".join(TAGS[t] for t in p["tags"]),
    }
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} – The Leadership Lab</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" type="application/rss+xml" title="The Leadership Lab" href="{SITE}/writing/feed.xml">
<link rel="icon" href="../../favicon.ico" sizes="any">
<link rel="icon" href="../../assets/favicon/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../../assets/favicon/apple-touch-icon.png">
<meta property="og:site_name" content="Goode Design &amp; Consulting">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{esc(cover)}">
<meta property="article:published_time" content="{p['date']}">
<meta property="article:author" content="Matt Goode">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{esc(cover)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap">
<link rel="stylesheet" href="../../assets/style.css?v=17">
<link rel="stylesheet" href="../../assets/gdc-nav.css?v=17">
<link rel="stylesheet" href="../../assets/writing.css?v=1">
<script src="../../assets/gdc-analytics.js?v=12"></script>
<script src="../../assets/gdc-nav.js?v=17" defer></script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<meta name="tdm-reservation" content="1">
<meta name="tdm-policy" content="{SITE}/terms/">
<meta name="robots" content="noai, noimageai">
</head>
<body>

{header}

<main id="main">
  <article class="post">
    <header class="post-head">
      <p class="eyebrow"><a href="../">The Leadership Lab</a></p>
      <h1>{esc(title)}</h1>
      {f'<p class="post-sub">{esc(sub)}</p>' if sub else ''}
      <p class="post-meta">
        <span>Matt Goode</span><span><time datetime="{p['date'][:10]}">{nice(p)}</time></span><span>{mins(p['words'])} min read</span>
        <a class="post-sub-jump" href="#subscribe">Get new pieces by email</a>
      </p>
      <p class="post-tags">{tag_links(p['tags'], '../')}</p>
    </header>
    <div class="prose">
{body}
    </div>
{series}
    <section class="post-subscribe" id="subscribe" aria-labelledby="sub-h">
      <div>
        <p class="eyebrow">The Leadership Lab, by email</p>
        <h2 id="sub-h">Get the next piece in your inbox</h2>
        <p>For people who have become the bottleneck in the thing they built: one idea at a time, and something to do with it. Free. Leave whenever you like.</p>
      </div>
      <div class="signup-form">
        {KIT_FORM}
      </div>
    </section>

    <section class="post-next">
      <div>
        <p class="eyebrow">Where is your system slipping?</p>
        <p>A few short questions, about two minutes, and you will know which of five patterns you are in. No email needed.</p>
        <p class="cta-row"><a class="btn" href="../../diagnostic/?src=writing-{p['slug'][:24]}#doors">Run the free diagnostic</a>
        <a class="btn btn-ghost" href="{CALENDLY}?utm_content=writing-post">Book a 30-minute call</a></p>
      </div>
    </section>
    {nav}
  </article>
</main>

{footer}

</body>
</html>
"""


def archive_rows(posts):
    by = {}
    for p in posts:
        by.setdefault(pdate(p).year, []).append(p)
    rows = []
    for y in sorted(by, reverse=True):
        rows.append(f'    <h3 class="arc-year">{y}</h3>\n    <ul class="arc-list">')
        for p in by[y]:
            sub = f'<span class="arc-sub">{esc(dashes(p["subtitle"].strip()))}</span>' if p["subtitle"].strip() else ""
            rows.append(
                f'      <li data-tags="{" ".join(p["tags"])}"><a href="{p["slug"]}/"><time datetime="{p["date"][:10]}">'
                f'{pdate(p).strftime("%-d %b")}</time><span class="arc-t"><b>{esc(clean_title(p["title"]))}</b>{sub}</span>'
                f'<span class="arc-m">{mins(p["words"])} min</span></a></li>')
        rows.append("    </ul>")
    return "\n".join(rows)


def cards(posts, prefix, indent):
    """The three newest posts as cards. The title link stretches over the whole
    card; the hashtag links sit above it and open the filtered archive."""
    pad = " " * indent
    arc = prefix or ""
    out = []
    for p in posts[:3]:
        sub = f'\n{pad}  <span class="lp-sub">{esc(dashes(p["subtitle"].strip()))}</span>' if p["subtitle"].strip() else ""
        img = ""
        if p.get("cover"):
            src = "https://substackcdn.com/image/fetch/w_640,h_360,c_fill,f_auto,q_auto:good,g_auto/" + quote(p["cover"], safe="")
            img = f'\n{pad}  <img class="lp-img" src="{esc(src)}" alt="" width="640" height="360" loading="lazy" decoding="async">'
        tags = "".join(f'<a class="lp-tag" href="{arc}?tag={t}#archive">#&nbsp;{esc(TAGS[t])}</a>'
                       for t in (p.get("tags") or []) if t in TAGS)
        tags = f'\n{pad}  <span class="lp-tags">{tags}</span>' if tags else ""
        out.append(f'{pad}<li>{img}\n{pad}  <span class="lp-date">{pdate(p).strftime("%-d %b %Y")} &middot; '
                   f'{mins(p["words"])} min read</span>\n{pad}  <a class="lp-link" href="{prefix}{p["slug"]}/"><b>{esc(clean_title(p["title"]))}</b></a>'
                   f'{sub}{tags}\n{pad}</li>')
    return "\n".join(out)


def chips():
    out = ['    <div class="chips" role="group" aria-label="Filter by topic">']
    for head, keys in GROUPS:
        out.append(f'      <span class="chips-h">{esc(head)}</span>')
        out += [f'      <button type="button" class="chip" data-tag="{k}" aria-pressed="false">{esc(TAGS[k])}</button>'
                for k in keys]
    out.append("    </div>")
    return "\n".join(out)


def between(src, start, end, new):
    a = src.index(start)
    b = src.index(end, a)
    return src[:a] + new + src[b:]


def main():
    posts = json.load(open(os.path.join(ROOT, "scripts", "writing", "posts.json"), encoding="utf-8"))
    posts.sort(key=pdate, reverse=True)
    header, footer = chrome(2)
    for i, p in enumerate(posts):
        d = os.path.join(ROOT, "writing", p["slug"])
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page(p, posts, i, header, footer))

    # /writing/ index
    wp = os.path.join(ROOT, "writing", "index.html")
    w = open(wp, encoding="utf-8").read()
    w = between(w, "<!--ARCHIVE-->", "<!--/ARCHIVE-->", "<!--ARCHIVE-->\n" + archive_rows(posts) + "\n    ")
    w = between(w, "<!--LATEST-->", "<!--/LATEST-->", "<!--LATEST-->\n" + cards(posts, "", 6) + "\n      ")
    w = between(w, "<!--CHIPS-->", "<!--/CHIPS-->", "<!--CHIPS-->\n" + chips() + "\n    ")
    w = re.sub(r"Search \d+ pieces", f"Search {len(posts)} pieces", w)
    w = re.sub(r'id="arc-count" aria-live="polite">\d+ pieces', f'id="arc-count" aria-live="polite">{len(posts)} pieces', w)
    open(wp, "w", encoding="utf-8").write(w)

    # Homepage: three newest
    hp = os.path.join(ROOT, "index.html")
    h = open(hp, encoding="utf-8").read()
    h = between(h, "<!--LATEST-->", "<!--/LATEST-->", "<!--LATEST-->\n" + cards(posts, "writing/", 6) + "\n      ")
    open(hp, "w", encoding="utf-8").write(h)

    # RSS for Kit's RSS-to-email: newest 25, full text.
    items = []
    for p in posts[:25]:
        u = f"{SITE}/writing/{p['slug']}/"
        items.append(f"""  <item>
    <title>{esc(clean_title(p['title']))}</title>
    <link>{u}</link>
    <guid isPermaLink="true">{u}</guid>
    <pubDate>{format_datetime(pdate(p))}</pubDate>
    <dc:creator>Matt Goode</dc:creator>
    <description>{esc(dashes(p['subtitle'].strip()))}</description>
    {''.join(f'<category>{esc(TAGS[t])}</category>' for t in p['tags'])}
    <content:encoded><![CDATA[{clean_body(p['html']).replace(']]>', ']]&gt;')}]]></content:encoded>
  </item>""")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>The Leadership Lab</title>
  <link>{SITE}/writing/</link>
  <atom:link href="{SITE}/writing/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Leadership systems for people who have become the bottleneck in the thing they built. By Matt Goode.</description>
  <language>en-us</language>
  <lastBuildDate>{format_datetime(pdate(posts[0]))}</lastBuildDate>
{chr(10).join(items)}
</channel>
</rss>
"""
    open(os.path.join(ROOT, "writing", "feed.xml"), "w", encoding="utf-8").write(feed)

    # Sitemap: replace the writing block.
    sp = os.path.join(ROOT, "sitemap.xml")
    s = open(sp, encoding="utf-8").read()
    s = re.sub(r"  <url><loc>https://thatsgoodedesign\.com/writing/[^<]+/</loc>[^\n]*\n", "", s)
    block = "".join(
        f"  <url><loc>{SITE}/writing/{p['slug']}/</loc><lastmod>{p['date'][:10]}</lastmod><priority>0.5</priority></url>\n"
        for p in posts)
    s = s.replace("</urlset>", block + "</urlset>")
    open(sp, "w", encoding="utf-8").write(s)
    print(f"built {len(posts)} posts")


if __name__ == "__main__":
    sys.exit(main())
