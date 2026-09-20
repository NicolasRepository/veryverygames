import { ElementCatalog } from '../data/ElementCatalog.js';
import { ShapeCatalog } from '../data/ShapeCatalog.js';
import { FOE_ARCHETYPES, FOE_PREFIXES, BOSS_PREFIX } from '../data/FoeArchetypes.js';

/* ============================================================================
   ModalRenderer.js — responsável apenas pelo overlay modal genérico:
   recompensas pós-Confronto, tela de fim de jogo, o Inventário de Relíquias
   e o Compêndio (catálogo completo de tudo que o jogo pode liberar).
   ============================================================================ */
export class ModalRenderer {
  constructor(root) {
    this.overlay = root.querySelector('#overlay');
    this.modal = root.querySelector('#modal');
  }

  show(html) { this.modal.innerHTML = html; this.overlay.hidden = false; }
  hide() { this.overlay.hidden = true; }

  /** Desenha a matriz de blocos de uma peça (reutilizado por várias telas). */
  static pieceMatrix(piece, { blockSize = '10px', gap = '3px' } = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = gap;
    wrap.style.gridTemplateColumns = `repeat(${piece.width}, auto)`;
    const filled = new Set(piece.cells.map(([r, c]) => `${r}:${c}`));
    for (let r = 0; r < piece.height; r++) {
      for (let c = 0; c < piece.width; c++) {
        const b = document.createElement('div');
        const on = filled.has(`${r}:${c}`);
        b.style.width = blockSize;
        b.style.height = blockSize;
        b.style.borderRadius = '3px';
        b.style.background = on ? piece.element.css : 'transparent';
        if (on) b.style.boxShadow = 'inset 0 -2px 0 rgba(0,0,0,.3)';
        wrap.appendChild(b);
      }
    }
    return wrap;
  }

  /** Desenha a matriz de blocos de uma FORMA crua do ShapeCatalog (sem elemento associado). */
  static shapeMatrix(shapeDef, { blockSize = '10px', gap = '3px', css = 'var(--brass)' } = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = gap;
    const height = Math.max(...shapeDef.cells.map(c => c[0])) + 1;
    const width = Math.max(...shapeDef.cells.map(c => c[1])) + 1;
    wrap.style.gridTemplateColumns = `repeat(${width}, auto)`;
    const filled = new Set(shapeDef.cells.map(([r, c]) => `${r}:${c}`));
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const b = document.createElement('div');
        const on = filled.has(`${r}:${c}`);
        b.style.width = blockSize;
        b.style.height = blockSize;
        b.style.borderRadius = '3px';
        b.style.background = on ? css : 'transparent';
        if (on) b.style.boxShadow = 'inset 0 -2px 0 rgba(0,0,0,.3)';
        wrap.appendChild(b);
      }
    }
    return wrap;
  }

  /**
   * Compêndio — mostra TUDO que o jogo pode liberar, não só o que já está
   * no baralho ou foi visto: os 5 Elementos, todas as formas de Relíquia
   * (com seu tier de raridade) e o bestiário completo de Arautos.
   */
  showCodex() {
    this.show(`
      <h2>Compêndio do Crisol</h2>
      <p>Tudo o que a Jornada pode liberar: Elementos, formas de Relíquia e o bestiário de Arautos.</p>
      <div class="codex-section">
        <h3>Elementos</h3>
        <div class="codex-elements" id="codexElements"></div>
      </div>
      <div class="codex-section">
        <h3>Formas de Relíquia</h3>
        <div class="codex-shapes" id="codexShapes"></div>
      </div>
      <div class="codex-section">
        <h3>Bestiário de Arautos</h3>
        <div class="codex-foes" id="codexFoes"></div>
      </div>
      <button class="ghost-btn" id="closeCodex">Fechar</button>
    `);

    const elementsBox = this.modal.querySelector('#codexElements');
    Object.entries(ElementCatalog).forEach(([key, el]) => {
      const card = document.createElement('div');
      card.className = 'codex-card codex-element';
      card.style.setProperty('--accent', el.css);
      card.innerHTML = `
        <span class="codex-card__icon">${el.icon}</span>
        <div class="codex-card__name">${el.label}</div>
        <div class="codex-card__desc">${el.describe(el.perBlock)} por bloco em potência base.</div>
        <div class="codex-card__lore">${el.lore}</div>
      `;
      elementsBox.appendChild(card);
    });

    const shapesBox = this.modal.querySelector('#codexShapes');
    const tierLabel = ['Comum', 'Incomum', 'Rara', 'Épica', 'Lendária'];
    Object.values(ShapeCatalog)
      .sort((a, b) => a.tier - b.tier)
      .forEach(shape => {
        const card = document.createElement('div');
        card.className = 'codex-card codex-shape';
        const mini = ModalRenderer.shapeMatrix(shape, { blockSize: '9px', gap: '2px' });
        mini.style.justifyContent = 'center';
        mini.style.margin = '0 auto 10px';
        card.appendChild(mini);
        const name = document.createElement('div');
        name.className = 'codex-card__name'; name.textContent = shape.name;
        const desc = document.createElement('div');
        desc.className = 'codex-card__desc';
        desc.textContent = `${shape.cells.length} blocos · ${tierLabel[shape.tier] || `Tier ${shape.tier}`}`;
        card.append(name, desc);
        shapesBox.appendChild(card);
      });

    const foesBox = this.modal.querySelector('#codexFoes');
    FOE_ARCHETYPES.forEach(arch => {
      const card = document.createElement('div');
      card.className = 'codex-card codex-foe';
      const traitBits = [];
      if (arch.bias.defend) traitBits.push('Blindagem');
      if (arch.bias.buff) traitBits.push('Ascensão de Poder');
      card.innerHTML = `
        <span class="codex-card__icon">${arch.face}</span>
        <div class="codex-card__name">${arch.name}</div>
        <div class="codex-card__desc">${arch.title}</div>
        <div class="codex-card__lore">Prefixos possíveis: ${FOE_PREFIXES.join(', ')} — ou <b>${BOSS_PREFIX}</b> em Colheitas.${traitBits.length ? ` Traços: ${traitBits.join(', ')}.` : ''}</div>
      `;
      foesBox.appendChild(card);
    });

    this.modal.querySelector('#closeCodex').addEventListener('click', () => this.hide());
  }

  showHelp() {
    this.show(`
      <h2>Como Jogar RogueBlock</h2>
      <div class="help-body">
        <p><b>Objetivo:</b> encaixe Relíquias no Crisol (tabuleiro) para completar linhas e colunas.
        Os efeitos elementais só disparam quando uma linha/coluna fica cheia e é limpa — encaixar uma
        peça sozinha não faz nada.</p>
        <p><b>Multiplicador:</b> se um único encaixe completar mais de uma linha/coluna ao mesmo tempo,
        o valor total é multiplicado pelo número de linhas limpas.</p>
        <p><b>Controles:</b> clique numa Relíquia da mão e depois numa célula do Crisol, ou arraste a
        peça diretamente. Tecle <b>R</b> para girar a peça selecionada e <b>Espaço</b> para passar o turno.</p>
        <p><b>Elementos:</b> Ignição causa dano, Éter Vital cura, Baluarte dá escudo temporário
        (zera no início do seu turno), Corrosão Astral envenena o Arauto aos poucos, e Prisma Etéreo
        dispersa o poder acumulado do inimigo (o excesso vira dano).</p>
        <p><b>Mapa:</b> a cada onda você escolhe entre Confronto, Entreposto, Vestígio ou um Véu
        Nebuloso (que só revela seu tipo real ao ser escolhido). A cada 5 profundidades, uma Colheita
        (chefe) bloqueia o caminho.</p>
        <p><b>Baralho e Compêndio:</b> use os botões "Baralho" e "Compêndio" na barra do topo a
        qualquer momento para ver todas as Relíquias que você já tem e todo o conteúdo que o jogo
        pode liberar — Elementos, formas e Arautos.</p>
      </div>
      <button class="ghost-btn" id="closeHelp">Entendi</button>
    `);
    this.modal.querySelector('#closeHelp').addEventListener('click', () => this.hide());
  }

  showRewards(depth, options, onTake) {
    this.show(`
      <h2>Profundidade ${depth - 1} superada</h2>
      <p>Escolha uma Relíquia para levar ao Baralho. Ela acompanha você pelo resto da Jornada.</p>
      <div class="rewards" id="rewards"></div>
      <button class="ghost-btn" id="skipReward">Seguir sem levar nada</button>
    `);
    const box = this.modal.querySelector('#rewards');
    options.forEach(piece => {
      const card = document.createElement('div');
      card.className = 'reward';
      card.tabIndex = 0;
      const mini = ModalRenderer.pieceMatrix(piece);
      mini.style.justifyContent = 'center';
      mini.style.minHeight = '40px';
      mini.style.alignContent = 'center';
      mini.style.marginBottom = '12px';
      card.appendChild(mini);
      const name = document.createElement('div');
      name.className = 'name'; name.textContent = piece.name;
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = `${piece.element.icon} ${piece.element.describe(piece.value)} · ${piece.size} blocos`;
      card.append(name, desc);
      const take = () => { this.hide(); onTake(piece); };
      card.addEventListener('click', take);
      card.addEventListener('keydown', ev => { if (ev.key === 'Enter') take(); });
      box.appendChild(card);
    });
    this.modal.querySelector('#skipReward').addEventListener('click', () => { this.hide(); onTake(null); });
  }

  showGameOver(depth, deckSize, onRestart) {
    this.show(`
      <h2>A Jornada termina aqui</h2>
      <p>Você caiu na profundidade ${depth} com um Baralho de ${deckSize} Relíquias.</p>
      <button class="end-turn" id="againBtn">Começar nova Jornada</button>
    `);
    this.modal.querySelector('#againBtn').addEventListener('click', () => { this.hide(); onRestart(); });
  }

  showInventory(deck) {
    this.show(`
      <h2>Baralho da Jornada</h2>
      <p>${deck.cards.length} Relíquia${deck.cards.length === 1 ? '' : 's'} carregada${deck.cards.length === 1 ? '' : 's'} atualmente.</p>
      <div class="inventory-grid" id="inventoryGrid"></div>
      <button class="ghost-btn" id="closeInventory">Fechar</button>
    `);
    const grid = this.modal.querySelector('#inventoryGrid');
    [...deck.cards]
      .sort((a, b) => a.elementKey.localeCompare(b.elementKey) || a.size - b.size)
      .forEach(piece => {
        const card = document.createElement('div');
        card.className = 'reward inventory-item';
        const mini = ModalRenderer.pieceMatrix(piece);
        mini.style.justifyContent = 'center';
        mini.style.minHeight = '36px';
        mini.style.alignContent = 'center';
        mini.style.marginBottom = '10px';
        card.appendChild(mini);
        const name = document.createElement('div');
        name.className = 'name'; name.textContent = piece.name;
        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = `${piece.element.icon} ${piece.element.describe(piece.value)}`;
        card.append(name, desc);
        grid.appendChild(card);
      });
    this.modal.querySelector('#closeInventory').addEventListener('click', () => this.hide());
  }
}
