/* ============================================================================
   EventBus.js — implementação mínima do padrão Observer.
   É o único fio que liga o estado lógico (core/systems/entities) à camada
   de UI (ui/*). Nenhum módulo de lógica importa DOM; nenhum módulo de UI
   altera estado diretamente sem passar pelos métodos públicos das classes
   de estado. A comunicação de "algo mudou" sempre passa por aqui.
   ============================================================================ */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /** Assina um evento. Retorna uma função para cancelar a assinatura. */
  on(eventName, handler) {
    if (!this._listeners.has(eventName)) this._listeners.set(eventName, new Set());
    this._listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this._listeners.get(eventName)?.delete(handler);
  }

  emit(eventName, payload) {
    this._listeners.get(eventName)?.forEach(handler => handler(payload));
  }
}

// Instância única compartilhada por toda a aplicação.
export const eventBus = new EventBus();

/** Nomes de eventos centralizados — evita strings soltas e erros de digitação. */
export const EVENTS = Object.freeze({
  RUN_CHANGED: 'run:changed',           // troca de tela / mapa / moeda / etc.
  ENCOUNTER_UPDATED: 'encounter:updated', // qualquer alteração no combate atual
  ENCOUNTER_LINES_CLEARED: 'encounter:linesCleared',
  ENCOUNTER_WON: 'encounter:won',
  ENCOUNTER_LOST: 'encounter:lost',
  REWARD_OFFERED: 'reward:offered',
  SHOP_OPENED: 'shop:opened',
  EVENT_OPENED: 'event:opened',
  EVENT_RESOLVED: 'event:resolved',
});
