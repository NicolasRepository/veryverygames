/* ============================================================================
   EventCatalog.js — os Vestígios: situações narrativas de risco e recompensa
   encontradas nos nós de tipo "event" do mapa.

   Cada evento tem 2-3 escolhas. `resolve(runState)` aplica o efeito e
   retorna { text } com a narração do desfecho. Os efeitos usam apenas a
   API pública de RunState (currency, deck, adventurer), nunca tocam DOM.

   >>> COMO ADICIONAR UM VESTÍGIO NOVO <<<
   Acrescente uma entrada ao array com id único, icon, title, description e
   um array de choices — cada choice com label e resolve(runState).
   ============================================================================ */
import { Piece } from '../entities/Piece.js';
import { REWARD_ELEMENT_POOL } from './ElementCatalog.js';
import { pick, clamp } from '../core/utils.js';

export const EVENT_CATALOG = [
  {
    id: 'altar-sangue',
    icon: '🩸',
    title: 'O Altar de Sangue Cristalizado',
    description: 'Um altar baixo pulsa com veias de éter vermelho. Ele promete força a quem pagar com a própria vida.',
    choices: [
      {
        label: 'Ofertar 8 de vida por uma Relíquia rara',
        resolve(runState) {
          runState.adventurer.hp = clamp(runState.adventurer.hp - 8, 1, runState.adventurer.maxHp);
          const piece = new Piece('square', pick(REWARD_ELEMENT_POOL), 2);
          runState.deck.add(piece);
          return { text: `Você sente o Éter arder nas veias. <b>${piece.name}</b> entra no seu baralho, mas você perde 8 de vida.` };
        },
      },
      {
        label: 'Recuar em silêncio',
        resolve() {
          return { text: 'Você dá as costas ao altar. Ele volta a dormir na escuridão.' };
        },
      },
    ],
  },
  {
    id: 'mercador-sombrio',
    icon: '🕯️',
    title: 'O Peregrino Sem Rosto',
    description: 'Uma figura encapuzada oferece trocar Fragmentos Astrais por vitalidade — ou o contrário.',
    choices: [
      {
        label: 'Trocar 20 de vida por Fragmentos Astrais',
        resolve(runState) {
          const loss = Math.min(20, runState.adventurer.hp - 1);
          runState.adventurer.hp -= loss;
          const gained = 35;
          runState.addCurrency(gained);
          return { text: `A figura sorri sob o capuz. Você recebe <b>${gained} ${runState.currencyIcon}</b> e perde <b>${loss}</b> de vida.` };
        },
      },
      {
        label: 'Pagar 25 Fragmentos por cura completa',
        resolve(runState) {
          if (runState.currency < 25) return { text: 'Você não tem Fragmentos suficientes. A figura desaparece na bruma.' };
          runState.spendCurrency(25);
          runState.adventurer.hp = runState.adventurer.maxHp;
          return { text: 'O Éter Vital preenche cada ferida. Sua vida está completamente restaurada.' };
        },
      },
      {
        label: 'Ignorar a oferta',
        resolve() { return { text: 'A figura se dissolve como fumaça, sem uma palavra.' }; },
      },
    ],
  },
  {
    id: 'jardim-corrompido',
    icon: '🌱',
    title: 'O Jardim que Cresce ao Contrário',
    description: 'Plantas de cristal negro absorvem luz em vez de emiti-la. Tocá-las talvez ensine algo sobre Corrosão.',
    choices: [
      {
        label: 'Tocar o jardim (ganha Relíquia de Corrosão, risco de veneno)',
        resolve(runState) {
          const piece = new Piece('tri', 'purple', 1);
          runState.deck.add(piece);
          if (Math.random() < 0.5) {
            runState.adventurer.hp = clamp(runState.adventurer.hp - 6, 1, runState.adventurer.maxHp);
            return { text: `Os espinhos cortam sua pele. Você ganha <b>${piece.name}</b>, mas perde 6 de vida.` };
          }
          return { text: `Nada acontece além de um frio na espinha. Você ganha <b>${piece.name}</b> ileso.` };
        },
      },
      {
        label: 'Manter distância',
        resolve() { return { text: 'Você contorna o jardim. Melhor não arriscar.' }; },
      },
    ],
  },
  {
    id: 'forja-abandonada',
    icon: '⚒️',
    title: 'A Forja Abandonada',
    description: 'Um crisol menor, esfriado há eras, ainda guarda ferramentas capazes de aprimorar Relíquias.',
    choices: [
      {
        label: 'Usar a forja (fortalece uma Relíquia aleatória do baralho)',
        resolve(runState) {
          const candidates = runState.deck.cards.filter(p => p.power < 3);
          if (!candidates.length) return { text: 'Nenhuma Relíquia sua aceita mais poder. A forja permanece fria.' };
          const piece = pick(candidates);
          piece.power += 1;
          return { text: `<b>${piece.name}</b> pulsa com mais poder que antes.` };
        },
      },
      {
        label: 'Seguir em frente',
        resolve() { return { text: 'Você deixa a forja para trás, silenciosa como a encontrou.' }; },
      },
    ],
  },
  {
    id: 'eco-do-crisol',
    icon: '🔮',
    title: 'O Eco do Primeiro Crisol',
    description: 'Uma voz sem origem oferece apagar uma de suas Relíquias mais fracas — em troca de Fragmentos.',
    choices: [
      {
        label: 'Pagar 20 Fragmentos para purgar uma Relíquia fraca',
        resolve(runState) {
          if (runState.currency < 20) return { text: 'Os Fragmentos em sua bolsa não bastam. O eco se dissipa.' };
          const candidates = runState.deck.cards.filter(p => p.size <= 2);
          if (!candidates.length) return { text: 'Seu baralho já é enxuto demais. A voz desiste.' };
          runState.spendCurrency(20);
          const piece = pick(candidates);
          runState.deck.remove(piece.id);
          return { text: `<b>${piece.name}</b> se desfaz em poeira etérea, deixando o baralho mais afiado.` };
        },
      },
      {
        label: 'Não confiar em vozes sem rosto',
        resolve() { return { text: 'O silêncio retorna ao corredor.' }; },
      },
    ],
  },
  {
    id: 'poco-de-fragmentos',
    icon: '💠',
    title: 'O Poço de Fragmentos Adormecidos',
    description: 'Luzes azuis piscam no fundo de um poço raso. Parece seguro recolher algumas.',
    choices: [
      {
        label: 'Recolher os Fragmentos',
        resolve(runState) {
          const gained = 22 + Math.floor(Math.random() * 14);
          runState.addCurrency(gained);
          return { text: `Você recolhe <b>${gained} ${runState.currencyIcon}</b> do fundo do poço.` };
        },
      },
      {
        label: 'Desconfiar e seguir em frente',
        resolve() { return { text: 'Melhor não arriscar a mão em água parada.' }; },
      },
    ],
  },
];
