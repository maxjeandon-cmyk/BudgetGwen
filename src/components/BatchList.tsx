import React from 'react';
import type { Batch } from '../types/budget';
import ConfirmButton from './ConfirmButton';

interface BatchListProps {
  batches: Batch[];
  onConfirm: (batchId: string) => void;
  onCancel: (batchId: string) => void;
  onDelete: (batchId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
};

const BatchList = ({ batches, onConfirm, onCancel, onDelete }: BatchListProps) => {
  return (
    <div className="batch-grid">
      {batches.map(batch => (
        <div key={batch.id} className="batch-card">
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
            <ConfirmButton
              className="btn-small btn-danger"
              stopPropagation
              onConfirm={() => onDelete(batch.id)}
              label={`Supprimer le lot « ${batch.name} » et ses ${batch.transactionIds.length} transactions`}
              confirmText="⚠️ Recliquez : lot et transactions seront supprimés"
            >
              🗑️ Supprimer
            </ConfirmButton>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BatchList;
