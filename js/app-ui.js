// Utilitários Globais de Interface e Feedback  
function mostrarToast(mensagem, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgClass = tipo === 'success' ? 'text-bg-success' : (tipo === 'danger' ? 'text-bg-danger' : 'text-bg-primary');
  const icon = tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icon}"></i>
        <span>${mensagem}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3200 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Simulação do disparo EmailJS (RN03 & RN05)
function dispararEmailLembrete() {
  mostrarToast('Enviando lembrete de revisão via EmailJS...', 'primary');
  setTimeout(() => {
    mostrarToast('E-mail de revisão enviado com sucesso para estudante@ifrj.edu.br!', 'success');
    const statusEl = document.getElementById('statusUltimoEmail');
    if (statusEl) statusEl.textContent = 'Último envio: Agora mesmo';
  }, 900);
}
