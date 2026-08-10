import os

import requests

api_url = os.getenv('API_URL', 'http://127.0.0.1:8000/api')
session = requests.Session()
response = session.post(
    f'{api_url}/auth/login',
    json={
        'email': os.environ['TEACHER_EMAIL'],
        'password': os.environ['TEACHER_PASSWORD'],
    },
)
response.raise_for_status()
token = session.cookies.get('access_token')
headers = {'Authorization': f'Bearer {token}'}
evaluation_id = os.environ['EVALUATION_ID']

evaluation_response = session.get(
    f'{api_url}/evaluaciones/{evaluation_id}',
    headers=headers,
)
evaluation_response.raise_for_status()
evaluation = evaluation_response.json()
print('Current state:')
print(f'  estado: {evaluation.get("estado")}')
print(f'  modalidad: {evaluation.get("modalidad")}')
print(f'  recepcion_habilitada: {evaluation.get("recepcion_habilitada")}')

pause_response = session.post(
    f'{api_url}/evaluaciones/{evaluation_id}/pausar-recepcion',
    headers=headers,
)
print(f'\nPause response: {pause_response.status_code}')
print(f'Body: {pause_response.text[:500]}')

activate_response = session.post(
    f'{api_url}/evaluaciones/{evaluation_id}/activar-recepcion',
    headers=headers,
)
print(f'\nActivate response: {activate_response.status_code}')
print(f'Body: {activate_response.text[:500]}')