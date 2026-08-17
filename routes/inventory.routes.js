const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

/**
 * Valida o corpo de uma requisição de criação/atualização de item de estoque.
 * @param {object} body - corpo da requisição
 * @param {boolean} parcial - se true, só valida os campos presentes (usado no PUT)
 */
function validarItem(body, parcial = false) {
  const { item, quantidade, unidade } = body;

  if (!parcial || item !== undefined) {
    if (!item || typeof item !== 'string' || !item.trim()) {
      const erro = new Error('O campo "item" é obrigatório e deve ser um texto válido.');
      erro.statusCode = 400;
      throw erro;
    }
  }

  if (!parcial || quantidade !== undefined) {
    if (quantidade === undefined || quantidade === null || Number.isNaN(Number(quantidade)) || Number(quantidade) < 0) {
      const erro = new Error('O campo "quantidade" é obrigatório e deve ser um número maior ou igual a zero.');
      erro.statusCode = 400;
      throw erro;
    }
  }

  if (!parcial && (!unidade || !String(unidade).trim())) {
    const erro = new Error('O campo "unidade" é obrigatório (ex: kg, un, l, cx).');
    erro.statusCode = 400;
    throw erro;
  }
}

/**
 * GET /api/estoque
 * Lista todos os itens do estoque. Aceita filtro opcional: /api/estoque?busca=feijao
 */
router.get('/', (req, res, next) => {
  try {
    const { busca } = req.query;

    const itens = busca
      ? db.prepare('SELECT * FROM estoque WHERE item LIKE ? ORDER BY item ASC').all(`%${busca}%`)
      : db.prepare('SELECT * FROM estoque ORDER BY item ASC').all();

    res.json(itens);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/estoque/alertas/baixo
 * Lista os itens cuja quantidade está no ou abaixo do estoque mínimo definido.
 * OBS: precisa vir antes de "/:id" para não ser interpretada como um id.
 */
router.get('/alertas/baixo', (req, res, next) => {
  try {
    const itens = db
      .prepare(
        `SELECT * FROM estoque
         WHERE estoque_minimo > 0 AND quantidade <= estoque_minimo
         ORDER BY quantidade ASC`
      )
      .all();

    res.json(itens);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/estoque/:id
 * Retorna um único item de estoque pelo id.
 */
router.get('/:id', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id);

    if (!item) {
      const erro = new Error('Item de estoque não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/estoque
 * Cria um novo item de estoque.
 * Body: { item, categoria?, quantidade, unidade, estoque_minimo? }
 */
router.post('/', (req, res, next) => {
  try {
    validarItem(req.body);

    const { item, categoria, quantidade, unidade, estoque_minimo: estoqueMinimo } = req.body;

    const resultado = db
      .prepare(
        `INSERT INTO estoque (item, categoria, quantidade, unidade, estoque_minimo)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        item.trim(),
        categoria && String(categoria).trim() ? String(categoria).trim() : 'Geral',
        Number(quantidade),
        String(unidade).trim(),
        estoqueMinimo ? Number(estoqueMinimo) : 0
      );

    const itemCriado = db
      .prepare('SELECT * FROM estoque WHERE id = ?')
      .get(resultado.lastInsertRowid);

    res.status(201).json(itemCriado);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/estoque/:id
 * Atualiza um item de estoque existente (aceita atualização parcial).
 */
router.put('/:id', (req, res, next) => {
  try {
    const existente = db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id);

    if (!existente) {
      const erro = new Error('Item de estoque não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    validarItem(req.body, true);

    const dados = {
      item: req.body.item !== undefined ? String(req.body.item).trim() : existente.item,
      categoria:
        req.body.categoria !== undefined ? String(req.body.categoria).trim() || 'Geral' : existente.categoria,
      quantidade: req.body.quantidade !== undefined ? Number(req.body.quantidade) : existente.quantidade,
      unidade: req.body.unidade !== undefined ? String(req.body.unidade).trim() : existente.unidade,
      estoque_minimo:
        req.body.estoque_minimo !== undefined ? Number(req.body.estoque_minimo) : existente.estoque_minimo,
    };

    db.prepare(
      `UPDATE estoque
       SET item = ?, categoria = ?, quantidade = ?, unidade = ?, estoque_minimo = ?,
           atualizado_em = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(dados.item, dados.categoria, dados.quantidade, dados.unidade, dados.estoque_minimo, req.params.id);

    const itemAtualizado = db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id);
    res.json(itemAtualizado);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/estoque/:id
 * Remove um item do estoque.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const existente = db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id);

    if (!existente) {
      const erro = new Error('Item de estoque não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }

    db.prepare('DELETE FROM estoque WHERE id = ?').run(req.params.id);

    res.status(200).json({ mensagem: 'Item removido com sucesso.', item: existente });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
