import React, { useState } from 'react';
import type { Account, Category } from '../types/budget';

interface DoubleEntryFormProps {
  accounts: Account[];
  categories: Category[];
  onSubmit: (
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    label: string,
    debitCategoryId?: string,
    creditCategoryId?: string
  ) => void;
  onCancel: () => void;
}

export const DoubleEntryForm: React.FC<DoubleEntryFormProps> = ({
  accounts,
  categories,
  onSubmit,
  onCancel,
}) => {
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState('');
  const [debitCategoryId, setDebitCategoryId] = useState<string | undefined>();
  const [creditCategoryId, setCreditCategoryId] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!debitAccountId) {
      newErrors.debitAccount = 'Le compte de débit est obligatoire';
    }
    if (!creditAccountId) {
      newErrors.creditAccount = 'Le compte de crédit est obligatoire';
    }
    if (debitAccountId === creditAccountId) {
      newErrors.sameAccount = 'Les comptes doivent être différents';
    }
    if (amount <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }
    if (!label.trim()) {
      newErrors.label = 'Le libellé est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(
      debitAccountId,
      creditAccountId,
      amount,
      label,
      debitCategoryId,
      creditCategoryId
    );

    // Réinitialise le formulaire
    setDebitAccountId('');
    setCreditAccountId('');
    setAmount(0);
    setLabel('');
    setDebitCategoryId(undefined);
    setCreditCategoryId(undefined);
  };

  // Filtre les comptes pour le débit (pas de type 'revenu' ou 'capital' en débit)
  const debitAccounts = accounts.filter(acc => 
    acc.type !== 'revenu' && acc.type !== 'capital'
  );

  // Filtre les comptes pour le crédit (pas de type 'depense' en crédit)
  const creditAccounts = accounts.filter(acc => 
    acc.type !== 'depense'
  );

  return (
    <form onSubmit={handleSubmit} className="double-entry-form">
      <h3>⚖️ Nouvelle Entrée Double</h3>
      <p className="form-description">
        La méthode double entrée nécessite un débit et un crédit de montant égal.
        <br />
        <strong>Montants en EUROS</strong>
      </p>

      {errors.sameAccount && (
        <div className="error-message">{errors.sameAccount}</div>
      )}

      <div className="double-entry-grid">
        <div className="entry-side debit-side">
          <h4>📉 Débit</h4>
          
          <div className="form-group">
            <label>Compte</label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
            >
              <option value="">-- Sélectionnez un compte --</option>
              {debitAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
            {errors.debitAccount && <span className="error">{errors.debitAccount}</span>}
          </div>

          <div className="form-group">
            <label>Catégorie (optionnel)</label>
            <select
              value={debitCategoryId || ''}
              onChange={(e) => setDebitCategoryId(e.target.value || undefined)}
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

        <div className="entry-connector">
          <div className="amount-input">
            <label>Montant (€)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
            {errors.amount && <span className="error">{errors.amount}</span>}
          </div>
          <div className="connector-arrow">↔️</div>
          <div className="form-group">
            <label>Libellé</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Description"
            />
            {errors.label && <span className="error">{errors.label}</span>}
          </div>
        </div>

        <div className="entry-side credit-side">
          <h4>📈 Crédit</h4>
          
          <div className="form-group">
            <label>Compte</label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value)}
            >
              <option value="">-- Sélectionnez un compte --</option>
              {creditAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
            {errors.creditAccount && <span className="error">{errors.creditAccount}</span>}
          </div>

          <div className="form-group">
            <label>Catégorie (optionnel)</label>
            <select
              value={creditCategoryId || ''}
              onChange={(e) => setCreditCategoryId(e.target.value || undefined)}
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
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" className="btn-primary">
          Créer l'Entrée Double
        </button>
      </div>
    </form>
  );
};

export default DoubleEntryForm;
