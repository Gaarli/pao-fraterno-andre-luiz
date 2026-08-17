/**
 * Middleware para capturar requisições feitas a rotas de API inexistentes.
 * Deve ser registrado logo após as rotas da aplicação.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    erro: true,
    mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Middleware centralizado de tratamento de erros.
 * Deve ser o ÚLTIMO middleware registrado na aplicação (app.use(errorHandler)).
 * Qualquer erro lançado (ou passado via next(err)) nas rotas cai aqui.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  console.error(`❌ [${new Date().toISOString()}] Erro: ${err.message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    erro: true,
    mensagem: err.message || 'Erro interno no servidor.',
  });
}

module.exports = { notFoundHandler, errorHandler };
