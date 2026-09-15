"use strict";

// Envio de imagens pelo painel. O arquivo vira um commit em site/img/uploads/
// e o painel recebe de volta o caminho para gravar no conteúdo.
//
// SVG fica de fora de propósito: um SVG pode conter script e seria servido do
// mesmo domínio do site, virando um caminho para injetar código na página.

const { exigirSessao, gravarArquivo } = require("./_lib");

const TIPOS = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif"
};

// A Vercel corta requisições acima de ~4,5 MB; o limite abaixo é do arquivo em
// si, já descontando o crescimento de ~33% da codificação base64.
const LIMITE_BYTES = 3 * 1024 * 1024;

function nomeSeguro(nome) {
  const base = String(nome || "imagem")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "imagem";
  return base;
}

module.exports = async function handler(req, res) {
  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "método não permitido" });
  }

  try {
    const { nome, conteudo } = req.body || {};
    if (!conteudo) return res.status(400).json({ erro: "arquivo ausente" });

    const extensao = String(nome || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = extensao && extensao[1];
    if (!ext || !TIPOS[ext]) {
      return res.status(400).json({ erro: "formato não aceito — use JPG, PNG, WebP ou AVIF" });
    }

    const base64 = String(conteudo).replace(/^data:[^;]+;base64,/, "");
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes > LIMITE_BYTES) {
      return res.status(413).json({ erro: "imagem acima de 3 MB — reduza antes de enviar" });
    }

    // Carimbo no nome evita sobrescrever uma imagem ainda em uso por outra
    // parte do site quando dois arquivos chegam com o mesmo nome.
    const carimbo = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const caminho = `img/uploads/${nomeSeguro(nome)}-${carimbo}-${Date.now().toString(36)}.${ext}`;

    await gravarArquivo(
      caminho,
      base64,
      `Imagem: ${caminho.split("/").pop()} via painel (${sessao.email})`,
      undefined,
      { name: sessao.nome || "Painel Paletó", email: sessao.email }
    );

    return res.status(200).json({ ok: true, caminho });
  } catch (e) {
    return res.status(500).json({ erro: e.message || "falha ao enviar a imagem" });
  }
};
