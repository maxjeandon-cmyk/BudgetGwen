import React, { useState, useEffect } from 'react';
import type { Transaction, Account, Category } from '../types/budget';

interface TransactionFormProps {
  transaction?: Partial<Transaction>;
  accounts: Account[];
  categories: Category[];
  onSubmit: (data: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction = {},
  accounts,
  categories,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    debitAccountId: '',
    debitCategoryId: undefined,
    creditAccountId: '',
    creditCategoryId: undefined,
    amount: 0,
    label: '',
    ...transaction,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (transaction) {
      setFormData(prev => ({ ...prev, ...transaction }));
    }
  }, [transaction]);

  const handleChange = <K extends keyof Omit<Transaction, 'id'>>(
    field: K,
    value: Omit<Transaction, 'id'>[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.debitAccountId) {
      newErrors.debitAccountId = 'Le compte de débit est obligatoire';
    }
    if (!formData.creditAccountId) {
      newErrors.creditAccountId = 'Le compte de crédit est obligatoire';
    }
    if (formData.debitAccountId === formData.creditAccountId) {
      newErrors.sameAccount = 'Les comptes doivent être différents';
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }
    if (!formData.label.trim()) {
      newErrors.label = 'Le libellé est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(formData);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      debitAccountId: '',
      debitCategoryId: undefined,
      creditAccountId: '',
      creditCategoryId: undefined,
      amount: 0,
      label: '',
    });
  };

  // Filtre les comptes pour le débit
  const debitAccounts = accounts.filter(acc => 
    acc.type !== 'revenu' && acc.type !== 'capital'
  );

  // Filtre les comptes pour le crédit
  const creditAccounts = accounts.filter(acc => 
    acc.type !== 'depense'
  );

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <h3>{transaction?.id ? 'Modifier la Transaction' : 'Nouvelle Transaction'}</h3>
      <p className="form-description"><strong>Montants en EUROS</strong></p>

      {errors.sameAccount && (
        <div className="error-message">{errors.sameAccount}</div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Libellé</label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Description de la transaction"
          />
          {errors.label && <span className="error">{errors.label}</span>}
        </div>

        <div className="form-group">
          <label>Montant (€)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0"
          />
          {errors.amount && <span className="error">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label>Compte Débit</label>
          <select
            value={formData.debitAccountId}
            onChange={(e) => handleChange('debitAccountId', e.target.value)}
          >
            <option value="">-- Sélectionnez --</option>
            {debitAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type})
              </option>
            ))}
          </select>
          {errors.debitAccountId && <span className="error">{errors.debitAccountId}</span>}
        </div>

        <div className="form-group">
          <label>Catégorie Débit (optionnel)</label>
          <select
            value={formData.debitCategoryId || ''}
            onChange={(e) => handleChange('debitCategoryId', e.target.value || undefined)}
          >
            <option value="">-- Aucune --</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Compte Crédit</label>
          <select
            value={formData.creditAccountId}
            onChange={(e) => handleChange('creditAccountId', e.target.value)}
          >
            <option value="">-- Sélectionnez --</option>
            {creditAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type})
              </option>
            ))}
          </select>
          {errors.creditAccountId && <span className="error">{errors.creditAccountId}</span>}
        </div>

        <div className="form-group">
          <label>Catégorie Crédit (optionnel)</label>
          <select
            value={formData.creditCategoryId || ''}
            onChange={(e) => handleChange('creditCategoryId', e.target.value || undefined)}
          >
            <option value="">-- Aucune --</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" className="btn-primary">
          {transaction?.id ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
