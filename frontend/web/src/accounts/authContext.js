import { createContext, useContext } from 'react';

// Context, hook và các hàm phân quyền dùng chung.
export const AuthContext = createContext(null);

export const ROLES = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
};

export function getRoleHome(role) {
  if (role === ROLES.ADMIN) return '/quan-tri';
  if (role === ROLES.SELLER) return '/nguoi-ban';
  return '/';
}

export { getRoleHome as getHomeForRole };

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
