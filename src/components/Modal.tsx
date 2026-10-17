import React, { useEffect, useId, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Modale accessible :
// - fermeture par Escape, croix, ou clic sur l arriere-plan ;
// - piege de focus : Tab / Shift+Tab restent dans la modale ;
// - le focus est rendu a l element qui a ouvert la modale a la fermeture.
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!isOpen) return;

    // On memorise qui avait le focus : il le recuperera a la fermeture.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const root = contentRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id={headingId}>{title}</h3>
          <button
            ref={closeRef}
            className="modal-close btn-icon"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
