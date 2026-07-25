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

/** `.savebar` - contextual save bar (`Unsaved ▸ Save/Discard`), shown at the top of an edit
 * panel while it has unsaved changes. The `savebar` class is kept as a hook so the print
 * stylesheet can hide it. */
export function SaveBar({
  message,
  saving = false,
  onSave,
  onDiscard,
  saveLabel = 'Save',
  discardLabel = 'Discard',
}: SaveBarProps) {
  return (
    <div
      className="savebar flex items-center gap-3 bg-action text-white px-4 py-2 rounded-lg shadow-2 mb-4"
      role="region"
      aria-label="Unsaved changes"
    >
      <Badge plain className="bg-[#ffffff22] text-white">
        Unsaved
      </Badge>
      <span className="text-[13px] font-medium">{message}</span>
      <div className="ml-auto flex gap-2">
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
