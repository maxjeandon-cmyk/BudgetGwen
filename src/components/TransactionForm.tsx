import React, { useState } from 'react';
import type { Account, Category, Transaction } from '../types/budget';
import { accountTypeLabel } from '../format';

interface TransactionFormProps {
  transaction: Partial<Transaction> | null;
  accounts: Account[];
  categories: Category[];
  /** Mode du formulaire : 'income' (entree d argent) ou 'expense' (sortie). */
  mode?: 'income' | 'expense';
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

const todayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const parseAmount = (raw: string | number | undefined): number => {
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw || '').replace(',', '.'));
};

const TransactionForm = ({ transaction, accounts, categories, mode, onSubmit, onCancel }: TransactionFormProps) => {
  // Pre-remplissage selon le mode, coherent avec la semantique du hook figé :
  // - income  : on credite un compte de REVENU (ex. Salaire) — c est ainsi
  //   que le hook compte l entree dans le resume mensuel.
  // - expense : on DEBITE le compte de depense et on credite son compte —
  //   sens classique compte par le hook.
  const defaultDebit =
    mode === 'expense'
      ? (accounts.find(a => a.type === 'depense')?.id || '')
      : '';
  const defaultCredit =
    mode === 'income'
      ? (accounts.find(a => a.type === 'revenu')?.id || '')
      : (mode === 'expense' ? (accounts.find(a => a.type === 'actif')?.id || '') : '');

  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    date: transaction?.date || todayISO(),
    debitAccountId: transaction?.debitAccountId || defaultDebit,
    debitCategoryId: transaction?.debitCategoryId,
    creditAccountId: transaction?.creditAccountId || defaultCredit,
    creditCategoryId: transaction?.creditCategoryId,
    amount: transaction?.amount !== undefined ? transaction.amount : ('' as string | number),
    label: transaction?.label || '',
  });
  const [errors, setErrors] = useState({ label: '', amount: '', debit: '', credit: '', sameAccount: '' });

  // Mise a jour d un champ du formulaire, sans generiques compliques.
  const setField = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }) as Omit<Transaction, 'id'>);
  };

  // Comptes eligibles au debit : tout sauf les flux de revenus et de capital.
  const debitAccounts = accounts.filter(a => a.type !== 'revenu' && a.type !== 'capital');
  // Comptes eligibles au credit : tous, y compris les depenses.
  // Crediter un compte de depense est legitime : l argent utilise
  // (remboursement, ajustement, sortie directe) atterrit sur la depense.
  const creditAccounts = accounts;

  const handleSubmit = () => {
    const next = { ...errors, label: '', amount: '', debit: '', credit: '', sameAccount: '' };
    if (!formData.label.trim()) next.label = 'Le libellé est obligatoire.';
    const amount = parseAmount(formData.amount);
    if (isNaN(amount) || amount <= 0) next.amount = 'Le montant doit être supérieur à 0.';
    if (!formData.debitAccountId) next.debit = 'Choisissez le compte à débiter.';
    if (!formData.creditAccountId) next.credit = 'Choisissez le compte à créditer.';
    if (formData.debitAccountId && formData.creditAccountId && formData.debitAccountId === formData.creditAccountId) {
      next.sameAccount = 'Débit et crédit doivent être deux comptes différents.';
    }
    setErrors(next);
    if (next.label || next.amount || next.debit || next.credit || next.sameAccount) return;

    onSubmit({
      date: formData.date,
      debitAccountId: formData.debitAccountId,
      debitCategoryId: formData.debitCategoryId || undefined,
      creditAccountId: formData.creditAccountId,
      creditCategoryId: formData.creditCategoryId || undefined,
      amount,
      label: formData.label.trim(),
    });
  };

  const debitOptions = debitAccounts.map(account => (
    <option key={account.id} value={account.id}>
      {account.name} ({accountTypeLabel(account.type)})
    </option>
  ));
  const creditOptions = creditAccounts.map(account => (
    <option key={account.id} value={account.id}>
      {account.name} ({accountTypeLabel(account.type)})
    </option>
  ));

  return (
    <div className="transaction-form">
      {errors.sameAccount && (
        <p className="error-message" role="alert">{errors.sameAccount}</p>
      )}
      {mode === 'income' && !transaction?.id && (
        <p className="form-hint">💰 L'argent entre : créditez le compte de revenu (ex. Salaire) et débitez la source.</p>
      )}
      {mode === 'expense' && !transaction?.id && (
        <p className="form-hint">🧾 L'argent sort : le compte « Dépenses » est débité, votre compte est crédité. Sortie différée ? Choisissez simplement une date future — elle sera suivie dans le mois correspondant du Dashboard.</p>
      )}
      <div className="form-group">
        <label htmlFor="tx-date">Date</label>
        <input
          id="tx-date"
          type="date"
          value={formData.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('date', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="tx-label">Libellé</label>
        <input
          id="tx-label"
          type="text"
          value={formData.label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('label', e.target.value)}
          placeholder="Ex : Courses du samedi"
        />
        {errors.label && <p className="error-message" role="alert">{errors.label}</p>}
      </div>
      <div className="form-group">
        <label htmlFor="tx-amount">Montant (€)</label>
        <input
          id="tx-amount"
          type="text"
          inputMode="decimal"
          value={formData.amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('amount', e.target.value)}
          placeholder="Ex : 42,50"
        />
        {errors.amount && <p className="error-message" role="alert">{errors.amount}</p>}
      </div>
      <div className="form-group">
        <label htmlFor="tx-debit-account">Compte débité (d où vient l argent)</label>
        <select
          id="tx-debit-account"
          value={formData.debitAccountId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('debitAccountId', e.target.value)}
        >
          <option value="">— Choisir —</option>
          {debitOptions}
        </select>
        {errors.debit && <p className="error-message" role="alert">{errors.debit}</p>}
      </div>
      <div className="form-group">
        <label htmlFor="tx-debit-category">Catégorie de dépense</label>
        <select
          id="tx-debit-category"
          value={formData.debitCategoryId || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('debitCategoryId', e.target.value || undefined)}
        >
          <option value="">Sans catégorie</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="tx-credit-account">Compte crédité (où va l argent)</label>
        <select
          id="tx-credit-account"
          value={formData.creditAccountId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('creditAccountId', e.target.value)}
        >
          <option value="">— Choisir —</option>
          {creditOptions}
        </select>
        {errors.credit && <p className="error-message" role="alert">{errors.credit}</p>}
      </div>
      <div className="form-group">
        <label htmlFor="tx-credit-category">Catégorie de revenu</label>
        <select
          id="tx-credit-category"
          value={formData.creditCategoryId || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('creditCategoryId', e.target.value || undefined)}
        >
          <option value="">Sans catégorie</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button onClick={onCancel} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} className="btn-primary">
          {transaction?.id ? 'Enregistrer' : (mode === 'income' ? 'Ajouter le revenu' : mode === 'expense' ? 'Ajouter la dépense' : 'Ajouter la transaction')}
        </button>
      </div>
    </div>
  );
};

export default TransactionForm;
