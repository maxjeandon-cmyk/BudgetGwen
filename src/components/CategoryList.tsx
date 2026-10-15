import React from 'react';
import type { Category } from '../types/budget';

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
            <button
              className="btn-icon"
              onClick={() => onDelete(category.id)}
              aria-label={`Supprimer la catégorie « ${category.name} »`}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
