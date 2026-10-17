import React from 'react';
import type { Account, Category } from '../types/budget';
import { formatEUR } from '../format';

interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  byCategory: Record<string, number>;
  byAccount: Record<string, number>;
}

interface DashboardProps {
  monthlySummary: MonthlySummary;
  accounts: Account[];
  overallBalance: number;
  categories?: Category[];
}

// Libelle lisible d une categorie : « icone nom »
const categoryLabel = (category: Category | undefined): string =>
  category ? `${category.icon} ${category.name}` : 'Catégorie inconnue';

// Pourcentage a la francaise : « 12,5 % »
const formatPercent = (part: number): string => {
  const rounded = part.toFixed(1).replace('.', ',');
  return `${rounded} %`;
};

const Dashboard = ({
  monthlySummary,
  accounts,
  overallBalance,
  categories = [],
}: DashboardProps) => {
  const { byCategory } = monthlySummary;

  // Depenses : valeurs negatives du registre par categorie (cote debit)
  const expenseEntries = Object.entries(byCategory)
    .filter(([, value]) => value < 0)
    .map(([id, value]) => ({ id, amount: -value }));
  const totalExpenseBase = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

  // Revenus : valeurs positives (cote credit)
  const incomeEntries = Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({ id, amount: value }));
  const totalIncomeBase = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

  const renderChart = (entries: { id: string; amount: number }[], base: number): React.ReactNode[] => {
    return entries.map(entry => {
      const part = base > 0 ? entry.amount / base : 0;
      const category = categories.find(c => c.id === entry.id);
      return (
        <div key={entry.id} className="chart-row">
          <span className="chart-bar-label">{categoryLabel(category)}</span>
          <div
            className="chart-bar-container"
            role="progressbar"
            aria-valuenow={Math.round(part * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="chart-bar" style={{ width: `${Math.round(part * 100)}%` }}></div>
          </div>
          <span className="chart-bar-value">
            {formatEUR(entry.amount)} ({formatPercent(part)})
          </span>
        </div>
      );
    });
  };

  return (
    <section className="dashboard" aria-label="Tableau de bord">
      <div className="dashboard-grid">
        <div className="balance-card">
          <h3>Solde global</h3>
          <p className="balance-amount" aria-label={formatEUR(overallBalance)}>
            {formatEUR(overallBalance)}
          </p>
          <p className="card-hint">Tous comptes confondus</p>
        </div>
        <div className="income-card">
          <h3>Revenus du mois</h3>
          <p className="balance-amount">{formatEUR(monthlySummary.totalIncome)}</p>
          <p className="card-hint">Ce qui entre</p>
        </div>
        <div className="expense-card">
          <h3>Dépenses du mois</h3>
          <p className="balance-amount">{formatEUR(monthlySummary.totalExpense)}</p>
          <p className="card-hint">Ce qui sort</p>
        </div>
        <div className="monthly-balance-card">
          <h3>Solde du mois</h3>
          <p className="balance-amount">{formatEUR(monthlySummary.netBalance)}</p>
          <p className="card-hint">Revenus moins dépenses</p>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-section">
          <h3>Dépenses par catégorie</h3>
          {expenseEntries.length === 0 ? (
            <p role="status">Aucune dépense ce mois-ci — c'est parfois bon signe.</p>
          ) : (
            renderChart(expenseEntries, totalExpenseBase)
          )}
        </div>
        <div className="chart-section">
          <h3>Revenus par catégorie</h3>
          {incomeEntries.length === 0 ? (
            <p role="status">Aucun revenu ce mois-ci — patience, ça viendra.</p>
          ) : (
            renderChart(incomeEntries, totalIncomeBase)
          )}
        </div>
      </div>

      <div className="chart-section account-balances">
        <h3>Soldes par compte</h3>
        <ul className="balance-list">
          {accounts.map(account => (
            <li key={account.id} className="balance-list-item">
              <span className="chart-bar-label">{account.name}</span>
              <span className="chart-bar-value">{formatEUR(account.balance)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Dashboard;
