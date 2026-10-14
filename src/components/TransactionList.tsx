import React from 'react';
import type { Transaction, Account, Category } from '../types/budget';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEdit: (transaction: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  onEdit,
  onDelete,
}) => {
  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Inconnu';
  };

  const getAccountTypeLabel = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.type : 'inconnu';
  };

  // Trie par date (plus récent en premier)
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="transaction-list">
      <h3>Transactions</h3>
      
      {sortedTransactions.length === 0 ? (
        <p className="no-transactions">Aucune transaction a afficher</p>
      ) : (
        <div className="transaction-table">
          <div className="transaction-header">
            <span>Date</span>
            <span>Libelle</span>
            <span>Debit</span>
            <span>Credit</span>
            <span>Montant</span>
            <span>Actions</span>
          </div>

          {sortedTransactions.map(transaction => (
            <div key={transaction.id} className="transaction-row">
              <span>{formatDate(transaction.date)}</span>
              <span className="transaction-label">{transaction.label}</span>
              <span className="account-cell">
                {getAccountName(transaction.debitAccountId)} ({getAccountTypeLabel(transaction.debitAccountId)})
              </span>
              <span className="account-cell">
                {getAccountName(transaction.creditAccountId)} ({getAccountTypeLabel(transaction.creditAccountId)})
              </span>
              <span className="amount-cell">{transaction.amount.toFixed(2)} EUR</span>
              <span className="actions-cell">
                <button onClick={() => onEdit(transaction)} className="btn-icon">
                  Edit
                </button>
                <button onClick={() => onDelete(transaction.id)} className="btn-icon btn-danger">
                  Del
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper pour formater la date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default TransactionList;
