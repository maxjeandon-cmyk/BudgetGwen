import React, { useEffect, useRef, useState } from 'react';

interface ConfirmButtonProps {
  /** Action executee au second clic, quand la confirmation est armee. */
  onConfirm: () => void;
  /** Libelle accessible de l action (ex : « Supprimer la transaction « Cafe » »). */
  label: string;
  /** Classes du bouton au repos (ex : 'btn-icon' ou 'btn-small btn-danger'). */
  className?: string;
  /** Contenu affiche au repos (icone ou texte). */
  children?: React.ReactNode;
  /** Contenu affiche une fois la confirmation armee. */
  confirmText?: string;
  /** Duree avant desarmement automatique, en ms. */
  timeoutMs?: number;
  /** Arrete la propagation du clic (utile dans une carte cliquable). */
  stopPropagation?: boolean;
}

// Bouton a double clic : le premier clic ARME la confirmation, le second AGIT.
// Objectif : eviter les suppressions par erreur sans modale bloquante.
// - Arme : le bouton change de look et le libelle accessible precise « recliquez ».
// - Desarme tout seul apres `timeoutMs` (3 s par defaut) ou a la perte du focus.
const ConfirmButton = ({
  onConfirm,
  label,
  className = 'btn-icon',
  children,
  confirmText = '⚠️ Recliquez',
  timeoutMs = 3000,
  stopPropagation = false,
}: ConfirmButtonProps) => {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  // Nettoyage du minuteur au demontage : pas de setTimeout orphelin.
  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  const disarm = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setArmed(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    if (armed) {
      disarm();
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = window.setTimeout(disarm, timeoutMs);
  };

  // Perte de focus = changement d avis : on rearme a zero pour eviter un
  // second clic fonce sur le mauvais bouton.
  const handleBlur = () => {
    if (armed) {
      disarm();
    }
  };

  return (
    <button
      type="button"
      className={armed ? `${className} btn-confirm-armed` : className}
      onClick={handleClick}
      onBlur={handleBlur}
      onMouseLeave={handleBlur}
      aria-label={armed ? `${label} — recliquez pour confirmer` : label}
    >
      {armed ? confirmText : children}
    </button>
  );
};

export default ConfirmButton;
