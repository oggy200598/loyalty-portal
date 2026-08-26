import { useContext } from 'react';
import { AuthContext } from './authContext';

/**
 * useAuth hook — tách riêng khỏi AuthContext.jsx (component file)
 * để Vite Fast Refresh hoạt động đúng.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
