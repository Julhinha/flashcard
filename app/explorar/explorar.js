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
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let usuarioAtual = null;
let questoesAtuaisAPI = []; // Guarda os resultados do fetch atual
let cardsParaImportar = []; // Um card (salvar individual) ou vários (adicionar todos)
let importacaoEmLote = false; // true = modal com checkboxes

// Dropdown de biblioteca de destino (com busca), usado no modal de importação
const dropdownBiblioteca = criarDropdownBusca(
  document.getElementById("dropdownBibliotecaDestino"),
  {
    placeholderBotao: "Carregando bibliotecas...",
    placeholderBusca: "Buscar biblioteca...",
    textoVazio: "Nenhuma biblioteca encontrada.",
  },
);

// Dropdowns de filtro (mesmo componente com busca das bibliotecas)
const dropdownCategoria = criarDropdownBusca(
  document.getElementById("dropdownCategoria"),
  {
    placeholderBusca: "Buscar categoria...",
    textoVazio: "Nenhuma categoria encontrada.",
  },
);
dropdownCategoria.setOpcoes([
  { valor: "", texto: "Todas as categorias" },
  { valor: "9", texto: "General Knowledge" },
  { valor: "10", texto: "Entertainment: Books" },
  { valor: "11", texto: "Entertainment: Film" },
  { valor: "12", texto: "Entertainment: Music" },
  { valor: "13", texto: "Entertainment: Musicals & Theatres" },
  { valor: "14", texto: "Entertainment: Television" },
  { valor: "15", texto: "Entertainment: Video Games" },
  { valor: "16", texto: "Entertainment: Board Games" },
  { valor: "17", texto: "Science & Nature" },
  { valor: "18", texto: "Science: Computers" },
  { valor: "19", texto: "Science: Mathematics" },
  { valor: "20", texto: "Mythology" },
  { valor: "21", texto: "Sports" },
  { valor: "22", texto: "Geography" },
  { valor: "23", texto: "History" },
  { valor: "24", texto: "Politics" },
  { valor: "25", texto: "Art" },
  { valor: "26", texto: "Celebrities" },
  { valor: "27", texto: "Animals" },
  { valor: "28", texto: "Vehicles" },
  { valor: "29", texto: "Entertainment: Comics" },
  { valor: "30", texto: "Science: Gadgets" },
  { valor: "31", texto: "Entertainment: Japanese Anime & Manga" },
  { valor: "32", texto: "Entertainment: Cartoon & Animations" },
]);

const dropdownDificuldade = criarDropdownBusca(
  document.getElementById("dropdownDificuldade"),
  {
    placeholderBusca: "Buscar dificuldade...",
    textoVazio: "Nenhuma dificuldade encontrada.",
  },
);
dropdownDificuldade.setOpcoes([
  { valor: "Easy", texto: "Easy (Fácil)" },
  { valor: "Medium", texto: "Medium (Médio)" },
  { valor: "Hard", texto: "Hard (Difícil)" },
]);

// 1. Verifica usuário logado e carrega as bibliotecas dele no Modal.
// A busca na API só acontece quando o usuário clica em "Buscar Questões".
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html"; // Ajuste se necessário
    return;
  }
  usuarioAtual = user;
  await carregarBibliotecasNoSelect();
});

// 2. Carrega as bibliotecas reais do usuário no dropdown do Modal
async function carregarBibliotecasNoSelect() {
  try {
    const q = query(
      collection(db, "bibliotecas"),
      where("usuario_id", "==", usuarioAtual.uid),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      dropdownBiblioteca.setOpcoes([
        { valor: "CRIAR_GERAL", texto: "Geral (Será criada automaticamente)" },
      ]);
    } else {
      dropdownBiblioteca.setOpcoes(
        snap.docs.map((d) => ({ valor: d.id, texto: d.data().nome })),
      );
    }
  } catch (erro) {
    console.error("Erro ao carregar bibliotecas:", erro);
  }
}

// A Open Trivia DB aceita 1 requisição a cada 5 segundos por IP (acima disso, response_code 5).
const INTERVALO_API_MS = 5000;
let buscandoAPI = false;
let timerEspera = null;

// Mantém o botão desabilitado durante a requisição e durante a espera de 5 segundos
function bloquearBotaoBusca(ate) {
  const btn = document.getElementById("btnBuscarAPI");
  clearInterval(timerEspera);

  const atualizar = () => {
    const restante = Math.ceil((ate - Date.now()) / 1000);
    if (restante <= 0) {
      clearInterval(timerEspera);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-search me-1"></i> Buscar Questões';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-hourglass-split me-1"></i> Aguarde ${restante}s`;
  };
  atualizar();
  timerEspera = setInterval(atualizar, 250);
}

// 3. Busca Real na Open Trivia DB via fetch (sem chave de API)
window.buscarQuestoesAPI = async function (e) {
  if (e) e.preventDefault();
  if (buscandoAPI) return; // nunca dispara duas requisições ao mesmo tempo
  buscandoAPI = true;

  const btn = document.getElementById("btnBuscarAPI");
  btn.disabled = true;
  btn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-1"></span> Buscando...';

  const categoria = dropdownCategoria.valor;
  const dificuldade = dropdownDificuldade.valor;
  const spinner = document.getElementById("apiLoadingSpinner");
  const grid = document.getElementById("gridResultadosAPI");

  grid.classList.add("d-none");
  spinner.classList.remove("d-none");

  // encode=url3986 evita entidades HTML (&quot; etc.) nos textos retornados
  const params = new URLSearchParams({
    amount: "6",
    difficulty: dificuldade.toLowerCase(),
    type: "multiple",
    encode: "url3986",
  });
  // Categoria vazia = todas as categorias (parâmetro omitido)
  if (categoria) params.set("category", categoria);
  const url = `https://opentdb.com/api.php?${params}`;

  try {
    const resposta = await fetch(url);
    const { response_code, results } = await resposta.json().catch(() => ({}));

    // 1. Trata o limite de 5 segundos (vem com HTTP 429 e response_code 5)
    if (resposta.status === 429 || response_code === 5) {
      throw new Error(
        "Muitas requisições. Aguarde 5 segundos e tente novamente.",
      );
    }

    // 2. Trata qualquer outro erro de servidor/HTTP
    if (!resposta.ok) {
      throw new Error(`Erro na Open Trivia DB (Status ${resposta.status}).`);
    }

    // 3. Trata os códigos lógicos da API (que vêm com HTTP 200 OK)
    if (response_code !== 0 || !results || !results.length) {
      throw new Error("Nenhuma questão encontrada para esse filtro.");
    }

    // Transforma o JSON da Open Trivia DB no formato limpo que o seu card já usa
    questoesAtuaisAPI = results.map((q) => ({
      pergunta: decodeURIComponent(q.question),
      resposta: decodeURIComponent(q.correct_answer),
      tag: decodeURIComponent(q.category),
      dif: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1),
    }));

    renderizarCardsAPI(questoesAtuaisAPI);
  } catch (erro) {
    console.error("Erro no fetch:", erro);
    grid.innerHTML = `<div class="col-12"><div class="alert alert-danger">Falha ao buscar questões: ${escaparHTML(erro.message)}</div></div>`;
  } finally {
    spinner.classList.add("d-none");
    grid.classList.remove("d-none");
    buscandoAPI = false;
    bloquearBotaoBusca(Date.now() + INTERVALO_API_MS);
  }
};

// 4. Mantém exatamente a sua renderização visual
function renderizarCardsAPI(lista) {
  const grid = document.getElementById("gridResultadosAPI");
  grid.innerHTML = "";

  const topo = document.createElement("div");
  topo.className = "col-12 d-flex justify-content-end";
  topo.innerHTML = `
    <button type="button" class="btn btn-outline-primary" onclick="abrirModalSalvarTodosAPI()">
      <i class="bi bi-collection me-1"></i> Adicionar todos na biblioteca
    </button>
  `;
  grid.appendChild(topo);

  lista.slice(0, 6).forEach((item, idx) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="flashcard-perspective explore-card-box">
        <div class="flashcard-inner position-relative w-100 h-100" id="apiCard_${idx}" onclick="this.classList.toggle('is-flipped')">
          <!-- Frente -->
          <div class="flashcard-face position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between rounded-4 p-4">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-primary-subtle text-primary-emphasis">${escaparHTML(item.tag)}</span>
              <span class="badge bg-light text-muted border">${escaparHTML(item.dif)}</span>
            </div>
            <div class="my-auto">
              <p class="fw-bold text-dark mb-0">${escaparHTML(item.pergunta)}</p>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
              <span class="small text-muted"><i class="bi bi-arrow-repeat me-1"></i>Clique para virar</span>
              <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); abrirModalSalvarAPI(${idx})">
                <i class="bi bi-plus-lg"></i> Salvar na Biblioteca
              </button>
            </div>
          </div>
          <!-- Verso -->
          <div class="flashcard-face flashcard-back position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between rounded-4 p-4">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-primary-subtle text-primary-emphasis">Resposta Oficial</span>
              <span class="small text-muted">Open Trivia DB</span>
            </div>
            <div class="my-auto">
              <p class="small fw-semibold text-dark mb-0">${escaparHTML(item.resposta)}</p>
            </div>
            <div class="d-grid">
              <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); abrirModalSalvarAPI(${idx})">
                <i class="bi bi-bookmark-plus me-1"></i> Salvar na Biblioteca
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
}

// 5. Abre o Modal preenchido com um card (salvar individual) ou com todos os
// resultados (lote, com um checkbox por card, todos marcados por padrão)
function cardsSelecionados() {
  if (!importacaoEmLote) return cardsParaImportar;
  const marcados = document.querySelectorAll(
    "#previewModalCards input[type=checkbox]:checked",
  );
  return Array.from(marcados).map((cb) => cardsParaImportar[Number(cb.dataset.idx)]);
}

function atualizarBotaoConfirmar() {
  const btn = document.getElementById("btnConfirmarImportacao");
  if (!importacaoEmLote) {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-check me-1"></i> Confirmar e Salvar';
    return;
  }
  const total = cardsSelecionados().length;
  btn.disabled = total === 0;
  btn.innerHTML = `<i class="bi bi-cloud-check me-1"></i> Salvar ${total} ${total === 1 ? "card selecionado" : "cards selecionados"}`;
}

document
  .getElementById("previewModalCards")
  .addEventListener("change", atualizarBotaoConfirmar);

function abrirModalImportacao(cards, lote) {
  cardsParaImportar = cards;
  importacaoEmLote = lote;
  const preview = document.getElementById("previewModalCards");
  preview.innerHTML = cards
    .map((c, i) =>
      lote
        ? `
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" id="chkImportar_${i}" data-idx="${i}" checked />
        <label class="form-check-label w-100" for="chkImportar_${i}">
          <div class="fw-bold text-dark">${escaparHTML(c.pergunta)}</div>
          <div class="text-muted">${escaparHTML(c.resposta)}</div>
        </label>
      </div>`
        : `
      <div class="mb-2">
        <div class="fw-bold text-dark">${escaparHTML(c.pergunta)}</div>
        <div class="text-muted">${escaparHTML(c.resposta)}</div>
      </div>`,
    )
    .join("");
  document.getElementById("tituloModalSalvar").textContent = lote
    ? "Adicionar todos na Biblioteca"
    : "Salvar na Biblioteca";
  atualizarBotaoConfirmar();
  new bootstrap.Modal(document.getElementById("modalSalvarCardAPI")).show();
}

window.abrirModalSalvarAPI = function (idx) {
  abrirModalImportacao([questoesAtuaisAPI[idx]], false);
};

window.abrirModalSalvarTodosAPI = function () {
  abrirModalImportacao(questoesAtuaisAPI.slice(0, 6), true);
};

// 6. Grava o(s) Flashcard(s) no Cloud Firestore (um documento por flashcard)
window.confirmarImportacaoCard = async function () {
  let bibliotecaId = dropdownBiblioteca.valor;
  let nomeBiblioteca = dropdownBiblioteca.texto;

  const selecionados = cardsSelecionados();
  if (!bibliotecaId || !selecionados.length) {
    mostrarToast("Aguarde o carregamento das bibliotecas.", "danger");
    return;
  }

  try {
    // Ignora perguntas que já existem na biblioteca (e repetidas dentro do próprio lote)
    let cards = selecionados;
    if (bibliotecaId !== "CRIAR_GERAL") {
      const existentes = await getDocs(
        query(
          collection(db, "flashcards"),
          where("usuario_id", "==", usuarioAtual.uid),
          where("biblioteca_id", "==", bibliotecaId),
        ),
      );
      const frentesVistas = new Set(
        existentes.docs.map((d) => normalizarTexto(d.data().frente)),
      );
      cards = selecionados.filter((c) => {
        const chave = normalizarTexto(c.pergunta);
        if (frentesVistas.has(chave)) return false;
        frentesVistas.add(chave);
        return true;
      });
      if (!cards.length) {
        mostrarToast(
          importacaoEmLote
            ? `Todos os cards selecionados já existem na biblioteca "${escaparHTML(nomeBiblioteca)}" (${selecionados.length} duplicados ignorados).`
            : `Essa pergunta já existe na biblioteca "${escaparHTML(nomeBiblioteca)}".`,
          "danger",
        );
        return;
      }
    }

    // Se não existir nenhuma biblioteca, cria a "Geral"
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
      await carregarBibliotecasNoSelect();
    }

    // Salva cada flashcard como um documento separado na coleção "flashcards"
    await Promise.all(
      cards.map((card) =>
        addDoc(collection(db, "flashcards"), {
          biblioteca_id: bibliotecaId,
          usuario_id: usuarioAtual.uid,
          usuario_email: usuarioAtual.email,
          frente: card.pergunta,
          verso: card.resposta,
          dificuldade: card.dif.toLowerCase(),
          origem: "API",
          tag: card.tag,
          nivel_dominio: "dificil", // todo card novo começa como difícil
          total_revisoes: 0,
          proxima_revisao: new Date().toISOString(),
          criado_em: new Date().toISOString(),
        }),
      ),
    );

    bootstrap.Modal.getInstance(
      document.getElementById("modalSalvarCardAPI"),
    ).hide();

    const ignorados = selecionados.length - cards.length;
    const resumo = importacaoEmLote
      ? `${cards.length} ${cards.length === 1 ? "card adicionado" : "cards adicionados"}` +
        (ignorados
          ? ` (${ignorados} ${ignorados === 1 ? "duplicado ignorado" : "duplicados ignorados"})`
          : "")
      : "Flashcard salvo";
    mostrarToast(
      `${resumo} na biblioteca "${escaparHTML(nomeBiblioteca)}"!`,
      "success",
    );
  } catch (erro) {
    console.error("Erro ao salvar no Firestore:", erro);
    mostrarToast("Erro ao salvar no banco de dados.", "danger");
  }
};
