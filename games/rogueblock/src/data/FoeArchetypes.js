/* ============================================================================
   FoeArchetypes.js — os arquétipos que povoam o Crisol do Éter.

   Cada arquétipo carrega nome, rosto (emoji), um título de peso (lore) e um
   viés de atributos usado pelo FoeCodex na geração procedural. Para
   adicionar um inimigo novo, basta acrescentar uma entrada aqui — o
   sistema já sabe gerar vida, dano e intenções a partir do viés.
   ============================================================================ */
export const FOE_ARCHETYPES = [
  {
    name: 'Autômato de Escória',
    face: '🗿',
    title: 'Forjado nas cinzas do Primeiro Crisol',
    bias: { hp: 1.25, dmg: 0.85, defend: true },
  },
  {
    name: 'Vigia de Pedra Rúnica',
    face: '👹',
    title: 'Esculpida em vigília desde antes do tempo',
    bias: { hp: 1.0, dmg: 1.0, defend: true },
  },
  {
    name: 'Tecelã do Véu Negro',
    face: '🕷️',
    title: 'Fiandeira dos fios que ninguém deveria cortar',
    bias: { hp: 0.8, dmg: 1.2, buff: true },
  },
  {
    name: 'Arcanista da Chama Profana',
    face: '🧙',
    title: 'Rouba poder do próprio Éter que a sustenta',
    bias: { hp: 0.9, dmg: 1.05, buff: true },
  },
  {
    name: 'Víbora do Abismo Estelar',
    face: '🐍',
    title: 'Desliza onde a luz do Crisol não alcança',
    bias: { hp: 0.95, dmg: 1.15, buff: true },
  },
  {
    name: 'Arauto da Última Colheita',
    face: '💀',
    title: 'Cobra a dívida de toda carne que respira',
    bias: { hp: 1.1, dmg: 1.1, defend: true },
  },
  {
    name: 'Broto da Praga Cósmica',
    face: '🍄',
    title: 'Cresce mais forte a cada golpe que recebe',
    bias: { hp: 1.15, dmg: 0.9, buff: true },
  },
];

export const FOE_PREFIXES = ['Corrompido', 'Esquecido', 'Fraturado', 'Úmbrio', 'Incandescente', 'Errante', 'Profano'];

/** Prefixo especial usado quando a onda no mapa é um Colheita (chefe). */
export const BOSS_PREFIX = 'Arqui-';
