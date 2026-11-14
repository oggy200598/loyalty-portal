import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../common/api';
import { AuthContext, useAuth } from './authContext';
import { Navigate, useLocation } from 'react-router-dom';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem('accessToken'),
  );
  const [loading, setLoading] = useState(true);
  const [notificationState, setNotificationState] = useState(null);
  useEffect(() => {
    if (!accessToken || !user?.id) return undefined;
    let fingerprint = '';
    return api.watchNotifications(snapshot => {
      const next = JSON.stringify(snapshot);
      if (next === fingerprint) return;
      fingerprint = next;
      setNotificationState({ ownerId: user.id, ...snapshot });
      window.dispatchEvent(new CustomEvent('notifications-changed', { detail: snapshot }));
    }, () => { localStorage.removeItem('accessToken'); setAccessToken(null); setUser(null); });
  }, [accessToken, user?.id]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await api.me();
        if (active) setUser(currentUser);
      } catch {
        localStorage.removeItem('accessToken');
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function login(payload) {
    const response = await api.login(payload);
    localStorage.setItem('accessToken', response.accessToken);
    setAccessToken(response.accessToken);
    setUser(response.user);
    return response;
  }

  async function register(payload) {
    const response = await api.register(payload);
    localStorage.setItem('accessToken', response.accessToken);
    setAccessToken(response.accessToken);
    setUser(response.user);
    return response;
  }

  function logout() {
    // 1. clear access token
    localStorage.removeItem('accessToken');
    for (const key of Object.keys(sessionStorage)) { if (key.startsWith('risk_') || key.startsWith('checkout_')) sessionStorage.removeItem(key); }
    setAccessToken(null);
    // 2. clear auth state + protected user state
    setUser(null);
    // replace history để browser back không quay lại protected page
    window.history.replaceState(null, '', '/dang-nhap');
  }

  const refreshUser = useCallback(async () => {
    const session = localStorage.getItem('accessToken');
    const current = await api.me();
    if (localStorage.getItem('accessToken') === session) setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login,
      register,
      logout,
      refreshUser,
      unreadCount: user?.id && notificationState?.ownerId === user.id
        ? notificationState.unreadCount ?? 0
        : 0,
    }),
    [user, accessToken, loading, refreshUser, notificationState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/khong-co-quyen" replace />;
  }

  return children;
}
