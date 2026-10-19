# BudgetGwen

> Votre budget, simplement.

**App en ligne : https://maxjeandon-cmyk.github.io/BudgetGwen/**

Petite application de gestion de budget personnel, simple et chaleureuse : on saisit une transaction, la comptabilite en partie double s occupe du reste, et les donnees ne quittent jamais le navigateur.

## Fonctionnalites

- **Transactions en partie double** : chaque mouvement a exactement un debit et un credit de meme montant — impossible de perdre de l argent en route.
- **Comptes avec solde initial** : creez vos comptes reels (livret, compte bancaire, especes...) avec leur solde actuel ; le decouvert est accepte.
- **Patrimoine honnete** : le solde global affiche vos actifs moins vos dettes ; les comptes de revenus et de depenses restent des coulisses, pas des comptes reels.
- **Resume mensuel bidirectionnel** : un remboursement deduit les depenses, une correction deduit les revenus.
- **Lots de transactions** : groupez des ecritures en brouillon, confirmez ou annulez en deux clics.
- **Export CSV** (BOM UTF-8 + point-virgule) lisible directement par Excel ou LibreOffice, sans reglage.
- **Sauvegarde et restauration completes** : copie JSON de tout le localStorage, restauration validee puis confirmee avant ecrasement.
- **PWA** : installable sur l ecran d accueil, coquille disponible hors ligne (service worker) — les donnees, elles, ne passent jamais par le cache.

## Vos donnees restent chez vous

Tout vit dans le localStorage du navigateur : aucun serveur, aucun compte, aucun suivi. La sauvegarde JSON est votre ceinture de securite — exportez-la regulierement.

## Stack

- React 18 + TypeScript, construit avec Vite, teste avec Vitest
- Aucune dependance runtime au-dela de React
- PWA : manifest web + service worker (cache de la coquille uniquement)

## Demarrage

```bash
npm install
npm run dev        # serveur de developpement
npm test           # tests unitaires (Vitest)
npm run build      # generation des icones + build de production
npm run preview    # previsualiser le build
```

Node.js >= 22 recommande.

## Harnais de verification

En plus des tests Vitest, le depot embarque un harnais sans aucune dependance :

```bash
node harness/run.mjs
```

Il pose plus de 220 verrous, dont l execution du **vrai** hook `useBudget` sur un mini-React et un localStorage factice : soldes verifies au centime, garde-fous, invariant de partie double, export/sauvegarde/restauration et persistance/rechargement. Le hook `useBudget.ts` est volontairement fige — son SHA-256 est controle a chaque execution. Details dans `harness/README.md`.

## Deploiement

A chaque push sur `main`, GitHub Actions joue le harnais, construit le site puis le deploie sur GitHub Pages (voir `.github/workflows/deploy.yml`). Le site est servi sur https://maxjeandon-cmyk.github.io/BudgetGwen/.

## Structure du depot

```
src/        composants React, hook useBudget (fige), types, export CSV/JSON
harness/    harnais de verification sans dependance
scripts/    generation deterministe des icones PWA (pur Node, zero dependance)
public/     manifest, service worker, favicon
tests/      tests unitaires Vitest
```
