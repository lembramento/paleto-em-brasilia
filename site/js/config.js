// Tweaks do site — edite aqui sem mexer no resto do código.
window.SITE_CONFIG = {
  // Link de pré-save / streaming (LANDR, etc.)
  preSaveUrl: "https://release.landr.com/991048912632",

  // Lançamento em destaque. Controla a tarja da capa E o fluxo "Receba a
  // intimação" — os dois se ajustam à fase, para reaproveitar nos próximos singles.
  //
  // fase: "streaming" → single já no ar: tarja aparece na capa e o fluxo manda
  //                     o público ouvir (botão "Ouvir agora" → smartLink).
  // fase: "presave"   → próximo single: tarja some e o fluxo volta ao texto de
  //                     pré-save do Articulista (botão → preSaveUrl acima).
  //
  // Para o próximo lançamento: troque fase para "presave", atualize preSaveUrl,
  // e quando sair troque fase para "streaming" com o novo smartLink e título.
  lancamento: {
    ativo: true,
    fase: "streaming",
    titulo: "Do meio ao fim",
    // Smart link do LANDR — destino padrão de todos os botões abaixo.
    smartLink: "https://release.landr.com/domeioaofim",
    // Plataformas listadas na tarja. Enquanto "url" estiver vazio, o botão
    // aponta para o smartLink acima; cole a URL direta da faixa em cada
    // serviço para o link ir direto pra lá.
    // ATENÇÃO: confira esta lista — deixe só onde a faixa está mesmo no ar.
    plataformas: [
      { nome: "Spotify", url: "" },
      { nome: "Apple Music", url: "" },
      { nome: "YouTube Music", url: "" },
      { nome: "Deezer", url: "" },
      { nome: "Amazon Music", url: "" },
      { nome: "Tidal", url: "" },
    ],
  },

  // Perfil do Instagram da banda
  instagramUrl: "https://instagram.com/",

  // Link da apresentação para parceiros e imprensa (link discreto no rodapé). "#" = link inativo.
  pressReleaseUrl: "imprensa.html",

  // Mostrar ou não a seção "Pronunciamentos"
  mostrarArquivo: true,

  // Canal do YouTube da banda
  youtubeChannelUrl: "https://youtube.com/@paletoembrasilia.oficial",

  // Pronunciamentos. Para ativar uma linha, cole o ID do vídeo do YouTube em
  // "youtubeId" — é o trecho de 11 caracteres depois de "watch?v=" (vídeo
  // normal) ou de "/shorts/" (Short) na URL.
  // Linha com ID vira clicável e abre o player ali mesmo; linha sem ID fica
  // no estado "selado" (apagada, sem botão de play).
  // "vertical: true" para Shorts (proporção 9:16); omita para vídeo 16:9.
  pronunciamentos: [
    {
      numero: "Nº 1",
      pt: "&ldquo;Chegou-se a um consenso.&rdquo;",
      en: "&ldquo;A consensus has been reached.&rdquo;",
      duracao: "—",
      youtubeId: "VrldpRqUGf0",
      vertical: true,
    },
    {
      numero: "Nº 2",
      pt: "&ldquo;Serão três.&rdquo;",
      en: "&ldquo;There will be three.&rdquo;",
      duracao: "—",
      youtubeId: "F6vwOhpka2M",
      vertical: true,
    },
    {
      numero: "Nº 3",
      pt: "Registro selado.",
      en: "Record sealed.",
      duracao: "—",
      youtubeId: "dYAHoWspIgs",
      vertical: true,
    },
  ],

  // MailerLite — endpoint do formulário embutido (Forms → Embedded forms).
  // Gerado pela conta MailerLite conectada; não é uma chave secreta, é o
  // endpoint público de submissão do formulário.
  mailerlite: {
    action: "https://assets.mailerlite.com/jsonp/2613474/forms/197598446476067891/subscribe",
  },
};
