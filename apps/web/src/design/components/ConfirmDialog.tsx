import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  /** Short dialog title, e.g. "Deactivate department". */
  title: string;
  /** The consequence, in plain language: what will happen and to what. */
  children: ReactNode;
  /** Label for the action button (names the action, never "OK"/"Yes"). */
  confirmLabel: string;
  cancelLabel?: string;
  /** `critical` for destructive/irreversible-feeling actions; `primary` otherwise. */
  tone?: 'critical' | 'primary';
  /** Disables both buttons and shows a working state while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A focused confirmation dialog for a consequential action. Reuses `Modal` (portal, Escape and
 * backdrop close, scroll lock) and autofocuses the safe (Cancel) action, so a stray Enter or a
 * reflexive Escape resolves to "don't do the dangerous thing" rather than firing it.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'critical',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal aria-label={title} onClose={onCancel}>
      <Modal.Header title={title} />
      <Modal.Section>
        <div className="text-[13px] leading-relaxed text-sub">{children}</div>
      </Modal.Section>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading} autoFocus>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'critical' ? 'critical' : 'primary'}
          size="sm"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
