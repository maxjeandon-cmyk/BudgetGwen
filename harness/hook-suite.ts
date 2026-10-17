// Suite dynamique : execute le VRAI useBudget (types retires par Node lui-meme)
// sur un seed realiste, et verifie les invariants de partie double.
// Sortie : une seule ligne JSON sur stdout, consommee par run.mjs.
//
// Semantique du hook figé (verifiee sur le Lot 1) : les soldes sont
// POSITIFS AU CREDIT (grand livre). Une depense (debit d'un compte 'depense',
// credit d'un actif) fait donc grimper le solde global de 2 x son montant,
// et un revenu (credit d'un compte 'revenu') est neutre dessus.
// Les attentes ci-dessous sont calculees avec ces regles, au centime.
import { useState, useEffect, beginRender, setRerender, flushEffects, reset } from './react-stub.mjs';
import { useBudget, isEffectiveTransaction } from './gen/useBudget.gen.ts';

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

// Attentes (regle : solde = credits - debits ; global = actifs + revenus
// - passifs - depenses - capital) :
//   bank     = -250.00 (salaire) + 96.00 (credits)     = -154.00
//   cash     = +12.00 ; salary = +250.00
//   food_exp = -45.70 ; charges = -62.30
//   global   = (-154.00 + 12.00) + 250.00 - (-108.00)  = 216.00
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
eq('seed — solde bank -154,00 €', bal('bank'), -154.00);
eq('seed — solde food_exp -45,70 €', bal('food_exp'), -45.70);
eq('seed — solde charges -62,30 €', bal('charges'), -62.30);
eq('seed — solde salary +250,00 €', bal('salary'), 250.00);
eq('seed — solde cash +12,00 €', bal('cash'), 12.00);
eq('seed — solde global 216,00 €', api.getOverallBalance(), 216.00);
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
eq('garde-fou — soldes intacts', bal('bank'), -154.00);

// ===== 3. Cafe 3,50 € : depense petite mais bien comptee =====
api.addTransaction({ date: day(10), debitAccountId: 'food_exp', debitCategoryId: 'food', creditAccountId: 'bank', amount: 3.50, label: 'Café' });
eq('cafe — 8 transactions', api.data.transactions.length, 8);
eq('cafe — solde bank -150,50 €', bal('bank'), -150.50);
eq('cafe — solde food_exp -49,20 €', bal('food_exp'), -49.20);
eq('cafe — solde global 223,00 € (depense pesee double)', api.getOverallBalance(), 223.00);
eq('cafe — depenses du mois 111,50 €', summary().totalExpense, 111.50);
eq('cafe — nourriture -40,00 €', summary().byCategory.food, -40.00);

// ===== 4. Confirmation du lot « Courses » : atomique, tout ou rien =====
api.confirmBatch('b1');
eq('lot confirme — statut confirmed', api.data.batches.find(b => b.id === 'b1')?.status, 'confirmed');
eq('lot confirme — solde bank -112,10 €', bal('bank'), -112.10);
eq('lot confirme — solde food_exp -87,60 €', bal('food_exp'), -87.60);
eq('lot confirme — solde global 299,80 €', api.getOverallBalance(), 299.80);
eq('lot confirme — depenses du mois 149,90 €', summary().totalExpense, 149.90);
eq('lot confirme — solde du mois 100,10 €', summary().netBalance, 100.10);
eq('lot confirme — t5 desormais effective', isEffectiveTransaction(api.data.transactions.find(t => t.id === 't5'), api.data.batches), true);
// Re-confirmer un lot confirme : sans effet.
api.confirmBatch('b1');
eq('lot confirme — re-confirmation sans effet', bal('bank'), -112.10);

// ===== 5. Suppression du lot « Retraits » : emporte sa transaction =====
api.deleteBatch('b2');
eq('lot supprime — 7 transactions restantes', api.data.transactions.length, 7);
eq('lot supprime — t6 disparue', api.data.transactions.some(t => t.id === 't6'), false);
eq('lot supprime — soldes inchanges (brouillon)', bal('bank'), -112.10);
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
tick(); // Remontage : le hook relit localStorage
eq('rechargement — 7 transactions retrouvees', api.data.transactions.length, 7);
eq('rechargement — solde bank -112,10 € retrouve', bal('bank'), -112.10);
eq('rechargement — lot Courses confirme retrouve', api.data.batches.find(b => b.id === 'b1')?.status, 'confirmed');
eq('rechargement — Livret B retrouve', api.data.accounts.some(a => a.name === 'Livret B'), true);

// Sortie unique, consommee par run.mjs.
console.log(JSON.stringify(results));
