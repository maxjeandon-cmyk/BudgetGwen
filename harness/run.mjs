#!/usr/bin/env node
// Harnais BudgetGwen — sans aucune dependance npm.
//   node harness/run.mjs
//
// Deux etages de verification :
//   1. Verifications statiques du code source (a11y, patterns, invariant SHA du hook).
//   2. Suite dynamique : le VRAI src/hooks/useBudget.ts execute par Node
//      (--experimental-strip-types) sur un mini-React et un localStorage factice.
//
// Le hook est FIGE (mode design) : son SHA-256 doit rester 18c56b57…185120.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const results = [];
function check(name, ok) {
  results.push({ name, ok: Boolean(ok) });
}

// ============================================================
// Etage 1 : verifications statiques
// ============================================================

// Invariant sacre : le hook ne doit jamais bouger en mode design.
const FROZEN_SHA = '18c56b57b6be5f07afcd1974323de87cd9b938d477a43730abc05c73be185120';
const hookSha = crypto.createHash('sha256').update(read('src/hooks/useBudget.ts')).digest('hex');
check('statique — useBudget.ts figé (SHA-256 identique)', hookSha === FROZEN_SHA);

const app = read('src/App.tsx');
const css = read('src/App.css');
const modal = read('src/components/Modal.tsx');
const confirm = read('src/components/ConfirmButton.tsx');
const txList = read('src/components/TransactionList.tsx');
const batchList = read('src/components/BatchList.tsx');
const accountList = read('src/components/AccountList.tsx');
const categoryList = read('src/components/CategoryList.tsx');
const dashboard = read('src/components/Dashboard.tsx');
const budgetTypes = read('src/types/budget.ts');

// Plus un seul console.log dans le code produit.
check('statique — aucun console.log dans App.tsx', !/console\.log/.test(app));

// Toast accessible.
check('statique — toast avec role="status" et aria-live', app.includes('role="status"') && app.includes('aria-live'));

// Confirmation a double clic branchee partout ou l on supprime.
check('statique — TransactionList utilise ConfirmButton', txList.includes('ConfirmButton'));
check('statique — BatchList utilise ConfirmButton', batchList.includes('ConfirmButton'));
check('statique — AccountList utilise ConfirmButton', accountList.includes('ConfirmButton'));
check('statique — CategoryList utilise ConfirmButton', categoryList.includes('ConfirmButton'));
check('statique — libelle « Recliquez » present dans les confirmations', batchList.includes('Recliquez') && txList.includes('Recliquez'));
check('statique — libelle accessible precise « recliquez pour confirmer »', confirm.includes('recliquez pour confirmer'));
check('statique — ConfirmButton se desarme a la perte de focus', confirm.includes('onBlur'));
check('statique — ConfirmButton nettoie son minuteur au demontage', confirm.includes('clearTimeout'));

// Modale accessible.
check('statique — modale fermable par Escape', modal.includes("e.key === 'Escape'"));
check('statique — modale role="dialog" aria-modal', modal.includes('aria-modal'));
check('statique — modale liee au titre (aria-labelledby)', modal.includes('aria-labelledby'));
check('statique — piege de focus dans la modale', modal.includes("e.key === 'Tab'"));
check('statique — focus restitue a la fermeture', modal.includes('restoreFocusRef'));

// Table des transactions lisible sur mobile.
check('statique — libelles data-label sur les cellules (4)', (txList.match(/data-label=/g) || []).length >= 4);
check('statique — CSS : cartes empilees sous 560 px', css.includes('559.98px'));

// Dashboard : barres distinguees revenus/depenses + noms accessibles.
check('statique — barres depenses terracotta (chart-bar--expense)', dashboard.includes('chart-bar--expense'));
check('statique — barres revenus sauge (chart-bar--income)', dashboard.includes('chart-bar--income'));
check('statique — CSS : .chart-bar--income definie', css.includes('.chart-bar--income'));
check('statique — progressbar avec nom accessible (aria-label)', dashboard.includes('aria-label={`Part de'));
check('statique — progressbar avec aria-valuenow', dashboard.includes('aria-valuenow'));

// Mois dynamiques et validation des noms vides.
check('statique — selecteur de mois construit depuis les transactions', app.includes('monthOptions') && (app.includes('firstDate') || app.includes('lastMonth')));
check('statique — nom de compte vide refuse (trim)', app.includes('editingAccount?.name?.trim()'));
check('statique — nom de categorie vide refuse (trim)', app.includes('editingCategory?.name?.trim()'));
check('statique — focus visible style', css.includes(':focus-visible'));
check('statique — etat arme du bouton de confirmation style', css.includes('.btn-confirm-armed'));

// ============================================================
// Verrous comportementaux (decisions produit explicites)
// ============================================================

// Les comptes de DEPENSE doivent etre creditables dans les deux formulaires :
// l argent utilise (remboursement, ajustement, sortie directe) peut
// atterrir sur un compte de depense. Ce verrou evite que le filtre
// historique (a.type !== 'depense') ne revienne par accident.
const txForm = read('src/components/TransactionForm.tsx');
const deForm = read('src/components/DoubleEntryForm.tsx');
check('verrou — TransactionForm : comptes de dépense créditables', !txForm.includes("a.type !== 'depense'"));
check('verrou — DoubleEntryForm : comptes de dépense créditables', !deForm.includes("a.type !== 'depense'"));
check('verrou — TransactionForm : crédit = tous les comptes', txForm.includes('const creditAccounts = accounts;'));
check('verrou — DoubleEntryForm : crédit = tous les comptes', deForm.includes('const creditAccounts = accounts;'));
// Le debit garde ses garde-fous : ni revenu ni capital au debit.
check('verrou — debit sans revenu ni capital (TransactionForm)', txForm.includes("a.type !== 'revenu' && a.type !== 'capital'"));
check('verrou — debit sans revenu ni capital (DoubleEntryForm)', deForm.includes("a.type !== 'revenu' && a.type !== 'capital'"));

// ============================================================
// Verrous : boutons Revenus / Depenses separes (decision produit)
// ============================================================

// La saisie se fait via deux boutons distincts, plus un mode qui
// pre-remplit le formulaire dans le bon sens comptable :
// - Revenus  : credit sur le compte de revenu (compte par le hook) ;
// - Depenses : debit du compte de depense + credit de son compte,
//   avec date differee possible (suivie dans le Dashboard).
check('verrou — bouton « + Revenus » present', app.includes("+ Revenus"));
check('verrou — bouton « − Dépenses » present', app.includes("− Dépenses"));
check('verrou — ancien bouton « + Transaction » disparu', !app.includes('+ Transaction'));
check('verrou — mode income pre-remplit le credit sur un compte de revenu', txForm.includes("accounts.find(a => a.type === 'revenu')"));
check('verrou — mode expense pre-remplit le debit sur un compte de depense', txForm.includes("accounts.find(a => a.type === 'depense')"));
check('verrou — mode expense suggere la date differee', txForm.includes('Sortie différée'));
check('verrou — selecteur de mois etendu aux mois futurs (depenses differees)', app.includes('lastMonth'));
check('verrou — style .form-hint defini', css.includes('.form-hint'));

// ============================================================
// Verrous : solde initial a la creation d un compte
// ============================================================

// Le hook fige cree toujours les comptes a balance 0 et recalcule les
// soldes depuis les transactions. Le solde saisi est donc materialise
// par une transaction « Solde initial » equilibree contre un compte
// d ouverture « Ouverture » (passif) — neutre pour le resume mensuel :
// ni revenu ni depense fantome le mois de la creation. Ces verrous
// empechent la regression vers un solde pose en base (interdit par le
// hook) ou une contrepartie qui fausserait le Dashboard.
check('verrou — champ « Solde actuel » present (account-opening)', app.includes('account-opening'));
check('verrou — champ reserve a la creation et aux types actif/passif', app.includes("['actif', 'passif'].includes(editingAccount?.type || 'actif')"));
check('verrou — libelle « vide pour partir de zero » present', app.includes('vide pour partir de zéro'));
check('verrou — transaction « Solde initial — » generee', app.includes('Solde initial — '));
check('verrou — compte d ouverture « Ouverture » declare en passif', app.includes("OPENING_ACCOUNT_NAME = 'Ouverture'") && app.includes("type: 'passif'"));
check('verrou — garde StrictMode contre le double effet', app.includes('openingGuardRef'));
check('verrou — solde negatif ecrit dans l autre sens', app.includes('pendingOpening.amount > 0 ? opening.id : target.id'));
check('verrou — edition d un compte existant : solde ignore', app.includes('le solde se gere par les transactions'));

// ============================================================
// Verrous : comptes tampons masques au Dashboard
// ============================================================

// « Salaire » (type revenu) et « Ouverture » (contrepartie des soldes
// initiaux) simulent une entree d argent : ce sont des coulisses, pas des
// comptes reels. Le Dashboard ne montre que les vrais comptes de Gwen.
// Les listes de gestion (Comptes, Transactions, formulaires) gardent
// TOUS les comptes : on a besoin des coulisses pour jouer dessus.
check('verrou — liste dashboardAccounts filtree dans App', app.includes('dashboardAccounts'));
check('verrou — comptes de revenu masques au Dashboard', app.includes("a.type !== 'revenu' && !(a.name === OPENING_ACCOUNT_NAME"));
check('verrou — compte Ouverture masque au Dashboard', app.includes('a.name === OPENING_ACCOUNT_NAME && a.type === \'passif\''));
check('verrou — Dashboard recoit la liste filtree', app.includes('accounts={dashboardAccounts}'));
check('verrou — listes de gestion : tous les comptes conserves', app.includes('accounts={data.accounts}'));

// ============================================================
// Verrous : depart minimal — seulement Salaire et Depenses
// ============================================================

// Gwen demarre avec les deux seules coulisses necessaires a la partie
// double : « Salaire » (revenu) et « Depenses » (depense). Les comptes
// reels seront ajoutes au fur et a mesure, avec leur solde actuel saisi
// a la creation. Ce verrou empeche le retour des comptes de demo
// (Especes, Compte Bancaire, Epargne, Carte de credit) dans les defauts.
check('verrou — defauts : compte « Salaire » conservé', budgetTypes.includes("id: 'salary'"));
check('verrou — defauts : compte « Dépenses » conservé', budgetTypes.includes("id: 'expenses'"));
check('verrou — defauts : plus aucun compte de demo (cash/bank/savings/credit_card)',
  !budgetTypes.includes("id: 'cash'") && !budgetTypes.includes("id: 'bank'") &&
  !budgetTypes.includes("id: 'savings'") && !budgetTypes.includes("id: 'credit_card'"));
check('verrou — TransactionForm guide vers « Comptes » sans compte réel', txForm.includes("créez-le d'abord dans « Comptes »"));

// ============================================================
// Etage 2 : suite dynamique sur le vrai hook
// ============================================================

// Genere les fichiers .gen : copie du hook avec les imports reroutes vers
// le mini-React et la copie des types. Le code METIER reste le vrai code.
const GEN_DIR = path.join(HERE, 'gen');
fs.mkdirSync(GEN_DIR, { recursive: true });

const hookSrc = read('src/hooks/useBudget.ts');
const genHook = hookSrc
  .replace(/from 'react'/g, "from '../react-stub.mjs'")
  .replace(/from '\.\.\/types\/budget'/g, "from './budget.gen.ts'");
fs.writeFileSync(path.join(GEN_DIR, 'useBudget.gen.ts'), genHook);
fs.writeFileSync(path.join(GEN_DIR, 'budget.gen.ts'), read('src/types/budget.ts'));

// Verification : le code genere ne differe du vrai que par les imports.
const genSansImports = genHook.split('\n').filter(l => !/^import /.test(l)).join('\n');
const vraiSansImports = hookSrc.split('\n').filter(l => !/^import /.test(l)).join('\n');
check('generation — le hook genere est le vrai code (imports reroutes uniquement)', genSansImports === vraiSansImports);

// Node >= 22 requis (suppression de types native).
const [major] = process.versions.node.split('.').map(Number);
check('environnement — Node >= 22 disponible', major >= 22);

if (major >= 22) {
  const run = spawnSync(
    process.execPath,
    ['--experimental-strip-types', path.join(HERE, 'hook-suite.ts')],
    { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } }
  );
  if (run.status !== 0) {
    check('dynamique — la suite s execute sans erreur', false);
    if (run.stderr) console.error(run.stderr);
  } else {
    // La suite imprime UNE ligne JSON sur stdout.
    const lines = (run.stdout || '').split('\n').filter(l => l.trim().startsWith('[{'));
    if (lines.length === 0) {
      check('dynamique — resultat JSON recu de la suite', false);
    } else {
      results.push(...JSON.parse(lines[lines.length - 1]));
    }
  }
}

// ============================================================
// Bilan
// ============================================================
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
}
console.log('---');
console.log(`TOTAL : ${pass} PASS / ${fail.length} FAIL (${results.length} assertions)`);
process.exit(fail.length > 0 ? 1 : 0);
