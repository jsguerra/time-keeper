import type { ButtonHTMLAttributes, Ref } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

export function Button({ variant = 'primary', icon, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement>; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName }) {
  return <button type="button" className={`${styles.button} ${styles[`button--${variant}`]} ${className}`} {...props}>
    {icon && <Icon name={icon} size={17} />}{children}
  </button>;
}
