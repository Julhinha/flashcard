// Estado Inicial Simulado (CRUD Firestore)
let bibliotecas = [
  {
    id: 'lib1',
    nome: 'Arquitetura de Software',
    descricao: 'Padrões de projeto, Clean Architecture e princípios SOLID',
    cards: [
      { id: 'c1', frente: 'O que significa a letra S no princípio SOLID?', verso: 'Single Responsibility Principle (Princípio da Responsabilidade Única).', dificuldade: 'easy', origem: 'Manual', nivelDominio: 'Fácil' },
      { id: 'c2', frente: 'Qual o objetivo do padrão Observer?', verso: 'Definir uma dependência um-para-muitos onde, quando um objeto muda de estado, seus dependentes são notificados.', dificuldade: 'medium', origem: 'Manual', nivelDominio: 'Bom' }
    ]
  },
  {
    id: 'lib2',
    nome: 'Banco de Dados & SQL',
    descricao: 'Modelagem relacional, normalização e transações ACID',
    cards: [
      { id: 'c3', frente: 'Qual cláusula filtra grupos criados pelo GROUP BY?', verso: 'HAVING', dificuldade: 'medium', origem: 'API', nivelDominio: 'Bom' }
    ]
  },
  {
    id: 'lib3',
    nome: 'Linux & Redes',
    descricao: 'Administração de servidores, permissões e protocolos TCP/IP',
    cards: [
      { id: 'c4', frente: 'O que faz o comando chmod 755?', verso: 'Concede rwx ao proprietário e r-x para grupo e outros usuários.', dificuldade: 'medium', origem: 'API', nivelDominio: 'Difícil' }
    ]
  }
];

let bibliotecaAtivaId = 'lib1';

function renderizarBibliotecas() {
  const listaEl = document.getElementById('listaBibliotecas');
  document.getElementById('contadorBibliotecas').textContent = bibliotecas.length;
  listaEl.innerHTML = '';

  bibliotecas.forEach(lib => {
    const isActive = lib.id === bibliotecaAtivaId ? 'active' : '';
    const item = document.createElement('div');
    item.className = `deck-item p-3 ${isActive}`;
    item.onclick = () => { bibliotecaAtivaId = lib.id; renderizarBibliotecas(); renderizarCards(); };
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold text-dark">${lib.nome}</span>
        <span class="badge bg-white text-dark border">${lib.cards.length}</span>
      </div>
      <div class="small text-muted text-truncate">${lib.descricao}</div>
    `;
    listaEl.appendChild(item);
  });
}

function renderizarCards() {
  const lib = bibliotecas.find(b => b.id === bibliotecaAtivaId) || bibliotecas[0];
  if (!lib) return;

  document.getElementById('tituloBibliotecaAtual').textContent = lib.nome;
  document.getElementById('descBibliotecaAtual').textContent = lib.descricao;

  const container = document.getElementById('listaCardsBiblioteca');
  container.innerHTML = '';

  if (lib.cards.length === 0) {
    container.innerHTML = `<div class="text-center py-5 text-muted small">Nenhum flashcard nesta biblioteca ainda. Clique em <strong>+ Novo Flashcard</strong> para começar.</div>`;
    return;
  }

  lib.cards.forEach(card => {
    const badgeCor = card.nivelDominio === 'Fácil' ? 'bg-primary-subtle text-primary-emphasis' : (card.nivelDominio === 'Bom' ? 'bg-info-subtle text-info' : 'bg-danger-subtle text-danger');
    const el = document.createElement('div');
    el.className = 'p-3 rounded-3 border bg-light-subtle';
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div class="d-flex gap-2">
          <span class="badge ${badgeCor}">${card.nivelDominio}</span>
          <span class="badge bg-white text-muted border">${card.origem}</span>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" onclick="abrirModalEditarCard('${card.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger" onclick="excluirCard('${card.id}')" title="Excluir"><i class="bi bi-trash"></i></button>
        </div>
      </div>
      <div class="fw-bold text-dark mb-1">${card.frente}</div>
      <div class="small text-muted">${card.verso}</div>
    `;
    container.appendChild(el);
  });
}

function abrirModalNovaBiblioteca() {
  document.getElementById('modalBibliotecaTitulo').textContent = 'Nova Biblioteca';
  document.getElementById('editBibliotecaId').value = '';
  document.getElementById('inputBibliotecaNome').value = '';
  document.getElementById('inputBibliotecaDesc').value = '';
}

function editarBibliotecaAtual() {
  const lib = bibliotecas.find(b => b.id === bibliotecaAtivaId);
  if (!lib) return;
  document.getElementById('modalBibliotecaTitulo').textContent = 'Editar Biblioteca';
  document.getElementById('editBibliotecaId').value = lib.id;
  document.getElementById('inputBibliotecaNome').value = lib.nome;
  document.getElementById('inputBibliotecaDesc').value = lib.descricao;
  new bootstrap.Modal(document.getElementById('modalBiblioteca')).show();
}

function salvarBiblioteca(e) {
  e.preventDefault();
  const id = document.getElementById('editBibliotecaId').value;
  const nome = document.getElementById('inputBibliotecaNome').value;
  const descricao = document.getElementById('inputBibliotecaDesc').value;

  if (id) {
    const lib = bibliotecas.find(b => b.id === id);
    lib.nome = nome;
    lib.descricao = descricao;
    mostrarToast('Biblioteca atualizada com sucesso!');
  } else {
    const novoId = 'lib_' + Date.now();
    bibliotecas.push({ id: novoId, nome, descricao, cards: [] });
    bibliotecaAtivaId = novoId;
    mostrarToast('Nova biblioteca criada no Firestore!');
  }

  bootstrap.Modal.getInstance(document.getElementById('modalBiblioteca')).hide();
  renderizarBibliotecas();
  renderizarCards();
}

function excluirBibliotecaAtual() {
  if (bibliotecas.length <= 1) {
    mostrarToast('Mantenha pelo menos uma biblioteca ativa.', 'danger');
    return;
  }
  bibliotecas = bibliotecas.filter(b => b.id !== bibliotecaAtivaId);
  bibliotecaAtivaId = bibliotecas[0].id;
  renderizarBibliotecas();
  renderizarCards();
  mostrarToast('Biblioteca excluída com sucesso.');
}

function abrirModalNovoCard() {
  document.getElementById('modalFlashcardTitulo').textContent = 'Novo Flashcard Manual';
  document.getElementById('editCardId').value = '';
  document.getElementById('inputCardFrente').value = '';
  document.getElementById('inputCardVerso').value = '';
}

function abrirModalEditarCard(cardId) {
  const lib = bibliotecas.find(b => b.id === bibliotecaAtivaId);
  const card = lib.cards.find(c => c.id === cardId);
  document.getElementById('modalFlashcardTitulo').textContent = 'Editar Flashcard';
  document.getElementById('editCardId').value = card.id;
  document.getElementById('inputCardFrente').value = card.frente;
  document.getElementById('inputCardVerso').value = card.verso;
  document.getElementById('inputCardDificuldade').value = card.dificuldade;
  new bootstrap.Modal(document.getElementById('modalFlashcard')).show();
}

function salvarFlashcard(e) {
  e.preventDefault();
  const lib = bibliotecas.find(b => b.id === bibliotecaAtivaId);
  const cardId = document.getElementById('editCardId').value;
  const frente = document.getElementById('inputCardFrente').value;
  const verso = document.getElementById('inputCardVerso').value;
  const dif = document.getElementById('inputCardDificuldade').value;
  const mapNivel = { easy: 'Fácil', medium: 'Bom', hard: 'Difícil' };

  if (cardId) {
    const card = lib.cards.find(c => c.id === cardId);
    card.frente = frente;
    card.verso = verso;
    card.dificuldade = dif;
    card.nivelDominio = mapNivel[dif];
    mostrarToast('Flashcard atualizado!');
  } else {
    lib.cards.push({
      id: 'c_' + Date.now(),
      frente,
      verso,
      dificuldade: dif,
      origem: 'Manual',
      nivelDominio: mapNivel[dif]
    });
    mostrarToast('Flashcard criado com sucesso!');
  }

  bootstrap.Modal.getInstance(document.getElementById('modalFlashcard')).hide();
  renderizarBibliotecas();
  renderizarCards();
}

function excluirCard(cardId) {
  const lib = bibliotecas.find(b => b.id === bibliotecaAtivaId);
  lib.cards = lib.cards.filter(c => c.id !== cardId);
  renderizarBibliotecas();
  renderizarCards();
  mostrarToast('Flashcard removido do banco.');
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarBibliotecas();
  renderizarCards();
});
