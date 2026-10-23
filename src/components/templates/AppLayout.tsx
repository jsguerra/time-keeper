import type { ReactNode } from 'react';
import { Icon, type IconName } from '../atoms/Icon';
import styles from './AppLayout.module.css';

export type Page = 'dashboard' | 'entries' | 'projects' | 'users';
const navigation: { page: Page; label: string; icon: IconName }[] = [
  { page: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { page: 'entries', label: 'Time entries', icon: 'clock' },
  { page: 'projects', label: 'Projects', icon: 'folder' },
  { page: 'users', label: 'People', icon: 'users' },
];
export function AppLayout({ page, onNavigate, children }: { page: Page; onNavigate: (page: Page) => void; children: ReactNode }) {
  return <div className={styles.layout}>
    <a className={styles.layout__skip} href="#main">Skip to content</a>
    <aside className={styles.layout__sidebar}>
      <a className={styles.layout__brand} href="#dashboard" aria-label="Timekeeper overview" onClick={() => onNavigate('dashboard')}><span className={styles.layout__brandMark}><Icon name="clock" size={25} /></span>timekeeper<span className={styles.layout__brandDot}>.</span></a>
      <div className={styles.layout__workspace}><span className={styles.layout__workspaceIcon}><Icon name="leaf" size={17} /></span><div><strong>My workspace</strong><span>A little more intentional.</span></div></div>
      <p className={styles.layout__navLabel}>WORKSPACE</p>
      <nav className={styles.layout__nav} aria-label="Main navigation">{navigation.map(item => <a key={item.page} href={`#${item.page}`} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} className={`${styles.layout__navItem} ${page === item.page ? styles['layout__navItem--active'] : ''}`} onClick={() => onNavigate(item.page)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{page === item.page && <span className={styles.layout__activeDot} />}</a>)}</nav>
      <div className={styles.layout__sidebarBottom}>
        <div className={styles.layout__quote}><Icon name="leaf" size={22} /><p>Great work takes time.<br /><strong>Make yours count.</strong></p><span>A little focus goes a long way.</span></div>
        <div className={styles.layout__local}><span /><div><strong>Local &amp; private</strong><p>Stored on this computer</p></div><Icon name="check" size={15} /></div>
      </div>
    </aside>
    <div className={styles.layout__content}>
      <header className={styles.layout__topbar}><div>Workspace <span>/</span><strong>{navigation.find(item => item.page === page)?.label}</strong></div><span className={styles.layout__localBadge}><i />Local workspace</span></header>
      <main id="main" tabIndex={-1} className={styles.layout__main}>{children}</main>
      <footer className={styles.layout__footer}><span>A clearer picture of your time.</span><span>Made for focus. Built to stay local.</span></footer>
    </div>
  </div>;
}
