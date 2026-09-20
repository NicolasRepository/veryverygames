/* ============================================================================
   ElementCatalog.js — os quatro Elementos Etéreos que colorem as peças.

   Cada elemento é um efeito que dispara quando a linha/coluna que contém
   aquele bloco é completada no tabuleiro. O valor final = blocos * perBlock
   * potência da peça (ver entities/Piece.js).

   >>> COMO ADICIONAR UM ELEMENTO NOVO <<<
   1. Escolha uma chave interna única (ex.: "amber").
   2. Preencha label, css (var CSS), icon, perBlock, describe(valor) e
      apply(encounter, valor) — "encounter" é a EncounterManager ativa.
   3. Declare a variável de cor correspondente em styles/main.css (:root).
   4. Pronto — REWARD_ELEMENT_POOL abaixo lê as chaves deste objeto sozinho,
      então o elemento novo já entra no sorteio de recompensas e da loja.
   ============================================================================ */
export const ElementCatalog = {
  red: {
    label: 'Ignição',
    lore: 'Chama primordial extraída do núcleo do Crisol.',
    css: 'var(--red)',
    icon: '🔥',
    perBlock: 1,
    describe: v => `${v} de dano por Ignição`,
    apply: (encounter, v) => encounter.strikeFoe(v, 'Ignição'),
  },
  green: {
    label: 'Éter Vital',
    lore: 'Seiva luminosa que sela feridas de carne e alma.',
    css: 'var(--green)',
    icon: '✨',
    perBlock: 1,
    describe: v => `${v} de restauração`,
    apply: (encounter, v) => {
      encounter.adventurer.restore(v);
      encounter.log(`Você recupera <b>${v}</b> de vida com Éter Vital.`);
    },
  },
  blue: {
    label: 'Baluarte',
    lore: 'Cinética cristalizada que se ergue em anteparo.',
    css: 'var(--blue)',
    icon: '🛡️',
    perBlock: 2,
    describe: v => `${v} de Baluarte`,
    apply: (encounter, v) => {
      encounter.adventurer.ward += v;
      encounter.log(`Você ergue <b>${v}</b> de Baluarte Cinético.`);
    },
  },
  purple: {
    label: 'Corrosão Astral',
    lore: 'Vazio que corrói de dentro para fora, um pouco a cada respiro.',
    css: 'var(--purple)',
    icon: '☠️',
    perBlock: 1,
    describe: v => `${v} de Corrosão`,
    apply: (encounter, v) => {
      encounter.foe.corrosion += v;
      encounter.log(`O inimigo recebe <b>${v}</b> de Corrosão Astral.`);
    },
  },
  cyan: {
    label: 'Prisma Etéreo',
    lore: 'Luz fragmentada que dissolve o poder que a sombra acumulou.',
    css: 'var(--cyan)',
    icon: '🔷',
    perBlock: 1,
    describe: v => `${v} de Dispersão (some com o poder acumulado do Arauto; o excesso vira dano)`,
    apply: (encounter, v) => {
      const foe = encounter.foe;
      const dispersed = Math.min(foe.might, v);
      foe.might -= dispersed;
      if (dispersed > 0) encounter.log(`Prisma Etéreo dispersa <b>${dispersed}</b> de poder acumulado do Arauto.`);
      const overflow = v - dispersed;
      if (overflow > 0) encounter.strikeFoe(overflow, 'Prisma Etéreo');
    },
  },
};

export const REWARD_ELEMENT_POOL = Object.keys(ElementCatalog);
