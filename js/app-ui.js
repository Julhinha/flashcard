// Utilitários Globais de Interface e Feedback
function mostrarToast(mensagem, tipo = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const bgClass =
    tipo === "success"
      ? "text-bg-success"
      : tipo === "danger"
        ? "text-bg-danger"
        : "text-bg-primary";
  const icon =
    tipo === "success"
      ? "bi-check-circle-fill"
      : "bi-exclamation-triangle-fill";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
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
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// Lê do env.local.js localmente ou usa os placeholders substituídos pelo GitHub Actions
const env = window.ENV_LOCAL || {};

// Disparo real de e-mail via EmailJS REST API
const EMAILJS_CONFIG = {
  serviceId: env.EMAILJS_SERVICE_ID || "__EMAILJS_SERVICE_ID__",
  templateId: env.EMAILJS_TEMPLATE_ID || "__EMAILJS_TEMPLATE_ID__",
  publicKey: env.EMAILJS_PUBLIC_KEY || "__EMAILJS_PUBLIC_KEY__",
};

// Mostra a data do último envio (vinda do Firestore, em usuarios/{uid})
function exibirUltimoEnvio(iso) {
  const statusEl = document.getElementById("statusUltimoEmail");
  if (!statusEl) return;
  statusEl.textContent = iso
    ? `Último envio: ${new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
    : "Nenhum envio realizado ainda";
}

// Envio manual (botões do dashboard e do sino). O lembrete diário automático é feito
// pelo workflow do GitHub Actions, não por esta função.
async function dispararEmailLembrete() {
  if (!window.usuarioEmail) {
    mostrarToast(
      "Aguarde o carregamento da sessão e tente novamente.",
      "danger",
    );
    return;
  }

  mostrarToast("Enviando lembrete de revisão via EmailJS...", "primary");
  try {
    const resposta = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.serviceId,
          template_id: EMAILJS_CONFIG.templateId,
          user_id: EMAILJS_CONFIG.publicKey,
          template_params: {
            to_email: window.usuarioEmail,
            to_name: window.usuarioNome || window.usuarioEmail.split("@")[0],
            cards_pendentes: window.cardsPendentes ?? 0,
            link_revisao: new URL("../revisao/revisao.html", location.href)
              .href,
            tipo: "revisao_pendente",
            dias_inativo: 0,
            assunto: `IFlashcard: você tem ${window.cardsPendentes ?? 0} card(s) para revisar!`,
            mensagem:
              "Sua fila de repetição espaçada (Anki) está aguardando por você.",
            destaque: `${window.cardsPendentes ?? 0} flashcard(s) pendente(s) para revisão hoje!`,
            botao: "Revisar Meus Cards Agora",
            cor_destaque:
              (window.cardsPendentes ?? 0) > 0 ? "#dc3545" : "#0d6efd",
          },
        }),
      },
    );
    if (!resposta.ok) throw new Error(await resposta.text());

    const agora = new Date().toISOString();
    exibirUltimoEnvio(agora);
    mostrarToast(
      `E-mail de revisão enviado com sucesso para ${window.usuarioEmail}!`,
      "success",
    );
    if (window.salvarPerfil) {
      await window
        .salvarPerfil({ ultimo_email_enviado_em: agora })
        .catch((e) => console.error("Erro ao salvar último envio:", e));
    }
  } catch (erro) {
    console.error("Erro ao enviar e-mail via EmailJS:", erro);
    mostrarToast(
      "Não foi possível enviar o e-mail. Verifique o template do EmailJS.",
      "danger",
    );
  }
}
