/**
 * Middleware simples de log de requisições HTTP.
 * Registra método, rota, status de resposta e tempo de execução.
 */
function logger(req, res, next) {
  const inicio = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duracaoMs = Date.now() - inicio;
    const timestamp = new Date().toISOString();
    const nivel = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';

    console.log(
      `${nivel} [${timestamp}] ${method} ${originalUrl} -> ${res.statusCode} (${duracaoMs}ms)`
    );
  });

  next();
}

module.exports = logger;
