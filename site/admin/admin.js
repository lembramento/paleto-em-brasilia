/* Painel de edição do site — Paletó em Brasília.
 *
 * Os campos não são escritos à mão aqui: o painel busca index.html e
 * imprensa.html, lê os blocos marcados com data-edit e monta o formulário a
 * partir deles. Assim, texto novo no site aparece sozinho no painel, e nada sai
 * de sincronia quando a página muda.
 *
 * Gravar = um commit em content/site.json ou content/imprensa.json pela função
 * /api/conteudo. A publicação em si é da Vercel, que reconstrói o site sozinha.
 */
(function () {
  "use strict";

  var estado = {
    email: "",
    site: { dados: null, sha: null },
    deck: { dados: null, sha: null },
    chavesSite: [],
    chavesDeck: [],
    sujo: false
  };

  // Nomes amigáveis para as chaves do site. Chave sem nome aqui aparece com o
  // próprio identificador — o painel continua funcionando, só menos bonito.
  var NOMES = {
    "hero.kicker": "Capa — linha de cima",
    "release.tag": "Capa — selo do lançamento",
    "articulista.presave": "Articulista — fala antes do lançamento",
    "articulista.streaming": "Articulista — fala depois do lançamento",
    "articulista.assinatura": "Articulista — assinatura",
    "single.rotulo.lancamento": "Ficha — rótulo “Lançamento”",
    "single.rotulo.formato": "Ficha — rótulo “Formato”",
    "single.rotulo.aseguir": "Ficha — rótulo “A seguir”",
    "single.cta.ouvir": "Single — botão de ouvir",
    "arquivo.titulo": "Pronunciamentos — título",
    "arquivo.tag": "Pronunciamentos — etiqueta (link do canal)",
    "arquivo.aviso": "Pronunciamentos — aviso de IA",
    "banda.kicker": "Banda — etiqueta",
    "banda.titulo": "Banda — título",
    "banda.desc": "Banda — texto de apoio",
    "banda.botao": "Banda — botão do formulário",
    "rodape.imprensa": "Rodapé — botão imprensa",
    "ouvir.label": "Painel de escuta — rótulo",
    "fluxo.kicker": "Intimação — etapa 1, etiqueta",
    "fluxo.titulo": "Intimação — etapa 1, título",
    "fluxo.apoio": "Intimação — etapa 1, apoio",
    "fluxo.botao": "Intimação — etapa 1, botão",
    "fluxo.presave.titulo": "Intimação — etapa 2 (pré-save), título",
    "fluxo.presave.p1": "Intimação — etapa 2 (pré-save), 1º parágrafo",
    "fluxo.presave.p2": "Intimação — etapa 2 (pré-save), 2º parágrafo",
    "fluxo.presave.cta": "Intimação — etapa 2 (pré-save), botão",
    "fluxo.streaming.titulo": "Intimação — etapa 2 (já lançado), título",
    "fluxo.streaming.p1": "Intimação — etapa 2 (já lançado), 1º parágrafo",
    "fluxo.streaming.p2": "Intimação — etapa 2 (já lançado), 2º parágrafo",
    "fluxo.recusa": "Intimação — recusar",
    "fluxo.fim.kicker": "Intimação — etapa 3, etiqueta",
    "fluxo.fim.titulo": "Intimação — etapa 3, título",
    "fluxo.fim.presave": "Intimação — etapa 3 (pré-save), texto",
    "fluxo.fim.streaming": "Intimação — etapa 3 (já lançado), texto",
    "fluxo.fim.botao": "Intimação — etapa 3, botão"
  };

  var IMAGENS = [
    { chave: "heroFundo", nome: "Fundo da capa", dica: "A foto atrás do nome da banda." },
    { chave: "bandaFoto", nome: "Foto da banda", dica: "Aparece na faixa azul, junto do formulário." },
    { chave: "articulistaFoto", nome: "O Articulista", dica: "Usada na etapa 2 do fluxo de intimação." }
  ];

  var el = {
    carregando: document.querySelector("[data-carregando]"),
    entrada: document.querySelector("[data-entrada]"),
    entradaErro: document.querySelector("[data-entrada-erro]"),
    entradaForm: document.querySelector("[data-entrada-form]"),
    entradaBotao: document.querySelector("[data-entrada-botao]"),
    entradaGoogle: document.querySelector("[data-entrada-google]"),
    painel: document.querySelector("[data-painel]"),
    email: document.querySelector("[data-email]"),
    estado: document.querySelector("[data-estado]"),
    salvar: document.querySelector("[data-salvar]")
  };

  var ERROS = {
    estado: "A tentativa de login expirou ou veio de outra aba. Tente de novo.",
    troca: "O Google recusou a troca de credenciais. Confira as variáveis GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel.",
    token: "Resposta inesperada do Google. Tente novamente.",
    acesso: "Esta conta não está autorizada. Peça para incluírem o e-mail em ADMIN_EMAILS."
  };

  iniciar();

  async function iniciar() {
    var erro = new URLSearchParams(location.search).get("erro");
    if (erro) {
      el.entradaErro.textContent = ERROS[erro] || "Não foi possível entrar.";
      el.entradaErro.hidden = false;
      history.replaceState(null, "", location.pathname);
    }

    // O 401 aqui é o caso normal de quem ainda não entrou, então a resposta
    // interessa mesmo sem sucesso: é ela que diz se o Google está ligado.
    var sessao = await pegarJSON("/api/auth?acao=quem").catch(function (e) { return e.dados || null; });
    el.carregando.hidden = true;

    if (!sessao || !sessao.autenticado) {
      if (sessao && sessao.google) el.entradaGoogle.hidden = false;
      el.entrada.hidden = false;
      ligarFormularioEntrada();
      return;
    }

    estado.email = sessao.email;
    el.email.textContent = sessao.email;
    el.painel.hidden = false;

    try {
      await carregarTudo();
    } catch (e) {
      avisar("Não foi possível carregar o conteúdo: " + e.message, "erro");
    }
  }

  function ligarFormularioEntrada() {
    el.entradaForm.addEventListener("submit", async function (evento) {
      evento.preventDefault();
      el.entradaErro.hidden = true;
      el.entradaBotao.disabled = true;
      el.entradaBotao.textContent = "Entrando…";

      try {
        await enviarJSON("/api/auth?acao=senha", "POST", {
          email: el.entradaForm.email.value.trim(),
          senha: el.entradaForm.senha.value
        });
        location.reload();
      } catch (e) {
        el.entradaErro.textContent = e.message;
        el.entradaErro.hidden = false;
        el.entradaBotao.disabled = false;
        el.entradaBotao.textContent = "Entrar";
        el.entradaForm.senha.value = "";
        el.entradaForm.senha.focus();
      }
    });
  }

  async function carregarTudo() {
    var [site, deck, htmlSite, htmlDeck] = await Promise.all([
      pegarJSON("/api/conteudo?arquivo=site.json"),
      pegarJSON("/api/conteudo?arquivo=imprensa.json"),
      pegarTexto("/index.html"),
      pegarTexto("/imprensa.html")
    ]);

    estado.site = { dados: site.dados || {}, sha: site.sha };
    estado.deck = { dados: deck.dados || { textos: {} }, sha: deck.sha };
    if (!estado.deck.dados.textos) estado.deck.dados.textos = {};
    if (!estado.site.dados.textos) estado.site.dados.textos = {};

    estado.chavesSite = lerChaves(htmlSite, false);
    estado.chavesDeck = lerChaves(htmlDeck, true);

    montarLancamento();
    montarPronunciamentos();
    montarLinks();
    montarImagens();
    montarTextos();
    montarDeck();
    ligarAbas();

    el.salvar.addEventListener("click", salvar);
    document.querySelector("[data-sair]").addEventListener("click", sair);
    window.addEventListener("beforeunload", function (e) {
      if (!estado.sujo) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  // Descobre os campos editáveis lendo a própria página publicada.
  function lerChaves(html, comSlide) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var slides = Array.prototype.slice.call(doc.querySelectorAll("[data-slide]"));
    return Array.prototype.map.call(doc.querySelectorAll("[data-edit]"), function (node) {
      var item = {
        chave: node.getAttribute("data-edit"),
        pt: node.dataset.pt !== undefined ? node.dataset.pt : node.innerHTML.trim(),
        en: node.dataset.en,
        bilingue: node.dataset.pt !== undefined
      };
      if (comSlide) {
        var slide = node.closest("[data-slide]");
        item.slide = slide ? slides.indexOf(slide) + 1 : 0;
      }
      return item;
    });
  }

  /* ---------- LANÇAMENTO ---------- */
  function montarLancamento() {
    var l = estado.site.dados.lancamento || (estado.site.dados.lancamento = {});
    var alvo = document.querySelector("[data-campos-lancamento]");
    alvo.innerHTML = "";

    alvo.appendChild(campoOpcoes(
      "Em que fase está",
      [
        { valor: "presave", titulo: "Vai sair", texto: "Sem tarja na capa. O botão do single leva ao fluxo de e-mail e depois ao pré-save." },
        { valor: "streaming", titulo: "Já lançado", texto: "Tarja com as plataformas na capa, botão “Ouvir agora” e o Articulista anuncia o lançamento." }
      ],
      l.fase === "presave" ? "presave" : "streaming",
      function (v) { l.fase = v; sujar(); }
    ));

    alvo.appendChild(campoTexto("Número", l.numero, function (v) { l.numero = v; }, "Ex.: Single 01"));
    alvo.appendChild(campoTexto("Título", l.titulo, function (v) { l.titulo = v; }));
    alvo.appendChild(campoTexto("Data", l.data, function (v) { l.data = v; }, "Como aparece na ficha. Ex.: 11.09.2026"));
    alvo.appendChild(campoParIdioma("Formato", l.formato || {}, function (par) { l.formato = par; }));
    alvo.appendChild(campoParIdioma("A seguir", l.aSeguir || {}, function (par) { l.aSeguir = par; }));

    alvo.appendChild(campoImagem("Capa do single", l.capa, function (caminho) {
      l.capa = caminho;
      sujar();
    }));

    alvo.appendChild(campoTexto("Smart link (já lançado)", l.smartLink, function (v) { l.smartLink = v; },
      "Link do LANDR que reúne as plataformas. Usado quando a fase é “Já lançado”."));
    alvo.appendChild(campoTexto("Link de pré-save", l.preSaveUrl, function (v) { l.preSaveUrl = v; },
      "Usado enquanto a fase for “Vai sair”."));

    var rotulo = document.createElement("div");
    rotulo.className = "rotulo";
    rotulo.textContent = "Plataformas";
    alvo.appendChild(rotulo);

    var dica = document.createElement("p");
    dica.className = "dica";
    dica.style.margin = "0 0 14px";
    dica.textContent = "Aparecem na tarja da capa, nessa ordem. Sem link, a linha cai no smart link.";
    alvo.appendChild(dica);

    alvo.appendChild(lista(
      l.plataformas || (l.plataformas = []),
      function (item) { return item.nome || "Plataforma"; },
      function (item, corpo) {
        corpo.appendChild(campoTexto("Nome", item.nome, function (v) { item.nome = v; }));
        corpo.appendChild(campoTexto("Link direto", item.url, function (v) { item.url = v; }));
      },
      function () { return { nome: "", url: "" }; },
      montarLancamento
    ));
  }

  /* ---------- PRONUNCIAMENTOS ---------- */
  function montarPronunciamentos() {
    var dados = estado.site.dados;
    var alvo = document.querySelector("[data-campos-pronunciamentos]");
    alvo.innerHTML = "";

    var secoes = dados.secoes || (dados.secoes = {});
    alvo.appendChild(campoInterruptor(
      "Mostrar a seção no site",
      secoes.mostrarArquivo !== false,
      function (v) { secoes.mostrarArquivo = v; }
    ));

    alvo.appendChild(lista(
      dados.pronunciamentos || (dados.pronunciamentos = []),
      function (item) { return (item.numero || "Pronunciamento") + (item.youtubeId ? "" : " — sem vídeo"); },
      function (item, corpo) {
        corpo.appendChild(campoTexto("Número", item.numero, function (v) { item.numero = v; }, "Ex.: Nº 1"));
        corpo.appendChild(campoParIdioma("Frase", { pt: item.pt, en: item.en }, function (par) {
          item.pt = par.pt; item.en = par.en;
        }));
        var dupla = document.createElement("div");
        dupla.className = "linha-dupla";
        dupla.appendChild(campoTexto("ID do vídeo", item.youtubeId, function (v) {
          // Aceita a URL inteira e extrai o ID, que é o que a maioria vai colar.
          var m = String(v).match(/(?:v=|\/shorts\/|youtu\.be\/)([\w-]{11})/);
          item.youtubeId = m ? m[1] : v.trim();
        }, "Cole a URL do vídeo ou só o ID."));
        dupla.appendChild(campoTexto("Duração", item.duracao, function (v) { item.duracao = v; }, "Ex.: 00:42"));
        corpo.appendChild(dupla);
        corpo.appendChild(campoInterruptor("Vídeo vertical (Short)", item.vertical !== false, function (v) { item.vertical = v; }));
      },
      function () { return { numero: "", pt: "", en: "", duracao: "—", youtubeId: "", vertical: true }; },
      montarPronunciamentos
    ));
  }

  /* ---------- LINKS ---------- */
  function montarLinks() {
    var links = estado.site.dados.links || (estado.site.dados.links = {});
    var alvo = document.querySelector("[data-campos-links]");
    alvo.innerHTML = "";
    alvo.appendChild(campoTexto("Instagram", links.instagramUrl, function (v) { links.instagramUrl = v; }));
    alvo.appendChild(campoTexto("Canal no YouTube", links.youtubeChannelUrl, function (v) { links.youtubeChannelUrl = v; }));
    alvo.appendChild(campoTexto("Botão imprensa (rodapé)", links.pressReleaseUrl, function (v) { links.pressReleaseUrl = v; },
      "Pode ser uma página do site (imprensa.html) ou um link externo."));
  }

  /* ---------- IMAGENS ---------- */
  function montarImagens() {
    var imagens = estado.site.dados.imagens || (estado.site.dados.imagens = {});
    var alvo = document.querySelector("[data-campos-imagens]");
    alvo.innerHTML = "";
    IMAGENS.forEach(function (def) {
      alvo.appendChild(campoImagem(def.nome, imagens[def.chave], function (caminho) {
        imagens[def.chave] = caminho;
        sujar();
      }, def.dica));
    });
  }

  /* ---------- TEXTOS DO SITE ---------- */
  function montarTextos() {
    var textos = estado.site.dados.textos;
    var alvo = document.querySelector("[data-campos-textos]");
    alvo.innerHTML = "";

    estado.chavesSite.forEach(function (item) {
      var atual = textos[item.chave] || {};
      var grupo = document.createElement("div");
      grupo.className = "campo";

      var rotulo = document.createElement("label");
      rotulo.textContent = NOMES[item.chave] || item.chave;
      grupo.appendChild(rotulo);

      var par = document.createElement("div");
      par.className = "par";
      par.appendChild(subcampo("Português", atual.pt !== undefined ? atual.pt : item.pt, function (v) {
        guardarTexto(textos, item.chave, "pt", v, item.pt);
      }));
      if (item.bilingue) {
        par.appendChild(subcampo("Inglês", atual.en !== undefined ? atual.en : (item.en || ""), function (v) {
          guardarTexto(textos, item.chave, "en", v, item.en || "");
        }));
      }
      grupo.appendChild(par);
      alvo.appendChild(grupo);
    });
  }

  // Só guarda o que difere do original: assim o JSON fica pequeno e um ajuste
  // futuro no HTML continua valendo para o que ninguém editou.
  function guardarTexto(mapa, chave, idioma, valor, original) {
    var item = mapa[chave] || {};
    if (valor === original || valor === "") delete item[idioma];
    else item[idioma] = valor;
    if (Object.keys(item).length === 0) delete mapa[chave];
    else mapa[chave] = item;
    sujar();
  }

  /* ---------- DECK ---------- */
  function montarDeck() {
    var textos = estado.deck.dados.textos;
    var alvo = document.querySelector("[data-campos-deck]");
    alvo.innerHTML = "";

    var slideAtual = null;
    var grupo = null;

    estado.chavesDeck.forEach(function (item) {
      if (item.slide !== slideAtual) {
        slideAtual = item.slide;
        grupo = document.createElement("div");
        grupo.className = "grupo-slide";
        var h = document.createElement("h3");
        h.textContent = "Slide " + String(slideAtual).padStart(2, "0");
        grupo.appendChild(h);
        alvo.appendChild(grupo);
      }

      var campo = document.createElement("div");
      campo.className = "campo";

      var original = document.createElement("p");
      original.className = "original";
      original.textContent = semTags(item.pt).slice(0, 160) || "(vazio)";
      campo.appendChild(original);

      var area = document.createElement("textarea");
      area.value = textos[item.chave] !== undefined ? textos[item.chave] : item.pt;
      area.rows = item.pt.length > 120 ? 4 : 2;
      area.addEventListener("input", function () {
        if (area.value === item.pt || area.value === "") delete textos[item.chave];
        else textos[item.chave] = area.value;
        sujar();
      });
      campo.appendChild(area);
      grupo.appendChild(campo);
    });
  }

  function semTags(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }

  /* ---------- PEÇAS DE FORMULÁRIO ---------- */
  function campoTexto(nome, valor, aoMudar, dica) {
    var campo = document.createElement("div");
    campo.className = "campo";

    var rotulo = document.createElement("label");
    rotulo.textContent = nome;
    campo.appendChild(rotulo);

    var input = document.createElement("input");
    input.type = "text";
    input.value = valor || "";
    input.addEventListener("input", function () { aoMudar(input.value); sujar(); });
    campo.appendChild(input);

    if (dica) {
      var p = document.createElement("p");
      p.className = "dica";
      p.textContent = dica;
      campo.appendChild(p);
    }
    return campo;
  }

  function subcampo(idioma, valor, aoMudar) {
    var caixa = document.createElement("div");
    var rot = document.createElement("span");
    rot.className = "rotulo-idioma";
    rot.textContent = idioma;
    caixa.appendChild(rot);

    var longo = (valor || "").length > 70;
    var input = document.createElement(longo ? "textarea" : "input");
    if (!longo) input.type = "text";
    input.value = valor || "";
    input.addEventListener("input", function () { aoMudar(input.value); });
    caixa.appendChild(input);
    return caixa;
  }

  function campoParIdioma(nome, par, aoMudar) {
    var atual = { pt: par.pt || "", en: par.en || "" };
    var campo = document.createElement("div");
    campo.className = "campo";

    var rotulo = document.createElement("label");
    rotulo.textContent = nome;
    campo.appendChild(rotulo);

    var grade = document.createElement("div");
    grade.className = "par";
    grade.appendChild(subcampo("Português", atual.pt, function (v) { atual.pt = v; aoMudar(atual); sujar(); }));
    grade.appendChild(subcampo("Inglês", atual.en, function (v) { atual.en = v; aoMudar(atual); sujar(); }));
    campo.appendChild(grade);
    return campo;
  }

  function campoInterruptor(nome, ligado, aoMudar) {
    var campo = document.createElement("div");
    campo.className = "campo";

    var label = document.createElement("label");
    label.className = "switch";
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!ligado;
    input.addEventListener("change", function () { aoMudar(input.checked); sujar(); });
    var span = document.createElement("span");
    span.textContent = nome;
    label.appendChild(input);
    label.appendChild(span);
    campo.appendChild(label);
    return campo;
  }

  function campoOpcoes(nome, opcoes, atual, aoMudar) {
    var campo = document.createElement("div");
    campo.className = "campo";

    var rotulo = document.createElement("label");
    rotulo.textContent = nome;
    campo.appendChild(rotulo);

    var caixa = document.createElement("div");
    caixa.className = "opcoes";

    opcoes.forEach(function (op) {
      var item = document.createElement("label");
      item.className = "opcao" + (op.valor === atual ? " ativa" : "");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "opc-" + nome.replace(/\s+/g, "-");
      input.checked = op.valor === atual;
      input.addEventListener("change", function () {
        caixa.querySelectorAll(".opcao").forEach(function (o) { o.classList.remove("ativa"); });
        item.classList.add("ativa");
        aoMudar(op.valor);
      });
      var b = document.createElement("b");
      b.textContent = op.titulo;
      var small = document.createElement("small");
      small.textContent = op.texto;
      item.appendChild(input);
      item.appendChild(b);
      item.appendChild(small);
      caixa.appendChild(item);
    });

    campo.appendChild(caixa);
    return campo;
  }

  function campoImagem(nome, caminho, aoTrocar, dica) {
    var caixa = document.createElement("div");
    caixa.className = "imagem-campo";

    var previa = document.createElement("img");
    previa.className = "imagem-previa";
    previa.alt = "";
    if (caminho) previa.src = "/" + caminho;
    caixa.appendChild(previa);

    var corpo = document.createElement("div");
    corpo.className = "imagem-corpo";

    var rotulo = document.createElement("div");
    rotulo.className = "rotulo";
    rotulo.textContent = nome;
    corpo.appendChild(rotulo);

    if (dica) {
      var d = document.createElement("p");
      d.className = "dica";
      d.style.margin = "0";
      d.textContent = dica;
      corpo.appendChild(d);
    }

    var atual = document.createElement("div");
    atual.className = "imagem-caminho";
    atual.textContent = caminho || "sem imagem";
    corpo.appendChild(atual);

    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao botao-vazado";
    botao.textContent = "Trocar imagem";

    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.hidden = true;

    botao.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", async function () {
      var arquivo = input.files && input.files[0];
      if (!arquivo) return;
      botao.disabled = true;
      botao.textContent = "Enviando…";
      try {
        var caminhoNovo = await enviarImagem(arquivo);
        previa.src = "/" + caminhoNovo;
        atual.textContent = caminhoNovo;
        aoTrocar(caminhoNovo);
        avisar("Imagem enviada. Ela entra no ar junto com as próximas alterações.", "ok");
      } catch (e) {
        avisar("Falha ao enviar: " + e.message, "erro");
      } finally {
        botao.disabled = false;
        botao.textContent = "Trocar imagem";
        input.value = "";
      }
    });

    corpo.appendChild(botao);
    corpo.appendChild(input);
    caixa.appendChild(corpo);
    return caixa;
  }

  function lista(itens, titulo, montarCorpo, novo, remontar) {
    var caixa = document.createElement("div");

    itens.forEach(function (item, i) {
      var bloco = document.createElement("div");
      bloco.className = "item";

      var topo = document.createElement("div");
      topo.className = "item-topo";

      var nome = document.createElement("span");
      nome.className = "item-titulo";
      nome.textContent = titulo(item);
      topo.appendChild(nome);

      var botoes = document.createElement("div");
      botoes.className = "item-botoes";
      botoes.appendChild(mini("↑", i === 0, function () {
        itens.splice(i - 1, 0, itens.splice(i, 1)[0]); sujar(); remontar();
      }));
      botoes.appendChild(mini("↓", i === itens.length - 1, function () {
        itens.splice(i + 1, 0, itens.splice(i, 1)[0]); sujar(); remontar();
      }));
      botoes.appendChild(mini("Remover", false, function () {
        itens.splice(i, 1); sujar(); remontar();
      }));
      topo.appendChild(botoes);
      bloco.appendChild(topo);

      var corpo = document.createElement("div");
      montarCorpo(item, corpo);
      bloco.appendChild(corpo);
      caixa.appendChild(bloco);
    });

    var adicionar = document.createElement("button");
    adicionar.type = "button";
    adicionar.className = "botao botao-vazado";
    adicionar.textContent = "Adicionar";
    adicionar.addEventListener("click", function () {
      itens.push(novo());
      sujar();
      remontar();
    });
    caixa.appendChild(adicionar);
    return caixa;
  }

  function mini(texto, desabilitado, aoClicar) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini";
    b.textContent = texto;
    b.disabled = desabilitado;
    b.addEventListener("click", aoClicar);
    return b;
  }

  /* ---------- ABAS ---------- */
  function ligarAbas() {
    var abas = document.querySelectorAll("[data-aba]");
    abas.forEach(function (aba) {
      aba.addEventListener("click", function () {
        abas.forEach(function (a) { a.classList.remove("ativa"); });
        aba.classList.add("ativa");
        document.querySelectorAll("[data-painel-secao]").forEach(function (s) {
          s.hidden = s.dataset.painelSecao !== aba.dataset.aba;
        });
        window.scrollTo(0, 0);
      });
    });
    abas[0].classList.add("ativa");
  }

  /* ---------- GRAVAR ---------- */
  async function salvar() {
    el.salvar.disabled = true;
    avisar("Gravando…");

    try {
      var r1 = await enviarJSON("/api/conteudo", "PUT", {
        arquivo: "site.json", dados: estado.site.dados, sha: estado.site.sha
      });
      estado.site.sha = r1.sha;

      var r2 = await enviarJSON("/api/conteudo", "PUT", {
        arquivo: "imprensa.json", dados: estado.deck.dados, sha: estado.deck.sha
      });
      estado.deck.sha = r2.sha;

      estado.sujo = false;
      avisar("Salvo. O site se atualiza sozinho em um ou dois minutos.", "ok");
    } catch (e) {
      avisar(e.message, "erro");
    } finally {
      el.salvar.disabled = false;
    }
  }

  async function sair() {
    await fetch("/api/auth?acao=sair", { method: "POST" }).catch(function () {});
    location.reload();
  }

  function sujar() {
    estado.sujo = true;
    if (el.estado.classList.contains("ok")) avisar("");
  }

  function avisar(texto, tipo) {
    el.estado.textContent = texto || "";
    el.estado.className = "estado" + (tipo ? " " + tipo : "");
  }

  /* ---------- REDE ---------- */
  async function pegarJSON(url) {
    var r = await fetch(url, { cache: "no-store" });
    var dados = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var erro = new Error(dados.erro || (r.status === 401 ? "sessão expirada" : "erro " + r.status));
      erro.dados = dados;  // o corpo do 401 ainda traz informação útil
      erro.status = r.status;
      throw erro;
    }
    return dados;
  }

  async function pegarTexto(url) {
    var r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("não foi possível ler " + url);
    return r.text();
  }

  async function enviarJSON(url, metodo, corpo) {
    var r = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    var dados = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(dados.erro || ("erro " + r.status));
    return dados;
  }

  function enviarImagem(arquivo) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onerror = function () { reject(new Error("não foi possível ler o arquivo")); };
      leitor.onload = async function () {
        try {
          var r = await enviarJSON("/api/upload", "POST", {
            nome: arquivo.name,
            conteudo: String(leitor.result)
          });
          resolve(r.caminho);
        } catch (e) {
          reject(e);
        }
      };
      leitor.readAsDataURL(arquivo);
    });
  }
})();
