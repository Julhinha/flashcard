// CRUD de Bibliotecas e Flashcards no Cloud Firestore
import { auth, db } from "../../js/firebase-config.js";
import { escaparHTML, normalizarTexto } from "../../js/utils.js";
import { criarDropdownBusca } from "../../js/dropdown-busca.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let usuarioAtual = null;
let bibliotecas = []; // { id, nome, descricao, cards: [...] }
let bibliotecaAtivaId = null;

const CARDS_POR_PAGINA = 10;
let paginaAtual = 1; // página da lista de flashcards da biblioteca ativa

// Dropdown de biblioteca (com busca) do modal de novo flashcard
const dropdownBibliotecaCard = criarDropdownBusca(
  document.getElementById("dropdownCardBiblioteca"),
  {
    placeholderBusca: "Buscar biblioteca...",
    textoVazio: "Nenhuma biblioteca encontrada.",
  },
);

const ROTULO_NIVEL = { facil: "Fácil", bom: "Bom", dificil: "Difícil" };
const COR_NIVEL = {
  facil: "bg-primary-subtle text-primary-emphasis",
  bom: "bg-info-subtle text-info",
  dificil: "bg-danger-subtle text-danger",
};

// Modal de confirmação (substitui o confirm() do navegador). Resolve true ao confirmar.
function confirmarExclusao(titulo, texto) {
  return new Promise((resolve) => {
    const el = document.getElementById("modalConfirmarExclusao");
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    const btnConfirmar = document.getElementById("btnConfirmarExclusao");
    let confirmado = false;

    document.getElementById("confirmarExclusaoTitulo").textContent = titulo;
    document.getElementById("confirmarExclusaoTexto").textContent = texto;

    btnConfirmar.onclick = () => {
      confirmado = true;
      modal.hide();
    };
    el.addEventListener("hidden.bs.modal", () => resolve(confirmado), {
      once: true,
    });
    modal.show();
  });
}

function bibliotecaAtiva() {
  return bibliotecas.find((b) => b.id === bibliotecaAtivaId);
}

// ---------------------------------------------------------------
// Leitura (Read)
// ---------------------------------------------------------------
async function carregarDados() {
  const filtro = where("usuario_id", "==", usuarioAtual.uid);
  const [snapLibs, snapCards] = await Promise.all([
    getDocs(query(collection(db, "bibliotecas"), filtro)),
    getDocs(query(collection(db, "flashcards"), filtro)),
  ]);

  const porCriacao = (a, b) =>
    (a.criado_em || "").localeCompare(b.criado_em || "");

  bibliotecas = snapLibs.docs
    .map((d) => ({ id: d.id, ...d.data(), cards: [] }))
    .sort(porCriacao);

  snapCards.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(porCriacao)
    .forEach((card) => {
      const lib = bibliotecas.find((b) => b.id === card.biblioteca_id);
      if (lib) lib.cards.push(card);
    });

  if (!bibliotecaAtiva()) {
    bibliotecaAtivaId = bibliotecas.length ? bibliotecas[0].id : null;
    paginaAtual = 1;
  }
  renderizarBibliotecas();
  renderizarCards();
}

async function recarregar() {
  try {
    await carregarDados();
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
    mostrarToast("Erro ao carregar dados do Firestore.", "danger");
  }
}

// ---------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------
function renderizarBibliotecas() {
  const listaEl = document.getElementById("listaBibliotecas");
  document.getElementById("contadorBibliotecas").textContent =
    bibliotecas.length;
  listaEl.innerHTML = "";

  if (!bibliotecas.length) {
    listaEl.innerHTML = `<div class="text-center py-4 text-muted small">Você ainda não tem bibliotecas. Clique em <button type="button" class="btn btn-link p-0 align-baseline small fw-bold text-decoration-none" data-bs-toggle="modal" data-bs-target="#modalBiblioteca" onclick="abrirModalNovaBiblioteca()">Nova Biblioteca</button> para começar.</div>`;
    return;
  }

  bibliotecas.forEach((lib) => {
    const item = document.createElement("div");
    item.className = `deck-item p-3 ${lib.id === bibliotecaAtivaId ? "active" : ""}`;
    item.onclick = () => {
      bibliotecaAtivaId = lib.id;
      paginaAtual = 1;
      renderizarBibliotecas();
      renderizarCards();
    };
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold text-dark">${escaparHTML(lib.nome)}</span>
        <span class="badge bg-white text-dark border">${lib.cards.length}</span>
      </div>
      <div class="small text-muted text-truncate">${escaparHTML(lib.descricao)}</div>
    `;
    listaEl.appendChild(item);
  });
}

// Números de página a exibir: primeira, última e vizinhas da atual (null = reticências)
function numerosPagina(atual, total) {
  const nums = [...new Set([1, total, atual - 1, atual, atual + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const saida = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) saida.push(null);
    saida.push(n);
  });
  return saida;
}

function renderizarPaginacao(totalCards, totalPaginas) {
  const nav = document.getElementById("paginacaoCards");
  if (totalPaginas <= 1) {
    nav.innerHTML = "";
    return;
  }
  const inicio = (paginaAtual - 1) * CARDS_POR_PAGINA + 1;
  const fim = Math.min(paginaAtual * CARDS_POR_PAGINA, totalCards);

  const item = (rotulo, pagina, { ativo = false, desabilitado = false, aria = "" } = {}) =>
    `<li class="page-item ${ativo ? "active" : ""} ${desabilitado ? "disabled" : ""}">
      <button type="button" class="page-link" ${aria ? `aria-label="${aria}"` : ""} onclick="irParaPagina(${pagina})" ${desabilitado ? "disabled" : ""}>${rotulo}</button>
    </li>`;

  const itens = numerosPagina(paginaAtual, totalPaginas)
    .map((n) =>
      n === null
        ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
        : item(n, n, { ativo: n === paginaAtual }),
    )
    .join("");

  nav.innerHTML = `
    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
      <span class="small text-muted">Mostrando ${inicio}–${fim} de ${totalCards} flashcards</span>
      <ul class="pagination pagination-sm mb-0 flex-wrap justify-content-center">
        ${item("&laquo;", paginaAtual - 1, { desabilitado: paginaAtual === 1, aria: "Página anterior" })}
        ${itens}
        ${item("&raquo;", paginaAtual + 1, { desabilitado: paginaAtual === totalPaginas, aria: "Próxima página" })}
      </ul>
    </div>`;
}

window.irParaPagina = function (pagina) {
  paginaAtual = pagina;
  renderizarCards();
  document
    .getElementById("tituloBibliotecaAtual")
    .scrollIntoView({ behavior: "smooth", block: "start" });
};

function renderizarCards() {
  const lib = bibliotecaAtiva();
  const container = document.getElementById("listaCardsBiblioteca");
  const botoesBiblioteca = document.querySelectorAll(".acao-biblioteca");
  container.innerHTML = "";
  document.getElementById("paginacaoCards").innerHTML = "";

  if (!lib) {
    document.getElementById("tituloBibliotecaAtual").textContent =
      "Nenhuma biblioteca selecionada";
    document.getElementById("descBibliotecaAtual").textContent =
      "Crie uma biblioteca para organizar seus flashcards.";
    botoesBiblioteca.forEach((el) => el.classList.add("d-none"));
    return;
  }

  botoesBiblioteca.forEach((el) => el.classList.remove("d-none"));
  document.getElementById("btnRevisarBaralho").href =
    `../revisao/revisao.html?biblioteca=${encodeURIComponent(lib.id)}`;
  document.getElementById("tituloBibliotecaAtual").textContent = lib.nome;
  document.getElementById("descBibliotecaAtual").textContent =
    lib.descricao || "Sem descrição";

  if (!lib.cards.length) {
    container.innerHTML = `<div class="text-center py-5 text-muted small">Nenhum flashcard nesta biblioteca ainda. Clique em <button type="button" class="btn btn-link p-0 align-baseline small fw-bold text-decoration-none" data-bs-toggle="modal" data-bs-target="#modalFlashcard" onclick="abrirModalNovoCard()">+ Novo Flashcard</button> para começar ou vá em <a href="../explorar/explorar.html" class="fw-semibold text-decoration-none">Explorar API</a> para adicionar flashcards.</div>`;
    return;
  }

  // Mantém a página válida (ex.: após excluir o último card da última página)
  const totalPaginas = Math.ceil(lib.cards.length / CARDS_POR_PAGINA);
  paginaAtual = Math.min(Math.max(paginaAtual, 1), totalPaginas);
  const inicio = (paginaAtual - 1) * CARDS_POR_PAGINA;

  lib.cards.slice(inicio, inicio + CARDS_POR_PAGINA).forEach((card) => {
    const nivel = card.nivel_dominio || "bom";
    const el = document.createElement("div");
    el.className = "p-3 rounded-3 border bg-light-subtle";
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div class="d-flex gap-2">
          <span class="badge ${COR_NIVEL[nivel] || COR_NIVEL.bom}">${ROTULO_NIVEL[nivel] || "Bom"}</span>
          <span class="badge bg-white text-muted border">${escaparHTML(card.origem || "Manual")}</span>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" onclick="abrirModalEditarCard('${card.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger" onclick="excluirCard('${card.id}')" title="Excluir"><i class="bi bi-trash"></i></button>
        </div>
      </div>
      <div class="fw-bold text-dark mb-1">${escaparHTML(card.frente)}</div>
      <div class="small text-muted">${escaparHTML(card.verso)}</div>
    `;
    container.appendChild(el);
  });

  renderizarPaginacao(lib.cards.length, totalPaginas);
}

// ---------------------------------------------------------------
// Bibliotecas: Create / Update / Delete
// ---------------------------------------------------------------
window.abrirModalNovaBiblioteca = function () {
  document.getElementById("modalBibliotecaTitulo").textContent =
    "Nova Biblioteca";
  document.getElementById("editBibliotecaId").value = "";
  document.getElementById("inputBibliotecaNome").value = "";
  document.getElementById("inputBibliotecaDesc").value = "";
};

window.editarBibliotecaAtual = function () {
  const lib = bibliotecaAtiva();
  if (!lib) return;
  document.getElementById("modalBibliotecaTitulo").textContent =
    "Editar Biblioteca";
  document.getElementById("editBibliotecaId").value = lib.id;
  document.getElementById("inputBibliotecaNome").value = lib.nome;
  document.getElementById("inputBibliotecaDesc").value = lib.descricao || "";
  new bootstrap.Modal(document.getElementById("modalBiblioteca")).show();
};

window.salvarBiblioteca = async function (e) {
  e.preventDefault();
  const id = document.getElementById("editBibliotecaId").value;
  const nome = document.getElementById("inputBibliotecaNome").value.trim();
  const descricao = document.getElementById("inputBibliotecaDesc").value.trim();

  const duplicada = bibliotecas.some(
    (b) => b.id !== id && b.nome.toLowerCase() === nome.toLowerCase(),
  );
  if (duplicada) {
    mostrarToast("Já existe uma biblioteca com esse nome.", "danger");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "bibliotecas", id), { nome, descricao });
      mostrarToast("Biblioteca atualizada com sucesso!");
    } else {
      const ref = await addDoc(collection(db, "bibliotecas"), {
        usuario_id: usuarioAtual.uid,
        usuario_email: usuarioAtual.email,
        nome,
        descricao,
        criado_em: new Date().toISOString(),
      });
      bibliotecaAtivaId = ref.id;
      paginaAtual = 1;
      mostrarToast("Nova biblioteca criada!");
    }
    bootstrap.Modal.getInstance(
      document.getElementById("modalBiblioteca"),
    ).hide();
    await recarregar();
  } catch (erro) {
    console.error("Erro ao salvar biblioteca:", erro);
    mostrarToast("Erro ao salvar biblioteca.", "danger");
  }
};

window.excluirBibliotecaAtual = async function () {
  const lib = bibliotecaAtiva();
  if (!lib) return;
  const aviso = lib.cards.length
    ? `Excluir "${lib.nome}" e seus ${lib.cards.length} flashcard(s)? Esta ação não pode ser desfeita.`
    : `Excluir a biblioteca "${lib.nome}"?`;
  if (!(await confirmarExclusao("Excluir biblioteca", aviso))) return;

  try {
    // Remove a biblioteca e todos os seus flashcards de uma só vez
    const batch = writeBatch(db);
    lib.cards.forEach((c) => batch.delete(doc(db, "flashcards", c.id)));
    batch.delete(doc(db, "bibliotecas", lib.id));
    await batch.commit();

    bibliotecaAtivaId = null;
    paginaAtual = 1;
    mostrarToast("Biblioteca excluída com sucesso.");
    await recarregar();
  } catch (erro) {
    console.error("Erro ao excluir biblioteca:", erro);
    mostrarToast("Erro ao excluir biblioteca.", "danger");
  }
};

// ---------------------------------------------------------------
// Flashcards: Create / Update / Delete
// ---------------------------------------------------------------
window.abrirModalNovoCard = function () {
  document.getElementById("modalFlashcardTitulo").textContent =
    "Novo Flashcard Manual";
  document.getElementById("editCardId").value = "";
  document.getElementById("inputCardFrente").value = "";
  document.getElementById("inputCardVerso").value = "";

  // Seletor de biblioteca: a ativa vem selecionada; sem bibliotecas, cai na "Geral"
  if (!bibliotecas.length) {
    dropdownBibliotecaCard.setOpcoes([
      { valor: "CRIAR_GERAL", texto: "Geral (Será criada automaticamente)" },
    ]);
  } else {
    dropdownBibliotecaCard.setOpcoes(
      bibliotecas.map((b) => ({ valor: b.id, texto: b.nome })),
      bibliotecaAtivaId,
    );
  }
  document.getElementById("grupoCardBiblioteca").classList.remove("d-none");
};

window.abrirModalEditarCard = function (cardId) {
  const card = bibliotecaAtiva()?.cards.find((c) => c.id === cardId);
  if (!card) return;
  document.getElementById("modalFlashcardTitulo").textContent =
    "Editar Flashcard";
  document.getElementById("editCardId").value = card.id;
  document.getElementById("inputCardFrente").value = card.frente;
  document.getElementById("inputCardVerso").value = card.verso;
  // Na edição o card permanece na biblioteca atual
  document.getElementById("grupoCardBiblioteca").classList.add("d-none");
  new bootstrap.Modal(document.getElementById("modalFlashcard")).show();
};

window.salvarFlashcard = async function (e) {
  e.preventDefault();

  const cardId = document.getElementById("editCardId").value;
  const frente = document.getElementById("inputCardFrente").value.trim();
  const verso = document.getElementById("inputCardVerso").value.trim();

  // Edição: biblioteca atual. Criação: a escolhida no seletor (ou "Geral" se não houver nenhuma)
  let bibliotecaId = cardId ? bibliotecaAtivaId : dropdownBibliotecaCard.valor;
  let nomeBiblioteca = cardId
    ? bibliotecaAtiva()?.nome
    : dropdownBibliotecaCard.texto;
  if (!bibliotecaId) {
    mostrarToast("Selecione uma biblioteca.", "danger");
    return;
  }

  try {
    // Bloqueia pergunta repetida na mesma biblioteca (do usuário logado),
    // ignorando o próprio card quando for edição
    if (bibliotecaId !== "CRIAR_GERAL") {
      const existentes = await getDocs(
        query(
          collection(db, "flashcards"),
          where("usuario_id", "==", usuarioAtual.uid),
          where("biblioteca_id", "==", bibliotecaId),
        ),
      );
      const frenteNormalizada = normalizarTexto(frente);
      const duplicado = existentes.docs.some(
        (d) =>
          d.id !== cardId &&
          normalizarTexto(d.data().frente) === frenteNormalizada,
      );
      if (duplicado) {
        mostrarToast(
          `Essa pergunta já existe na biblioteca "${escaparHTML(nomeBiblioteca)}".`,
          "danger",
        );
        return;
      }
    }

    // Sem nenhuma biblioteca, cria a "Geral" automaticamente
    if (bibliotecaId === "CRIAR_GERAL") {
      const novaBib = await addDoc(collection(db, "bibliotecas"), {
        usuario_id: usuarioAtual.uid,
        usuario_email: usuarioAtual.email,
        nome: "Geral",
        descricao: "Biblioteca padrão",
        criado_em: new Date().toISOString(),
      });
      bibliotecaId = novaBib.id;
      nomeBiblioteca = "Geral";
    }

    if (cardId) {
      // Não mexe em nivel_dominio: ele é definido pela revisão
      await updateDoc(doc(db, "flashcards", cardId), {
        frente,
        verso,
      });
      mostrarToast("Flashcard atualizado!");
    } else {
      const agora = new Date().toISOString();
      await addDoc(collection(db, "flashcards"), {
        biblioteca_id: bibliotecaId,
        usuario_id: usuarioAtual.uid,
        usuario_email: usuarioAtual.email,
        frente,
        verso,
        dificuldade: "hard", // todo card novo começa como difícil
        origem: "Manual",
        nivel_dominio: "dificil", // todo card novo começa como difícil
        total_revisoes: 0,
        proxima_revisao: agora,
        criado_em: agora,
      });
      bibliotecaAtivaId = bibliotecaId; // mostra a biblioteca onde o card foi salvo
      paginaAtual = Number.MAX_SAFE_INTEGER; // vai para a última página, onde o card novo aparece
      mostrarToast(
        `Flashcard criado na biblioteca "${escaparHTML(nomeBiblioteca)}"!`,
      );
    }
    bootstrap.Modal.getInstance(
      document.getElementById("modalFlashcard"),
    ).hide();
    await recarregar();
  } catch (erro) {
    console.error("Erro ao salvar flashcard:", erro);
    mostrarToast("Erro ao salvar flashcard.", "danger");
  }
};

window.excluirCard = async function (cardId) {
  if (
    !(await confirmarExclusao(
      "Excluir flashcard",
      "Excluir este flashcard? Esta ação não pode ser desfeita.",
    ))
  )
    return;
  try {
    await deleteDoc(doc(db, "flashcards", cardId));
    mostrarToast("Flashcard removido.");
    await recarregar();
  } catch (erro) {
    console.error("Erro ao excluir flashcard:", erro);
    mostrarToast("Erro ao excluir flashcard.", "danger");
  }
};

// ---------------------------------------------------------------
// Início: aguarda a sessão do Firebase e carrega os dados do usuário
// ---------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) return; // o auth-guard.js redireciona para o login
  usuarioAtual = user;
  recarregar();
});
