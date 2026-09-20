/* ============================================================================
   MapRenderer.js — desenha a tela de mapa: sempre 3 rotas (ou 1, em ondas
   de Colheita). Cada card mostra tipo, ícone e um pequeno flavor text.
   ============================================================================ */
const FLAVOR = {
  combat: 'Um Arauto guarda esta passagem. Encare-o para seguir em frente.',
  shop: 'Luzes de um Entreposto piscam ao longe — talvez valha negociar.',
  event: 'Algo neste caminho não pertence inteiramente a este mundo.',
  mystery: 'A bruma engole qualquer sinal do que espera adiante.',
  boss: 'O ar pesa. Uma Colheita aguarda no fim deste caminho.',
};

export class MapRenderer {
  constructor(root, { onChoose }) {
    this.root = root;
    this.onChoose = onChoose;
    this.listEl = root.querySelector('#mapNodes');
    this.depthEl = root.querySelector('#mapDepth');
  }

  render(runState) {
    this.depthEl.textContent = `Profundidade ${runState.depth}`;
    this.listEl.innerHTML = '';
    this.listEl.classList.toggle('single', runState.currentWave.length === 1);
    runState.currentWave.forEach(node => {
      const card = document.createElement('button');
      card.className = `map-node map-node--${node.type}`;
      card.innerHTML = `
        <span class="map-node__icon">${node.icon}</span>
        <span class="map-node__label">${node.label}</span>
        <span class="map-node__flavor">${FLAVOR[node.type] || ''}</span>
      `;
      card.addEventListener('click', () => this.onChoose(node.id));
      this.listEl.appendChild(card);
    });
  }
}
