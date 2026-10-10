import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api';
import type { Notification } from '../types';

const NAV_ITEMS: { role: string[]; path: string; label: string }[] = [
  { role: ['agent1', 'admin'], path: '/deals/new', label: '+ New Deal' },
  { role: ['agent1', 'agent2', 'asm', 'city_manager', 'business_head', 'admin'], path: '/deals', label: 'Deals' },
  { role: ['asm'], path: '/my-visits', label: 'My Visits' },
  { role: ['city_manager', 'business_head', 'admin'], path: '/dashboard', label: 'Dashboard' },
  { role: ['city_manager', 'admin'], path: '/asm-mapping', label: 'ASM Mapping' },
  { role: ['city_manager', 'admin'], path: '/users', label: 'Users' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    notificationsApi.list(true).then(setNotifications).catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications([]);
  };

  const navItems = NAV_ITEMS.filter((item) => user && item.role.includes(user.role));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#003335', color: '#fff', padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 24, height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>The Pause CRM</span>
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: location.pathname.startsWith(item.path) ? '#fff' : 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: location.pathname.startsWith(item.path) ? 600 : 400,
                background: location.pathname.startsWith(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, position: 'relative' }}
          >
            🔔
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, background: '#f44336',
                color: '#fff', fontSize: 10, borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: 40, right: 0, background: '#fff', color: '#333',
              borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 320, zIndex: 200,
              maxHeight: 400, overflow: 'auto',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Notifications</strong>
                <button onClick={markAllRead} style={{ fontSize: 12, color: '#003335', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No new notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.deal_id) navigate(`/deals/${n.deal_id}`);
                      setShowNotifs(false);
                    }}
                    style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', background: n.is_read ? '#fff' : '#e0f5f6' }}
                  >
                    <div style={{ fontSize: 13 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          )}

          <span style={{ fontSize: 13 }}>{user?.name}</span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
