import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';

export interface SaveBarProps {
  message: ReactNode;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
  discardLabel?: string;
}

/** `.savebar` — contextual save bar (`Unsaved ▸ Save/Discard`), shown at the top of an edit
 * panel while it has unsaved changes. Ported from `ui_design/shopify/styles.css` / `admin.html`. */
export function SaveBar({
  message,
  saving = false,
  onSave,
  onDiscard,
  saveLabel = 'Save',
  discardLabel = 'Discard',
}: SaveBarProps) {
  return (
    <div className="savebar" role="region" aria-label="Unsaved changes">
      <Badge plain style={{ background: '#ffffff22', color: '#fff' }}>
        Unsaved
      </Badge>
      <span className="msg">{message}</span>
      <div className="sb-actions">
        <Button variant="ghostdark" size="sm" onClick={onDiscard} disabled={saving}>
          {discardLabel}
        </Button>
        <Button variant="brand" size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}
