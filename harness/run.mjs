#!/usr/bin/env node
// Harnais BudgetGwen — sans aucune dependance npm.
//   node harness/run.mjs
//
// Deux etages de verification :
//   1. Verifications statiques du code source (a11y, patterns, invariant SHA du hook).
//   2. Suite dynamique : le VRAI src/hooks/useBudget.ts execute par Node
//      (--experimental-strip-types) sur un mini-React et un localStorage factice.
//
// Le hook est REFIGE apres le degel unique du Lot 4 : son SHA-256 doit rester 1ef71203…0b117.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
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
const FROZEN_SHA = '1ef71203675d30b7c2bccbc41ff6560779543aa7438ba42b4f1d9cd60b60b117';
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
const hook = read('src/hooks/useBudget.ts');
const suite = read('harness/hook-suite.ts');

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

// Le hook cree toujours les comptes a balance 0 et recalcule les
// soldes depuis les transactions. Le solde saisi est donc materialise
// par une transaction « Solde initial » equilibree contre un compte
// d ouverture « Ouverture » (capital, Lot 4) — neutre pour le resume
// mensuel : ni revenu ni depense fantome le mois de la creation, ni
// dette fictive dans le patrimoine. Ces verrous empechent la
// regression vers un solde pose en base (interdit par le hook) ou une
// contrepartie qui fausserait le Dashboard.
check('verrou — champ « Solde actuel » present (account-opening)', app.includes('account-opening'));
check('verrou — champ reserve a la creation et aux types actif/passif', app.includes("['actif', 'passif'].includes(editingAccount?.type || 'actif')"));
check('verrou — libelle « vide pour partir de zero » present', app.includes('vide pour partir de zéro'));
check('verrou — transaction « Solde initial — » generee', app.includes('Solde initial — '));
check('verrou — compte d ouverture « Ouverture » declare en capital', app.includes("OPENING_ACCOUNT_NAME = 'Ouverture'") && app.includes("type: 'capital'"));
check('verrou — garde StrictMode contre le double effet', app.includes('openingGuardRef'));
check('verrou — solde positif ecrit au sens naturel (debit du compte)', app.includes('pendingOpening.amount > 0 ? target.id : opening.id'));
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
check('verrou — compte Ouverture masque au Dashboard', app.includes('a.name === OPENING_ACCOUNT_NAME && a.type === \'capital\''));
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
// Verrous : Lot 4 — degel unique du hook, semantique naturelle
// ============================================================

// Le hook a ete DEGELE une seule fois (Lot 4) pour rendre les soldes
// naturels : actif = debits - credits, autres = credits - debits ; le
// solde global devient un PATRIMOINE (actifs - passifs : les flux et le
// capital ne pesent plus) ; le resume mensuel devient bidirectionnel
// (un remboursement deduit les depenses, une correction deduit les
// revenus). Ces verrous empechent le retour a la balance de grand livre.
check('verrou lot4 — solde naturel : actif = debits - credits', hook.includes("accountType === 'actif' ? debit - credit : credit - debit"));
check('verrou lot4 — calculateNaturalBalance exporte', hook.includes('export function calculateNaturalBalance'));
check('verrou lot4 — le hook delegue ses soldes au naturel', hook.includes('return calculateNaturalBalance(accountId, accountType, transactions, batches);'));
check('verrou lot4 — patrimoine : actif ajoute, passif deduit', hook.includes("if (acc.type === 'actif') return sum + acc.balance;") && hook.includes("if (acc.type === 'passif') return sum - acc.balance;"));
check('verrou lot4 — plus aucun flux dans le solde global', !hook.includes("acc.type === 'revenu'") && !hook.includes("acc.type === 'depense'"));
check('verrou lot4 — remboursement deduit les depenses du mois', hook.includes("accountType(t.creditAccountId) === 'depense'") && hook.includes('return sum - t.amount;'));
check('verrou lot4 — correction deduit les revenus du mois', hook.includes("accountType(t.debitAccountId) === 'revenu'"));
check('verrou lot4 — migration migrateLot4 exportee', hook.includes('export function migrateLot4'));
check('verrou lot4 — migration idempotente (marqueur lot4Migrated)', hook.includes('if (data.lot4Migrated) return data;') && hook.includes('lot4Migrated: true'));
check('verrou lot4 — migration appliquee au chargement du hook', hook.includes('return migrateLot4({ ...initialData, ...parsed });'));
check('verrou lot4 — « Ouverture » retypé capital dans App', app.includes("{ name: OPENING_ACCOUNT_NAME, type: 'capital'"));
check('verrou lot4 — solde positif ecrit au sens naturel (debit du compte)', app.includes('pendingOpening.amount > 0 ? target.id : opening.id'));
check('verrou lot4 — Ouverture capital masque au Dashboard', app.includes("a.name === OPENING_ACCOUNT_NAME && a.type === 'capital'"));
check('verrou lot4 — suite : attentes naturelles et sections Lot 4', suite.includes('patrimoine 142,00') && suite.includes('===== 9. Lot 4') && suite.includes('===== 10. Lot 4'));
check('verrou lot4 — suite : remboursement et migration verifies', suite.includes('remboursement') && suite.includes('idempotente'));
check('verrou lot4 — Dashboard : carte « Patrimoine »', dashboard.includes('Patrimoine') && dashboard.includes('Vos actifs moins vos dettes'));

// ============================================================
// Verrous : paufinage — export, sauvegarde, restauration
// ============================================================

// Les donnees vivent dans le navigateur de Gwen : elles doivent pouvoir
// partir (CSV pour le tableur, JSON pour la copie complete) et revenir
// par une restauration VALIDEE puis CONFIRMEE. Ces verrous empechent la
// regression vers des donnees prisonnieres du localStorage.
const exportTs = read('src/export.ts');
check('verrou données — bouton « Exporter en CSV » présent', app.includes('Exporter en CSV'));
check('verrou données — bouton « Sauvegarde complète » présent', app.includes('Sauvegarde complète'));
check('verrou données — bouton « Restaurer une sauvegarde » présent', app.includes('Restaurer une sauvegarde'));
check('verrou données — CSV : BOM utf-8 et point-virgule (Excel friendly)', exportTs.includes("'\\uFEFF'") && exportTs.includes("CSV_SEP = ';'"));
check('verrou données — CSV : cellules échappées (guillemets doublés)', exportTs.includes('replace(/"/g, \'""\')'));
check('verrou données — CSV : montant à virgule décimale', exportTs.includes("replace('.', ',')"));
check('verrou données — validateBackup exporté (garde-fou restauration)', exportTs.includes('export function validateBackup'));
check('verrou données — buildBackup exporté (copie complète)', exportTs.includes('export function buildBackup'));
check('verrou données — clé de stockage identique au hook (budgetgwen.v1)', hook.includes("'budgetgwen.v1'") && app.includes("'budgetgwen.v1.data'"));
check('verrou données — restauration validée avant écrasement (toast refus)', app.includes('Sauvegarde refusée'));
check('verrou données — restauration confirmée en deux clics', app.includes('onConfirm={handleRestoreConfirm}'));
check('verrou données — rechargement après restauration', app.includes('window.location.reload()'));
check('verrou données — suite : export et sauvegarde testés', suite.includes('===== 11. Paufinage') && suite.includes('transactionsToCsv'));

// ============================================================
// Verrous : PWA — icone ecran d accueil, manifest, service worker
// ============================================================

// L app doit pouvoir s installer sur l ecran d accueil de Gwen.
// Contrainte du depot : aucun binaire ne transite jamais par l API —
// les icones sont GENEREES au build par scripts/generate-icons.mjs
// (pur node, zlib, CRC32 : zero dependance) puis validees ici octet
// par octet, comme le reste de la maison.
const manifestRaw = read('public/manifest.webmanifest');
let manifest = null;
try { manifest = JSON.parse(manifestRaw); } catch { manifest = null; }
check('pwa — manifest.webmanifest est un JSON valide', manifest !== null);
check('pwa — manifest : name et short_name déclarés', Boolean(manifest && manifest.name && manifest.short_name));
check('pwa — manifest : display standalone, start_url relatif "./"', manifest && manifest.display === 'standalone' && manifest.start_url === './');
check('pwa — manifest : theme_color terracotta, background_color crème', manifest && manifest.theme_color === '#c95f3f' && manifest.background_color === '#faf5ee');
const iconList = manifest && Array.isArray(manifest.icons) ? manifest.icons : [];
check('pwa — manifest : icônes 192 any, 512 any et 512 maskable déclarées',
  iconList.some(i => i.sizes === '192x192' && i.purpose === 'any') &&
  iconList.some(i => i.sizes === '512x512' && i.purpose === 'any') &&
  iconList.some(i => i.sizes === '512x512' && i.purpose === 'maskable'));

const sw = read('public/sw.js');
check('pwa — sw.js déclare un handler fetch (installable)', sw.includes("addEventListener('fetch'"));
const indexHtml = read('index.html');
check('pwa — index.html relie le manifest', indexHtml.includes('manifest.webmanifest'));
check('pwa — index.html déclare theme-color terracotta', indexHtml.includes('content="#c95f3f"'));
check('pwa — index.html déclare apple-touch-icon (iOS)', indexHtml.includes('apple-touch-icon'));
const mainTsx = read('src/main.tsx');
check('pwa — service worker enregistré au chargement (main.tsx)', mainTsx.includes('serviceWorker.register'));
const gen = read('scripts/generate-icons.mjs');
check('pwa — générateur d icônes déterministe (aucun Math.random)', !gen.includes('Math.random'));
const pkgJson = JSON.parse(read('package.json'));
check('pwa — le build génère les icônes avant vite build', pkgJson.scripts.build === 'node scripts/generate-icons.mjs && vite build');

// Génération réelle puis vérification structurelle : signature PNG, CRC de
// chaque morceau, dimensions IHDR, IDAT décompressible à la taille exacte.
const genRun = spawnSync(process.execPath, [path.join(ROOT, 'scripts/generate-icons.mjs')], { encoding: 'utf8' });
check('pwa — le générateur d icônes s exécute sans erreur', genRun.status === 0);
if (genRun.status !== 0 && genRun.stderr) console.error(genRun.stderr);
if (genRun.status === 0) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
  }
  const crc32buf = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const verifyPng = (rel, expectedW, expectedH) => {
    const file = fs.readFileSync(path.join(ROOT, rel));
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!file.subarray(0, 8).equals(sig)) return 'signature invalide';
    let off = 8, w = 0, h = 0;
    const idatParts = [];
    while (off + 12 <= file.length) {
      const len = file.readUInt32BE(off);
      const type = file.toString('ascii', off + 4, off + 8);
      const data = file.subarray(off + 8, off + 8 + len);
      const crc = file.readUInt32BE(off + 8 + len);
      if (crc !== crc32buf(Buffer.concat([file.subarray(off + 4, off + 8), data]))) return 'CRC invalide (' + type + ')';
      if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
      if (type === 'IDAT') idatParts.push(data);
      off += 12 + len;
    }
    if (w !== expectedW || h !== expectedH) return 'IHDR ' + w + 'x' + h + ', attendu ' + expectedW + 'x' + expectedH;
    try {
      const raw = zlib.inflateSync(Buffer.concat(idatParts));
      if (raw.length !== h * (w * 4 + 1)) return 'IDAT gonflé à ' + raw.length + ', attendu ' + h * (w * 4 + 1);
    } catch (e) {
      return 'IDAT non décompressible : ' + (e && e.message ? e.message : e);
    }
    return 'ok';
  };
  check('pwa — icon-192.png : PNG valide 192x192 (signature, CRC, IDAT)', verifyPng('public/icons/icon-192.png', 192, 192) === 'ok');
  check('pwa — icon-512.png : PNG valide 512x512', verifyPng('public/icons/icon-512.png', 512, 512) === 'ok');
  check('pwa — icon-maskable-512.png : PNG valide 512x512', verifyPng('public/icons/icon-maskable-512.png', 512, 512) === 'ok');
}

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
