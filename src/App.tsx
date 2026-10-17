import React, { useState, useMemo, useRef } from 'react';
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
type MonthOption = { value: string; label: string };
type ModalType = 'transaction' | 'doubleEntry' | 'account' | 'category' | 'batchForm' | null;

// Duree d affichage d un toast (ms) : assez long pour lire, assez court pour ne pas gêner.
const TOAST_DURATION_MS = 2600;

const App: React.FC = () => {
  const {
    data,
    addTransaction,
    createDoubleEntryTransaction,
    createBatch,
    confirmBatch,
    cancelBatch,
    deleteBatch,
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

  // Toast : petit message de confirmation, discret et annonce aux lecteurs d ecran.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

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
  const openTransactionModal = (transaction: Partial<Transaction> | undefined = undefined) => {
    setEditingTransaction(transaction || null);
    setActiveModal('transaction');
  };

  // Ouvre la modale de double entrée
  const openDoubleEntryModal = () => {
    setActiveModal('doubleEntry');
  };

  // Ouvre la modale de compte
  const openAccountModal = (account: Partial<Account> | undefined = undefined) => {
    setEditingAccount(account || null);
    setActiveModal('account');
  };

  // Ouvre la modale de catégorie
  const openCategoryModal = (category: Partial<Category> | undefined = undefined) => {
    setEditingCategory(category || null);
    setActiveModal('category');
  };

  // Ouvre la modale de création de lot
  const openBatchFormModal = () => {
    setActiveModal('batchForm');
  };

  // Soumet une transaction (avec retour visuel)
  const handleSubmitTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction?.id) {
      updateTransaction(editingTransaction.id, transactionData);
      showToast('Transaction modifiée ✓');
    } else {
      addTransaction(transactionData);
      showToast('Transaction ajoutée ✓');
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
    debitCategoryId: string | undefined = undefined,
    creditCategoryId: string | undefined = undefined
  ) => {
    createDoubleEntryTransaction(
      debitAccountId,
      creditAccountId,
      amount,
      label,
      debitCategoryId,
      creditCategoryId
    );
    showToast('Entrée double créée ✓');
    setActiveModal(null);
  };

  // Soumet un compte
  const handleSubmitAccount = (accountData: Omit<Account, 'id' | 'balance'>) => {
    if (editingAccount?.id) {
      updateAccount(editingAccount.id, accountData);
      showToast('Compte modifié ✓');
    } else {
      addAccount(accountData);
      showToast('Compte ajouté ✓');
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
      showToast('Catégorie ajoutée ✓');
    }
    setActiveModal(null);
    setEditingCategory(null);
  };

  // Soumet un lot : il nait en brouillon, comme il se doit.
  const handleSubmitBatch = (name: string) => {
    createBatch(name);
    showToast(`Lot « ${name} » créé en brouillon ✓`);
    setActiveModal(null);
  };

  // Confirme un lot : les transactions deviennent effectives.
  const handleConfirmBatch = (batchId: string) => {
    const batch = data.batches.find(b => b.id === batchId);
    confirmBatch(batchId);
    showToast(`Lot confirmé : « ${batch?.name || batchId} »`);
  };

  // Annule un lot
  const handleCancelBatch = (batchId: string) => {
    const batch = data.batches.find(b => b.id === batchId);
    cancelBatch(batchId);
    showToast(`Lot annulé : « ${batch?.name || batchId} »`);
  };

  // Supprime un lot
  const handleDeleteBatch = (batchId: string) => {
    const batch = data.batches.find(b => b.id === batchId);
    deleteBatch(batchId);
    showToast(`Lot supprimé : « ${batch?.name || batchId} »`);
  };

  // Supprime une transaction
  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    showToast('Transaction supprimée');
  };

  // Génère les options de mois
  const monthOptions = useMemo(() => {
    const options: MonthOption[] = [];
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
        <p>Gestion budgétaire à double entrée, en euros</p>
      </header>

      {/* Barre de navigation */}
      <nav className="app-nav">
        <div className="nav-section">
          <label htmlFor="month-select">Mois affiché</label>
          <select id="month-select" value={currentMonth} onChange={handleMonthChange}>
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
            ⚖️ Double entrée
          </button>
          <button onClick={openBatchFormModal} className="btn-primary">
            + Nouveau lot
          </button>
        </div>
      </nav>

      {/* Dashboard */}
      <Dashboard
        monthlySummary={monthlySummary}
        accounts={data.accounts}
        overallBalance={overallBalance}
        categories={data.categories}
      />

      {/* Liste des Transactions */}
      <section className="app-section">
        <h2>📋 Transactions du mois</h2>
        <TransactionList
          transactions={monthlyTransactions}
          accounts={data.accounts}
          categories={data.categories}
          onEdit={openTransactionModal}
          onDelete={handleDeleteTransaction}
        />
      </section>

      {/* Liste des Lots */}
      {data.batches.length > 0 && (
        <section className="app-section">
          <h2>📦 Lots de transactions</h2>
          <BatchList
            batches={data.batches}
            onConfirm={handleConfirmBatch}
            onCancel={handleCancelBatch}
            onDelete={handleDeleteBatch}
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
          + Ajouter un compte
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
          + Ajouter une catégorie
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
        title={editingTransaction?.id ? 'Modifier la transaction' : 'Nouvelle transaction'}
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
        title="Nouvelle entrée double"
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
        title={editingAccount?.id ? 'Modifier le compte' : 'Nouveau compte'}
      >
        <div className="account-form">
          <div className="form-group">
            <label htmlFor="account-name">Nom</label>
            <input
              id="account-name"
              type="text"
              value={editingAccount?.name || ''}
              onChange={(e) => setEditingAccount((prev: Partial<Account> | null) => ({
                ...prev,
                name: e.target.value
              }))}
              placeholder="Ex : Compte Bancaire"
            />
          </div>
          <div className="form-group">
            <label htmlFor="account-type">Type</label>
            <select
              id="account-type"
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
            <label htmlFor="account-color">Couleur</label>
            <input
              id="account-color"
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
        title={editingCategory?.id ? 'Catégorie existante' : 'Nouvelle catégorie'}
      >
        <div className="category-form">
          {editingCategory?.id && (
            <p className="error-message" role="alert">
              La modification d'une catégorie n'est pas encore disponible : seul le
              nom affiché est visible ici, rien ne sera enregistré. Vous pouvez
              par contre la supprimer depuis la liste, ou en créer une nouvelle.
            </p>
          )}
          <div className="form-group">
            <label htmlFor="category-name">Nom</label>
            <input
              id="category-name"
              type="text"
              value={editingCategory?.name || ''}
              onChange={(e) => setEditingCategory((prev: Partial<Category> | null) => ({
                ...prev,
                name: e.target.value
              }))}
              placeholder="Ex : Nourriture"
            />
          </div>
          <div className="form-group">
            <label htmlFor="category-icon">Icône</label>
            <input
              id="category-icon"
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
            <label htmlFor="category-color">Couleur</label>
            <input
              id="category-color"
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
            <button
              onClick={() => {
                handleSubmitCategory({
                  name: editingCategory?.name || '',
                  icon: editingCategory?.icon || '🏷️',
                  color: editingCategory?.color || '#FF9800',
                });
              }}
              className="btn-primary"
              disabled={Boolean(editingCategory?.id)}
              title={
                editingCategory?.id
                  ? "Modification indisponible pour l'instant"
                  : undefined
              }
            >
              {editingCategory?.id ? 'Enregistrer (indisponible)' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale de Lot */}
      <Modal
        isOpen={activeModal === 'batchForm'}
        onClose={() => setActiveModal(null)}
        title="Nouveau lot"
      >
        <BatchForm
          onSubmit={handleSubmitBatch}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* Toast de confirmation */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* Pied de page */}
      <footer className="app-footer">
        <p>BudgetGwen — outil de gestion budgétaire à double entrée</p>
        <p>Données sauvegardées localement dans votre navigateur</p>
      </footer>
    </div>
  );
};

export default App;
