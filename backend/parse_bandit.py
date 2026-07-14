"""Parse bandit JSON and print high/medium severity issues."""
import json
import sys

with open('bandit_report.json') as f:
    data = json.load(f)
results = data.get('results', [])
print(f'Total issues: {len(results)}')
print()

for r in results:
    sev = r.get('issue_severity', '')
    conf = r.get('issue_confidence', '')
    if sev in ('HIGH', 'MEDIUM') or conf == 'HIGH':
        tid = r.get('test_id', '?')
        tn = r.get('test_name', '?')
        fname = r.get('filename', '?')
        ln = r.get('line_number', '?')
        msg = r.get('issue_text', '?')[:200]
        print(f'[{sev}/{conf}] {tid} - {tn}')
        print(f'  {fname}:{ln}')
        print(f'  {msg}')
        print()
