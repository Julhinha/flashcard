// Utilitários compartilhados entre as telas (módulo ES).

// Protege o HTML caso o texto tenha tags como <div> ou <script>
export function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}
