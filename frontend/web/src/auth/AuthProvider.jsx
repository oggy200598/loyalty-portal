import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem('accessToken'),
  );
  const [loading, setLoading] = useState(true);

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
    setAccessToken(null);
    // 2. clear auth state + protected user state
    setUser(null);
    // replace history để browser back không quay lại protected page
    window.history.replaceState(null, '', '/login');
  }

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login,
      register,
      logout,
    }),
    [user, accessToken, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
