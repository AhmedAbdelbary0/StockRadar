import json, urllib.request, urllib.error
import time

# Give the server a few seconds to start up
time.sleep(3)

url = 'http://localhost:8000/mitigate-risk'
data = {
    'batch_id': 123,
    'sku': 'TEST-01',
    'product_name': 'Test Product',
    'category': 'Dairy',
    'batch_number': 'BATCH123',
    'quantity_remaining': 50,
    'cost_price': 5.99,
    'expiry_date': '2026-07-15',
    'days_until_expiry': 13,
    'daily_velocity': 1.5,
    'risk_level': 'High'
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as f:
        print('Status:', f.status)
        res = json.loads(f.read().decode('utf-8'))
        print('Generated Type:', res.get('strategy_type'))
        print('Markdown length:', len(res.get('markdown_content', '')))
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code, e.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)
