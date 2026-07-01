import React, { useEffect, useRef } from 'react';
import { useSimulator } from '../hooks/useSimulator';
import { ShieldAlert, X } from 'lucide-react';

export const ErrorModal: React.FC = () => {
  const { error, closeErrorModal } = useSimulator();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Sync dialog visibility with the error state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (error) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [error]);

  // Apply fallback backdrop click handler for Safari/older browsers
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      // If native closedby is supported, let the browser handle it
      if ('closedBy' in HTMLDialogElement.prototype) return;

      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      if (!isDialogContent) {
        dialog.close();
      }
    };

    const handleCloseEvent = () => {
      closeErrorModal();
    };

    dialog.addEventListener('click', handleBackdropClick);
    dialog.addEventListener('close', handleCloseEvent);

    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
      dialog.removeEventListener('close', handleCloseEvent);
    };
  }, [closeErrorModal]);

  if (!error) return null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="modal-error-title"
      style={{
        zIndex: 50,
        position: 'fixed',
        margin: 'auto',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        background: '#161920',
        padding: '24px',
        color: '#f3f4f6',
        maxWidth: '520px',
        width: '90%'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={18} />
            </div>
            <h3 id="modal-error-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>
              SIMULATION HALTED
            </h3>
          </div>
          <button
            onClick={() => dialogRef.current?.close()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%'
            }}
            title="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto' }}>
          {error}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => dialogRef.current?.close()}
            style={{ minWidth: '80px' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </dialog>
  );
};
export default ErrorModal;
