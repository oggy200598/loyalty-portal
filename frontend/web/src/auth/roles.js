export const ROLES = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
};

/** Trang mặc định sau khi đăng nhập, theo role. */
export function getRoleHome(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SELLER') return '/seller';
  return '/';
}

/** Trang phù hợp để redirect khi 403 / logout. */
export { getRoleHome as getHomeForRole };
