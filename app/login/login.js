// Login - simulação de autenticação (Firebase Auth será integrado depois)
function simularLoginSocial(provedor) {
  const alertBox = document.getElementById('authAlert');
  alertBox.className = 'alert alert-success small py-2';
  alertBox.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Autenticando com <strong>${provedor}</strong>...`;
  alertBox.classList.remove('d-none');
  setTimeout(() => { window.location.href = '../dashboard/dashboard.html'; }, 800);
}

function handleAuthSubmit(e, tipo) {
  e.preventDefault();
  const btn = tipo === 'login' ? document.getElementById('btnSubmitLogin') : document.getElementById('btnSubmitCadastro');
  btn.disabled = true;
  btn.querySelector('.spinner-border').classList.remove('d-none');
  setTimeout(() => { window.location.href = '../dashboard/dashboard.html'; }, 800);
}
