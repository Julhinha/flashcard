// Sessão de Revisão Espaçada (RN04: Difícil +10m, Bom +3d, Fácil +7d) com Cloud Firestore
import { auth, db } from "../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const MINUTO = 60 * 1000;
const INTERVALO_MS = {
  dificil: 10 * MINUTO,
  bom: 3 * 24 * 60 * MINUTO,
  facil: 7 * 24 * 60 * MINUTO,
};

const bibliotecaParam = new URLSearchParams(location.search).get("biblioteca");

let nomesBibliotecas = {}; // id -> nome
let todosCards = []; // todos os cards do usuário
let vencidos = []; // todos os cards com revisão vencida
let modoBaralho = false; // true: revisa o baralho inteiro (aberto pela biblioteca)
let filaRevisao = []; // fila atual (após filtro por biblioteca)
let indiceAtual = 0;
let cardVirado = false;
let avaliando = false;

function mostrarConcluida(titulo, texto) {
  document.getElementById("arenaAtiva").classList.add("d-none");
  document.getElementById("arenaConcluida").classList.remove("d-none");
  document.getElementById("tituloConcluida").textContent = titulo;
  document.getElementById("textoConcluida").textContent = texto;
}

function carregarCardAtual() {
  if (indiceAtual >= filaRevisao.length) {
    const vazio = filaRevisao.length === 0;
    mostrarConcluida(
      vazio
        ? modoBaralho
          ? "Baralho vazio"
          : "Nenhum flashcard pendente"
        : modoBaralho
          ? "Parabéns! Baralho Revisado"
          : "Parabéns! Fila de Revisão Concluída",
      vazio
        ? modoBaralho
          ? "Este baralho ainda não tem flashcards. Crie novos flashcards na biblioteca."
          : "Você não tem cards vencidos para revisar agora. Crie novos flashcards ou volte mais tarde."
        : "Todos os flashcards foram reagendados no Firestore de acordo com seu desempenho.",
    );
    document.getElementById("barraProgressoRevisao").style.width = "100%";
    document.getElementById("contadorProgressoTexto").textContent = vazio
      ? modoBaralho
        ? "Baralho vazio"
        : "Sem pendências"
      : "Concluído!";
    return;
  }

  document.getElementById("arenaAtiva").classList.remove("d-none");
  document.getElementById("arenaConcluida").classList.add("d-none");

  const card = filaRevisao[indiceAtual];
  cardVirado = false;
  document.getElementById("cardRevisaoInner").classList.remove("is-flipped");

  document.getElementById("cardTagBiblioteca").textContent =
    nomesBibliotecas[card.biblioteca_id] || "Sem biblioteca";
  document.getElementById("cardTagOrigem").textContent = card.origem || "Manual";
  document.getElementById("cardTextoFrente").textContent = card.frente;
  document.getElementById("cardTextoVerso").textContent = card.verso;
  document.getElementById("cardRevisoesCount").textContent = `Revisado ${card.total_revisoes || 0}x`;

  document.getElementById("areaBotaoMostrar").classList.remove("d-none");
  document.getElementById("areaBotoesAvaliacao").classList.add("d-none");

  const total = filaRevisao.length;
  document.getElementById("contadorProgressoTexto").textContent = `Card ${indiceAtual + 1} de ${total}`;
  document.getElementById("barraProgressoRevisao").style.width = `${(indiceAtual / total) * 100}%`;
}

window.virarCardRevisao = function () {
  if (cardVirado || indiceAtual >= filaRevisao.length) return;
  cardVirado = true;
  document.getElementById("cardRevisaoInner").classList.add("is-flipped");
  document.getElementById("areaBotaoMostrar").classList.add("d-none");
  document.getElementById("areaBotoesAvaliacao").classList.remove("d-none");
};

window.avaliarCard = async function (nivel) {
  if (avaliando || !cardVirado) return;
  avaliando = true;

  const card = filaRevisao[indiceAtual];
  const agora = Date.now();
  const mensagens = {
    dificil: "Reagendado para +10 minutos (Difícil).",
    bom: "Reagendado para +3 dias (Bom).",
    facil: "Reagendado para +7 dias (Fácil).",
  };

  try {
    await updateDoc(doc(db, "flashcards", card.id), {
      nivel_dominio: nivel,
      total_revisoes: increment(1),
      ultima_revisao: new Date(agora).toISOString(),
      proxima_revisao: new Date(agora + INTERVALO_MS[nivel]).toISOString(),
    });
    mostrarToast(mensagens[nivel], nivel === "dificil" ? "danger" : "success");
    indiceAtual++;
    setTimeout(carregarCardAtual, 220);
  } catch (erro) {
    console.error("Erro ao salvar avaliação:", erro);
    mostrarToast("Erro ao salvar a avaliação. Tente novamente.", "danger");
  } finally {
    avaliando = false;
  }
};

function filaDoFiltro(filtro) {
  if (modoBaralho) {
    return todosCards
      .filter((c) => c.biblioteca_id === bibliotecaParam)
      .sort((a, b) => (a.criado_em || "").localeCompare(b.criado_em || ""));
  }
  return filtro === "todos" ? vencidos : vencidos.filter((c) => c.biblioteca_id === filtro);
}

window.filtrarFilaRevisao = function () {
  const filtro = document.getElementById("filtroBaralhoRevisao").value;
  filaRevisao = filaDoFiltro(filtro);
  indiceAtual = 0;
  carregarCardAtual();
};

function preencherFiltro() {
  const select = document.getElementById("filtroBaralhoRevisao");
  if (modoBaralho) {
    select.innerHTML = `<option value="${bibliotecaParam}"></option>`;
    select.options[0].textContent = nomesBibliotecas[bibliotecaParam];
    select.disabled = true;
    return;
  }
  select.innerHTML = `<option value="todos">Todos os Baralhos Vencidos</option>`;
  const comPendencia = [...new Set(vencidos.map((c) => c.biblioteca_id))];
  comPendencia.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = nomesBibliotecas[id] || "Sem biblioteca";
    select.appendChild(opt);
  });
}

async function carregarFila(uid) {
  const filtro = where("usuario_id", "==", uid);
  const [snapLibs, snapCards] = await Promise.all([
    getDocs(query(collection(db, "bibliotecas"), filtro)),
    getDocs(query(collection(db, "flashcards"), filtro)),
  ]);

  nomesBibliotecas = {};
  snapLibs.forEach((d) => (nomesBibliotecas[d.id] = d.data().nome));

  const agora = new Date().toISOString();
  modoBaralho = Boolean(bibliotecaParam && nomesBibliotecas[bibliotecaParam]);
  todosCards = snapCards.docs.map((d) => ({ id: d.id, ...d.data() }));
  vencidos = todosCards
    .filter((c) => (c.proxima_revisao || "") <= agora)
    .sort((a, b) => (a.proxima_revisao || "").localeCompare(b.proxima_revisao || ""));

  preencherFiltro();
  const select = document.getElementById("filtroBaralhoRevisao");
  filaRevisao = filaDoFiltro(select.value);
  indiceAtual = 0;
  carregarCardAtual();
}

// Atalhos de Teclado (Espaço = Virar | 1, 2, 3 = Avaliar)
document.addEventListener("keydown", (e) => {
  if (indiceAtual >= filaRevisao.length) return;
  if (e.code === "Space") {
    e.preventDefault();
    window.virarCardRevisao();
  } else if (cardVirado && e.key === "1") {
    window.avaliarCard("dificil");
  } else if (cardVirado && e.key === "2") {
    window.avaliarCard("bom");
  } else if (cardVirado && e.key === "3") {
    window.avaliarCard("facil");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return; // o auth-guard.js redireciona para o login
  try {
    await carregarFila(user.uid);
  } catch (erro) {
    console.error("Erro ao carregar a fila de revisão:", erro);
    mostrarToast("Erro ao carregar flashcards do Firestore.", "danger");
  } finally {
    document.getElementById("arenaCarregando").classList.add("d-none");
  }
});
