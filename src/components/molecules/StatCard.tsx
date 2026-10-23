import { Icon, type IconName } from '../atoms/Icon';
import styles from './StatCard.module.css';

export function StatCard({ label, value, note, icon, accent = false }: { label: string; value: string; note: string; icon: IconName; accent?: boolean }) {
  return <article className={`${styles.stat} ${accent ? styles['stat--accent'] : ''}`}>
    <div className={styles.stat__top}><span>{label}</span><span className={styles.stat__icon}><Icon name={icon} size={18} /></span></div>
    <strong className={styles.stat__value}>{value}</strong>
    <span className={styles.stat__note}>{note}</span>
  </article>;
}
