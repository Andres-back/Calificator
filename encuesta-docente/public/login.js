const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');
const submit = document.querySelector('#login-submit');
const root = new URL('./', location.href);

document.querySelector('#show-password').addEventListener('change', event => {
  document.querySelector('#password').type = event.target.checked ? 'text' : 'password';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled || !form.reportValidity()) return;
  submit.disabled = true;
  submit.textContent = 'Ingresando…';
  message.hidden = true;
  try {
    const sessionResponse = await fetch(new URL('../api/session', root), {cache:'no-store', credentials:'same-origin'});
    const session = await sessionResponse.json();
    if (!sessionResponse.ok) throw new Error(session.error || 'No fue posible preparar el acceso. Intente de nuevo.');
    const response = await fetch(new URL('login', root), {
      method:'POST', cache:'no-store', credentials:'same-origin',
      headers:{'Content-Type':'application/json', 'X-Survey-CSRF':session.csrf},
      body:JSON.stringify({username:document.querySelector('#username').value.trim(), password:document.querySelector('#password').value})
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || 'No fue posible ingresar.');
    location.replace(new URL('./', location.href));
  } catch (error) {
    message.textContent = error.message || 'No fue posible conectar. Intente de nuevo.';
    message.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Ingresar';
  }
});
