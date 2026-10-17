// Formatage monetaire partage — Lot 2
// Une seule source de verite pour l affichage des montants en euros.
// Utilise Intl fr-FR : separateur d espace pour les milliers, virgule decimale.

export const formatEUR = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

// Libelle lisible d un type de compte (partout pareil dans l app)
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  actif: 'Actif',
  passif: 'Passif',
  revenu: 'Revenu',
  depense: 'Dépense',
  capital: 'Capital',
};

export const accountTypeLabel = (type: string): string =>
  ACCOUNT_TYPE_LABELS[type] || type;
