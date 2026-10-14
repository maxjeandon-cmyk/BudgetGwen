import React from 'react';
import type { Batch } from '../types/budget';

interface BatchListProps {
  batches: Batch[];
  onSelect: (batch: Batch) => void;
  onConfirm: (batchId: string) => void;
  onCancel: (batchId: string) => void;
  onDelete: (batchId: string) => void;
}

export const BatchList: React.FC<BatchListProps> = ({
  batches,
  onSelect,
  onConfirm,
  onCancel,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'confirmed':
        return 'Confirmé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  return (
    <div className="batch-list">
      <h3>Lots de Transactions</h3>
      <div className="batch-grid">
        {batches.map(batch => (
          <div
            key={batch.id}
            className="batch-card"
            onClick={() => onSelect(batch)}
            style={{ cursor: 'pointer' }}
          >
            <div className="batch-header">
              <span className="batch-name">{batch.name}</span>
              <span
                className="batch-status"
                style={{ color: getStatusColor(batch.status) }}
              >
                {getStatusLabel(batch.status)}
              </span>
            </div>
            <div className="batch-info">
              <span>{batch.transactionIds.length} transactions</span>
              <span>ID: {batch.id.substring(0, 8)}...</span>
            </div>
            <div className="batch-actions">
              {batch.status === 'draft' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onConfirm(batch.id); }} className="btn-small">
                    Confirmer
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onCancel(batch.id); }} className="btn-small btn-secondary">
                    Annuler
                  </button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(batch.id); }} className="btn-small btn-danger">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchList;
