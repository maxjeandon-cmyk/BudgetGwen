import React from 'react';
import type { Batch } from '../types/budget';

interface BatchListProps {
  batches: Batch[];
  onSelect: (batch: Batch) => void;
  onConfirm: (batchId: string) => void;
  onCancel: (batchId: string) => void;
  onDelete: (batchId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
};

const BatchList = ({ batches, onSelect, onConfirm, onCancel, onDelete }: BatchListProps) => {
  return (
    <div className="batch-grid">
      {batches.map(batch => (
        <div
          key={batch.id}
          className="batch-card"
          onClick={() => onSelect(batch)}
        >
          <div className="batch-header">
            <span className="batch-name">{batch.name}</span>
            <span className={`status-badge status-${batch.status}`}>
              {STATUS_LABELS[batch.status] || batch.status}
            </span>
          </div>
          <p className="batch-info">{batch.transactionIds.length} transactions</p>
          <div className="batch-actions">
            {batch.status === 'draft' && (
              <button
                className="btn-small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onConfirm(batch.id);
                }}
                aria-label={`Confirmer le lot « ${batch.name} »`}
              >
                ✓ Confirmer
              </button>
            )}
            {batch.status !== 'cancelled' && batch.status !== 'confirmed' && (
              <button
                className="btn-small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onCancel(batch.id);
                }}
                aria-label={`Annuler le lot « ${batch.name} »`}
              >
                ⊘ Annuler
              </button>
            )}
            <button
              className="btn-small btn-danger"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onDelete(batch.id);
              }}
              aria-label={`Supprimer le lot « ${batch.name} »`}
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BatchList;
