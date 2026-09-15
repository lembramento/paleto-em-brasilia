"use strict";

// Leitura e gravação do conteúdo do site.
//   GET  /api/conteudo?arquivo=site.json  → JSON atual + sha
//   PUT  /api/conteudo                    → grava (commit no repositório)
//
// A leitura vem do GitHub, e não do arquivo publicado, porque logo após uma
// gravação a versão no ar ainda é a antiga: editar em cima dela desfaria o que
// o colega acabou de salvar.

const { exigirSessao, lerArquivo, gravarArquivo } = require("./_lib");

// Só estes dois arquivos podem ser escritos por aqui. Sem a lista, um caminho
// vindo do navegador poderia alcançar qualquer arquivo do repositório.
const PERMITIDOS = new Set(["content/site.json", "content/imprensa.json"]);

function caminhoDe(nome) {
  const arquivo = `content/${String(nome || "").replace(/[^a-z0-9._-]/gi, "")}`;
  return PERMITIDOS.has(arquivo) ? arquivo : null;
}

module.exports = async function handler(req, res) {
  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  try {
    if (req.method === "GET") {
      const arquivo = caminhoDe(req.query && req.query.arquivo);
      if (!arquivo) return res.status(400).json({ erro: "arquivo inválido" });

      const atual = await lerArquivo(arquivo);
      if (!atual) return res.status(200).json({ dados: null, sha: null });

      let dados;
      try {
        dados = JSON.parse(atual.conteudo);
      } catch (e) {
        return res.status(500).json({ erro: "o arquivo no repositório não é JSON válido" });
      }
      return res.status(200).json({ dados, sha: atual.sha });
    }

    if (req.method === "PUT") {
      const corpo = req.body || {};
      const arquivo = caminhoDe(corpo.arquivo);
      if (!arquivo) return res.status(400).json({ erro: "arquivo inválido" });
      if (!corpo.dados || typeof corpo.dados !== "object") {
        return res.status(400).json({ erro: "dados ausentes" });
      }

      const texto = JSON.stringify(corpo.dados, null, 2) + "\n";
      if (texto.length > 400000) return res.status(413).json({ erro: "conteúdo grande demais" });

      const resultado = await gravarArquivo(
        arquivo,
        Buffer.from(texto, "utf8").toString("base64"),
        `Conteúdo: ${arquivo.replace("content/", "")} via painel (${sessao.email})`,
        corpo.sha || undefined,
        { name: sessao.nome || "Painel Paletó", email: sessao.email }
      );

      return res.status(200).json({
        ok: true,
        sha: resultado.content && resultado.content.sha,
        commit: resultado.commit && resultado.commit.html_url
      });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ erro: "método não permitido" });
  } catch (e) {
    // 409 = alguém gravou entre a sua leitura e a sua gravação.
    if (e.status === 409) {
      return res.status(409).json({ erro: "o conteúdo mudou desde que você abriu o painel — recarregue e refaça a edição" });
    }
    return res.status(500).json({ erro: e.message || "falha ao gravar" });
  }
};
