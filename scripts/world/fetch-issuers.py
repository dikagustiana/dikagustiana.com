# Fetches lembarsaham.com's per-sub-industry issuer pages for every IDX-IC sub-industry code in the classification
# table and writes the snapshot docs/world/sources/issuers-snapshot.json: code -> [{ticker, name, ipo, founded}].
#
#   python3 -I scripts/world/fetch-issuers.py <scratch dir> docs/world/sources/idx-ic-classification.tsv docs/world/sources/issuers-snapshot.json
#
# Four requests at a time with a pause between pages; fetched pages are cached in <scratch dir>/pages so a rerun
# re-reads them. Only the ticker, the company name and the founding and IPO dates are kept (SOURCES.md).
import json, re, html, sys, time, urllib.request, pathlib
from concurrent.futures import ThreadPoolExecutor

D = pathlib.Path(sys.argv[1]); CLS = pathlib.Path(sys.argv[2]); OUT = pathlib.Path(sys.argv[3])
(D / 'pages').mkdir(parents=True, exist_ok=True)
codes = [l.split('\t')[0] for l in CLS.read_text(encoding='utf-8').splitlines()[1:] if l.strip()]
UA = {'User-Agent': 'Mozilla/5.0 (research fetch for dikagustiana.com registry; one request per page)'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode('utf-8', 'replace'), r.status

def fetch_code(code):
    tickers, page, lines, found = [], 1, [], {}
    while True:
        cache = D / 'pages' / f'{code}-{page}.html'
        if cache.exists():
            body, status = cache.read_text(encoding='utf-8'), 'cache'
        else:
            url = f'https://lembarsaham.com/daftar-emiten/industrial/{code}/x?page={page}'
            try:
                body, status = get(url)
            except Exception as e:
                lines.append(f'{code} p{page} ERROR {e}'); break
            cache.write_text(body, encoding='utf-8')
            time.sleep(0.4)
        for t, n in re.findall(r'"([A-Z0-9]{4})">\1 - ([^<]+?)\s*<', body):
            found[t] = html.unescape(n).strip()
        got = 0
        for r in re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S):
            cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)]
            if len(cells) >= 3 and re.fullmatch(r'[A-Z0-9]{4}', cells[0]):
                tickers.append({'ticker': cells[0], 'founded': cells[1], 'ipo': cells[2]}); got += 1
        m = re.search(r'Menampilkan[^0-9]*(\d+)-(\d+)[^0-9]*dari[^0-9]*(\d+)', re.sub(r'<[^>]+>', '', body))
        total = int(m.group(3)) if m else None
        lines.append(f'{code} p{page} {status} rows {got} total {total}')
        if got == 0 or total is None or len(tickers) >= total: break
        page += 1
    return code, tickers, lines, found

names, snap, log = {}, {}, []
with ThreadPoolExecutor(max_workers=4) as pool:
    for code, tickers, lines, found in pool.map(fetch_code, codes):
        snap[code] = tickers; log.extend(lines); names.update(found)
        print('\n'.join(lines), flush=True)
for code, ts in snap.items():
    for t in ts:
        t['name'] = names.get(t['ticker'], '')
OUT.write_text(json.dumps({'source': 'https://lembarsaham.com/daftar-emiten/industrial/<code>/…', 'fetched': time.strftime('%Y-%m-%d'), 'codes': snap}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
(D / 'scrape.log').write_text('\n'.join(log) + '\n', encoding='utf-8')
print('codes', len(snap), 'tickers', sum(len(v) for v in snap.values()), 'named', sum(1 for v in snap.values() for t in v if t['name']))
