import React, { useState } from 'react';

interface BatchFormProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const BatchForm: React.FC<BatchFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(name);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="batch-form">
      <h3>Nouveau Lot</h3>

      <div className="form-group">
        <label>Nom du Lot</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du lot de transactions"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" className="btn-primary">
          Créer le Lot
        </button>
      </div>
    </form>
  );
};

export default BatchForm;
