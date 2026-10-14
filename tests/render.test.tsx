/**
 * Tests de rendu pour BudgetGwen - Lot 0
 * Verifie que chaque composant principal rend sans TypeError
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import type { Account, Batch, Category, Transaction } from '../src/types/budget';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('BudgetGwen Lot 0 - Tests de Rendu', () => {
  describe('Composants Principaux', () => {
    it('Dashboard rend sans TypeError', async () => {
      const { Dashboard } = await import('../src/components/Dashboard');
      const mockSummary = {
        month: '2024-01',
        totalIncome: 2000,
        totalExpense: 500,
        netBalance: 1500,
        byCategory: {} as Record<string, number>,
        byAccount: {} as Record<string, number>,
      };
      const mockAccounts: Account[] = [
        { id: 'bank', name: 'Bank', type: 'actif', balance: 1500, color: '#2196F3' },
      ];
      expect(() => render(
        <Dashboard
          monthlySummary={mockSummary}
          accounts={mockAccounts}
          overallBalance={1500}
          onViewDetails={() => {}}
        />
      )).not.toThrow();
    });

    it('TransactionList rend sans TypeError', async () => {
      const { TransactionList } = await import('../src/components/TransactionList');
      const mockTransactions: Transaction[] = [{
        id: 't1', date: '2024-01-01',
        debitAccountId: 'bank', creditAccountId: 'cash',
        amount: 100, label: 'Test',
      }];
      const mockAccounts: Account[] = [
        { id: 'bank', name: 'Bank', type: 'actif', balance: 0, color: '#2196F3' },
        { id: 'cash', name: 'Cash', type: 'actif', balance: 0, color: '#4CAF50' },
      ];
      const mockCategories: Category[] = [];
      expect(() => render(
        <TransactionList
          transactions={mockTransactions}
          accounts={mockAccounts}
          categories={mockCategories}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )).not.toThrow();
    });

    it('DoubleEntryForm rend sans TypeError', async () => {
      const { DoubleEntryForm } = await import('../src/components/DoubleEntryForm');
      const mockAccounts: Account[] = [
        { id: 'bank', name: 'Bank', type: 'actif', balance: 0, color: '#2196F3' },
        { id: 'cash', name: 'Cash', type: 'actif', balance: 0, color: '#4CAF50' },
      ];
      const mockCategories: Category[] = [];
      expect(() => render(
        <DoubleEntryForm
          accounts={mockAccounts}
          categories={mockCategories}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      )).not.toThrow();
    });

    it('BatchList rend sans TypeError', async () => {
      const { BatchList } = await import('../src/components/BatchList');
      const mockBatches: Batch[] = [{
        id: 'b1', name: 'Batch 1', status: 'draft', transactionIds: [],
      }];
      expect(() => render(
        <BatchList
          batches={mockBatches}
          onSelect={() => {}}
          onConfirm={() => {}}
          onCancel={() => {}}
          onDelete={() => {}}
        />
      )).not.toThrow();
    });

    it('AccountList rend sans TypeError', async () => {
      const { AccountList } = await import('../src/components/AccountList');
      const mockAccounts: Account[] = [
        { id: 'bank', name: 'Bank', type: 'actif', balance: 0, color: '#2196F3' },
      ];
      expect(() => render(
        <AccountList
          accounts={mockAccounts}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )).not.toThrow();
    });

    it('CategoryList rend sans TypeError', async () => {
      const { CategoryList } = await import('../src/components/CategoryList');
      const mockCategories: Category[] = [
        { id: 'food', name: 'Food', icon: 'F', color: '#FF9800' },
      ];
      expect(() => render(
        <CategoryList
          categories={mockCategories}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )).not.toThrow();
    });
  });

  describe('Composants Secondaires', () => {
    it('Modal rend avec contenu', async () => {
      const { Modal } = await import('../src/components/Modal');
      expect(() => render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      )).not.toThrow();
    });

    it('Modal ne rend pas quand ferme', async () => {
      const { Modal } = await import('../src/components/Modal');
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <div>Content</div>
        </Modal>
      );
      expect(document.querySelector('.modal')).toBeNull();
    });

    it('BatchForm rend sans TypeError', async () => {
      const { BatchForm } = await import('../src/components/BatchForm');
      expect(() => render(
        <BatchForm onSubmit={() => {}} onCancel={() => {}} />
      )).not.toThrow();
    });

    it('TransactionForm rend sans TypeError', async () => {
      const { TransactionForm } = await import('../src/components/TransactionForm');
      const mockAccounts: Account[] = [];
      const mockCategories: Category[] = [];
      expect(() => render(
        <TransactionForm
          accounts={mockAccounts}
          categories={mockCategories}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      )).not.toThrow();
    });
  });

  describe('Verification DOM factice', () => {
    it('DOM factice est configure', () => {
      expect(document).toBeDefined();
      expect(document.body).toBeDefined();
      expect(typeof document.createElement).toBe('function');
    });

    it('Elements rendus sont dans le DOM', () => {
      const div = document.createElement('div');
      div.id = 'test';
      div.textContent = 'Test';
      document.body.appendChild(div);
      expect(document.getElementById('test')).toBeDefined();
      expect(document.getElementById('test')?.textContent).toBe('Test');
    });
  });
});
