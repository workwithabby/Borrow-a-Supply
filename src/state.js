// Who is logged in right now. The data itself lives behind the services.

export const state = { user: null };

export const setUser = (user) => { state.user = user; };

// Each role has its own home. Role names: user (borrower), staff, admin.
export const HOME = { user: '/borrower/home', staff: '/staff/queue', admin: '/admin/dashboard' };

export const homeFor = (role) => HOME[role] || '/login';

export const firstName = (u) => (u?.full_name || '').split(' ')[0] || 'there';
