// Login com Firebase Authentication (Google e E-mail/Senha)
import { auth, googleProvider } from "../../js/firebase-config.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const DASHBOARD_URL = "../dashboard/dashboard.html";
const alertBox = document.getElementById("authAlert");

const MENSAGENS_ERRO = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já possui uma conta.",
  "auth/weak-password": "A senha deve ter no mínimo 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente em instantes.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
  "auth/cancelled-popup-request": "Login com Google cancelado.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.",
  "auth/unauthorized-domain": "Domínio não autorizado no Firebase (Authentication > Settings > Authorized domains).",
  "auth/operation-not-allowed": "Este método de login não está ativado no Firebase.",
  "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
};

function mostrarErro(err) {
  alertBox.className = "alert alert-danger small py-2";
  alertBox.textContent = MENSAGENS_ERRO[err.code] || "Não foi possível autenticar. Tente novamente.";
}

function mostrarCarregando(texto) {
  alertBox.className = "alert alert-success small py-2";
  alertBox.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${texto}`;
}

function setBotaoCarregando(btn, carregando) {
  btn.disabled = carregando;
  btn.querySelector(".spinner-border").classList.toggle("d-none", !carregando);
}

// Enquanto o cadastro grava o nome, o redirecionamento automático fica suspenso
let cadastrando = false;

// Quem já está logado vai direto para o dashboard
onAuthStateChanged(auth, (user) => {
  if (user && !cadastrando) window.location.replace(DASHBOARD_URL);
});

document.getElementById("btnGoogle").addEventListener("click", async () => {
  mostrarCarregando("Autenticando com <strong>Google</strong>...");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    mostrarErro(err);
  }
});

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSubmitLogin");
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;
  alertBox.classList.add("d-none");
  setBotaoCarregando(btn, true);
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (err) {
    mostrarErro(err);
    setBotaoCarregando(btn, false);
  }
});

document.getElementById("formCadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSubmitCadastro");
  const nome = document.getElementById("cadastroNome").value.trim();
  const email = document.getElementById("cadastroEmail").value.trim();
  const senha = document.getElementById("cadastroSenha").value;
  alertBox.classList.add("d-none");
  setBotaoCarregando(btn, true);
  cadastrando = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    window.location.replace(DASHBOARD_URL);
  } catch (err) {
    cadastrando = false;
    mostrarErro(err);
    setBotaoCarregando(btn, false);
  }
});
