import { useState, useEffect, useCallback } from 'react';
import type { Transaction, Account, Batch, Category } from '../types/budget';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../types/budget';

// Préfixe versionné pour le stockage local
const STORAGE_PREFIX = 'budgetgwen.v1';
const STORAGE_KEY = `${STORAGE_PREFIX}.data`;

interface BudgetData {
  transactions: Transaction[];
  accounts: Account[];
  batches: Batch[];
  categories: Category[];
}

const initialData: BudgetData = {
  transactions: [],
  accounts: [...DEFAULT_ACCOUNTS],
  batches: [],
  categories: [...DEFAULT_CATEGORIES],
};

// Arrondi aux centimes : evite la derive flottante (0.1 + 0.2 !== 0.3)
const round2 = (value: number): number => Math.round(value * 100) / 100;

// Une transaction est EFFECTIVE (comptee dans les soldes) si et seulement si
// elle n'appartient a aucun lot, ou si son lot est confirme.
// INVARIANT: un lot draft ou annule ne modifie JAMAIS les soldes.
export function isEffectiveTransaction(transaction: Transaction, batches: Batch[]): boolean {
  if (!transaction.batchId) return true;
  const batch = batches.find(b => b.id === transaction.batchId);
  return batch?.status === 'confirmed';
}

export function useBudget() {
  const [data, setData] = useState<BudgetData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...initialData, ...parsed };
        } catch {
          return initialData;
        }
      }
    }
    return initialData;
  });

  // Sauvegarde dans localStorage avec préfixe versionné
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  // Génère un ID unique
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  // Calcule le solde d'un compte à partir des transactions EFFECTIVES
  const calculateAccountBalance = useCallback((accountId: string, transactions: Transaction[], batches: Batch[]): number => {
    let balance = 0;
    transactions.forEach(t => {
      if (!isEffectiveTransaction(t, batches)) return;
      if (t.debitAccountId === accountId) {
        balance -= t.amount;
      }
      if (t.creditAccountId === accountId) {
        balance += t.amount;
      }
    });
    return round2(balance);
  }, []);

  // Recalcule tous les soldes des comptes (par agregation, jamais en place)
  const recalculateAllBalances = useCallback((transactions: Transaction[], accounts: Account[], batches: Batch[]): Account[] => {
    return accounts.map(account => ({
      ...account,
      balance: calculateAccountBalance(account.id, transactions, batches),
    }));
  }, [calculateAccountBalance]);

  // Ajoute une transaction avec méthode double entrée
  // INVARIANT: chaque transaction a exactement un débit et un crédit de même montant
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    // Garde-fou: montant strictement positif et comptes debit/credit distincts
    if (!(transaction.amount > 0) || transaction.debitAccountId === transaction.creditAccountId) {
      return;
    }

    setData(prev => {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
      };

      // Recalcule tous les soldes
      const updatedAccounts = recalculateAllBalances(
        [...prev.transactions, newTransaction],
        prev.accounts,
        prev.batches
      );

      return {
        ...prev,
        transactions: [...prev.transactions, newTransaction],
        accounts: updatedAccounts,
      };
    });
  }, [generateId, recalculateAllBalances]);

  // Crée une transaction double entrée atomique
  const createDoubleEntryTransaction = useCallback((
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    label: string,
    debitCategoryId?: string,
    creditCategoryId?: string,
    batchId?: string
  ) => {
    const transaction: Omit<Transaction, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      debitAccountId,
      debitCategoryId,
      creditAccountId,
      creditCategoryId,
      amount,
      label,
      batchId,
    };

    return addTransaction(transaction);
  }, [addTransaction]);

  // Crée un lot
  const createBatch = useCallback((name: string): Batch => {
    const batch: Batch = {
      id: generateId(),
      name,
      status: 'draft',
      transactionIds: [],
    };

    setData(prev => ({
      ...prev,
      batches: [...prev.batches, batch],
    }));

    return batch;
  }, [generateId]);

  // Ajoute une transaction à un lot (en mode draft)
  // INVARIANT: la transaction draft ne compte pas dans les soldes
  const addTransactionToBatch = useCallback((batchId: string, transaction: Omit<Transaction, 'id' | 'batchId'>) => {
    setData(prev => {
      const batchIndex = prev.batches.findIndex(b => b.id === batchId);
      if (batchIndex === -1) return prev;

      const batch = prev.batches[batchIndex];
      if (batch.status !== 'draft') return prev; // On ne peut ajouter qu'à un lot draft

      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        batchId,
        date: new Date().toISOString().split('T')[0],
      };

      // Met à jour le lot avec la nouvelle transaction
      const updatedBatches = [...prev.batches];
      updatedBatches[batchIndex] = {
        ...batch,
        transactionIds: [...batch.transactionIds, newTransaction.id],
      };

      // Soldes recalcules : la transaction draft reste sans effet
      const updatedAccounts = recalculateAllBalances(
        [...prev.transactions, newTransaction],
        prev.accounts,
        updatedBatches
      );

      return {
        ...prev,
        batches: updatedBatches,
        transactions: [...prev.transactions, newTransaction],
        accounts: updatedAccounts,
      };
    });
  }, [generateId, recalculateAllBalances]);

  // Confirme un lot - ATOMIQUE (tout ou rien)
  // INVARIANT: la confirmation applique toutes les transactions du lot
  const confirmBatch = useCallback((batchId: string) => {
    setData(prev => {
      const batchIndex = prev.batches.findIndex(b => b.id === batchId);
      if (batchIndex === -1) return prev;

      const batch = prev.batches[batchIndex];
      if (batch.status !== 'draft') return prev;

      // Vérifie que toutes les transactions du lot existent
      const batchTransactions = prev.transactions.filter(t => t.batchId === batchId);
      if (batchTransactions.length !== batch.transactionIds.length) {
        console.error('Batch contains references to non-existent transactions');
        return prev;
      }

      // Met à jour le statut du lot
      const updatedBatches = [...prev.batches];
      updatedBatches[batchIndex] = {
        ...batch,
        status: 'confirmed',
      };

      // Recalcule tous les soldes avec le lot confirme (atomique: un seul setData)
      const updatedAccounts = recalculateAllBalances(prev.transactions, prev.accounts, updatedBatches);

      return {
        ...prev,
        batches: updatedBatches,
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Annule un lot
  // INVARIANT: un lot annulé ne modifie jamais les soldes
  const cancelBatch = useCallback((batchId: string) => {
    setData(prev => {
      const batchIndex = prev.batches.findIndex(b => b.id === batchId);
      if (batchIndex === -1) return prev;

      const batch = prev.batches[batchIndex];
      if (batch.status !== 'draft') return prev; // Seul un draft peut être annulé

      const updatedBatches = [...prev.batches];
      updatedBatches[batchIndex] = {
        ...batch,
        status: 'cancelled',
      };

      // Soldes recalcules : le lot annule n'a toujours eu aucun effet,
      // mais on recalcule par agregation pour garantir la coherence
      const updatedAccounts = recalculateAllBalances(prev.transactions, prev.accounts, updatedBatches);

      return {
        ...prev,
        batches: updatedBatches,
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Supprime un lot et TOUTES ses transactions (peu importe son statut)
  const deleteBatch = useCallback((batchId: string) => {
    setData(prev => {
      const batch = prev.batches.find(b => b.id === batchId);
      if (!batch) return prev;

      const updatedTransactions = prev.transactions.filter(t => t.batchId !== batchId);
      const updatedAccounts = recalculateAllBalances(updatedTransactions, prev.accounts, prev.batches);

      return {
        ...prev,
        transactions: updatedTransactions,
        batches: prev.batches.filter(b => b.id !== batchId),
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Met à jour une transaction
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setData(prev => {
      const transactionIndex = prev.transactions.findIndex(t => t.id === id);
      if (transactionIndex === -1) return prev;

      const oldTransaction = prev.transactions[transactionIndex];
      const newTransaction = { ...oldTransaction, ...updates };

      const updatedTransactions = prev.transactions.map(t => t.id === id ? newTransaction : t);
      const updatedAccounts = recalculateAllBalances(updatedTransactions, prev.accounts, prev.batches);

      return {
        ...prev,
        transactions: updatedTransactions,
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Supprime une transaction (et nettoie la reference dans son lot eventuel)
  const deleteTransaction = useCallback((id: string) => {
    setData(prev => {
      const transaction = prev.transactions.find(t => t.id === id);
      if (!transaction) return prev;

      // Retire l ID de la transaction de son lot, sinon confirmBatch echouerait en silence
      const updatedBatches = prev.batches.map(b =>
        b.transactionIds.includes(id)
          ? { ...b, transactionIds: b.transactionIds.filter(tid => tid !== id) }
          : b
      );

      const updatedTransactions = prev.transactions.filter(t => t.id !== id);
      const updatedAccounts = recalculateAllBalances(updatedTransactions, prev.accounts, updatedBatches);

      return {
        ...prev,
        transactions: updatedTransactions,
        batches: updatedBatches,
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Met à jour un compte (métadonnées seulement, pas le solde)
  const updateAccount = useCallback((id: string, updates: Partial<Omit<Account, 'balance'>>) => {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc),
    }));
  }, []);

  // Ajoute un compte
  const addAccount = useCallback((account: Omit<Account, 'id' | 'balance'>) => {
    setData(prev => ({
      ...prev,
      accounts: [...prev.accounts, { ...account, id: generateId(), balance: 0 }],
    }));
  }, [generateId]);

  // Supprime un compte (uniquement s'il n'a pas de transactions)
  const deleteAccount = useCallback((id: string) => {
    setData(prev => {
      const hasTransactions = prev.transactions.some(
        t => t.debitAccountId === id || t.creditAccountId === id
      );
      if (hasTransactions) {
        return prev;
      }

      return {
        ...prev,
        accounts: prev.accounts.filter(acc => acc.id !== id),
      };
    });
  }, []);

  // Ajoute une catégorie
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, { ...category, id: generateId() }],
    }));
  }, [generateId]);

  // Supprime une catégorie
  const deleteCategory = useCallback((id: string) => {
    setData(prev => {
      const hasTransactions = prev.transactions.some(
        t => t.debitCategoryId === id || t.creditCategoryId === id
      );
      if (hasTransactions) {
        return prev;
      }

      return {
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== id),
      };
    });
  }, []);

  // Calcule le résumé mensuel (sur les transactions EFFECTIVES uniquement)
  const getMonthlySummary = useCallback((month: string) => {
    const monthTransactions = data.transactions.filter(
      t => t.date.startsWith(month) && isEffectiveTransaction(t, data.batches)
    );
    const accountType = (id: string): string | undefined =>
      data.accounts.find(a => a.id === id)?.type;

    // Revenu: l argent entre dans les actifs/passifs depuis un compte de flux
    // (credit sur un compte 'revenu', ou debit actif/passif + credit hors actif/passif)
    const totalIncome = monthTransactions
      .filter(t => {
        const creditType = accountType(t.creditAccountId);
        const debitType = accountType(t.debitAccountId);
        return creditType === 'revenu' ||
          ((debitType === 'actif' || debitType === 'passif') && creditType !== 'actif' && creditType !== 'passif');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Depense: l argent sort des actifs/passifs vers un compte de flux
    // (debit sur un compte 'depense', ou credit actif/passif + debit hors actif/passif)
    const totalExpense = monthTransactions
      .filter(t => {
        const debitType = accountType(t.debitAccountId);
        const creditType = accountType(t.creditAccountId);
        return debitType === 'depense' ||
          ((creditType === 'actif' || creditType === 'passif') && debitType !== 'actif' && debitType !== 'passif');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Solde mensuel
    const netBalance = round2(totalIncome - totalExpense);

    // Par catégorie
    const byCategory: Record<string, number> = {};
    monthTransactions.forEach(t => {
      if (t.debitCategoryId) {
        byCategory[t.debitCategoryId] = round2((byCategory[t.debitCategoryId] || 0) - t.amount);
      }
      if (t.creditCategoryId) {
        byCategory[t.creditCategoryId] = round2((byCategory[t.creditCategoryId] || 0) + t.amount);
      }
    });

    // Par compte
    const byAccount: Record<string, number> = {};
    data.accounts.forEach(acc => {
      byAccount[acc.id] = calculateAccountBalance(acc.id, monthTransactions, data.batches);
    });

    return {
      month,
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      netBalance,
      byCategory,
      byAccount,
    };
  }, [data.accounts, data.batches, data.transactions, calculateAccountBalance]);

  // Calcule le solde global (actifs + revenus - passifs - dépenses - capital)
  const getOverallBalance = useCallback(() => {
    return data.accounts.reduce((sum, acc) => {
      if (acc.type === 'actif' || acc.type === 'revenu') {
        return sum + acc.balance;
      } else if (acc.type === 'passif' || acc.type === 'depense' || acc.type === 'capital') {
        return sum - acc.balance;
      }
      return sum;
    }, 0);
  }, [data.accounts]);

  // Filtre les transactions par mois
  const getTransactionsByMonth = useCallback((month: string) => {
    return data.transactions.filter(t => t.date.startsWith(month));
  }, [data.transactions]);

  // Filtre les transactions par compte (débit ou crédit)
  const getTransactionsByAccount = useCallback((accountId: string) => {
    return data.transactions.filter(
      t => t.debitAccountId === accountId || t.creditAccountId === accountId
    );
  }, [data.transactions]);

  // Filtre les transactions par catégorie
  const getTransactionsByCategory = useCallback((categoryId: string) => {
    return data.transactions.filter(
      t => t.debitCategoryId === categoryId || t.creditCategoryId === categoryId
    );
  }, [data.transactions]);

  // Vérifie l'invariant de partie double pour toutes les transactions
  const validateDoubleEntryInvariant = useCallback((): boolean => {
    return data.transactions.every(t => {
      // Chaque transaction doit avoir un débit et un crédit
      return t.debitAccountId && t.creditAccountId && t.amount > 0;
    });
  }, [data.transactions]);

  return {
    data,
    // Transactions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    createDoubleEntryTransaction,
    // Batches
    createBatch,
    addTransactionToBatch,
    confirmBatch,
    cancelBatch,
    deleteBatch,
    // Accounts
    updateAccount,
    addAccount,
    deleteAccount,
    // Categories
    addCategory,
    deleteCategory,
    // Queries
    getMonthlySummary,
    getOverallBalance,
    getTransactionsByMonth,
    getTransactionsByAccount,
    getTransactionsByCategory,
    // Validation
    validateDoubleEntryInvariant,
    recalculateAllBalances,
  };
}
