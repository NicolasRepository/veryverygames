import { RunState } from './core/RunState.js';
import { DOMController } from './ui/DOMController.js';

/* ============================================================================
   main.js — ponto de entrada. Cria o estado da Jornada, conecta o
   controlador de UI a ele e inicia a primeira Jornada.
   ============================================================================ */
const runState = new RunState();
new DOMController(runState);
runState.newRun();
