// Lógica de Sessão de Revisão Espaçada (RN04: Difícil +10m, Bom +3d, Fácil +7d)
const filaRevisao = [
  { biblioteca: 'Arquitetura de Software', origem: 'Manual', frente: 'O que significa a letra S no princípio SOLID?', verso: 'Single Responsibility Principle (Princípio da Responsabilidade Única) — uma classe deve ter apenas um motivo para mudar.', revisoes: 4 },
  { biblioteca: 'Banco de Dados & SQL', origem: 'API', frente: 'Qual cláusula SQL filtra resultados após um agrupamento com GROUP BY?', verso: 'HAVING — aplicada após a agregação das linhas.', revisoes: 2 },
  { biblioteca: 'Linux & Redes', origem: 'API', frente: 'O que faz o comando chmod 755 em um script?', verso: 'Define leitura, escrita e execução (rwx) para o dono, e leitura/execução (r-x) para grupo e outros.', revisoes: 1 },
  { biblioteca: 'JavaScript', origem: 'API', frente: 'Qual a diferença entre == e === em JavaScript?', verso: '=== verifica igualdade estrita (valor e tipo), evitando coerção implícita.', revisoes: 5 },
  { biblioteca: 'Arquitetura de Software', origem: 'Manual', frente: 'Para que serve o padrão de projeto Dependency Injection?', verso: 'Reduzir o acoplamento fornecendo as dependências externamente em vez de instanciá-las dentro da classe.', revisoes: 3 }
];

let indiceAtual = 0;
let cardVirado = false;

function carregarCardAtual() {
  if (indiceAtual >= filaRevisao.length) {
    document.getElementById('arenaAtiva').classList.add('d-none');
    document.getElementById('arenaConcluida').classList.remove('d-none');
    document.getElementById('barraProgressoRevisao').style.width = '100%';
    document.getElementById('contadorProgressoTexto').textContent = 'Concluído!';
    return;
  }

  const card = filaRevisao[indiceAtual];
  cardVirado = false;

  const inner = document.getElementById('cardRevisaoInner');
  inner.classList.remove('is-flipped');

  document.getElementById('cardTagBiblioteca').textContent = card.biblioteca;
  document.getElementById('cardTagOrigem').textContent = card.origem;
  document.getElementById('cardTextoFrente').textContent = card.frente;
  document.getElementById('cardTextoVerso').textContent = card.verso;
  document.getElementById('cardRevisoesCount').textContent = `Revisado ${card.revisoes}x`;

  document.getElementById('areaBotaoMostrar').classList.remove('d-none');
  document.getElementById('areaBotoesAvaliacao').classList.add('d-none');

  const total = filaRevisao.length;
  document.getElementById('contadorProgressoTexto').textContent = `Card ${indiceAtual + 1} de ${total}`;
  document.getElementById('barraProgressoRevisao').style.width = `${((indiceAtual) / total) * 100}%`;
}

function virarCardRevisao() {
  if (cardVirado) return;
  cardVirado = true;
  document.getElementById('cardRevisaoInner').classList.add('is-flipped');
  document.getElementById('areaBotaoMostrar').classList.add('d-none');
  document.getElementById('areaBotoesAvaliacao').classList.remove('d-none');
}

function avaliarCard(nivel) {
  const mensagens = {
    dificil: 'Reagendado para +10 minutos (Difícil).',
    bom: 'Reagendado para +3 dias (Bom).',
    facil: 'Reagendado para +7 dias (Fácil).'
  };
  mostrarToast(mensagens[nivel], nivel === 'dificil' ? 'danger' : 'success');
  indiceAtual++;
  setTimeout(carregarCardAtual, 220);
}

// Atalhos de Teclado (Espaço = Virar | 1, 2, 3 = Avaliar)
document.addEventListener('keydown', (e) => {
  if (indiceAtual >= filaRevisao.length) return;
  if (e.code === 'Space') {
    e.preventDefault();
    virarCardRevisao();
  } else if (cardVirado && e.key === '1') {
    avaliarCard('dificil');
  } else if (cardVirado && e.key === '2') {
    avaliarCard('bom');
  } else if (cardVirado && e.key === '3') {
    avaliarCard('facil');
  }
});

document.addEventListener('DOMContentLoaded', carregarCardAtual);
