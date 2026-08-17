const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

/**
 * GET /api/mapa/regioes
 * Lista todas as regiões cadastradas (usado para popular o seletor no frontend).
 */
router.get('/regioes', (req, res, next) => {
  try {
    const regioes = db.prepare('SELECT id, nome FROM regioes ORDER BY nome ASC').all();
    res.json(regioes);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mapa/visita
 * Registra uma nova visita em uma região.
 * Body: { regiao_id: number, observacao?: string }
 */
router.post('/visita', (req, res, next) => {
  try {
    const { regiao_id: regiaoId, observacao } = req.body;

    if (!regiaoId) {
      const erro = new Error('O campo "regiao_id" é obrigatório.');
      erro.statusCode = 400;
      throw erro;
    }

    const regiaoExiste = db.prepare('SELECT id FROM regioes WHERE id = ?').get(regiaoId);
    if (!regiaoExiste) {
      const erro = new Error('Região não encontrada.');
      erro.statusCode = 404;
      throw erro;
    }

    const resultado = db
      .prepare('INSERT INTO visitas (regiao_id, observacao) VALUES (?, ?)')
      .run(regiaoId, observacao ? String(observacao).trim() : null);

    const visitaCriada = db
      .prepare('SELECT * FROM visitas WHERE id = ?')
      .get(resultado.lastInsertRowid);

    res.status(201).json(visitaCriada);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mapa/calor
 * Retorna, para cada região, o total de visitas e uma "intensidade"
 * normalizada entre 0 e 1 (usada pelo frontend para pintar o mapa de calor:
 * valores próximos de 1 = cor quente / região muito visitada,
 * valores próximos de 0 = cor fria / região esquecida).
 */
router.get('/calor', (req, res, next) => {
  try {
    const dados = db
      .prepare(
        `SELECT r.id,
                r.nome,
                COUNT(v.id)      AS total_visitas,
                MAX(v.data_hora) AS ultima_visita
         FROM regioes r
         LEFT JOIN visitas v ON v.regiao_id = r.id
         GROUP BY r.id, r.nome
         ORDER BY total_visitas DESC`
      )
      .all();

    const maxVisitas = Math.max(1, ...dados.map((d) => d.total_visitas));

    const resposta = dados.map((d) => ({
      id: d.id,
      nome: d.nome,
      total_visitas: d.total_visitas,
      ultima_visita: d.ultima_visita,
      intensidade: Number((d.total_visitas / maxVisitas).toFixed(2)),
    }));

    res.json(resposta);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
