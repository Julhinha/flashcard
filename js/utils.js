// Utilitários compartilhados entre as telas (módulo ES).

// Protege o HTML caso o texto tenha tags como <div> ou <script>
export function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

// Normaliza um texto para comparação (ignora maiúsculas e espaços extras)
export function normalizarTexto(texto) {
  return (texto ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
