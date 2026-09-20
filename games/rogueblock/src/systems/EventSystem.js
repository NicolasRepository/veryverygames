import { EVENT_CATALOG } from '../data/EventCatalog.js';
import { pick } from '../core/utils.js';

/* ============================================================================
   EventSystem.js — sorteia e resolve os Vestígios (eventos narrativos).
   ============================================================================ */
export const EventSystem = {
  roll(excludeId = null) {
    const pool = excludeId ? EVENT_CATALOG.filter(e => e.id !== excludeId) : EVENT_CATALOG;
    return pick(pool.length ? pool : EVENT_CATALOG);
  },

  resolveChoice(eventDef, choiceIndex, runState) {
    const choice = eventDef.choices[choiceIndex];
    return choice.resolve(runState);
  },
};
