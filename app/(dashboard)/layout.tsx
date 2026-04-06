'use client';
// app/(dashboard)/layout.tsx
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

const NAV_ITEMS = [
  {
    label: 'Dashboard', href: '/dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: 'Houses', href: '/houses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: 'Residents', href: '/residents',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: 'Maintenance', href: '/maintenance',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    children: [
      { label: 'Collect Payment', href: '/maintenance' },
      { label: 'Pending Dues',    href: '/maintenance/dues' },
    ],
  },
  {
    label: 'Development', href: '/development',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    label: 'Expenses', href: '/expenses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    label: 'Reports', href: '/reports',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  },
  {
    label: 'Users', href: '/users', adminOnly: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

type NavItemType = typeof NAV_ITEMS[0];

function NavItem({ item, pathname, onNavigate }: { item: NavItemType; pathname: string; onNavigate?: () => void }) {
  const hasChildren = !!(item as any).children?.length;
  const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const [open, setOpen] = useState(isParentActive);

  if (hasChildren) {
    const children = (item as any).children as { label: string; href: string }[];
    return (
      <div>
        <button className={`nav-item ${isParentActive ? 'active' : ''}`} onClick={() => setOpen(o => !o)} style={{ justifyContent: 'space-between', width: '100%' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{item.icon}{item.label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && (
          <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            {children.map(child => (
              <Link key={child.href} href={child.href} onClick={onNavigate}
                className={`nav-item ${pathname === child.href ? 'active' : ''}`}
                style={{ fontSize: 13, padding: '7px 12px' }}>
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
      {item.icon}{item.label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(i => !(i as any).adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '4px 8px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>AF Garden</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Society PMS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {items.map(item => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <Link href="/profile" onClick={onNavigate}
          className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}
          style={{ marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)',
            border: '1px solid var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{user?.role}</div>
          </div>
        </Link>
        <button className="nav-item" onClick={logout} style={{ color: 'var(--red)', width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading]);
  useEffect(() => {
    const h = () => { if (window.innerWidth > 768) setMobileOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <aside style={{ width: 'var(--sidebar-w)', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 50 }} className="pms-desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 90, backdropFilter: 'blur(2px)' }} />}

      {/* Mobile drawer */}
      <aside style={{ width: 'var(--sidebar-w)', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 100, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }} className="pms-main">
        {/* Mobile topbar */}
        <div className="pms-topbar" style={{ display: 'none', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 4, display: 'flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>AF Garden PMS</span>
        </div>

        <div className="pms-content" style={{ padding: '32px 32px 64px' }}>
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .pms-desktop-sidebar { display: none !important; }
          .pms-topbar          { display: flex !important; }
          .pms-content         { padding: 20px 16px 48px !important; }
        }
        @media (min-width: 769px) {
          .pms-main { margin-left: var(--sidebar-w); }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </ToastProvider>
    </AuthProvider>
  );
}