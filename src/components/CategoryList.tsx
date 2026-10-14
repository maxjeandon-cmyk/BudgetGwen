import React from 'react';
import type { Category } from '../types/budget';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="category-list">
      <h3>Catégories</h3>
      <div className="category-grid">
        {categories.map(category => (
          <div
            key={category.id}
            className="category-card"
            style={{ borderTop: `4px solid ${category.color}` }}
          >
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </div>
            <div className="category-actions">
              <button onClick={() => onEdit(category)} className="btn-icon">
                ✏️
              </button>
              <button onClick={() => onDelete(category.id)} className="btn-icon btn-danger">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryList;
