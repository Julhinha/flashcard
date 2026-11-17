// Login com Firebase Authentication (Google e E-mail/Senha)
import { auth, googleProvider } from "../../js/firebase-config.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
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

// Aviso de sucesso some sozinho; qualquer outra mensagem cancela esse temporizador
const TEMPO_AVISO_SUCESSO_MS = 8000;
let timerAviso = null;

function mostrarAviso(texto) {
  clearTimeout(timerAviso);
  alertBox.className = "alert alert-danger small py-2";
  alertBox.textContent = texto;
}

function mostrarErro(err) {
  mostrarAviso(MENSAGENS_ERRO[err.code] || "Não foi possível autenticar. Tente novamente.");
}

// Validação feita aqui (os formulários usam "novalidate"), para as mensagens
// ficarem sempre em português e no mesmo estilo, em vez do balão do navegador.
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Retorna true se o e-mail é válido; senão mostra o aviso, foca o campo e retorna false
function validarEmail(campo) {
  const email = campo.value.trim();
  if (!email) {
    mostrarAviso("Informe seu e-mail.");
  } else if (!EMAIL_VALIDO.test(email)) {
    mostrarAviso("E-mail inválido. Use o formato nome@dominio.com.");
  } else {
    return true;
  }
  campo.focus();
  return false;
}

function mostrarSucesso(texto) {
  clearTimeout(timerAviso);
  alertBox.className = "alert alert-success small py-2";
  alertBox.textContent = texto;
  timerAviso = setTimeout(
    () => alertBox.classList.add("d-none"),
    TEMPO_AVISO_SUCESSO_MS,
  );
}

function mostrarCarregando(texto) {
  clearTimeout(timerAviso);
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
  const campoEmail = document.getElementById("loginEmail");
  const campoSenha = document.getElementById("loginSenha");
  if (!validarEmail(campoEmail)) return;
  if (!campoSenha.value) {
    mostrarAviso("Informe sua senha.");
    campoSenha.focus();
    return;
  }
  const email = campoEmail.value.trim();
  const senha = campoSenha.value;
  alertBox.classList.add("d-none");
  setBotaoCarregando(btn, true);
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (err) {
    mostrarErro(err);
    setBotaoCarregando(btn, false);
  }
});

// Recuperação de senha: envia o link de redefinição para o e-mail digitado no login
document.getElementById("btnEsqueciSenha").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const campoEmail = document.getElementById("loginEmail");
  if (!validarEmail(campoEmail)) return;
  const email = campoEmail.value.trim();

  btn.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    // E-mail sem conta: resposta genérica, para não revelar quais e-mails estão cadastrados
    if (err.code !== "auth/user-not-found") {
      mostrarErro(err);
      btn.disabled = false;
      return;
    }
  }
  mostrarSucesso(
    "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique também a caixa de spam.",
  );
  btn.disabled = false;
});

document.getElementById("formCadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSubmitCadastro");
  const campoNome = document.getElementById("cadastroNome");
  const campoEmail = document.getElementById("cadastroEmail");
  const campoSenha = document.getElementById("cadastroSenha");
  const nome = campoNome.value.trim();
  if (!nome) {
    mostrarAviso("Informe seu nome completo.");
    campoNome.focus();
    return;
  }
  if (!validarEmail(campoEmail)) return;
  if (campoSenha.value.length < 6) {
    mostrarAviso("A senha deve ter no mínimo 6 caracteres.");
    campoSenha.focus();
    return;
  }
  const email = campoEmail.value.trim();
  const senha = campoSenha.value;
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
