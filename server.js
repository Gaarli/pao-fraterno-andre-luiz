require('dotenv').config();

const express = require('express');
const path = require('path');

const { initDatabase } = require('./database/db');
const logger = require('./middlewares/logger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const mapRoutes = require('./routes/map.routes');
const inventoryRoutes = require('./routes/inventory.routes');

// Garante que as tabelas existam (e popula dados iniciais) antes de subir o servidor
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Middlewares globais -----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// ----- Arquivos estáticos do frontend -----
app.use(express.static(path.join(__dirname, 'public')));

// ----- Rotas da API -----
app.use('/api/mapa', mapRoutes);
app.use('/api/estoque', inventoryRoutes);

// Rota simples de verificação de saúde da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----- Tratamento de erros (sempre por último) -----
app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
