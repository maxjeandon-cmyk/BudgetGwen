import React, { useState } from 'react';

interface BatchFormProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const BatchForm = ({ onSubmit, onCancel }: BatchFormProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Le lot a besoin d un nom.');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="batch-form">
      <div className="form-group">
        <label htmlFor="batch-name">Nom du lot</label>
        <input
          id="batch-name"
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Ex : Courses du samedi"
        />
      </div>
      {error && (
        <p className="error-message" role="alert">{error}</p>
      )}
      <div className="form-actions">
        <button onClick={onCancel} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} className="btn-primary">Créer le lot</button>
      </div>
    </div>
  );
};

export default BatchForm;
