# Harnais de vérification BudgetGwen

Aucune dépendance npm. Seul prérequis : **Node.js ≥ 22** (suppression de types native).

```bash
node harness/run.mjs
```

## Ce qu'il vérifie (87 assertions)

1. **Invariant sacré** : `src/hooks/useBudget.ts` est figé — son SHA-256 doit rester
   `18c56b57b6be5f07afcd1974323de87cd9b938d477a43730abc05c73be185120`.
2. **Contrôles statiques** sur le code source : accessibilité (modale, toasts,
   progressbar), motif « recliquez pour confirmer », mois dynamiques,
   validation des noms vides, absence de `console.log`.
3. **Suite dynamique** : le **vrai hook** est exécuté (pas une copie de sa
   logique) sur un mini-React (`react-stub.mjs`) et un `localStorage` factice,
   avec un seed de 7 transactions et 2 lots brouillons. Vérifie soldes au
   centime, garde-fous, confirmation/suppression de lots, comptes,
   catégories, invariant de partie double et persistance/rechargement.

## Architecture

- `run.mjs` — orchestrateur : contrôles statiques, génération `gen/`, bilan.
- `react-stub.mjs` — mini-React : `useState` (re-rendu synchrone), `useEffect`
  accumulés puis exécutés, `useCallback` identité.
- `hook-suite.ts` — scénario dynamique et attentes chiffrées.
- `gen/` — **généré à chaque exécution** (ne pas versionner) : copie du hook
  avec uniquement les imports reroutés vers le stub. `run.mjs` vérifie que
  le code généré ne diffère du vrai que par les lignes d'import.

## Sémantique des soldes (le hook est figé)

Les soldes sont **positifs au crédit** (logique de grand livre) : une dépense
(débit d'un compte `depense`, crédit d'un actif) augmente le solde global de
2× son montant ; un revenu (crédit d'un compte `revenu`) y est neutre.
Les attentes de la suite sont calculées avec ces règles.
