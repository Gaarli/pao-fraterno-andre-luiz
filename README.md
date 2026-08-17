# Painel de Gestão Logística — ONG

Aplicação web para gestão logística e de estoque de uma ONG, com:

- **Mapa de calor dinâmico de visitas**: regiões mais visitadas ficam "quentes" (vermelho/laranja) e regiões esquecidas ficam "frias" (azul).
- **Gerenciador de estoque**: CRUD completo de insumos (ex: Feijão - 50kg).

Stack: **Node.js + Express + SQLite (`node:sqlite`, nativo do Node)**, frontend em HTML/CSS/JS puro consumindo a API via `fetch`.

> ⚠️ **Requer Node.js 22.5 ou superior** (idealmente 22.13+/23.4+, onde o `node:sqlite` já vem sem precisar de flag). O projeto usa o módulo `node:sqlite`, embutido no próprio Node — por isso **não há dependências nativas para compilar** (nada de Visual Studio Build Tools, Python, etc.).

## Estrutura do projeto

```
ong-gestao/
├── server.js                 # Inicialização do Express
├── .env                       # Variáveis de ambiente (porta, etc.)
├── database/
│   └── db.js                  # Conexão e criação das tabelas SQLite
├── middlewares/
│   ├── logger.js               # Log de requisições
│   └── errorHandler.js         # Tratamento centralizado de erros / 404
├── routes/
│   ├── map.routes.js           # Rotas do mapa de calor (/api/mapa)
│   └── inventory.routes.js     # Rotas CRUD do estoque (/api/estoque)
└── public/
    ├── index.html               # Dashboard
    ├── style.css                # Estilos
    └── app.js                   # Consumo da API via fetch
```

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
npm start
# ou, em modo desenvolvimento com auto-reload:
npm run dev

# 3. Abrir no navegador
http://localhost:3000
```

O banco `database/ong_gestao.db` é criado automaticamente na primeira execução, já com 8 regiões de exemplo cadastradas.

## Endpoints da API

### Mapa de calor
| Método | Rota                  | Descrição                                   |
|--------|------------------------|----------------------------------------------|
| GET    | `/api/mapa/regioes`    | Lista as regiões cadastradas                  |
| POST   | `/api/mapa/visita`     | Registra uma visita `{ regiao_id, observacao? }` |
| GET    | `/api/mapa/calor`      | Retorna total de visitas + intensidade (0–1) por região |

### Estoque
| Método | Rota                          | Descrição                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/api/estoque`                 | Lista itens (aceita `?busca=`)        |
| GET    | `/api/estoque/alertas/baixo`   | Itens no ou abaixo do estoque mínimo  |
| GET    | `/api/estoque/:id`             | Detalhe de um item                    |
| POST   | `/api/estoque`                 | Cria item `{ item, categoria?, quantidade, unidade, estoque_minimo? }` |
| PUT    | `/api/estoque/:id`             | Atualiza item (parcial)               |
| DELETE | `/api/estoque/:id`             | Remove item                           |

## Notas

- O `node:sqlite` ainda é marcado como **experimental** pelo Node.js — ao rodar o servidor você pode ver um aviso `ExperimentalWarning: SQLite is an experimental feature`. Isso é normal e não afeta o funcionamento.
- Para adicionar novas regiões, basta inserir na tabela `regioes` do banco (ou criar uma rota `POST /api/mapa/regioes`, se desejar expandir o projeto).
