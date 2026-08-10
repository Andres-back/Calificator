import os

import requests

api_url = os.getenv('API_URL', 'http://127.0.0.1:8000/api')
session = requests.Session()
response = session.post(
    f'{api_url}/auth/login',
    json={
        'email': os.environ['STUDENT_EMAIL'],
        'password': os.environ['STUDENT_PASSWORD'],
    },
)
response.raise_for_status()
token = session.cookies.get('access_token')
headers = {'Authorization': f'Bearer {token}'}
evaluation_id = os.environ['EVALUATION_ID']

submission = session.post(
    f'{api_url}/evaluaciones/{evaluation_id}/entregas',
    json={'respuesta_texto': 'P1: 15\nP2: 6\nP3: Falso\nP4: 6'},
    headers=headers,
)
print(f'Submit response: {submission.status_code}')
print(f'Body: {submission.text[:500]}')