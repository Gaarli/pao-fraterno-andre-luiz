const API_BASE = '/api';

// ========== Utilitários ==========

function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `toast ${tipo}`;
  toast.classList.remove('oculto');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('oculto');
  }, 3000);
}

async function requisitar(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.mensagem || 'Erro na requisição.');
  }

  return dados;
}

// Interpola cor entre azul (frio/pouco visitada) e vermelho (quente/muito visitada),
// passando por amarelo no meio do caminho — clássico gradiente de mapa de calor.
function corPorIntensidade(intensidade) {
  const paradas = [
    { i: 0, cor: [59, 130, 246] }, // azul
    { i: 0.5, cor: [250, 204, 21] }, // amarelo
    { i: 1, cor: [239, 68, 68] }, // vermelho
  ];

  let inicio = paradas[0];
  let fim = paradas[paradas.length - 1];

  for (let k = 0; k < paradas.length - 1; k += 1) {
    if (intensidade >= paradas[k].i && intensidade <= paradas[k + 1].i) {
      inicio = paradas[k];
      fim = paradas[k + 1];
      break;
    }
  }

  const proporcao = fim.i === inicio.i ? 0 : (intensidade - inicio.i) / (fim.i - inicio.i);

  const r = Math.round(inicio.cor[0] + (fim.cor[0] - inicio.cor[0]) * proporcao);
  const g = Math.round(inicio.cor[1] + (fim.cor[1] - inicio.cor[1]) * proporcao);
  const b = Math.round(inicio.cor[2] + (fim.cor[2] - inicio.cor[2]) * proporcao);

  return `rgb(${r}, ${g}, ${b})`;
}

// ========== Mapa de Calor ==========

async function carregarRegioes() {
  const select = document.getElementById('select-regiao');
  try {
    const regioes = await requisitar(`${API_BASE}/mapa/regioes`);

    select.innerHTML = '<option value="" disabled selected>Selecione uma região...</option>';
    regioes.forEach((regiao) => {
      const opcao = document.createElement('option');
      opcao.value = regiao.id;
      opcao.textContent = regiao.nome;
      select.appendChild(opcao);
    });
  } catch (err) {
    mostrarToast('Erro ao carregar regiões.', 'erro');
  }
}

async function carregarMapaCalor() {
  const grid = document.getElementById('grid-regioes');
  try {
    const dados = await requisitar(`${API_BASE}/mapa/calor`);

    if (dados.length === 0) {
      grid.innerHTML = '<p class="carregando">Nenhuma região cadastrada.</p>';
      return;
    }

    grid.innerHTML = '';
    dados.forEach((regiao) => {
      const card = document.createElement('div');
      card.className = 'card-regiao';
      card.style.backgroundColor = corPorIntensidade(regiao.intensidade);

      const ultimaVisita = regiao.ultima_visita
        ? new Date(regiao.ultima_visita.replace(' ', 'T')).toLocaleString('pt-BR')
        : 'Sem visitas registradas';

      card.innerHTML = `
        <h3>${regiao.nome}</h3>
        <p class="total-visitas">${regiao.total_visitas} visita(s)</p>
        <p class="ultima-visita">Última: ${ultimaVisita}</p>
      `;

      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<p class="carregando">Erro ao carregar o mapa de calor.</p>';
  }
}

async function registrarVisita(evento) {
  evento.preventDefault();

  const regiaoId = document.getElementById('select-regiao').value;
  const observacao = document.getElementById('input-observacao').value.trim();

  if (!regiaoId) {
    mostrarToast('Selecione uma região.', 'erro');
    return;
  }

  try {
    await requisitar(`${API_BASE}/mapa/visita`, {
      method: 'POST',
      body: JSON.stringify({ regiao_id: Number(regiaoId), observacao }),
    });

    document.getElementById('input-observacao').value = '';
    mostrarToast('Visita registrada com sucesso!');
    await carregarMapaCalor();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

// ========== Estoque ==========

let itensEstoqueCache = [];

async function carregarEstoque(busca = '') {
  const corpo = document.getElementById('corpo-tabela-estoque');
  try {
    const url = busca
      ? `${API_BASE}/estoque?busca=${encodeURIComponent(busca)}`
      : `${API_BASE}/estoque`;

    const itens = await requisitar(url);
    itensEstoqueCache = itens;

    if (itens.length === 0) {
      corpo.innerHTML = '<tr><td colspan="7" class="carregando">Nenhum item encontrado.</td></tr>';
      return;
    }

    corpo.innerHTML = '';
    itens.forEach((item) => {
      const abaixoDoMinimo = item.estoque_minimo > 0 && item.quantidade <= item.estoque_minimo;
      const linha = document.createElement('tr');
      if (abaixoDoMinimo) linha.classList.add('linha-alerta');

      const atualizado = item.atualizado_em
        ? new Date(item.atualizado_em.replace(' ', 'T')).toLocaleString('pt-BR')
        : '-';

      linha.innerHTML = `
        <td>${item.item}${abaixoDoMinimo ? ' ⚠️' : ''}</td>
        <td>${item.categoria}</td>
        <td>${item.quantidade}</td>
        <td>${item.unidade}</td>
        <td>${item.estoque_minimo}</td>
        <td>${atualizado}</td>
        <td class="acoes-tabela">
          <button class="btn btn-icone" data-acao="editar" data-id="${item.id}" title="Editar" type="button">✏️</button>
          <button class="btn btn-icone" data-acao="excluir" data-id="${item.id}" title="Excluir" type="button">🗑️</button>
        </td>
      `;

      corpo.appendChild(linha);
    });
  } catch (err) {
    corpo.innerHTML = '<tr><td colspan="7" class="carregando">Erro ao carregar o estoque.</td></tr>';
  }
}

function abrirModalItem(item = null) {
  const modal = document.getElementById('modal-item');
  const titulo = document.getElementById('modal-titulo');

  document.getElementById('form-item').reset();

  if (item) {
    titulo.textContent = 'Editar Item de Estoque';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-nome').value = item.item;
    document.getElementById('item-categoria').value = item.categoria;
    document.getElementById('item-quantidade').value = item.quantidade;
    document.getElementById('item-unidade').value = item.unidade;
    document.getElementById('item-minimo').value = item.estoque_minimo;
  } else {
    titulo.textContent = 'Novo Item de Estoque';
    document.getElementById('item-id').value = '';
  }

  modal.classList.remove('oculto');
}

function fecharModalItem() {
  document.getElementById('modal-item').classList.add('oculto');
}

async function salvarItem(evento) {
  evento.preventDefault();

  const id = document.getElementById('item-id').value;
  const corpo = {
    item: document.getElementById('item-nome').value.trim(),
    categoria: document.getElementById('item-categoria').value.trim() || 'Geral',
    quantidade: Number(document.getElementById('item-quantidade').value),
    unidade: document.getElementById('item-unidade').value.trim(),
    estoque_minimo: Number(document.getElementById('item-minimo').value) || 0,
  };

  try {
    if (id) {
      await requisitar(`${API_BASE}/estoque/${id}`, {
        method: 'PUT',
        body: JSON.stringify(corpo),
      });
      mostrarToast('Item atualizado com sucesso!');
    } else {
      await requisitar(`${API_BASE}/estoque`, {
        method: 'POST',
        body: JSON.stringify(corpo),
      });
      mostrarToast('Item criado com sucesso!');
    }

    fecharModalItem();
    await carregarEstoque();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

async function excluirItem(id) {
  if (!window.confirm('Tem certeza que deseja remover este item do estoque?')) return;

  try {
    await requisitar(`${API_BASE}/estoque/${id}`, { method: 'DELETE' });
    mostrarToast('Item removido com sucesso!');
    await carregarEstoque();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

// ========== Inicialização e Eventos ==========

function configurarEventos() {
  document.getElementById('form-visita').addEventListener('submit', registrarVisita);
  document.getElementById('btn-atualizar-mapa').addEventListener('click', carregarMapaCalor);

  document.getElementById('btn-novo-item').addEventListener('click', () => abrirModalItem());
  document.getElementById('btn-cancelar-item').addEventListener('click', fecharModalItem);
  document.getElementById('form-item').addEventListener('submit', salvarItem);

  document.getElementById('modal-item').addEventListener('click', (evento) => {
    if (evento.target.id === 'modal-item') fecharModalItem();
  });

  document.getElementById('corpo-tabela-estoque').addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;

    const { id, acao } = botao.dataset;

    if (acao === 'editar') {
      const item = itensEstoqueCache.find((i) => String(i.id) === id);
      if (item) abrirModalItem(item);
    } else if (acao === 'excluir') {
      excluirItem(id);
    }
  });

  let temporizadorBusca;
  document.getElementById('input-busca').addEventListener('input', (evento) => {
    clearTimeout(temporizadorBusca);
    const valor = evento.target.value.trim();
    temporizadorBusca = setTimeout(() => carregarEstoque(valor), 300);
  });
}

async function iniciar() {
  configurarEventos();
  await Promise.all([carregarRegioes(), carregarMapaCalor(), carregarEstoque()]);

  // Atualiza o mapa de calor automaticamente a cada 30 segundos
  setInterval(carregarMapaCalor, 30000);
}

document.addEventListener('DOMContentLoaded', iniciar);
