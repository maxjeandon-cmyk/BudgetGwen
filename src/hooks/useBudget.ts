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

  // Calcule le solde d'un compte à partir des transactions
  const calculateAccountBalance = useCallback((accountId: string, transactions: Transaction[]): number => {
    let balance = 0;
    transactions.forEach(t => {
      if (t.debitAccountId === accountId) {
        balance -= t.amount;
      }
      if (t.creditAccountId === accountId) {
        balance += t.amount;
      }
    });
    return balance;
  }, []);

  // Recalcule tous les soldes des comptes
  const recalculateAllBalances = useCallback((transactions: Transaction[], accounts: Account[]): Account[] => {
    return accounts.map(account => ({
      ...account,
      balance: calculateAccountBalance(account.id, transactions),
    }));
  }, [calculateAccountBalance]);

  // Ajoute une transaction avec méthode double entrée
  // INVARIANT: chaque transaction a exactement un débit et un crédit de même montant
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    setData(prev => {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
      };

      // Recalcule tous les soldes
      const updatedAccounts = recalculateAllBalances(
        [...prev.transactions, newTransaction],
        prev.accounts
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

      return {
        ...prev,
        batches: updatedBatches,
        transactions: [...prev.transactions, newTransaction],
      };
    });
  }, [generateId]);

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

      // Recalcule tous les soldes (atomique)
      const updatedAccounts = recalculateAllBalances(prev.transactions, prev.accounts);

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

      return {
        ...prev,
        batches: updatedBatches,
      };
    });
  }, []);

  // Met à jour une transaction
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setData(prev => {
      const transactionIndex = prev.transactions.findIndex(t => t.id === id);
      if (transactionIndex === -1) return prev;

      const oldTransaction = prev.transactions[transactionIndex];
      const newTransaction = { ...oldTransaction, ...updates };

      // Recalcule tous les soldes
      const updatedAccounts = recalculateAllBalances(
        prev.transactions.map(t => t.id === id ? newTransaction : t),
        prev.accounts
      );

      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? newTransaction : t),
        accounts: updatedAccounts,
      };
    });
  }, [recalculateAllBalances]);

  // Supprime une transaction
  const deleteTransaction = useCallback((id: string) => {
    setData(prev => {
      const transaction = prev.transactions.find(t => t.id === id);
      if (!transaction) return prev;

      // Recalcule tous les soldes sans cette transaction
      const updatedAccounts = recalculateAllBalances(
        prev.transactions.filter(t => t.id !== id),
        prev.accounts
      );

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
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

  // Calcule le résumé mensuel
  const getMonthlySummary = useCallback((month: string) => {
    const monthTransactions = data.transactions.filter(t => t.date.startsWith(month));

    // Revenus : transactions où le crédit est sur un compte de type 'revenu'
    const totalIncome = monthTransactions
      .filter(t => {
        const creditAccount = data.accounts.find(a => a.id === t.creditAccountId);
        return creditAccount?.type === 'revenu';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Dépenses : transactions où le débit est sur un compte de type 'depense'
    const totalExpense = monthTransactions
      .filter(t => {
        const debitAccount = data.accounts.find(a => a.id === t.debitAccountId);
        return debitAccount?.type === 'depense';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Solde mensuel
    const netBalance = totalIncome - totalExpense;

    // Par catégorie (simplifié)
    const byCategory: Record<string, number> = {};
    monthTransactions.forEach(t => {
      if (t.debitCategoryId) {
        byCategory[t.debitCategoryId] = (byCategory[t.debitCategoryId] || 0) - t.amount;
      }
      if (t.creditCategoryId) {
        byCategory[t.creditCategoryId] = (byCategory[t.creditCategoryId] || 0) + t.amount;
      }
    });

    // Par compte
    const byAccount: Record<string, number> = {};
    data.accounts.forEach(acc => {
      byAccount[acc.id] = calculateAccountBalance(acc.id, monthTransactions);
    });

    return {
      month,
      totalIncome,
      totalExpense,
      netBalance,
      byCategory,
      byAccount,
    };
  }, [data.accounts, data.transactions, calculateAccountBalance]);

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
