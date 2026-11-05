import urllib.request

urls = [
    'https://idsp.ncdc.gov.in/',
    'https://ksdhs.karnataka.gov.in/',
    'https://nhm.gov.in/',
    'https://www.imd.gov.in/'
]

for url in urls:
    print('URL:', url)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as resp:
            print('STATUS:', resp.status)
            body = resp.read(4000).decode('utf-8', 'replace')
            print(body[:500].replace('\n', ' ')[:500])
    except Exception as e:
        print('ERROR:', type(e).__name__, e)
    print('---')
