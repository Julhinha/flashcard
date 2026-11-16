// Simulação da QuizAPI.io v2 (com estrutura pronta para fetch real)
const mockQuestoesQuizAPI = {
  JavaScript: [
    { pergunta: "Qual método converte uma string JSON em um objeto JavaScript?", resposta: "JSON.parse()", tag: "JavaScript", dif: "Easy" },
    { pergunta: "Qual a diferença entre '==' e '===' em JavaScript?", resposta: "'===' compara valor e tipo (igualdade estrita), sem coerção de tipo.", tag: "JavaScript", dif: "Easy" },
    { pergunta: "O que é uma Closure em JavaScript?", resposta: "É a combinação de uma função com o ambiente léxico onde ela foi declarada.", tag: "JavaScript", dif: "Medium" },
    { pergunta: "Qual método de array cria um novo array com os elementos que passam em um teste?", resposta: "Array.prototype.filter()", tag: "JavaScript", dif: "Easy" },
    { pergunta: "Para que serve a palavra-chave 'await' em funções assíncronas?", resposta: "Pausa a execução da função async até que a Promise seja resolvida ou rejeitada.", tag: "JavaScript", dif: "Medium" },
    { pergunta: "O que o Event Loop faz no runtime do JavaScript?", resposta: "Monitora a Call Stack e a Callback Queue, empurrando callbacks quando a pilha está vazia.", tag: "JavaScript", dif: "Hard" }
  ],
  Linux: [
    { pergunta: "Qual comando exibe os processos em execução em tempo real no Linux?", resposta: "top (ou htop)", tag: "Linux", dif: "Easy" },
    { pergunta: "O que faz o comando 'chmod 755 arquivo.sh'?", resposta: "Dá permissão total (rwx) ao dono e leitura/execução (r-x) ao grupo e outros.", tag: "Linux", dif: "Medium" },
    { pergunta: "Qual arquivo armazena informações das contas de usuários locais no Linux?", resposta: "/etc/passwd", tag: "Linux", dif: "Easy" }
  ],
  Docker: [
    { pergunta: "Qual comando lista todos os contêineres Docker (incluindo os parados)?", resposta: "docker ps -a", tag: "Docker", dif: "Easy" },
    { pergunta: "Qual a diferença entre uma Imagem e um Contêiner Docker?", resposta: "A imagem é o template imutável; o contêiner é a instância em execução dessa imagem.", tag: "Docker", dif: "Easy" }
  ],
  SQL: [
    { pergunta: "Qual cláusula SQL é usada para filtrar resultados após um agrupamento (GROUP BY)?", resposta: "HAVING", tag: "SQL", dif: "Medium" },
    { pergunta: "O que garante a propriedade ACID de Atomicidade?", resposta: "Ou todas as operações da transação são concluídas com sucesso, ou nenhuma é aplicada.", tag: "SQL", dif: "Medium" }
  ],
  DevOps: [
    { pergunta: "O que significa CI/CD em engenharia de software?", resposta: "Continuous Integration (Integração Contínua) e Continuous Delivery/Deployment.", tag: "DevOps", dif: "Easy" }
  ]
};

let cardSelecionadoParaImportar = null;

function renderizarCardsAPI(lista) {
  const grid = document.getElementById('gridResultadosAPI');
  grid.innerHTML = '';

  lista.slice(0, 6).forEach((item, idx) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    col.innerHTML = `
      <div class="flashcard-perspective explore-card-box">
        <div class="flashcard-inner position-relative w-100 h-100" id="apiCard_${idx}" onclick="this.classList.toggle('is-flipped')">
          <!-- Frente -->
          <div class="flashcard-face position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between rounded-4 p-4">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-primary-subtle text-primary-emphasis">${item.tag}</span>
              <span class="badge bg-light text-muted border">${item.dif}</span>
            </div>
            <div class="my-auto">
              <p class="fw-bold text-dark mb-0">${item.pergunta}</p>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
              <span class="small text-muted"><i class="bi bi-arrow-repeat me-1"></i>Clique para virar</span>
              <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); abrirModalSalvarAPI(${idx}, '${item.tag}')">
                <i class="bi bi-plus-lg"></i> Salvar na Biblioteca
              </button>
            </div>
          </div>
          <!-- Verso -->
          <div class="flashcard-face flashcard-back position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between rounded-4 p-4">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-primary-subtle text-primary-emphasis">Resposta Oficial</span>
              <span class="small text-muted">QuizAPI.io</span>
            </div>
            <div class="my-auto">
              <p class="small fw-semibold text-dark mb-0">${item.resposta}</p>
            </div>
            <div class="d-grid">
              <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); abrirModalSalvarAPI(${idx}, '${item.tag}')">
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

function buscarQuestoesAPI(e) {
  if (e) e.preventDefault();
  const tech = document.getElementById('filtroTecnologia').value;
  const spinner = document.getElementById('apiLoadingSpinner');
  const grid = document.getElementById('gridResultadosAPI');

  grid.classList.add('d-none');
  spinner.classList.remove('d-none');

  setTimeout(() => {
    spinner.classList.add('d-none');
    grid.classList.remove('d-none');
    const resultados = mockQuestoesQuizAPI[tech] || mockQuestoesQuizAPI.JavaScript;
    renderizarCardsAPI(resultados);
  }, 550);
}

function abrirModalSalvarAPI(idx, tech) {
  const lista = mockQuestoesQuizAPI[tech] || mockQuestoesQuizAPI.JavaScript;
  cardSelecionadoParaImportar = lista[idx];
  document.getElementById('previewModalFrente').textContent = cardSelecionadoParaImportar.pergunta;
  document.getElementById('previewModalVerso').textContent = cardSelecionadoParaImportar.resposta;
  const modal = new bootstrap.Modal(document.getElementById('modalSalvarCardAPI'));
  modal.show();
}

function confirmarImportacaoCard() {
  const destino = document.getElementById('selectBibliotecaDestino').selectedOptions[0].text;
  bootstrap.Modal.getInstance(document.getElementById('modalSalvarCardAPI')).hide();
  mostrarToast(`Flashcard salvo na biblioteca "${destino}" (origem: API)!`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarCardsAPI(mockQuestoesQuizAPI.JavaScript);
});
