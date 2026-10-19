// Export et sauvegarde des donnees — paufinage « Donnees ».
// Fonctions PURES, verrouillees par le harnais (harness/hook-suite.ts,
// section 11) :
//   - transactionsToCsv : tableau lisible par un tableur, accents inclus ;
//   - buildBackup       : copie de securite complete (JSON) ;
//   - validateBackup    : garde-fou de restauration — rien ne s ecrase sur
//                         une sauvegarde malformee ou etrangere.
import type { Transaction, Account, Category, Batch } from './types/budget';

// Forme exacte des donnees persistees par le hook (budgetgwen.v1.data).
// Une sauvegarde en contient tout, ni plus ni moins : la date d export
// voyage a cote, jamais dedans.
export interface BudgetSnapshot {
  transactions: Transaction[];
  accounts: Account[];
  batches: Batch[];
  categories: Category[];
  lot4Migrated?: boolean;
}

// CSV a la francaise : point-virgule, virgule decimale, BOM utf-8 pour
// qu Excel ouvre les accents sans les traduire en hieroglyphes.
const CSV_SEP = ';';
const CSV_BOM = '\uFEFF';

// Echappe une cellule : tout entre guillemets, guillemets doubles.
const csvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

// Montant lisible : 1234.5 devient « 1234,50 »
const csvAmount = (value: number): string => value.toFixed(2).replace('.', ',');

const CSV_HEADER = [
  'Date', 'Libellé', 'Montant (€)', 'Compte débité', 'Catégorie débit',
  'Compte crédité', 'Catégorie crédit', 'Lot',
].map(csvCell).join(CSV_SEP);

// Toutes les transactions, triees par date puis libelle, en CSV.
export function transactionsToCsv(
  accounts: Account[],
  categories: Category[],
  batches: Batch[],
  transactions: Transaction[]
): string {
  const accountName = (id: string): string =>
    accounts.find(a => a.id === id)?.name ?? id;
  const categoryName = (id?: string): string =>
    id ? (categories.find(c => c.id === id)?.name ?? id) : '';
  const batchName = (id?: string): string =>
    id ? (batches.find(b => b.id === id)?.name ?? id) : '';

  const rows = [...transactions]
    .sort((a, b) =>
      a.date === b.date
        ? (a.label < b.label ? -1 : 1)
        : (a.date < b.date ? -1 : 1)
    )
    .map(t =>
      [
        t.date,
        t.label,
        csvAmount(t.amount),
        accountName(t.debitAccountId),
        categoryName(t.debitCategoryId),
        accountName(t.creditAccountId),
        categoryName(t.creditCategoryId),
        batchName(t.batchId),
      ].map(csvCell).join(CSV_SEP)
    );

  return CSV_BOM + CSV_HEADER + '\n' + rows.join('\n') + (rows.length > 0 ? '\n' : '');
}

// Copie de securite complete : les donnees du hook telles quelles, plus
// la date d export (information seule, ecartee a la restauration).
export function buildBackup(
  data: BudgetSnapshot,
  exportedAt: string = new Date().toISOString()
): string {
  return JSON.stringify({ ...data, exportedAt }, null, 2);
}

export interface BackupCheck {
  ok: boolean;
  data?: BudgetSnapshot;
  error?: string;
}

const ACCOUNT_TYPES = ['actif', 'passif', 'revenu', 'depense', 'capital'];
const BATCH_STATUSES = ['draft', 'confirmed', 'cancelled'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Garde-fou de restauration : valide la FORME et la COHERENCE d une
// sauvegarde avant tout ecrasement — comptes connus, montants positifs,
// debit distinct du credit, dates ISO. Renvoie les donnees nettoyees
// (sans champs parasites) pretes a reintegrer le localStorage.
export function validateBackup(raw: unknown): BackupCheck {
  if (!isRecord(raw)) {
    return { ok: false, error: "ce n'est pas une sauvegarde BudgetGwen" };
  }
  const { accounts, transactions, categories, batches, lot4Migrated } = raw;

  if (!Array.isArray(accounts)) return { ok: false, error: 'comptes manquants' };
  if (!Array.isArray(transactions)) return { ok: false, error: 'transactions manquantes' };
  if (!Array.isArray(categories)) return { ok: false, error: 'catégories manquantes' };
  const batchList = Array.isArray(batches) ? batches : [];

  for (const account of accounts) {
    if (
      !isRecord(account) || typeof account.id !== 'string' || account.id === '' ||
      typeof account.name !== 'string' ||
      typeof account.type !== 'string' || !ACCOUNT_TYPES.includes(account.type) ||
      typeof account.color !== 'string' ||
      typeof account.balance !== 'number' || !Number.isFinite(account.balance)
    ) {
      return { ok: false, error: `compte invalide (${JSON.stringify(isRecord(account) ? account.name : account)})` };
    }
  }
  const accountIds = new Set(
    accounts.map((account: Record<string, unknown>) => account.id as string)
  );

  for (const transaction of transactions) {
    if (
      !isRecord(transaction) ||
      typeof transaction.date !== 'string' || !ISO_DATE.test(transaction.date) ||
      typeof transaction.label !== 'string' ||
      typeof transaction.amount !== 'number' || !Number.isFinite(transaction.amount) || transaction.amount <= 0 ||
      typeof transaction.debitAccountId !== 'string' || typeof transaction.creditAccountId !== 'string' ||
      transaction.debitAccountId === transaction.creditAccountId
    ) {
      return { ok: false, error: `transaction invalide (${JSON.stringify(isRecord(transaction) ? transaction.label : transaction)})` };
    }
    if (!accountIds.has(transaction.debitAccountId) || !accountIds.has(transaction.creditAccountId)) {
      return { ok: false, error: `transaction vers un compte inconnu : ${JSON.stringify(transaction.label)}` };
    }
  }

  for (const category of categories) {
    if (
      !isRecord(category) || typeof category.id !== 'string' || category.id === '' ||
      typeof category.name !== 'string' ||
      typeof category.icon !== 'string' || typeof category.color !== 'string'
    ) {
      return { ok: false, error: `catégorie invalide (${JSON.stringify(isRecord(category) ? category.name : category)})` };
    }
  }

  for (const batch of batchList) {
    if (
      !isRecord(batch) || typeof batch.id !== 'string' || batch.id === '' ||
      typeof batch.name !== 'string' ||
      typeof batch.status !== 'string' || !BATCH_STATUSES.includes(batch.status) ||
      !Array.isArray(batch.transactionIds)
    ) {
      return { ok: false, error: `lot invalide (${JSON.stringify(isRecord(batch) ? batch.name : batch)})` };
    }
  }

  return {
    ok: true,
    data: {
      transactions: transactions as Transaction[],
      accounts: accounts as Account[],
      batches: batchList as Batch[],
      categories: categories as Category[],
      ...(lot4Migrated === true ? { lot4Migrated: true } : {}),
    },
  };
}
