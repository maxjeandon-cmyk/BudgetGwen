import React, { useState, useMemo } from 'react';
import { useBudget } from './hooks/useBudget';
import type { Transaction, Account, Category } from './types/budget';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AccountList from './components/AccountList';
import CategoryList from './components/CategoryList';
import BatchList from './components/BatchList';
import TransactionForm from './components/TransactionForm';
import DoubleEntryForm from './components/DoubleEntryForm';
import BatchForm from './components/BatchForm';
import Modal from './components/Modal';
import './App.css';

// Types pour les modales
type ModalType = 'transaction' | 'doubleEntry' | 'account' | 'category' | 'batchForm' | null;

const App: React.FC = () => {
  const {
    data,
    addTransaction,
    createDoubleEntryTransaction,
    createBatch,
    confirmBatch,
    cancelBatch,
    updateTransaction,
    deleteTransaction,
    updateAccount,
    addAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    getMonthlySummary,
    getOverallBalance,
    getTransactionsByMonth,
  } = useBudget();

  // État pour les modales
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calcule le résumé mensuel
  const monthlySummary = useMemo(() => {
    return getMonthlySummary(currentMonth);
  }, [getMonthlySummary, currentMonth]);

  // Calcule le solde global
  const overallBalance = useMemo(() => {
    return getOverallBalance();
  }, [getOverallBalance]);

  // Filtre les transactions du mois
  const monthlyTransactions = useMemo(() => {
    return getTransactionsByMonth(currentMonth);
  }, [getTransactionsByMonth, currentMonth]);

  // Gère le changement de mois
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(e.target.value);
  };

  // Ouvre la modale de transaction
  const openTransactionModal = (transaction?: Partial<Transaction>) => {
    setEditingTransaction(transaction || null);
    setActiveModal('transaction');
  };

  // Ouvre la modale de double entrée
  const openDoubleEntryModal = () => {
    setActiveModal('doubleEntry');
  };

  // Ouvre la modale de compte
  const openAccountModal = (account?: Partial<Account>) => {
    setEditingAccount(account || null);
    setActiveModal('account');
  };

  // Ouvre la modale de catégorie
  const openCategoryModal = (category?: Partial<Category>) => {
    setEditingCategory(category || null);
    setActiveModal('category');
  };

  // Ouvre la modale de création de lot
  const openBatchFormModal = () => {
    setActiveModal('batchForm');
  };

  // Soumet une transaction
  const handleSubmitTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction?.id) {
      updateTransaction(editingTransaction.id, transactionData);
    } else {
      addTransaction(transactionData);
    }
    setActiveModal(null);
    setEditingTransaction(null);
  };

  // Soumet une entrée double
  const handleSubmitDoubleEntry = (
    debitAccountId: string,
    creditAccountId: string,
    amount: number,
    label: string,
    debitCategoryId?: string,
    creditCategoryId?: string
  ) => {
    createDoubleEntryTransaction(
      debitAccountId,
      creditAccountId,
      amount,
      label,
      debitCategoryId,
      creditCategoryId
    );
    setActiveModal(null);
  };

  // Soumet un compte
  const handleSubmitAccount = (accountData: Omit<Account, 'id' | 'balance'>) => {
    if (editingAccount?.id) {
      updateAccount(editingAccount.id, accountData);
    } else {
      addAccount(accountData);
    }
    setActiveModal(null);
    setEditingAccount(null);
  };

  // Soumet une catégorie
  const handleSubmitCategory = (categoryData: Omit<Category, 'id'>) => {
    if (editingCategory?.id) {
      // Pour l'instant, on ne peut pas modifier une catégorie existante
    } else {
      addCategory(categoryData);
    }
    setActiveModal(null);
    setEditingCategory(null);
  };

  // Soumet un lot
  const handleSubmitBatch = (name: string) => {
    createBatch(name);
    setActiveModal(null);
  };

  // Génère les options de mois
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() + i);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      options.push({ value: month, label });
    }
    
    return options;
  }, []);

  return (
    <div className="app">
      {/* En-tête */}
      <header className="app-header">
        <h1>💰 BudgetGwen</h1>
        <p>Gestion budgétaire avec méthode double entrée - Montants en EUROS</p>
      </header>

      {/* Barre de navigation */}
      <nav className="app-nav">
        <div className="nav-section">
          <select value={currentMonth} onChange={handleMonthChange}>
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="nav-actions">
          <button onClick={() => openTransactionModal()} className="btn-primary">
            + Transaction
          </button>
          <button onClick={openDoubleEntryModal} className="btn-primary">
            ⚖️ Double Entrée
          </button>
          <button onClick={openBatchFormModal} className="btn-primary">
            + Lot
          </button>
        </div>
      </nav>

      {/* Dashboard */}
      <Dashboard
        monthlySummary={monthlySummary as any}
        accounts={data.accounts}
        overallBalance={overallBalance}
        onViewDetails={(section) => {
          console.log('View details:', section);
        }}
      />

      {/* Liste des Transactions */}
      <section className="app-section">
        <h2>📋 Transactions du Mois</h2>
        <TransactionList
          transactions={monthlyTransactions}
          accounts={data.accounts}
          categories={data.categories}
          onEdit={openTransactionModal}
          onDelete={deleteTransaction}
        />
      </section>

      {/* Liste des Lots */}
      {data.batches.length > 0 && (
        <section className="app-section">
          <h2>📦 Lots de Transactions</h2>
          <BatchList
            batches={data.batches}
            onSelect={(batch) => console.log('Selected batch:', batch)}
            onConfirm={confirmBatch}
            onCancel={cancelBatch}
            onDelete={(batchId) => {
              console.log('Delete batch:', batchId);
            }}
          />
        </section>
      )}

      {/* Liste des Comptes */}
      <section className="app-section">
        <h2>🏦 Comptes</h2>
        <AccountList
          accounts={data.accounts}
          onEdit={openAccountModal}
          onDelete={deleteAccount}
        />
        <button onClick={() => openAccountModal()} className="btn-small">
          + Ajouter un Compte
        </button>
      </section>

      {/* Liste des Catégories */}
      <section className="app-section">
        <h2>🏷️ Catégories</h2>
        <CategoryList
          categories={data.categories}
          onEdit={openCategoryModal}
          onDelete={deleteCategory}
        />
        <button onClick={() => openCategoryModal()} className="btn-small">
          + Ajouter une Catégorie
        </button>
      </section>

      {/* Modales */}
      
      {/* Modale de Transaction */}
      <Modal
        isOpen={activeModal === 'transaction'}
        onClose={() => {
          setActiveModal(null);
          setEditingTransaction(null);
        }}
        title={editingTransaction?.id ? 'Modifier la Transaction' : 'Nouvelle Transaction'}
      >
        <TransactionForm
          transaction={editingTransaction}
          accounts={data.accounts}
          categories={data.categories}
          onSubmit={handleSubmitTransaction}
          onCancel={() => {
            setActiveModal(null);
            setEditingTransaction(null);
          }}
        />
      </Modal>

      {/* Modale de Double Entrée */}
      <Modal
        isOpen={activeModal === 'doubleEntry'}
        onClose={() => setActiveModal(null)}
        title="Nouvelle Entrée Double"
      >
        <DoubleEntryForm
          accounts={data.accounts}
          categories={data.categories}
          onSubmit={handleSubmitDoubleEntry}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* Modale de Compte */}
      <Modal
        isOpen={activeModal === 'account'}
        onClose={() => {
          setActiveModal(null);
          setEditingAccount(null);
        }}
        title={editingAccount?.id ? 'Modifier le Compte' : 'Nouveau Compte'}
      >
        <div className="account-form">
          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={editingAccount?.name || ''}
              onChange={(e) => setEditingAccount((prev: Partial<Account> | null) => ({ 
                ...prev, 
                name: e.target.value 
              }))}
              placeholder="Nom du compte"
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              value={editingAccount?.type || 'actif'}
              onChange={(e) => setEditingAccount((prev: Partial<Account> | null) => ({ 
                ...prev, 
                type: e.target.value as Account['type'] 
              }))}
            >
              <option value="actif">Actif</option>
              <option value="passif">Passif</option>
              <option value="revenu">Revenu</option>
              <option value="depense">Dépense</option>
              <option value="capital">Capital</option>
            </select>
          </div>
          <div className="form-group">
            <label>Couleur</label>
            <input
              type="color"
              value={editingAccount?.color || '#4CAF50'}
              onChange={(e) => setEditingAccount((prev: Partial<Account> | null) => ({ 
                ...prev, 
                color: e.target.value 
              }))}
            />
          </div>
          <div className="form-actions">
            <button onClick={() => {
              setActiveModal(null);
              setEditingAccount(null);
            }} className="btn-secondary">
              Annuler
            </button>
            <button onClick={() => {
              handleSubmitAccount({
                name: editingAccount?.name || '',
                type: editingAccount?.type || 'actif',
                color: editingAccount?.color || '#4CAF50',
              });
            }} className="btn-primary">
              {editingAccount?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale de Catégorie */}
      <Modal
        isOpen={activeModal === 'category'}
        onClose={() => {
          setActiveModal(null);
          setEditingCategory(null);
        }}
        title={editingCategory?.id ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
      >
        <div className="category-form">
          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={editingCategory?.name || ''}
              onChange={(e) => setEditingCategory((prev: Partial<Category> | null) => ({ 
                ...prev, 
                name: e.target.value 
              }))}
              placeholder="Nom de la catégorie"
            />
          </div>
          <div className="form-group">
            <label>Icône</label>
            <input
              type="text"
              value={editingCategory?.icon || '🏷️'}
              onChange={(e) => setEditingCategory((prev: Partial<Category> | null) => ({ 
                ...prev, 
                icon: e.target.value 
              }))}
              placeholder="Icône emoji"
            />
          </div>
          <div className="form-group">
            <label>Couleur</label>
            <input
              type="color"
              value={editingCategory?.color || '#FF9800'}
              onChange={(e) => setEditingCategory((prev: Partial<Category> | null) => ({ 
                ...prev, 
                color: e.target.value 
              }))}
            />
          </div>
          <div className="form-actions">
            <button onClick={() => {
              setActiveModal(null);
              setEditingCategory(null);
            }} className="btn-secondary">
              Annuler
            </button>
            <button onClick={() => {
              handleSubmitCategory({
                name: editingCategory?.name || '',
                icon: editingCategory?.icon || '🏷️',
                color: editingCategory?.color || '#FF9800',
              });
            }} className="btn-primary">
              {editingCategory?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale de Lot */}
      <Modal
        isOpen={activeModal === 'batchForm'}
        onClose={() => setActiveModal(null)}
        title="Nouveau Lot"
      >
        <BatchForm
          onSubmit={handleSubmitBatch}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* Pied de page */}
      <footer className="app-footer">
        <p>BudgetGwen - Outil de gestion budgétaire avec méthode double entrée</p>
        <p>Données sauvegardées localement dans votre navigateur (localStorage: budgetgwen.v1.data)</p>
      </footer>
    </div>
  );
};

export default App;
