// Mini-React pour le harnais : juste ce qu'il faut pour useBudget.
// - useState persiste entre les rendus et declenche un re-rendu synchrone ;
// - useCallback rend la fonction telle quelle ;
// - useEffect accumule les effets, que le harnais execute apres chaque rendu.

let states = [];
let cursor = 0;
let rerender = null;
let pendingEffects = [];
let cleanups = [];

export function useState(initial) {
  const idx = cursor++;
  if (idx >= states.length) {
    states.push(typeof initial === 'function' ? initial() : initial);
  }
  const setter = (value) => {
    states[idx] = typeof value === 'function' ? value(states[idx]) : value;
    if (rerender) rerender();
  };
  return [states[idx], setter];
}

export function useCallback(fn) {
  return fn;
}

export function useEffect(effect) {
  pendingEffects.push(effect);
}

// Remet le curseur d hooks a zero avant chaque rendu (comme React).
export function beginRender() {
  cursor = 0;
}

// Enregistre la fonction qui relance le composant apres un setState.
export function setRerender(fn) {
  rerender = fn;
}

// Execute les effets accumules pendant le rendu.
export function flushEffects() {
  const toRun = pendingEffects;
  pendingEffects = [];
  for (const effect of toRun) {
    const cleanup = effect();
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  }
}

// Reinitialise tout (cleanups d abord) : simule un demontage/remontage.
export function reset() {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  states = [];
  cursor = 0;
  pendingEffects = [];
  rerender = null;
}
