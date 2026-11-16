// Gráficos Chart.js do Dashboard
document.addEventListener('DOMContentLoaded', () => {
  const ctxDominio = document.getElementById('chartDominio');
  if (ctxDominio) {
    new Chart(ctxDominio, {
      type: 'doughnut',
      data: {
        labels: ['Difícil (Errei)', 'Bom (Lembrei)', 'Fácil (Dominei)'],
        datasets: [{
          data: [7, 15, 20],
          backgroundColor: ['#CD191E', '#1967D2', '#2F9E41'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
        }
      }
    });
  }

  const ctxBib = document.getElementById('chartBibliotecas');
  if (ctxBib) {
    new Chart(ctxBib, {
      type: 'bar',
      data: {
        labels: ['Arquitetura SW', 'Banco de Dados', 'Linux & Redes', 'JavaScript'],
        datasets: [{
          label: 'Flashcards Salvos',
          data: [14, 11, 9, 8],
          backgroundColor: '#2F9E41',
          borderRadius: 8,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#EEF1F4' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
});

function toggleNotificacaoEmail(checkbox) {
  const msg = checkbox.checked
    ? 'Lembretes automáticos por e-mail ATIVADOS.'
    : 'Lembretes automáticos por e-mail DESATIVADOS.';
  mostrarToast(msg, 'success');
}
