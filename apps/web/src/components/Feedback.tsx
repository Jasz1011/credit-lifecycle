import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" />
      <div><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function Message({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div className={`message ${kind}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      {kind === 'success' ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}
