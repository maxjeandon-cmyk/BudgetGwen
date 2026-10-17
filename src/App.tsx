import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBudget } from './hooks/useBudget';
import type { Transaction, Account, Category } from './types/budget';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AccountList from './components/AccountList';
import CategoryList from './components/CategoryList';
import BatchList from './components/BatchList';
import TransactionForm from './components/TransactionForm';
import Modal from './components/Modal';
import './App.css';

// Types pour les modales
type MonthOption = { value: string; label: string };
type ModalType = 'transaction' | 'account' | 'category' | null;

// Brouillon du formulaire de compte : le compte en cours d edition, plus le
// champ « solde actuel » qui n existe qu a la creation (chaine libre,
// virgule decimale acceptee a la francaise).
type AccountDraft = Partial<Account> & { openingBalance?: string };

// Compte d ouverture : la contrepartie en partie double des soldes initiaux.
// Type passif choisi a dessein : face a un actif, la transaction d ouverture
// est NEUTRE pour le resume mensuel du hook fige (ni revenu, ni depense) —
// le mois ou l on cree ses comptes n affiche donc aucun fantome.
const OPENING_ACCOUNT_NAME = 'Ouverture';
const OPENING_ACCOUNT_COLOR = '#8D6E63';

// Duree d affichage d un toast (ms) : assez long pour lire, assez court pour ne pas gêner.
const TOAST_DURATION_MS = 2600;

const App: React.FC = () => {
  const {
    data,
    addTransaction,
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
  // Mode du formulaire de transaction : revenu ou depense (null = edition neutre).
  const [txMode, setTxMode] = useState<'income' | 'expense' | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountDraft | null>(null);
  // Solde initial en attente : le hook fige cree les comptes a balance 0 et
  // recalcule les soldes depuis les transactions. La seule facon honnete
  // de donner un solde de depart est donc une transaction equilibree
  // « Solde initial », ecrite des que le compte existe vraiment.
  const [pendingOpening, setPendingOpening] = useState<{
    name: string;
    amount: number;
    knownIds: string[];
    openingId?: string;
  } | null>(null);
  // Garde StrictMode : les effets sont joues deux fois en dev, il ne faut
  // ni deux comptes « Ouverture » ni deux transactions d ouverture.
  const openingGuardRef = useRef<{ pending: object | null; ensured: boolean; done: boolean }>({ pending: null, ensured: false, done: false });
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

  // Nettoyage du minuteur au demontage : pas de toast fantome ni de fuite.
  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // Ecrit la transaction « Solde initial » des que le nouveau compte existe
  // (addAccount genere son id dans le hook : on ne le connait qu apres rendu).
  // - solde positif : debit « Ouverture », credit du nouveau compte ;
  // - solde negatif (ex : decouvert) : sens inverse.
  // Le compte « Ouverture » est cree au besoin, une seule fois.
  useEffect(() => {
    if (!pendingOpening) return;
    // Nouvelle demande : on rearme la garde (protection StrictMode).
    if (openingGuardRef.current.pending !== pendingOpening) {
      openingGuardRef.current = { pending: pendingOpening, ensured: false, done: false };
    }
    const guard = openingGuardRef.current;

    // Le compte demande : celui qui n existait pas au moment de la soumission.
    const target = data.accounts.find(
      a => a.name === pendingOpening.name && !pendingOpening.knownIds.includes(a.id)
    );
    if (!target) return; // pas encore : le prochain rendu s en charge

    // Le compte d ouverture, deja connu ou tout juste cree.
    const opening = pendingOpening.openingId
      ? data.accounts.find(a => a.id === pendingOpening.openingId)
      : data.accounts.find(
          a => a.type === 'passif' && a.name === OPENING_ACCOUNT_NAME && a.id !== target.id
        );
    if (!opening) {
      if (guard.ensured) return; // deja demande : on attend le rendu suivant
      guard.ensured = true;
      addAccount({ name: OPENING_ACCOUNT_NAME, type: 'passif', color: OPENING_ACCOUNT_COLOR });
      return;
    }
    if (guard.done) return;
    guard.done = true;
    const amount = Math.abs(pendingOpening.amount);
    if (amount > 0) {
      addTransaction({
        date: new Date().toISOString().split('T')[0],
        debitAccountId: pendingOpening.amount > 0 ? opening.id : target.id,
        creditAccountId: pendingOpening.amount > 0 ? target.id : opening.id,
        amount,
        label: `Solde initial — ${target.name}`,
      });
    }
    setPendingOpening(null);
  }, [pendingOpening, data.accounts, addAccount, addTransaction]);

  // Calcule le résumé mensuel
  const monthlySummary = useMemo(() => {
    return getMonthlySummary(currentMonth);
  }, [getMonthlySummary, currentMonth]);

  // Calcule le solde global
  const overallBalance = useMemo(() => {
    return getOverallBalance();
  }, [getOverallBalance]);

  // Comptes montres au Dashboard : les vrais comptes de Gwen. Les comptes
  // tampons qui simulent une entree d argent — les comptes de revenu comme
  // « Salaire », et la contrepartie « Ouverture » des soldes initiaux —
  // restent en coulisses : ils sont la machinerie, pas les acteurs.
  const dashboardAccounts = useMemo(() => {
    return data.accounts.filter(
      a => a.type !== 'revenu' && !(a.name === OPENING_ACCOUNT_NAME && a.type === 'passif')
    );
  }, [data.accounts]);

  // Filtre les transactions du mois
  const monthlyTransactions = useMemo(() => {
    return getTransactionsByMonth(currentMonth);
  }, [getTransactionsByMonth, currentMonth]);

  // Gère le changement de mois
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(e.target.value);
  };

  // Ouvre la modale de transaction. En creation, le mode ('income'/'expense')
  // pre-remplit le formulaire dans le bon sens ; en edition, mode neutre.
  const openTransactionModal = (transaction: Partial<Transaction> | undefined = undefined, mode: 'income' | 'expense' | null = null) => {
    setEditingTransaction(transaction || null);
    setTxMode(transaction?.id ? null : mode);
    setActiveModal('transaction');
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

  // Soumet un compte
  const handleSubmitAccount = (accountData: Omit<Account, 'id' | 'balance'> & { openingBalance?: string }) => {
    const name = accountData.name?.trim();
    if (!name) {
      // Un compte sans nom, c est un tiroir sans etiquette : on refuse doucement.
      showToast('Le nom du compte ne peut pas être vide');
      return;
    }
    if (editingAccount?.id) {
      // Edition : metadonnees seulement — le solde se gere par les transactions.
      updateAccount(editingAccount.id, { name, type: accountData.type, color: accountData.color });
      showToast('Compte modifié ✓');
      setActiveModal(null);
      setEditingAccount(null);
      return;
    }
    // Creation : le solde actuel est facultatif (vide ou 0 = on part de zero).
    // Reserve aux types actif/passif : sur un compte de flux (revenu,
    // depense, capital), il fausserait le resume mensuel du hook.
    const raw = (accountData.openingBalance ?? '').trim();
    if (raw !== '' && accountData.type !== 'actif' && accountData.type !== 'passif') {
      showToast('Le solde initial est réservé aux comptes de type Actif ou Passif');
      return;
    }
    let opening = 0;
    if (raw !== '') {
      opening = parseFloat(raw.replace(',', '.'));
      if (isNaN(opening)) {
        showToast('Solde invalide — essayez par exemple 1250,40');
        return;
      }
    }
    addAccount({ name, type: accountData.type, color: accountData.color });
    if (opening !== 0) {
      // Le solde sera materialise par une transaction « Solde initial » des
      // que le compte existe (voir useEffect pendingOpening ci-dessus).
      const existingOpening = data.accounts.find(
        a => a.type === 'passif' && a.name === OPENING_ACCOUNT_NAME
      );
      setPendingOpening({
        name,
        amount: opening,
        knownIds: data.accounts.map(a => a.id),
        openingId: existingOpening?.id,
      });
      showToast('Compte ajouté avec son solde ✓');
    } else {
      showToast('Compte ajouté ✓');
    }
    setActiveModal(null);
    setEditingAccount(null);
  };

  // Soumet une catégorie
  const handleSubmitCategory = (categoryData: Omit<Category, 'id'>) => {
    const name = categoryData.name?.trim();
    if (!name) {
      showToast('Le nom de la catégorie ne peut pas être vide');
      return;
    }
    const cleaned = { ...categoryData, name };
    if (editingCategory?.id) {
      // Pour l'instant, on ne peut pas modifier une catégorie existante
    } else {
      addCategory(cleaned);
      showToast('Catégorie ajoutée ✓');
    }
    setActiveModal(null);
    setEditingCategory(null);
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

  // Supprime un compte (avec retour visuel, comme le reste)
  const handleDeleteAccount = (id: string) => {
    const account = data.accounts.find(a => a.id === id);
    deleteAccount(id);
    showToast(`Compte supprimé : « ${account?.name || id} »`);
  };

  // Supprime une categorie (avec retour visuel, comme le reste)
  const handleDeleteCategory = (id: string) => {
    const category = data.categories.find(c => c.id === id);
    deleteCategory(id);
    showToast(`Catégorie supprimée : « ${category?.name || id} »`);
  };

  // Mois affichables : de la premiere transaction a la derniere (y compris
  // futures, pour les sorties differees), borne a aujourd hui au minimum.
  const monthOptions = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Premiere et derniere transaction connues (dates ISO : comparaison lexicographique fiable).
    let first = '9999-12';
    let last = '0000-01';
    for (const t of data.transactions) {
      if (t.date < first) first = t.date;
      if (t.date > last) last = t.date;
    }
    const start = first.slice(0, 7) < current ? first.slice(0, 7) : current;
    // Une depense differee pousse la borne haute au-dela du mois courant.
    const lastMonth = last.slice(0, 7);
    const end = lastMonth > current ? lastMonth : current;

    const options: MonthOption[] = [];
    let [y, m] = start.split('-').map(Number);
    let [ey, em] = end.split('-').map(Number);
    // Garde-fou : au plus 1200 iterations si une date farfelue s invite.
    for (let guard = 0; guard < 1200; guard++) {
      if (y > ey || (y === ey && m > em)) break;
      const month = `${y}-${String(m).padStart(2, '0')}`;
      const date = new Date(y, m - 1, 1);
      options.push({
        value: month,
        label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    if (options.length === 0) {
      options.push({
        value: current,
        label: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      });
    }

    return options;
  }, [data.transactions]);

  return (
    <div className="app">
      {/* En-tête */}
      <header className="app-header">
        <h1>💰 BudgetGwen</h1>
        <p>Votre budget, simplement</p>
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
          <button onClick={() => openTransactionModal(undefined, 'income')} className="btn-primary">
            + Revenus
          </button>
          <button onClick={() => openTransactionModal(undefined, 'expense')} className="btn-primary">
            − Dépenses
          </button>
        </div>
      </nav>

      {/* Dashboard */}
      <Dashboard
        monthlySummary={monthlySummary}
        accounts={dashboardAccounts}
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
          onDelete={handleDeleteAccount}
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
          onDelete={handleDeleteCategory}
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
        title={editingTransaction?.id ? 'Modifier la transaction' : (txMode === 'income' ? 'Nouveau revenu' : txMode === 'expense' ? 'Nouvelle dépense' : 'Nouvelle transaction')}
      >
        <TransactionForm
          transaction={editingTransaction}
          accounts={data.accounts}
          categories={data.categories}
          mode={txMode ?? undefined}
          onSubmit={handleSubmitTransaction}
          onCancel={() => {
            setActiveModal(null);
            setEditingTransaction(null);
          }}
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
              onChange={(e) => setEditingAccount((prev: AccountDraft | null) => ({
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
              onChange={(e) => setEditingAccount((prev: AccountDraft | null) => ({
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
              onChange={(e) => setEditingAccount((prev: AccountDraft | null) => ({
                ...prev,
                color: e.target.value
              }))}
            />
          </div>
          {!editingAccount?.id && ['actif', 'passif'].includes(editingAccount?.type || 'actif') && (
            <div className="form-group">
              <label htmlFor="account-opening">Solde actuel (€)</label>
              <input
                id="account-opening"
                type="text"
                inputMode="decimal"
                value={editingAccount?.openingBalance ?? ''}
                onChange={(e) => setEditingAccount((prev: AccountDraft | null) => ({
                  ...prev,
                  openingBalance: e.target.value
                }))}
                placeholder="Ex : 1250,40 — vide pour partir de zéro"
              />
              <p className="form-hint">
                🌱 C'est ce que contient déjà le compte aujourd'hui. Il sera enregistré comme
                une transaction « Solde initial », visible et modifiable dans la liste.
                Négatif possible (ex : -300 pour un découvert).
              </p>
            </div>
          )}
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
                openingBalance: editingAccount?.openingBalance ?? '',
              });
            }} className="btn-primary" disabled={!editingAccount?.name?.trim()}>
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
              disabled={Boolean(editingCategory?.id) || !editingCategory?.name?.trim()}
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

      {/* Toast de confirmation */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* Pied de page */}
      <footer className="app-footer">
        <p>BudgetGwen — votre budget, simplement</p>
        <p>Données sauvegardées localement dans votre navigateur</p>
      </footer>
    </div>
  );
};

export default App;
