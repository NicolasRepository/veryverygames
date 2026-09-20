/* ============================================================================
   EventRenderer.js — desenha um Vestígio: título, descrição e escolhas.
   Depois de escolher, mostra o desfecho e um botão único para continuar.
   ============================================================================ */
export class EventRenderer {
  constructor(root, { onChoose, onContinue }) {
    this.root = root;
    this.onChoose = onChoose;
    this.onContinue = onContinue;
    this.iconEl = root.querySelector('#eventIcon');
    this.titleEl = root.querySelector('#eventTitle');
    this.descEl = root.querySelector('#eventDescription');
    this.choicesEl = root.querySelector('#eventChoices');
    this.outcomeEl = root.querySelector('#eventOutcome');
    this.continueBtn = root.querySelector('#eventContinueBtn');
    this.continueBtn.addEventListener('click', () => this.onContinue());
  }

  render(runState) {
    const evt = runState.activeEvent;
    if (!evt) return;
    this.iconEl.textContent = evt.icon;
    this.titleEl.textContent = evt.title;
    this.descEl.textContent = evt.description;

    const resolved = !!runState.lastEventOutcome;
    this.choicesEl.hidden = resolved;
    this.outcomeEl.hidden = !resolved;
    this.continueBtn.hidden = !resolved;

    if (resolved) {
      this.outcomeEl.innerHTML = runState.lastEventOutcome.text;
    } else {
      this.choicesEl.innerHTML = '';
      evt.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'ghost-btn event-choice';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => this.onChoose(i));
        this.choicesEl.appendChild(btn);
      });
    }
  }
}
