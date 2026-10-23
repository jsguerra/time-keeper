import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return <div className={styles.field}><label htmlFor={id} className={styles.field__label}>{label}</label>{children(id, hintId)}{hint && <span id={hintId} className={styles.field__hint}>{hint}</span>}</div>;
}
export const fieldControl = styles.field__control;
