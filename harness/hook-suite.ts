// Suite dynamique : execute le VRAI useBudget (types retires par Node lui-meme)
// sur un seed realiste, et verifie les invariants de partie double.
// Sortie : une seule ligne JSON sur stdout, consommee par run.mjs.
//
// Semantique NATURELLE (Lot 4 — degel unique du hook) :
//   actif = debits - credits ; autres types = credits - debits ;
//   solde global = PATRIMOINE : actifs - passifs (flux et capital exclus) ;
//   resume mensuel bidirectionnel : un remboursement deduit les depenses,
//   une correction deduit les revenus.
// Les attentes ci-dessous sont calculees avec ces regles, au centime.
import { useState, useEffect, beginRender, setRerender, flushEffects, reset } from './react-stub.mjs';
import { useBudget, isEffectiveTransaction, calculateNaturalBalance, migrateLot4 } from './gen/useBudget.gen.ts';

// --- localStorage factice, pose AVANT tout rendu ---
const storage = new Map();
const fakeStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};
globalThis.window = { localStorage: fakeStorage };
globalThis.localStorage = fakeStorage;

const results = [];
function check(name, ok) {
  results.push({ name, ok: Boolean(ok) });
}
function eq(name, actual, expected) {
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) < 1e-9
    : actual === expected;
  if (!ok) check(name + ` (obtenu: ${JSON.stringify(actual)}, attendu: ${JSON.stringify(expected)})`, false);
  else check(name, true);
}

// --- Seed : 4 transactions effectives + 2 lots brouillons (1 tx chacun) ---
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const day = (d) => `${month}-${String(d).padStart(2, '0')}`;

// Attentes (regle naturelle, Lot 4 : actif = debits - credits ; autres =
// credits - debits ; patrimoine = actifs - passifs) :
//   bank     = 250.00 (salaire) - 96.00 (credits)      = +154.00
//   cash     = -12.00 ; salary = +250.00
//   food_exp = -45.70 ; charges = -62.30
//   patrimoine = (+154.00 - 12.00) - 0                 = 142.00
const seed = {
  accounts: [
    { id: 'cash', name: 'Espèces', type: 'actif', color: '#4CAF50', balance: 12.00 },
    { id: 'bank', name: 'Compte Bancaire', type: 'actif', color: '#2196F3', balance: -154.00 },
    { id: 'savings', name: 'Épargne', type: 'actif', color: '#9C27B0', balance: 0 },
    { id: 'credit_card', name: 'Carte de crédit', type: 'passif', color: '#F44336', balance: 0 },
    { id: 'salary', name: 'Salaire', type: 'revenu', color: '#8BC34A', balance: 250.00 },
    { id: 'food_exp', name: 'Dépenses alimentaires', type: 'depense', color: '#FF9800', balance: -45.70 },
    { id: 'charges', name: 'Charges', type: 'depense', color: '#9C27B0', balance: -62.30 },
  ],
  categories: [
    { id: 'salary', name: 'Salaire', icon: '💰', color: '#8BC34A' },
    { id: 'rent', name: 'Loyer', icon: '🏠', color: '#E91E63' },
    { id: 'food', name: 'Nourriture', icon: '🍽️', color: '#FF9800' },
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#607D8B' },
    { id: 'transfer', name: 'Transfert', icon: '🔀', color: '#795548' },
  ],
  batches: [
    { id: 'b1', name: 'Courses', status: 'draft', transactionIds: ['t5'] },
    { id: 'b2', name: 'Retraits', status: 'draft', transactionIds: ['t6'] },
  ],
  transactions: [
    { id: 't0', date: day(1), debitAccountId: 'bank', creditAccountId: 'salary', creditCategoryId: 'salary', amount: 250.00, label: 'Salaire' },
    { id: 't1', date: day(2), debitAccountId: 'charges', debitCategoryId: 'rent', creditAccountId: 'bank', amount: 62.30, label: 'Loyer' },
    { id: 't2', date: day(3), debitAccountId: 'food_exp', debitCategoryId: 'food', creditAccountId: 'bank', amount: 24.50, label: 'Courses alimentaires' },
    { id: 't3', date: day(4), debitAccountId: 'food_exp', debitCategoryId: 'transport', creditAccountId: 'bank', amount: 9.20, label: 'Abonnement bus' },
    { id: 't4', date: day(5), debitAccountId: 'food_exp', debitCategoryId: 'food', creditAccountId: 'cash', amount: 12.00, label: 'Pharmacie' },
    { id: 't5', date: day(6), debitAccountId: 'food_exp', debitCategoryId: 'food', creditAccountId: 'bank', amount: 38.40, label: 'Grandes courses', batchId: 'b1' },
    { id: 't6', date: day(7), debitAccountId: 'bank', debitCategoryId: 'transfer', creditAccountId: 'cash', amount: 20.00, label: 'Retrait espèces', batchId: 'b2' },
  ],
};

storage.set('budgetgwen.v1.data', JSON.stringify(seed));

// --- Boucle de rendu : chaque setState relance le hook, comme React ---
let api;
function tick() {
  beginRender();
  api = useBudget();
  flushEffects();
}
setRerender(tick);
tick();

const bal = (id) => api.data.accounts.find(a => a.id === id)?.balance;
const summary = () => api.getMonthlySummary(month);

// ===== 1. Etat initial : le seed est charge, les brouillons ne comptent pas =====
eq('seed — 7 comptes charges', api.data.accounts.length, 7);
eq('seed — 5 categories chargees', api.data.categories.length, 5);
eq('seed — 7 transactions chargees', api.data.transactions.length, 7);
eq('seed — 2 lots brouillons', api.data.batches.filter(b => b.status === 'draft').length, 2);
eq('seed — solde bank +154,00 €', bal('bank'), 154.00);
eq('seed — solde food_exp -45,70 €', bal('food_exp'), -45.70);
eq('seed — solde charges -62,30 €', bal('charges'), -62.30);
eq('seed — solde salary +250,00 €', bal('salary'), 250.00);
eq('seed — solde cash -12,00 €', bal('cash'), -12.00);
eq('seed — patrimoine 142,00 €', api.getOverallBalance(), 142.00);
eq('seed — revenus du mois 250,00 €', summary().totalIncome, 250.00);
eq('seed — depenses du mois 108,00 €', summary().totalExpense, 108.00);
eq('seed — solde du mois 142,00 €', summary().netBalance, 142.00);
eq('seed — par categorie : nourriture -36,50 €', summary().byCategory.food, -36.50);
eq('seed — par categorie : salaire +250,00 €', summary().byCategory.salary, 250.00);
eq('seed — brouillon non effectif', isEffectiveTransaction(api.data.transactions.find(t => t.id === 't5'), api.data.batches), false);
eq('seed — transaction hors lot effective', isEffectiveTransaction(api.data.transactions.find(t => t.id === 't1'), api.data.batches), true);
eq('seed — invariant partie double respecte', api.validateDoubleEntryInvariant(), true);
eq('seed — 7 transactions dans le mois', api.getTransactionsByMonth(month).length, 7);

// ===== 2. Garde-fous : les transactions invalides sont refusees =====
api.addTransaction({ date: day(10), debitAccountId: 'food_exp', creditAccountId: 'bank', amount: 0, label: 'Montant nul' });
eq('garde-fou — montant nul refuse', api.data.transactions.length, 7);
api.addTransaction({ date: day(10), debitAccountId: 'food_exp', creditAccountId: 'food_exp', amount: 5, label: 'Debit = credit' });
eq('garde-fou — debit = credit refuse', api.data.transactions.length, 7);
api.addTransaction({ date: day(10), debitAccountId: 'food_exp', creditAccountId: 'bank', amount: -3, label: 'Montant negatif' });
eq('garde-fou — montant negatif refuse', api.data.transactions.length, 7);
eq('garde-fou — soldes intacts', bal('bank'), 154.00);

// ===== 3. Cafe 3,50 € : depense petite mais bien comptee =====
api.addTransaction({ date: day(10), debitAccountId: 'food_exp', debitCategoryId: 'food', creditAccountId: 'bank', amount: 3.50, label: 'Café' });
eq('cafe — 8 transactions', api.data.transactions.length, 8);
eq('cafe — solde bank +150,50 €', bal('bank'), 150.50);
eq('cafe — solde food_exp -49,20 €', bal('food_exp'), -49.20);
eq('cafe — patrimoine 138,50 €', api.getOverallBalance(), 138.50);
eq('cafe — depenses du mois 111,50 €', summary().totalExpense, 111.50);
eq('cafe — nourriture -40,00 €', summary().byCategory.food, -40.00);

// ===== 4. Confirmation du lot « Courses » : atomique, tout ou rien =====
api.confirmBatch('b1');
eq('lot confirme — statut confirmed', api.data.batches.find(b => b.id === 'b1')?.status, 'confirmed');
eq('lot confirme — solde bank +112,10 €', bal('bank'), 112.10);
eq('lot confirme — solde food_exp -87,60 €', bal('food_exp'), -87.60);
eq('lot confirme — patrimoine 100,10 €', api.getOverallBalance(), 100.10);
eq('lot confirme — depenses du mois 149,90 €', summary().totalExpense, 149.90);
eq('lot confirme — solde du mois 100,10 €', summary().netBalance, 100.10);
eq('lot confirme — t5 desormais effective', isEffectiveTransaction(api.data.transactions.find(t => t.id === 't5'), api.data.batches), true);
// Re-confirmer un lot confirme : sans effet.
api.confirmBatch('b1');
eq('lot confirme — re-confirmation sans effet', bal('bank'), 112.10);

// ===== 5. Suppression du lot « Retraits » : emporte sa transaction =====
api.deleteBatch('b2');
eq('lot supprime — 7 transactions restantes', api.data.transactions.length, 7);
eq('lot supprime — t6 disparue', api.data.transactions.some(t => t.id === 't6'), false);
eq('lot supprime — soldes inchanges (brouillon)', bal('bank'), 112.10);
eq('lot supprime — 1 lot restant', api.data.batches.length, 1);

// ===== 6. Comptes et categories : garde-fous et cycles =====
api.deleteAccount('bank');
eq('compte — suppression avec transactions refusee', api.data.accounts.some(a => a.id === 'bank'), true);
api.deleteAccount('savings');
eq('compte — suppression sans transactions acceptee', api.data.accounts.some(a => a.id === 'savings'), false);
eq('compte — 6 comptes', api.data.accounts.length, 6);
api.addAccount({ name: 'Livret B', type: 'actif', color: '#0af' });
eq('compte — ajout Livret B', api.data.accounts.some(a => a.name === 'Livret B'), true);
eq('compte — nouveau compte a solde 0', api.data.accounts.find(a => a.name === 'Livret B')?.balance, 0);

api.deleteCategory('food');
eq('categorie — suppression utilisee refusee', api.data.categories.some(c => c.id === 'food'), true);
api.deleteCategory('transfer');
eq('categorie — suppression inutilisee acceptee', api.data.categories.some(c => c.id === 'transfer'), false);
api.addCategory({ name: 'Vacances', icon: '🏝️', color: '#0af' });
eq('categorie — ajout Vacances', api.data.categories.some(c => c.name === 'Vacances'), true);
eq('categorie — 5 categories', api.data.categories.length, 5);

eq('final — invariant partie double toujours respecte', api.validateDoubleEntryInvariant(), true);

// ===== 7. Persistance : localStorage ecrit, rechargement integre =====
const persisted = storage.get('budgetgwen.v1.data');
eq('persistance — localStorage contient Livret B', persisted.includes('Livret B'), true);
eq('persistance — localStorage contient le lot confirme', persisted.includes('"status":"confirmed"'), true);
reset();
setRerender(tick); // le stub met rerender a null au reset : on le rebranche
tick(); // Remontage : le hook relit localStorage
eq('rechargement — 7 transactions retrouvees', api.data.transactions.length, 7);
eq('rechargement — solde bank +112,10 € retrouve', bal('bank'), 112.10);
eq('rechargement — lot Courses confirme retrouve', api.data.batches.find(b => b.id === 'b1')?.status, 'confirmed');
eq('rechargement — Livret B retrouve', api.data.accounts.some(a => a.name === 'Livret B'), true);

// ===== 8. Solde initial : ouverture de compte equilibree =====
// Decision produit (Lot 4) : le solde saisi a la creation d un compte
// s ecrit comme une transaction equilibree contre un compte d ouverture
// « Ouverture » (capital). Au sens naturel : debit du compte cree pour
// un solde positif, credit « Ouverture » en contrepartie. Le capital
// n est ni revenu ni depense : le mois de la creation n affiche aucun
// fantome, et le patrimoine ignore la contrepartie.
const balName = (n: string) => api.data.accounts.find(a => a.name === n)?.balance;
const summaryBefore = summary();
api.addAccount({ name: 'Ouverture', type: 'capital', color: '#8D6E63' });
api.addAccount({ name: 'Livret C', type: 'actif', color: '#00bcd4' });
const ouvId = api.data.accounts.find(a => a.name === 'Ouverture')?.id;
const livCId = api.data.accounts.find(a => a.name === 'Livret C')?.id;
api.addTransaction({ date: day(10), debitAccountId: livCId, creditAccountId: ouvId, amount: 1250.40, label: 'Solde initial — Livret C' });
eq('ouverture — solde Livret C +1250,40 €', balName('Livret C'), 1250.40);
eq('ouverture — solde Ouverture (capital) +1250,40 €', balName('Ouverture'), 1250.40);
eq('ouverture — resume neutre : revenus inchanges', summary().totalIncome, summaryBefore.totalIncome);
eq('ouverture — resume neutre : depenses inchangees', summary().totalExpense, summaryBefore.totalExpense);
eq('ouverture — resume neutre : solde du mois inchange', summary().netBalance, summaryBefore.netBalance);
eq('ouverture — patrimoine 1350,50 € (contrepartie capital ignoree)', api.getOverallBalance(), 1350.50);
// Solde initial negatif (ex : decouvert) : meme mecanique, sens inverse.
api.addAccount({ name: 'Découvert', type: 'actif', color: '#f44336' });
const decId = api.data.accounts.find(a => a.name === 'Découvert')?.id;
api.addTransaction({ date: day(10), debitAccountId: ouvId, creditAccountId: decId, amount: 300.00, label: 'Solde initial — Découvert' });
eq('ouverture negative — solde Découvert -300,00 €', balName('Découvert'), -300.00);
eq('ouverture negative — solde Ouverture +950,40 €', balName('Ouverture'), 950.40);
eq('ouverture negative — depenses du mois toujours 149,90 €', summary().totalExpense, 149.90);
eq('ouverture negative — patrimoine 1050,50 €', api.getOverallBalance(), 1050.50);
eq('final — invariant partie double apres ouvertures', api.validateDoubleEntryInvariant(), true);

// ===== 9. Lot 4 : remboursement et correction, enfin comptes =====
// Un remboursement CREDITE le compte de depense : la depense du mois
// recule d autant, au lieu de gonfler un solde global double.
api.addTransaction({ date: day(11), debitAccountId: 'bank', creditAccountId: 'food_exp', amount: 10.00, label: 'Remboursement pharmacie' });
eq('remboursement — solde bank +122,10 €', bal('bank'), 122.10);
eq('remboursement — depenses du mois 139,90 € (deduites)', summary().totalExpense, 139.90);
eq('remboursement — patrimoine 1060,50 €', api.getOverallBalance(), 1060.50);
// Une correction DEBITE le compte de revenu : le revenu du mois recule.
api.addTransaction({ date: day(11), debitAccountId: 'salary', creditAccountId: 'bank', amount: 50.00, label: 'Correction salaire' });
eq('correction — solde bank +72,10 €', bal('bank'), 72.10);
eq('correction — revenus du mois 200,00 € (corriges)', summary().totalIncome, 200.00);
eq('correction — patrimoine 1010,50 €', api.getOverallBalance(), 1010.50);
eq('final — invariant partie double apres corrections', api.validateDoubleEntryInvariant(), true);

// ===== 10. Lot 4 : soldes naturels exportes et migration idempotente =====
// Parite : calculateNaturalBalance (exporte) = soldes du hook, au centime.
eq('naturel — parite bank (actif)', calculateNaturalBalance('bank', 'actif', api.data.transactions, api.data.batches), bal('bank'));
eq('naturel — parite food_exp (depense)', calculateNaturalBalance('food_exp', 'depense', api.data.transactions, api.data.batches), bal('food_exp'));
eq('naturel — actif : debits - credits', calculateNaturalBalance('bank', 'actif', api.data.transactions, api.data.batches), 72.10);
eq('naturel — flux : credits - debits', calculateNaturalBalance('salary', 'revenu', api.data.transactions, api.data.batches), 200.00);
// Migration : un localStorage d avant le Lot 4 (« Ouverture » passif,
// « Solde initial » debit Ouverture, salaire simule contre Ouverture)
// repasse entierement au sens naturel, une seule fois.
const legacy = {
  accounts: [
    { id: 'bank2', name: 'Compte bancaire', type: 'actif', color: '#2196F3', balance: 1250.00 },
    { id: 'ouv2', name: 'Ouverture', type: 'passif', color: '#8D6E63', balance: -1500.00 },
    { id: 'sal2', name: 'Salaire', type: 'revenu', color: '#8BC34A', balance: 250.00 },
  ],
  categories: [],
  batches: [],
  transactions: [
    { id: 'l0', date: day(1), debitAccountId: 'ouv2', creditAccountId: 'bank2', amount: 1250.00, label: 'Solde initial — Compte bancaire' },
    { id: 'l1', date: day(2), debitAccountId: 'ouv2', creditAccountId: 'sal2', amount: 250.00, label: 'Salaire' },
  ],
};
const migrated = migrateLot4(legacy);
eq('migration — « Solde initial » retourne (debit bank2)', migrated.transactions.find(t => t.id === 'l0')?.debitAccountId, 'bank2');
eq('migration — solde bank2 au naturel +1250,00 €', migrated.accounts.find(a => a.id === 'bank2')?.balance, 1250.00);
eq('migration — « Ouverture » retypé capital', migrated.accounts.find(a => a.id === 'ouv2')?.type, 'capital');
eq('migration — solde Ouverture (capital) +1000,00 €', migrated.accounts.find(a => a.id === 'ouv2')?.balance, 1000.00);
eq('migration — salaire simule : sal2 +250,00 €', migrated.accounts.find(a => a.id === 'sal2')?.balance, 250.00);
eq('migration — marqueur lot4Migrated pose', migrated.lot4Migrated, true);
// Idempotence : rejouer la migration ne change plus rien.
const migratedTwice = migrateLot4(migrated);
eq('migration — idempotente (second passage identique)', JSON.stringify(migratedTwice) === JSON.stringify(migrated), true);
eq('final — invariant partie double apres migration', api.validateDoubleEntryInvariant(), true);

// Sortie unique, consommee par run.mjs.
console.log(JSON.stringify(results));
