import React from 'react';
import type { Account } from '../types/budget';

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
  onViewDetails: (section: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  monthlySummary,
  accounts,
  overallBalance,
  onViewDetails,
}) => {
  // Calcule le pourcentage de dépenses par catégorie
  const totalExpense = monthlySummary.totalExpense;
  const expenseByCategory = Object.entries(monthlySummary.byCategory)
    .filter(([_, value]) => value < 0)
    .map(([key, value]) => ({ category: key, amount: -value }));

  const incomeByCategory = Object.entries(monthlySummary.byCategory)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ category: key, amount: value }));

  // Formate le mois pour l'affichage
  const monthLabel = new Date(monthlySummary.month + '-01').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard">
      <h2>📊 Tableau de Bord - {monthLabel}</h2>

      <div className="dashboard-grid">
        {/* Solde Global */}
        <div className="dashboard-card balance-card">
          <h3>Solde Global</h3>
          <div className="balance-amount" style={{ color: overallBalance >= 0 ? '#4CAF50' : '#F44336' }}>
            {overallBalance >= 0 ? '+' : ''}{overallBalance.toFixed(2)} €
          </div>
          <button onClick={() => onViewDetails('accounts')} className="btn-small">
            Voir les comptes
          </button>
        </div>

        {/* Revenus du Mois */}
        <div className="dashboard-card income-card">
          <h3>💰 Revenus</h3>
          <div className="amount">+{monthlySummary.totalIncome.toFixed(2)} €</div>
          <button onClick={() => onViewDetails('income')} className="btn-small">
            Détails
          </button>
        </div>

        {/* Dépenses du Mois */}
        <div className="dashboard-card expense-card">
          <h3>💸 Dépenses</h3>
          <div className="amount">-{monthlySummary.totalExpense.toFixed(2)} €</div>
          <button onClick={() => onViewDetails('expense')} className="btn-small">
            Détails
          </button>
        </div>

        {/* Solde Mensuel */}
        <div className="dashboard-card monthly-balance-card">
          <h3>Solde Mensuel</h3>
          <div 
            className="amount" 
            style={{ color: monthlySummary.netBalance >= 0 ? '#4CAF50' : '#F44336' }}
          >
            {monthlySummary.netBalance >= 0 ? '+' : ''}{monthlySummary.netBalance.toFixed(2)} €
          </div>
          <button onClick={() => onViewDetails('monthly')} className="btn-small">
            Voir le détail
          </button>
        </div>
      </div>

      {/* Graphique des Dépenses par Catégorie */}
      <div className="chart-section">
        <h3>📈 Répartition des Dépenses</h3>
        {totalExpense === 0 ? (
          <p>Aucune dépense ce mois-ci</p>
        ) : (
          <div className="chart-container">
            {expenseByCategory.map(({ category, amount }) => {
              const percentage = (amount / totalExpense) * 100;
              return (
                <div key={category} className="chart-bar">
                  <div className="chart-bar-label">{category}</div>
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">
                    {amount.toFixed(2)} € ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Graphique des Revenus par Catégorie */}
      <div className="chart-section">
        <h3>📊 Répartition des Revenus</h3>
        {monthlySummary.totalIncome === 0 ? (
          <p>Aucun revenu ce mois-ci</p>
        ) : (
          <div className="chart-container">
            {incomeByCategory.map(({ category, amount }) => {
              const percentage = (amount / monthlySummary.totalIncome) * 100;
              return (
                <div key={category} className="chart-bar">
                  <div className="chart-bar-label">{category}</div>
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar-fill income"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="chart-bar-value">
                    {amount.toFixed(2)} € ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Soldes par Compte */}
      <div className="chart-section">
        <h3>💳 Soldes par Compte</h3>
        <div className="accounts-balance-grid">
          {accounts.map(account => (
            <div key={account.id} className="account-balance-item">
              <div className="account-balance-header">
                <span style={{ color: account.color }}>●</span>
                <span>{account.name} ({account.type})</span>
              </div>
              <div 
                className="account-balance-amount"
                style={{ color: account.balance >= 0 ? '#4CAF50' : '#F44336' }}
              >
                {account.balance >= 0 ? '+' : ''}{account.balance.toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
