import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


root = Path(__file__).resolve().parent


def fetch_text(url: str, timeout: int = 30) -> tuple[int | None, str]:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        status = resp.status
        text = resp.read().decode('utf-8', 'replace')
        return status, text


checks = [
    {'name': 'IDSP portal', 'url': 'https://idsp.ncdc.gov.in/'},
    {'name': 'Karnataka Health Department', 'url': 'https://ksdhs.karnataka.gov.in/'},
    {'name': 'NHM portal', 'url': 'https://nhm.gov.in/'},
    {'name': 'IMD portal', 'url': 'https://www.imd.gov.in/'},
    {'name': 'Data.gov.in dengue search', 'url': 'https://www.data.gov.in/search/site/dengue'},
    {'name': 'Data.gov.in Karnataka dengue search', 'url': 'https://www.data.gov.in/search/site/Karnataka%20dengue'},
]


def summarize_text(text: str, terms) -> str:
    lower = text.lower()
    hits = [term for term in terms if term.lower() in lower]
    if hits:
        return 'found_terms=' + ', '.join(hits)
    return 'no_expected_terms_found'


terms = ['dengue', 'outbreak', 'district', 'weekly', 'csv', 'xlsx', 'download']

results = []
for check in checks:
    item = {'name': check['name'], 'url': check['url'], 'status': 'unknown', 'result': 'not_checked'}
    try:
        status, text = fetch_text(check['url'])
        item['status'] = status
        item['result'] = summarize_text(text, terms)
        if 'dengue' in text.lower() or 'outbreak' in text.lower() or 'csv' in text.lower():
            snippet = re.sub(r'\s+', ' ', text[:1000])
            item['snippet'] = snippet
    except Exception as exc:
        item['status'] = 'error'
        item['result'] = str(type(exc).__name__) + ': ' + str(exc)

    results.append(item)

search_queries = [
    'site:idsp.ncdc.gov.in dengue outbreak Karnataka weekly data',
    'site:ksdhs.karnataka.gov.in dengue Karnataka district weekly report',
    'site:nhm.gov.in dengue Karnataka district weekly bulletin pdf',
    'site:imd.gov.in rainfall temperature Karnataka weekly district data',
    'Karnataka dengue district weekly cases official government website',
]

for q in search_queries:
    url = 'https://duckduckgo.com/html/?q=' + urllib.parse.quote(q)
    try:
        status, text = fetch_text(url)
        matches = re.findall(r'<a rel="nofollow" class="result-link" href="(.*?)">(.*?)</a>', text)[:8]
        results.append({
            'name': 'search_query',
            'query': q,
            'status': status,
            'match_count': len(matches),
            'matches': [{'href': href, 'title': re.sub('<.*?>', '', title)} for href, title in matches],
        })
    except Exception as exc:
        results.append({'name': 'search_query', 'query': q, 'status': 'error', 'result': str(type(exc).__name__) + ': ' + str(exc)})

output_path = root / 'official_source_verification.json'
output_path.write_text(json.dumps(results, indent=2), encoding='utf-8')

print(json.dumps(results, indent=2))
