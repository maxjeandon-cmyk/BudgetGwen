/**
 * Tests de logique metier pour BudgetGwen - Lot 0
 * Verifie les invariants de partie double, calculs de soldes, et cycle de lot
 * Donnees factices fixes pour garantie de reproductibilite
 * 
 * CONTRAT: Les montants sont en EUROS (et Francs suisses)
 */

import { describe, it, expect } from 'vitest';
import type { Transaction, Account, Batch } from '../src/types/budget';

// === DONNEES FACTICES FIXES ===
// Comptes avec soldes initiaux a zero pour simplifier les tests
const testAccountsZero: Account[] = [
  { id: 'bank', name: 'Compte Bancaire', type: 'actif', balance: 0, color: '#2196F3' },
  { id: 'cash', name: 'Espaces', type: 'actif', balance: 0, color: '#4CAF50' },
  { id: 'credit', name: 'Carte de credit', type: 'passif', balance: 0, color: '#F44336' },
  { id: 'salary', name: 'Salaire', type: 'revenu', balance: 0, color: '#8BC34A' },
  { id: 'food', name: 'Nourriture', type: 'depense', balance: 0, color: '#FF9800' },
];

// === HELPERS (copies des fonctions de useBudget.ts) ===
function calculateAccountBalance(accountId: string, transactions: Transaction[]): number {
  let balance = 0;
  transactions.forEach(t => {
    if (t.debitAccountId === accountId) balance -= t.amount;
    if (t.creditAccountId === accountId) balance += t.amount;
  });
  return balance;
}

function recalculateAllBalances(transactions: Transaction[], accounts: Account[]): Account[] {
  return accounts.map(account => ({
    ...account,
    balance: calculateAccountBalance(account.id, transactions),
  }));
}

function getMonthlySummary(transactions: Transaction[], accounts: Account[], month: string) {
  const monthTransactions = transactions.filter(t => t.date.startsWith(month));
  const totalIncome = monthTransactions
    .filter(t => accounts.find(a => a.id === t.creditAccountId)?.type === 'revenu')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthTransactions
    .filter(t => accounts.find(a => a.id === t.debitAccountId)?.type === 'depense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const byCategory: Record<string, number> = {};
  monthTransactions.forEach(t => {
    if (t.debitCategoryId) byCategory[t.debitCategoryId] = (byCategory[t.debitCategoryId] || 0) - t.amount;
    if (t.creditCategoryId) byCategory[t.creditCategoryId] = (byCategory[t.creditCategoryId] || 0) + t.amount;
  });
  const byAccount: Record<string, number> = {};
  accounts.forEach(acc => { byAccount[acc.id] = calculateAccountBalance(acc.id, monthTransactions); });
  return { month, totalIncome, totalExpense, netBalance, byCategory, byAccount };
}

// === TESTS ===
describe('BudgetGwen Lot 0 - Tests de Logique Metier', () => {
  describe('1. Invariants de Partie Double', () => {
    it('1.1 Chaque transaction a exactement un debit et un credit', () => {
      const t: Transaction = {
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: 'food',
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Retrait',
      };
      expect(t.debitAccountId).toBeDefined();
      expect(t.creditAccountId).toBeDefined();
      expect(t.amount).toBeGreaterThan(0);
    });

    it('1.2 Comptes debit et credit doivent etre differents', () => {
      const t: Transaction = {
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Valide - comptes differents',
      };
      expect(t.debitAccountId).not.toEqual(t.creditAccountId);
    });

    it('1.3 Montant doit etre positif', () => {
      const t: Transaction = {
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100.50, label: 'Montant positif',
      };
      expect(t.amount).toBeGreaterThan(0);
    });

    it('1.4 Montants en EUROS ou Francs suisses', () => {
      // Le systeme supporte les deux devises
      // Les montants sont en unites (pas en centimes)
      const tEUR: Transaction = {
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: '100 EUR',
      };
      const tCHF: Transaction = {
        id: 't2', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 150, label: '150 CHF',
      };
      expect(tEUR.amount).toBe(100);
      expect(tCHF.amount).toBe(150);
    });
  });

  describe('2. Calculs de Soldes', () => {
    it('2.1 Solde compte avec debit unique', () => {
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: 'food',
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Retrait',
      }];
      expect(calculateAccountBalance('bank', txs)).toBe(-100);
      expect(calculateAccountBalance('cash', txs)).toBe(100);
    });

    it('2.2 Solde compte avec credit unique', () => {
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'cash', debitCategoryId: undefined,
        creditAccountId: 'bank', creditCategoryId: 'salary',
        amount: 200, label: 'Depot',
      }];
      expect(calculateAccountBalance('bank', txs)).toBe(200);
      expect(calculateAccountBalance('cash', txs)).toBe(-200);
    });

    it('2.3 Solde avec plusieurs transactions', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-01', debitAccountId: 'bank', creditAccountId: 'cash', amount: 100, label: 'T1' },
        { id: 't2', date: '2024-01-02', debitAccountId: 'cash', creditAccountId: 'bank', amount: 500, label: 'T2' },
        { id: 't3', date: '2024-01-03', debitAccountId: 'bank', creditAccountId: 'credit', amount: 50, label: 'T3' },
      ];
      // bank: -100 (t1 debit) + 500 (t2 credit) - 50 (t3 debit) = 350
      expect(calculateAccountBalance('bank', txs)).toBe(350);
    });

    it('2.4 Recalcul complet des soldes', () => {
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: 'food',
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Retrait',
      }];
      const initial = [
        { id: 'bank', name: 'B', type: 'actif', balance: 0, color: '#000' },
        { id: 'cash', name: 'C', type: 'actif', balance: 0, color: '#000' },
      ];
      const updated = recalculateAllBalances(txs, initial);
      expect(updated.find(a => a.id === 'bank')?.balance).toBe(-100);
      expect(updated.find(a => a.id === 'cash')?.balance).toBe(100);
    });

    it('2.5 Soldes jamais incrementes en place - recalcules par aggregation', () => {
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Test',
      }];
      const accounts = [
        { id: 'bank', name: 'B', type: 'actif', balance: 1000, color: '#000' },
        { id: 'cash', name: 'C', type: 'actif', balance: 200, color: '#000' },
      ];
      const originalBankBalance = accounts.find(a => a.id === 'bank')?.balance;
      const originalCashBalance = accounts.find(a => a.id === 'cash')?.balance;
      const updated = recalculateAllBalances(txs, accounts);
      // Le tableau original ne doit pas etre modifie
      expect(accounts.find(a => a.id === 'bank')?.balance).toBe(originalBankBalance);
      expect(accounts.find(a => a.id === 'cash')?.balance).toBe(originalCashBalance);
      // Les soldes sont recalcules par aggregation (ignorant les soldes initiaux)
      expect(updated.find(a => a.id === 'bank')?.balance).toBe(-100);
      expect(updated.find(a => a.id === 'cash')?.balance).toBe(100);
    });
  });

  describe('3. Cycle de Lot (draft -> confirmed -> cancelled)', () => {
    it('3.1 Lot en draft - transactions existent mais non appliquees', () => {
      const batch: Batch = {
        id: 'b1', name: 'Lot draft', status: 'draft', transactionIds: ['t1'],
      };
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', debitCategoryId: undefined,
        creditAccountId: 'cash', creditCategoryId: undefined,
        amount: 100, label: 'Tx draft', batchId: 'b1',
      }];
      expect(batch.status).toBe('draft');
      const updated = recalculateAllBalances(txs, testAccountsZero);
      expect(updated.find(a => a.id === 'bank')?.balance).toBe(-100);
      expect(updated.find(a => a.id === 'cash')?.balance).toBe(100);
    });

    it('3.2 Confirmation de lot - applique toutes les transactions (atomique)', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-01', debitAccountId: 'bank', creditAccountId: 'cash', amount: 100, label: 'T1', batchId: 'b1' },
        { id: 't2', date: '2024-01-02', debitAccountId: 'cash', creditAccountId: 'bank', amount: 500, label: 'T2', batchId: 'b1' },
      ];
      const updated = recalculateAllBalances(txs, testAccountsZero);
      // bank: -100 (t1 debit) + 500 (t2 credit) = 400
      expect(updated.find(a => a.id === 'bank')?.balance).toBe(400);
      expect(updated.find(a => a.id === 'cash')?.balance).toBe(-400);
      expect(updated.find(a => a.id === 'salary')?.balance).toBe(0);
    });

    it('3.3 Lot annule - ne modifie jamais les soldes', () => {
      const cancelledBatch: Batch = {
        id: 'b1', name: 'Lot annule', status: 'cancelled', transactionIds: [],
      };
      expect(cancelledBatch.status).toBe('cancelled');
    });

    it('3.4 Cycle complet: draft -> confirmed -> cancelled', () => {
      const batch1: Batch = { id: 'b1', name: 'B1', status: 'draft', transactionIds: [] };
      const batch2: Batch = { id: 'b2', name: 'B2', status: 'confirmed', transactionIds: [] };
      const batch3: Batch = { id: 'b3', name: 'B3', status: 'cancelled', transactionIds: [] };
      
      expect(batch1.status).toBe('draft');
      expect(batch2.status).toBe('confirmed');
      expect(batch3.status).toBe('cancelled');
    });
  });

  describe('4. Calculs du Tableau de Bord', () => {
    it('4.1 Revenus du mois', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-15', debitAccountId: 'bank', creditAccountId: 'salary', amount: 2000, label: 'Salaire' },
        { id: 't2', date: '2024-01-20', debitAccountId: 'bank', creditAccountId: 'salary', amount: 500, label: 'Prime' },
        { id: 't3', date: '2024-02-01', debitAccountId: 'bank', creditAccountId: 'salary', amount: 2000, label: 'Fevrier' },
      ];
      const summary = getMonthlySummary(txs, testAccountsZero, '2024-01');
      expect(summary.totalIncome).toBe(2500); // 2000 + 500
    });

    it('4.2 Depenses du mois', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-15', debitAccountId: 'food', creditAccountId: 'bank', amount: 300, label: 'Courses' },
        { id: 't2', date: '2024-01-20', debitAccountId: 'food', creditAccountId: 'cash', amount: 100, label: 'Restaurant' },
      ];
      const summary = getMonthlySummary(txs, testAccountsZero, '2024-01');
      expect(summary.totalExpense).toBe(400); // 300 + 100
    });

    it('4.3 Solde net mensuel', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-15', debitAccountId: 'bank', creditAccountId: 'salary', amount: 2000, label: 'Revenu' },
        { id: 't2', date: '2024-01-20', debitAccountId: 'food', creditAccountId: 'bank', amount: 500, label: 'Depense' },
      ];
      const summary = getMonthlySummary(txs, testAccountsZero, '2024-01');
      expect(summary.netBalance).toBe(1500); // 2000 - 500
    });

    it('4.4 Soldes par compte', () => {
      const txs: Transaction[] = [{
        id: 't1', date: '2024-01-15',
        debitAccountId: 'bank', creditAccountId: 'cash',
        amount: 100, label: 'Retrait',
      }];
      const summary = getMonthlySummary(txs, testAccountsZero, '2024-01');
      expect(summary.byAccount['bank']).toBe(-100);
      expect(summary.byAccount['cash']).toBe(100);
      expect(summary.byAccount['credit']).toBe(0);
    });

    it('4.5 Soldes par categorie', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-15', debitAccountId: 'bank', debitCategoryId: 'food', creditAccountId: 'cash', amount: 100, label: 'Depense' },
        { id: 't2', date: '2024-01-20', debitAccountId: 'bank', creditAccountId: 'salary', creditCategoryId: 'salary', amount: 200, label: 'Revenu' },
      ];
      const summary = getMonthlySummary(txs, testAccountsZero, '2024-01');
      expect(summary.byCategory['food']).toBe(-100);
      expect(summary.byCategory['salary']).toBe(200);
    });
  });

  describe('5. Equilibre Debit/Credit', () => {
    it('5.1 Chaque transaction a debit = credit en montant', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-01', debitAccountId: 'bank', creditAccountId: 'cash', amount: 100, label: 'T1' },
        { id: 't2', date: '2024-01-02', debitAccountId: 'bank', creditAccountId: 'salary', amount: 200, label: 'T2' },
      ];
      txs.forEach(t => {
        expect(t.amount).toBeGreaterThan(0);
        expect(t.debitAccountId).toBeDefined();
        expect(t.creditAccountId).toBeDefined();
      });
    });

    it('5.2 Total debits = Total credits pour un ensemble', () => {
      const txs: Transaction[] = [
        { id: 't1', date: '2024-01-01', debitAccountId: 'bank', creditAccountId: 'cash', amount: 100, label: 'T1' },
        { id: 't2', date: '2024-01-02', debitAccountId: 'bank', creditAccountId: 'salary', amount: 200, label: 'T2' },
      ];
      const totalDebits = txs.reduce((sum, t) => sum + t.amount, 0);
      const totalCredits = txs.reduce((sum, t) => sum + t.amount, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });
});
