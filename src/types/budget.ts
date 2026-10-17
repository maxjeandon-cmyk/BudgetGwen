// Types pour la gestion budgétaire avec méthode double entrée
// Contrat : Les montants sont en EUROS (pas en centimes)

/**
 * Compte budgétaire
 * Types : 'actif' | 'passif' | 'revenu' | 'depense' | 'capital'
 */
export interface Account {
  id: string;
  name: string;
  type: 'actif' | 'passif' | 'revenu' | 'depense' | 'capital';
  color: string;
  balance: number; // en euros
}

/**
 * Catégorie de transaction
 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/**
 * Transaction avec méthode double entrée
 * Chaque transaction a EXACTEMENT un débit et un crédit de même montant
 * amount: en EUROS (ex: 100.50 = 100,50€)
 */
export interface Transaction {
  id: string;
  date: string; // Format ISO yyyy-mm-dd
  debitAccountId: string;
  debitCategoryId?: string;
  creditAccountId: string;
  creditCategoryId?: string;
  amount: number; // en euros
  label: string;
  batchId?: string;
}

/**
 * Lot de transactions
 * status: 'draft' | 'confirmed' | 'cancelled'
 * transactionIds: liste des IDs de transactions appartenant au lot
 */
export interface Batch {
  id: string;
  name: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  transactionIds: string[];
}

// Données par défaut pour les comptes — départ minimal, demande de Gwen :
// juste les deux coulisses qui font vivre la partie double. Les comptes
// réels (Livret, Compte bancaire, Espèces…) seront ajoutés au fur et à
// mesure, avec leur solde actuel saisi à la création.
//   - Salaire (revenu) : tampon des entrées d'argent ;
//   - Dépenses (depense) : tampon des sorties, où part l'argent utilisé.
export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'salary', name: 'Salaire', type: 'revenu', balance: 0, color: '#8BC34A' },
  { id: 'expenses', name: 'Dépenses', type: 'depense', balance: 0, color: '#FF9800' },
];

// Données par défaut pour les catégories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salaire', icon: '💰', color: '#8BC34A' },
  { id: 'gift', name: 'Cadeau', icon: '🎁', color: '#FFEB3B' },
  { id: 'refund', name: 'Remboursement', icon: '🔄', color: '#CDDC39' },
  { id: 'food', name: 'Nourriture', icon: '🍽️', color: '#FF9800' },
  { id: 'rent', name: 'Loyer', icon: '🏠', color: '#E91E63' },
  { id: 'utilities', name: 'Charges', icon: '⚡', color: '#9C27B0' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#607D8B' },
  { id: 'health', name: 'Santé', icon: '🏥', color: '#F44336' },
  { id: 'leisure', name: 'Loisirs', icon: '🎬', color: '#00BCD4' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#FF5722' },
  { id: 'transfer', name: 'Transfert', icon: '🔀', color: '#795548' },
];
