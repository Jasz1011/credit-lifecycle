import {
  Landmark,
  ClipboardList,
  FilePlus2,
  Gauge,
  LogOut,
  Menu,
  SearchCheck,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/auth-context';
import { LanguageSwitcher } from './LanguageSwitcher';

const navItems: Array<{ to: string; key: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', key: 'dashboard', icon: Gauge, end: true },
  { to: '/applications', key: 'applications', icon: ClipboardList, end: true },
  { to: '/applications/new', key: 'newApplication', icon: FilePlus2 },
  { to: '/risk-committee', key: 'risk', icon: ShieldCheck },
  { to: '/disbursements', key: 'disbursements', icon: Landmark },
  { to: '/payment-schedule', key: 'schedule', icon: SearchCheck },
];

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 980px)').matches);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const currentItem = [...navItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)');
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const returnFocusTarget = menuButtonRef.current;
    closeButtonRef.current?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>('a, button:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      returnFocusTarget?.focus();
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('common.skipToContent')}</a>
      {menuOpen ? (
        <button className="sidebar-backdrop" type="button" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)} />
      ) : null}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} id="primary-navigation" ref={sidebarRef} inert={isMobile && !menuOpen}>
        <div className="product-wordmark">
          <div className="product-rule" aria-hidden="true"><span /><span /></div>
          <div><strong translate="no">{t('brand.name')}</strong><small>{t('brand.tagline')}</small></div>
          <button type="button" className="sidebar-close" ref={closeButtonRef} aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)}>
            <X aria-hidden="true" />
          </button>
        </div>
        <nav className="main-nav" aria-label={t('nav.menu')}>
          {navItems.map(({ to, key, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={18} aria-hidden="true" />
              <span>{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <span>{user?.fullName.slice(0, 1)}</span>
            <div><strong>{t('nav.analyst')}</strong><small translate="no">@{user?.username}</small></div>
          </div>
          <button type="button" className="logout-button" onClick={() => void logout()}>
            <LogOut size={17} aria-hidden="true" /> {t('nav.logout')}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-context">
            <button
              type="button"
              className="mobile-menu-button"
              ref={menuButtonRef}
              aria-label={t('nav.openMenu')}
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <div className="breadcrumb"><span translate="no">CreditFlow</span><b>/</b><strong>{t(`nav.${currentItem?.key ?? 'dashboard'}`)}</strong></div>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <div className="topbar-user"><span>{user?.fullName.slice(0, 1)}</span><strong>{user?.fullName}</strong></div>
          </div>
        </header>
        <div className="content-frame" id="main-content" tabIndex={-1}><Outlet /></div>
      </main>
    </div>
  );
}
