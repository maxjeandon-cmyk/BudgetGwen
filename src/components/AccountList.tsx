import React from 'react';
import type { Account } from '../types/budget';

interface AccountListProps {
  accounts: Account[];
  onEdit: (account: Partial<Account>) => void;
  onDelete: (id: string) => void;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  onEdit,
  onDelete,
}) => {
  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      actif: 'Actif',
      passif: 'Passif',
      revenu: 'Revenu',
      depense: 'Dépense',
      capital: 'Capital',
    };
    return labels[type] || type;
  };

  return (
    <div className="account-list">
      <h3>Comptes</h3>
      <div className="account-grid">
        {accounts.map(account => (
          <div
            key={account.id}
            className="account-card"
            style={{ borderTop: `4px solid ${account.color}` }}
          >
            <div className="account-header">
              <span className="account-name">{account.name}</span>
              <span className="account-type-badge" style={{ backgroundColor: account.color }}>
                {getAccountTypeLabel(account.type)}
              </span>
            </div>
            <div className="account-balance">
              {account.balance >= 0 ? '+' : ''}
              {account.balance.toFixed(2)} €
            </div>
            <div className="account-actions">
              <button onClick={() => onEdit(account)} className="btn-icon">
                ✏️
              </button>
              <button onClick={() => onDelete(account.id)} className="btn-icon btn-danger">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountList;
