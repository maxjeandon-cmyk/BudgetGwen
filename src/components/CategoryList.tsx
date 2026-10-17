import React from 'react';
import type { Category } from '../types/budget';
import ConfirmButton from './ConfirmButton';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Partial<Category> | undefined) => void;
  onDelete: (id: string) => void;
}

const CategoryList = ({ categories, onEdit, onDelete }: CategoryListProps) => {
  return (
    <div className="category-grid">
      {categories.map(category => (
        <div key={category.id} className="category-card" style={{ borderLeftColor: category.color }}>
          <span className="category-icon">{category.icon}</span>
          <span className="category-name">{category.name}</span>
          <div className="category-actions">
            <button
              className="btn-icon"
              onClick={() => onEdit(category)}
              aria-label={`Modifier la catégorie « ${category.name} »`}
            >
              ✏️
            </button>
            <ConfirmButton
              className="btn-icon"
              onConfirm={() => onDelete(category.id)}
              label={`Supprimer la catégorie « ${category.name} »`}
              confirmText="⚠️ Recliquez pour supprimer"
            >
              🗑️
            </ConfirmButton>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
