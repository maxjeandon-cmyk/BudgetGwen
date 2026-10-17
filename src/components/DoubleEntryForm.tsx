import React, { useState } from 'react';
import type { Account, Category } from '../types/budget';
import { accountTypeLabel } from '../format';

interface DoubleEntryFormProps {
  accounts: Account[];
  categories: Category[];
  onSubmit: (
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    label: string,
    debitCategoryId: string | undefined,
    creditCategoryId: string | undefined
  ) => void;
  onCancel: () => void;
}

const parseAmount = (raw: string): number => parseFloat(raw.replace(',', '.'));

const DoubleEntryForm = ({ accounts, categories, onSubmit, onCancel }: DoubleEntryFormProps) => {
  const [debitAccountId, setDebitAccountId] = useState('');
  const [debitCategoryId, setDebitCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [creditCategoryId, setCreditCategoryId] = useState('');
  const [errors, setErrors] = useState({ label: '', amount: '', debit: '', credit: '', sameAccount: '' });

  // Double entree : le debit et le credit sont deux faces de la meme operation.
  const debitAccounts = accounts.filter(a => a.type !== 'revenu' && a.type !== 'capital');
  const creditAccounts = accounts.filter(a => a.type !== 'depense');

  const handleSubmit = () => {
    const next = { ...errors, label: '', amount: '', debit: '', credit: '', sameAccount: '' };
    if (!label.trim()) next.label = 'Le libellé est obligatoire.';
    const parsed = parseAmount(amount);
    if (isNaN(parsed) || parsed <= 0) next.amount = 'Le montant doit être supérieur à 0.';
    if (!debitAccountId) next.debit = 'Choisissez le compte à débiter.';
    if (!creditAccountId) next.credit = 'Choisissez le compte à créditer.';
    if (debitAccountId && creditAccountId && debitAccountId === creditAccountId) {
      next.sameAccount = 'Débit et crédit doivent être deux comptes différents.';
    }
    setErrors(next);
    if (next.label || next.amount || next.debit || next.credit || next.sameAccount) return;

    onSubmit(
      debitAccountId,
      creditAccountId,
      parsed,
      label.trim(),
      debitCategoryId || undefined,
      creditCategoryId || undefined
    );
  };

  return (
    <div className="double-entry-form">
      {errors.sameAccount && (
        <p className="error-message" role="alert">{errors.sameAccount}</p>
      )}
      <div className="double-entry-grid">
        <div className="entry-side debit-side">
          <h4>Débit — d où vient l argent</h4>
          <div className="form-group">
            <label htmlFor="de-debit-account">Compte débité</label>
            <select
              id="de-debit-account"
              value={debitAccountId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDebitAccountId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {debitAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({accountTypeLabel(account.type)})
                </option>
              ))}
            </select>
            {errors.debit && <p className="error-message" role="alert">{errors.debit}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="de-debit-category">Catégorie</label>
            <select
              id="de-debit-category"
              value={debitCategoryId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDebitCategoryId(e.target.value)}
            >
              <option value="">Sans catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="entry-connector">
          <span className="connector-arrow">→</span>
          <div className="form-group amount-input">
            <label htmlFor="de-amount">Montant (€)</label>
            <input
              id="de-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              placeholder="Ex : 42,50"
            />
            {errors.amount && <p className="error-message" role="alert">{errors.amount}</p>}
          </div>
        </div>

        <div className="entry-side credit-side">
          <h4>Crédit — où va l argent</h4>
          <div className="form-group">
            <label htmlFor="de-credit-account">Compte crédité</label>
            <select
              id="de-credit-account"
              value={creditAccountId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreditAccountId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {creditAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({accountTypeLabel(account.type)})
                </option>
              ))}
            </select>
            {errors.credit && <p className="error-message" role="alert">{errors.credit}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="de-credit-category">Catégorie</label>
            <select
              id="de-credit-category"
              value={creditCategoryId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreditCategoryId(e.target.value)}
            >
              <option value="">Sans catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="de-label">Libellé</label>
        <input
          id="de-label"
          type="text"
          value={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
          placeholder="Ex : Virement épargne"
        />
        {errors.label && <p className="error-message" role="alert">{errors.label}</p>}
      </div>
      <div className="form-actions">
        <button onClick={onCancel} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} className="btn-primary">Créer l entrée double</button>
      </div>
    </div>
  );
};

export default DoubleEntryForm;
