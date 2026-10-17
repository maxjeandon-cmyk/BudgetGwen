import React from 'react';
import type { Account, Category, Transaction } from '../types/budget';
import { formatEUR } from '../format';
import ConfirmButton from './ConfirmButton';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  /** Categories recues d App pour compatibilite, non utilisees pour l instant. */
  categories?: Category[];
  onEdit: (transaction: Partial<Transaction> | undefined) => void;
  onDelete: (id: string) => void;
}

// Date courte et lisible : jj/mm/aaaa (sans surprise de fuseau horaire)
const formatDate = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const accountName = (accounts: Account[], id: string): string =>
  accounts.find(a => a.id === id)?.name || 'Compte inconnu';

const TransactionList = ({
  transactions,
  accounts,
  onEdit,
  onDelete,
}: TransactionListProps) => {
  // Les transactions en attente de lot restent visibles, mais a la fin de la liste.
  const sorted = [...transactions].sort((a, b) => {
    const aPending = a.batchId ? 1 : 0;
    const bPending = b.batchId ? 1 : 0;
    if (aPending !== bPending) return aPending - bPending;
    return b.date.localeCompare(a.date);
  });

  if (sorted.length === 0) {
    return (
      <p className="no-transactions" role="status">
        Aucune transaction ce mois-ci — c'est parfois bon signe. 🌱
      </p>
    );
  }

  return (
    <div className="transaction-list">
      <div className="transaction-row transaction-header">
        <span className="date-cell">Date</span>
        <span className="transaction-label">Transaction</span>
        <span className="account-cell">Débit</span>
        <span className="account-cell">Crédit</span>
        <span className="amount-cell">Montant</span>
        <span className="actions-cell">Actions</span>
      </div>
      {sorted.map(transaction => (
        <div key={transaction.id} className="transaction-row">
          <span className="date-cell" data-label="Date">{formatDate(transaction.date)}</span>
          <span className="transaction-label">
            {transaction.label}
            {transaction.batchId && (
              <span className="tx-draft-badge">En attente de lot</span>
            )}
          </span>
          <span className="account-cell" data-label="Débit">{accountName(accounts, transaction.debitAccountId)}</span>
          <span className="account-cell" data-label="Crédit">{accountName(accounts, transaction.creditAccountId)}</span>
          <span className="amount-cell" data-label="Montant">{formatEUR(transaction.amount)}</span>
          <span className="actions-cell">
            <button
              className="btn-icon"
              onClick={() => onEdit(transaction)}
              aria-label={`Modifier la transaction « ${transaction.label} »`}
            >
              ✏️
            </button>
            <ConfirmButton
              className="btn-icon"
              onConfirm={() => onDelete(transaction.id)}
              label={`Supprimer la transaction « ${transaction.label} »`}
              confirmText="⚠️ Recliquez pour supprimer"
            >
              🗑️
            </ConfirmButton>
          </span>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
