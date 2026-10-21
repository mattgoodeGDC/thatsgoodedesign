#!/usr/bin/env python3
"""21 Oct 2026 (CLUTCH-84): the engine check replaces the company diagnostic.

Matt's call: company traffic goes to /engine-check/; the school and nonprofit
diagnostics stay, reached from /diagnostic/ (now a chooser for those two).

- Site-wide links to /diagnostic/ (outside the school, nonprofit and
  diagnostic pages) point to /engine-check/ with utm_source=site and the old
  src kept as utm_content, and their button text changes to match.
- The Services menu keeps a /diagnostic/ entry, relabelled for schools and
  nonprofits (scripts/nav/services.json, then scripts/update-nav.py).
- The five company pattern pages and the share page redirect to /engine-check/.
Run once from the repo root. Safe to re-run.
"""
import glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
KEEP = ('diagnostic/', 'schools/', 'nonprofits/', 'school-meeting-forms/', 'engine-check/')

LINK = re.compile(r'href="((?:\.\./)*|/)?diagnostic/(?:\?src=([^"#&]*))?(?:#doors)?"')
def relink(m):
    pre, src = m.group(1) or '', m.group(2)
    q = '?utm_source=site&amp;utm_content=' + src if src else ''
    return 'href="%sengine-check/%s"' % (pre, q)

TEXT = [  # anchor text, only inside links that now point to engine-check
    ('>Run the free diagnostic first<', '>Check your engine first<'),
    ('>Run the free diagnostic<', '>Check your engine, free<'),
    ('>Take the 2-minute diagnostic<', '>Check your engine, free<'),
    ('>Find your pattern in the free diagnostic<', '>Check your engine, free<'),
    ('>Take the free diagnostic<', '>Check your engine, free<'),
    ('>Run the diagnostic<', '>Check your engine<'),
    ('>The free diagnostic<', '>The free engine check<'),
    ('>Free diagnostic<', '>Free engine check<'),
]
ANCHOR = re.compile(r'(<a [^>]*href="(?:\.\./)*/?engine-check/[^"]*"[^>]*)(>[^<]*<)')

COPY = [  # whole sentences, word for word
    ('A few short questions, about two minutes, and you will know which of five patterns you are in. No email needed.',
     'Eighteen statements about the team you lead, answered on instinct. Your readout comes up on screen, with steps for this week. No email needed.'),
    ('<h3>Start with the diagnostic</h3>', '<h3>Start with the engine check</h3>'),
    ('A few short questions, about two minutes, no email needed. It will tell you\n          which part of this is actually your problem.',
     'Eighteen statements about the team you lead, answered on instinct, no email\n          needed. Your readout names the cylinder to start with.'),
    ('<h3>Run the diagnostic</h3>', '<h3>Check your engine</h3>'),
    ('A few short questions, about two minutes, and an honest answer about which\n          of five patterns you are in. Bring your pattern to the call.',
     'Eighteen statements about the team you lead, answered on instinct. Your\n          readout names the cylinder to start with. Bring it to the call.'),
    ('A few short questions, about two minutes, and your\n      result appears before any email.',
     'Eighteen statements about the team you lead, and your\n      readout appears before any email.'),
]

changed = []
for f in sorted(glob.glob('**/*.html', recursive=True)):
    if f.startswith(KEEP):
        continue
    s0 = s = open(f, encoding='utf-8').read()
    s = LINK.sub(relink, s)
    def fix(m):
        a, t = m.group(1), m.group(2)
        for old, new in TEXT:
            if t == old:
                return a + new
        return a + t
    s = ANCHOR.sub(fix, s)
    for old, new in COPY:
        s = s.replace(old, new)
    s = s.replace('gdc-nav.js?v=17', 'gdc-nav.js?v=18')
    if s != s0:
        open(f, 'w', encoding='utf-8').write(s)
        changed.append(f)
# keep pages also need the new sticky-bar script version
for f in sorted(glob.glob('**/*.html', recursive=True)):
    if f.startswith(KEEP):
        s = open(f, encoding='utf-8').read()
        if 'gdc-nav.js?v=17' in s:
            open(f, 'w', encoding='utf-8').write(s.replace('gdc-nav.js?v=17', 'gdc-nav.js?v=18'))
            changed.append(f)
print(len(changed), 'files changed')
