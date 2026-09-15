// Aplica ao deck de imprensa os textos editados no painel (/admin).
// Cada bloco de texto dos slides carrega um data-edit; o JSON guarda só o que
// foi alterado, então o deck continua íntegro se o arquivo não existir ou vier
// vazio. Nenhuma estrutura é criada aqui — só substituição de conteúdo.
(function () {
  "use strict";

  fetch("content/imprensa.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (dados) {
      if (!dados) return;
      aplicar(dados.textos);
      aplicar(dados.imagens, "src");
    })
    .catch(function () { /* sem edições: o deck fica como está no HTML */ });

  function aplicar(mapa, atributo) {
    if (!mapa) return;
    Object.keys(mapa).forEach(function (chave) {
      var valor = mapa[chave];
      if (valor === undefined || valor === null || valor === "") return;
      var seletor = '[data-edit="' + chave.replace(/"/g, "") + '"]';
      document.querySelectorAll(seletor).forEach(function (el) {
        if (atributo === "src") el.setAttribute("src", valor);
        else el.innerHTML = valor;
      });
    });
  }
})();
