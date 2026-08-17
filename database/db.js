const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const CAMINHO_BD = path.join(__dirname, 'ong_gestao.db');

// Conexão única com o banco, reutilizada em toda a aplicação.
// node:sqlite é um módulo nativo embutido no Node.js (>= 22.5.0), então
// não é necessário compilar nada nem instalar Visual Studio Build Tools.
const db = new DatabaseSync(CAMINHO_BD);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Cria as tabelas do banco de dados (caso não existam) e popula
 * a tabela de regiões com dados iniciais para o mapa de calor.
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS regioes (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      regiao_id  INTEGER NOT NULL,
      data_hora  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      observacao TEXT,
      FOREIGN KEY (regiao_id) REFERENCES regioes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS estoque (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      item           TEXT NOT NULL,
      categoria      TEXT NOT NULL DEFAULT 'Geral',
      quantidade     REAL NOT NULL DEFAULT 0,
      unidade        TEXT NOT NULL DEFAULT 'kg',
      estoque_minimo REAL NOT NULL DEFAULT 0,
      atualizado_em  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Popula regiões padrão apenas se a tabela estiver vazia
  const totalRegioes = db.prepare('SELECT COUNT(*) AS total FROM regioes').get().total;

  if (totalRegioes === 0) {
    const regioesIniciais = [
      'Centro',
      'Zona Norte',
      'Zona Sul',
      'Zona Leste',
      'Zona Oeste',
      'Periferia A',
      'Periferia B',
      'Distrito Industrial',
    ];

    const inserir = db.prepare('INSERT INTO regioes (nome) VALUES (?)');

    db.exec('BEGIN');
    try {
      regioesIniciais.forEach((nome) => inserir.run(nome));
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    console.log('🌱 Regiões padrão inseridas no banco de dados.');
  }

  console.log('✅ Banco de dados inicializado com sucesso.');
}

module.exports = { db, initDatabase };
