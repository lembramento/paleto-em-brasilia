// Tweaks do site — edite aqui sem mexer no resto do código.
window.SITE_CONFIG = {
  // Link de pré-save / streaming (LANDR, etc.)
  preSaveUrl: "https://release.landr.com/991048912632",

  // Perfil do Instagram da banda
  instagramUrl: "https://instagram.com/",

  // URL do PDF do press release (link discreto no rodapé). "#" = link inativo.
  pressReleaseUrl: "#",

  // Mostrar ou não a seção "Pronunciamentos"
  mostrarArquivo: true,

  // Canal do YouTube da banda
  youtubeChannelUrl: "https://youtube.com/@paletoembrasilia.oficial",

  // Pronunciamentos. Para ativar uma linha, cole o ID do vídeo do YouTube em
  // "youtubeId" — é o trecho de 11 caracteres depois de "watch?v=" na URL
  // (ex.: https://www.youtube.com/watch?v=dQw4w9WgXcQ → "dQw4w9WgXcQ").
  // Linha com ID vira clicável e abre o player ali mesmo; linha sem ID fica
  // no estado "selado" (apagada, sem botão de play).
  pronunciamentos: [
    {
      numero: "Nº 1",
      pt: "&ldquo;Chegou-se a um consenso.&rdquo;",
      en: "&ldquo;A consensus has been reached.&rdquo;",
      duracao: "00:28",
      youtubeId: "",
    },
    {
      numero: "Nº 2",
      pt: "&ldquo;Serão três.&rdquo;",
      en: "&ldquo;There will be three.&rdquo;",
      duracao: "00:30",
      youtubeId: "",
    },
    {
      numero: "Nº 3",
      pt: "Registro selado.",
      en: "Record sealed.",
      duracao: "--:--",
      youtubeId: "",
    },
  ],

  // MailerLite — endpoint do formulário embutido (Forms → Embedded forms).
  // Gerado pela conta MailerLite conectada; não é uma chave secreta, é o
  // endpoint público de submissão do formulário.
  mailerlite: {
    action: "https://assets.mailerlite.com/jsonp/2613474/forms/197598446476067891/subscribe",
  },
};
