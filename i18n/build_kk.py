"""Build kk.html (Kazakh) from index.html (Russian).
Usage: python3 i18n/build_kk.py   (run from the repository root)
Russian text nodes and alt/aria-label/title attributes are replaced
by the translations in i18n/kk_text.py, matched by the exact Russian text."""
import re, sys, os
from html.parser import HTMLParser
sys.path.insert(0, os.path.dirname(__file__))
from kk_text import KK, JS, HEAD

src = open('index.html', encoding='utf-8').read()
b0 = src.index('<body>'); b1 = src.index('<script>\n(function')
head, body, tail = src[:b0], src[b0:b1], src[b1:]

class P(HTMLParser):
    def __init__(s): super().__init__(); s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in ('script','style'): s.skip+=1
        for k,v in a:
            if k in ('alt','aria-label','title') and v and re.search('[А-Яа-яЁё]',v): s.out.append(v)
    def handle_endtag(s,t):
        if t in ('script','style'): s.skip-=1
    def handle_data(s,d):
        if s.skip: return
        d=d.strip()
        if d and re.search('[А-Яа-яЁё]',d): s.out.append(d)
p = P(); p.feed(body)
order = []; [order.append(x) for x in p.out if x not in order]

missing = []
for ru in sorted(order, key=len, reverse=True):
    if ru not in KK:
        if not re.search('[ӘәІіҢңҒғҮүҰұҚқӨөҺһ]', ru) and ru not in ('РУС',): missing.append(ru)
        continue
    kk = KK[ru]; n = 0
    body, c = re.subn(r'(>\s*)' + re.escape(ru) + r'(\s*<)', lambda m: m.group(1) + kk + m.group(2), body); n += c
    for attr in ('alt', 'aria-label', 'title'):
        body, c = re.subn(attr + r'="' + re.escape(ru) + '"', attr + '="' + kk + '"', body); n += c
    if not n: missing.append(ru)
for a, b in HEAD.items():
    assert a in head, a; head = head.replace(a, b)
for a, b in JS.items():
    assert a in tail, a; tail = tail.replace(a, b)
# language switch points back to Russian
body = body.replace('<a class="lang" id="lang-switch" href="kk.html" hreflang="kk" lang="kk" data-lang="kk" aria-label="Қазақ тіліндегі нұсқа"><b>РУС</b> · ҚАЗ</a>',
                    '<a class="lang" id="lang-switch" href="index.html" hreflang="ru" lang="ru" data-lang="ru" aria-label="Русская версия">РУС · <b>ҚАЗ</b></a>')
open('kk.html', 'w', encoding='utf-8').write(head + body + tail)
print('kk.html written;', len(order), 'strings;', 'untranslated:', missing if missing else 'none')
