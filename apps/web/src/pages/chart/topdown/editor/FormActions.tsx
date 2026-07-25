import { Button } from '../../../../design/components';

export interface FormActionsProps {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/** Cancel / Save footer shared by the three inline canvas editors. */
export function FormActions({ saving, onCancel, onSave }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
