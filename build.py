"""Join the sources into one offline file: boiler-troubleshooting.html.

The classroom smartboard browser is old, so the JavaScript must stay ES2017. There is no transpiler in this build:
it refuses to build if newer syntax slips in (optional chaining, ??, object spread, flatMap and friends).
"""
import pathlib
import re
import sys

d = pathlib.Path(__file__).parent
JS = ['engine.js', 'parts.js', 'ptdraw.js', 'levels.js', 'panel.js', 'ladder.js', 'pic.js', 'app.js']
CSS = ['style.css', 'boiler.css']

NEWER = [
    (r'\?\.(?![0-9])', 'optional chaining ?.'),
    (r'\?\?', 'nullish ??'),
    (r'\{\s*\.\.\.', 'object spread {...'),
    (r',\s*\.\.\.[A-Za-z_$][\w$.]*\s*\}', 'object spread , ...x }'),
    (r'\.flatMap\(|\.flat\(', 'flat / flatMap'),
    (r'Object\.fromEntries|\.matchAll\(|\.replaceAll\(|\.at\(', 'ES2019+ built-in'),
    (r'catch\s*\{', 'catch without (e)'),
    (r'\(\?<[=!]', 'regex lookbehind'),
    (r'\(\?<[A-Za-z]', 'named regex group'),
]


def lint(name, src):
    bad = []
    for i, line in enumerate(src.splitlines(), 1):
        code = re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"", "''", line)
        for pat, what in NEWER:
            if re.search(pat, code):
                bad.append(f'{name}:{i}: {what}: {line.strip()[:100]}')
    return bad


js_parts, problems = [], []
for f in JS:
    src = (d / f).read_text()
    problems += lint(f, src)
    js_parts.append(f'/* ---- {f} ---- */\n' + src)
if problems:
    print('Newer JavaScript than the smartboard can run:\n' + '\n'.join(problems))
    sys.exit(1)
js = '\n'.join(js_parts)
css = '\n'.join((d / f).read_text() for f in CSS)
html = (d / 'shell.html').read_text().replace('/*CSS*/', css).replace('/*JS*/', js)
out = d / 'boiler-troubleshooting.html'
out.write_text(html)
(d / 'index.html').write_text(html)
(d / 'bundle.js').write_text(js)
print('built', out.name, 'and index.html,', len(html), 'bytes')
