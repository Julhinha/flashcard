// Dropdown com campo de busca (mesmo comportamento do filtro de Categoria em Explorar).
// Uso: const dd = criarDropdownBusca(document.getElementById("meuContainer"));
//      dd.setOpcoes([{ valor: "1", texto: "Biblioteca A" }], "1");
//      dd.valor / dd.texto -> opção selecionada
// Opções: placeholderBotao, placeholderBusca, textoVazio, pequeno (visual sm),
//         onChange(valor) chamado quando o usuário escolhe uma opção.
// Requer o JS do Bootstrap carregado (global `bootstrap`).

export function criarDropdownBusca(
  container,
  {
    placeholderBotao = "Selecione...",
    placeholderBusca = "Buscar...",
    textoVazio = "Nenhum resultado encontrado.",
    pequeno = false,
    onChange = null,
  } = {},
) {
  container.classList.add("dropdown");
  container.innerHTML = `
    <button type="button" class="form-select ${pequeno ? "form-select-sm" : ""} text-start text-truncate" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"></button>
    <div class="dropdown-menu w-100 p-2">
      <input type="search" class="form-control form-control-sm mb-2" autocomplete="off" />
      <div style="max-height: 260px; overflow-y: auto"></div>
      <div class="small text-muted px-2 py-1 d-none"></div>
    </div>`;

  const botao = container.querySelector("button");
  const busca = container.querySelector("input");
  const lista = busca.nextElementSibling;
  const vazio = lista.nextElementSibling;
  busca.placeholder = placeholderBusca;
  vazio.textContent = textoVazio;

  let opcoes = [];
  let selecionada = null;

  function filtrar() {
    const termo = busca.value.trim().toLowerCase();
    let visiveis = 0;
    lista.querySelectorAll(".dropdown-item").forEach((item) => {
      const mostrar = item.textContent.toLowerCase().includes(termo);
      item.classList.toggle("d-none", !mostrar);
      if (mostrar) visiveis++;
    });
    vazio.classList.toggle("d-none", visiveis > 0);
  }

  function selecionar(opcao) {
    selecionada = opcao;
    botao.textContent = opcao ? opcao.texto : placeholderBotao;
    lista.querySelectorAll(".dropdown-item").forEach((item) => {
      item.classList.toggle("active", opcao && item.dataset.valor === opcao.valor);
    });
  }

  busca.addEventListener("input", filtrar);

  // Enter na busca não pode enviar o formulário em que o dropdown estiver
  busca.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });

  // Ao abrir, limpa a busca e foca no campo
  botao.addEventListener("shown.bs.dropdown", () => {
    busca.value = "";
    filtrar();
    busca.focus();
  });

  return {
    // opcoes: [{ valor, texto }]; selecionado: valor a marcar (padrão: a primeira)
    setOpcoes(novas, valorSelecionado) {
      opcoes = novas;
      lista.innerHTML = "";
      novas.forEach((opcao) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "dropdown-item";
        item.dataset.valor = opcao.valor;
        item.textContent = opcao.texto; // textContent evita injeção de HTML
        item.addEventListener("click", () => {
          selecionar(opcao);
          bootstrap.Dropdown.getOrCreateInstance(botao).hide();
          if (onChange) onChange(opcao.valor);
        });
        lista.appendChild(item);
      });
      busca.value = "";
      filtrar();
      selecionar(
        novas.find((o) => o.valor === valorSelecionado) || novas[0] || null,
      );
    },
    setDesabilitado(desabilitado) {
      botao.disabled = desabilitado;
    },
    get valor() {
      return selecionada ? selecionada.valor : "";
    },
    get texto() {
      return selecionada ? selecionada.texto : "";
    },
  };
}
