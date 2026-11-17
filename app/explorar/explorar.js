import { auth, db } from "../../js/firebase-config.js";
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
let cardSelecionadoParaImportar = null;

// 1. Verifica usuário logado e carrega as bibliotecas dele no Modal
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html"; // Ajuste se necessário
    return;
  }
  usuarioAtual = user;
  await carregarBibliotecasNoSelect();
  buscarQuestoesAPI(); // Já faz a busca inicial ao abrir a tela
});

// 2. Carrega as bibliotecas reais do usuário no <select> do Modal
async function carregarBibliotecasNoSelect() {
  const select = document.getElementById("selectBibliotecaDestino");
  if (!select) return;

  try {
    const q = query(
      collection(db, "bibliotecas"),
      where("usuario_id", "==", usuarioAtual.uid),
    );
    const snap = await getDocs(q);
    select.innerHTML = "";

    if (snap.empty) {
      const opt = document.createElement("option");
      opt.value = "CRIAR_GERAL";
      opt.textContent = "Geral (Será criada automaticamente)";
      select.appendChild(opt);
    } else {
      snap.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.data().nome; // textContent evita injeção de HTML
        select.appendChild(opt);
      });
    }
  } catch (erro) {
    console.error("Erro ao carregar bibliotecas:", erro);
  }
}

// 3. Busca Real na Open Trivia DB via fetch (sem chave de API)
window.buscarQuestoesAPI = async function (e) {
  if (e) e.preventDefault();

  const selectCategoria = document.getElementById("filtroTecnologia");
  const categoria = selectCategoria.value;
  const nomeCategoria = selectCategoria.selectedOptions[0].text;
  const dificuldade = document.getElementById("filtroDificuldade").value;
  const spinner = document.getElementById("apiLoadingSpinner");
  const grid = document.getElementById("gridResultadosAPI");

  grid.classList.add("d-none");
  spinner.classList.remove("d-none");

  // encode=url3986 evita entidades HTML (&quot; etc.) nos textos retornados
  const params = new URLSearchParams({
    amount: "6",
    category: categoria,
    difficulty: dificuldade.toLowerCase(),
    type: "multiple",
    encode: "url3986",
  });
  const url = `https://opentdb.com/api.php?${params}`;

  try {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`Erro na Open Trivia DB (Status ${resposta.status}).`);
    }

    const { response_code, results } = await resposta.json();

    if (response_code === 5) {
      throw new Error(
        "Muitas requisições. Aguarde 5 segundos e tente novamente.",
      );
    }
    if (response_code !== 0 || !results.length) {
      throw new Error("Nenhuma questão encontrada para esse filtro.");
    }

    // Transforma o JSON da Open Trivia DB no formato limpo que o seu card já usa
    questoesAtuaisAPI = results.map((q) => ({
      pergunta: decodeURIComponent(q.question),
      resposta: decodeURIComponent(q.correct_answer),
      tag: nomeCategoria,
      dif: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1),
    }));

    renderizarCardsAPI(questoesAtuaisAPI);
  } catch (erro) {
    console.error("Erro no fetch:", erro);
    grid.innerHTML = `<div class="col-12"><div class="alert alert-danger">Falha ao buscar questões: ${erro.message}</div></div>`;
  } finally {
    spinner.classList.add("d-none");
    grid.classList.remove("d-none");
  }
};

// 4. Mantém exatamente a sua renderização visual
function renderizarCardsAPI(lista) {
  const grid = document.getElementById("gridResultadosAPI");
  grid.innerHTML = "";

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

// 5. Abre o Modal preenchido com o card real
window.abrirModalSalvarAPI = function (idx) {
  cardSelecionadoParaImportar = questoesAtuaisAPI[idx];
  document.getElementById("previewModalFrente").textContent =
    cardSelecionadoParaImportar.pergunta;
  document.getElementById("previewModalVerso").textContent =
    cardSelecionadoParaImportar.resposta;
  const modal = new bootstrap.Modal(
    document.getElementById("modalSalvarCardAPI"),
  );
  modal.show();
};

// 6. Grava o Flashcard real no Cloud Firestore
window.confirmarImportacaoCard = async function () {
  const select = document.getElementById("selectBibliotecaDestino");
  let bibliotecaId = select.value;
  const nomeBiblioteca = select.selectedOptions[0]?.text;

  if (!bibliotecaId || !cardSelecionadoParaImportar) {
    mostrarToast("Aguarde o carregamento das bibliotecas.", "danger");
    return;
  }

  try {
    // Evita salvar a mesma questão duas vezes na mesma biblioteca
    if (bibliotecaId !== "CRIAR_GERAL") {
      const existentes = await getDocs(
        query(
          collection(db, "flashcards"),
          where("usuario_id", "==", usuarioAtual.uid),
        ),
      );
      const duplicado = existentes.docs.some((d) => {
        const c = d.data();
        return c.biblioteca_id === bibliotecaId && c.frente === cardSelecionadoParaImportar.pergunta;
      });
      if (duplicado) {
        mostrarToast("Esse flashcard já existe nessa biblioteca.", "danger");
        return;
      }
    }

    // Se não existir nenhuma biblioteca, cria a "Geral"
    if (bibliotecaId === "CRIAR_GERAL") {
      const novaBib = await addDoc(collection(db, "bibliotecas"), {
        usuario_id: usuarioAtual.uid,
        nome: "Geral",
        descricao: "Biblioteca padrão",
        criado_em: new Date().toISOString(),
      });
      bibliotecaId = novaBib.id;
      await carregarBibliotecasNoSelect();
    }

    // Salva na coleção "flashcards"
    await addDoc(collection(db, "flashcards"), {
      biblioteca_id: bibliotecaId,
      usuario_id: usuarioAtual.uid,
      frente: cardSelecionadoParaImportar.pergunta,
      verso: cardSelecionadoParaImportar.resposta,
      dificuldade: cardSelecionadoParaImportar.dif.toLowerCase(),
      origem: "API",
      tag: cardSelecionadoParaImportar.tag,
      nivel_dominio: "bom",
      total_revisoes: 0,
      proxima_revisao: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    });

    bootstrap.Modal.getInstance(
      document.getElementById("modalSalvarCardAPI"),
    ).hide();

    mostrarToast(
      `Flashcard salvo na biblioteca "${escaparHTML(nomeBiblioteca)}" (origem: API)!`,
      "success",
    );
  } catch (erro) {
    console.error("Erro ao salvar no Firestore:", erro);
    mostrarToast("Erro ao salvar no banco de dados.", "danger");
  }
};

// Protege o HTML caso a pergunta tenha tags como <div> ou <script>
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
