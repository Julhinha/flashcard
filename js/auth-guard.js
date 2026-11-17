// Protege as páginas internas: sem sessão, volta para o login.
// Também preenche nome/e-mail do usuário, o sino de pendências, o perfil
// (preferência de lembretes e último envio) e liga o botão "Sair".
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const LOGIN_URL = new URL("../app/login/login.html", import.meta.url).href;
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const UMA_HORA_MS = 60 * 60 * 1000;

function setText(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

// Sino de notificações: conta os flashcards do usuário com revisão vencida
async function atualizarContadorPendentes(uid) {
  try {
    const snap = await getDocs(
      query(collection(db, "flashcards"), where("usuario_id", "==", uid)),
    );
    const agora = new Date().toISOString();
    const pendentes = snap.docs.filter(
      (d) => (d.data().proxima_revisao || "") <= agora,
    ).length;
    window.cardsPendentes = pendentes;

    const badge = document.getElementById("badgeNotificacoes");
    if (badge) {
      badge.textContent = pendentes;
      badge.classList.toggle("d-none", pendentes === 0);
    }
    setText(
      "dropdownPendCount",
      `${pendentes} card${pendentes === 1 ? "" : "s"}`,
    );
    return pendentes;
  } catch (erro) {
    console.error("Erro ao contar revisões pendentes:", erro);
    return 0;
  }
}

// Perfil do usuário em usuarios/{uid}: notificacoes_email e ultimo_email_enviado_em
async function carregarPerfil(uid) {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() ? snap.data() : {};
  } catch (erro) {
    console.error("Erro ao carregar perfil:", erro);
    return {};
  }
}

// Registra o último acesso do usuário (base da regra "10 dias sem entrar" do script
// de notificação). Grava no máximo 1 vez por hora para não gerar escritas à toa.
function registrarAcesso(perfil) {
  const ultimo = perfil.ultimo_acesso_em ? new Date(perfil.ultimo_acesso_em).getTime() : 0;
  if (Date.now() - ultimo < UMA_HORA_MS) return;
  window
    .salvarPerfil({ ultimo_acesso_em: new Date().toISOString() })
    .catch((erro) => console.error("Erro ao registrar último acesso:", erro));
}

// Lembrete automático: ao abrir o dashboard com o switch ligado, envia no máximo 1 e-mail por dia
async function verificarLembreteDiario(perfil, pendentes) {
  const noDashboard = document.getElementById("switchEmailNotif");
  if (!noDashboard || perfil.notificacoes_email !== true || pendentes === 0) return;

  const ultimo = perfil.ultimo_email_enviado_em;
  const jaEnviouHoje = ultimo && Date.now() - new Date(ultimo).getTime() < UM_DIA_MS;
  if (!jaEnviouHoje && typeof window.dispararEmailLembrete === "function") {
    await window.dispararEmailLembrete(true);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(LOGIN_URL);
    return;
  }
  window.usuarioEmail = user.email;
  window.usuarioNome = user.displayName || user.email.split("@")[0];
  setText("navUserName", window.usuarioNome);
  setText("navUserEmail", user.email);
  setText("emailDestinoDisplay", user.email);

  // Salva campos do perfil (mescla com o que já existe)
  window.salvarPerfil = (dados) =>
    setDoc(
      doc(db, "usuarios", user.uid),
      { ...dados, usuario_id: user.uid, email: user.email, nome: window.usuarioNome },
      { merge: true },
    );

  const [pendentes, perfil] = await Promise.all([
    atualizarContadorPendentes(user.uid),
    carregarPerfil(user.uid),
  ]);

  const interruptor = document.getElementById("switchEmailNotif");
  if (interruptor) interruptor.checked = perfil.notificacoes_email === true;
  if (typeof window.exibirUltimoEnvio === "function") {
    window.exibirUltimoEnvio(perfil.ultimo_email_enviado_em);
  }

  registrarAcesso(perfil);
  await verificarLembreteDiario(perfil, pendentes);
});

const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.replace(LOGIN_URL);
  });
}
