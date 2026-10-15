import React from 'react';
import type { Account } from '../types/budget';
import { formatEUR, accountTypeLabel } from '../format';

interface AccountListProps {
  accounts: Account[];
  onEdit: (account: Partial<Account> | undefined) => void;
  onDelete: (id: string) => void;
}

const AccountList = ({ accounts, onEdit, onDelete }: AccountListProps) => {
  return (
    <div className="account-grid">
      {accounts.map(account => (
        <div key={account.id} className="account-card" style={{ borderTopColor: account.color }}>
          <span className="account-name">{account.name}</span>
          <span className="account-type">{accountTypeLabel(account.type)}</span>
          <span className="account-balance">{formatEUR(account.balance)}</span>
          <div className="account-actions">
            <button
              className="btn-icon"
              onClick={() => onEdit(account)}
              aria-label={`Modifier le compte « ${account.name} »`}
            >
              ✏️
            </button>
            <button
              className="btn-icon"
              onClick={() => onDelete(account.id)}
              aria-label={`Supprimer le compte « ${account.name} »`}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountList;
