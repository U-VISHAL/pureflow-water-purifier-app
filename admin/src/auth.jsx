import { createContext, useContext, useEffect, useState } from 'react';
import * as backend from './backend';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true });

  useEffect(() => backend.onAuth(async (user) => {
    if (!user) return setState((s) => ({ user: null, profile: null, loading: false, error: s.error }));
    const profile = await backend.getProfile(user.uid).catch(() => null);
    if (profile?.role !== 'admin') {
      await backend.signOut();
      return setState({ user: null, profile: null, loading: false, error: 'This account does not have admin access.' });
    }
    setState({ user, profile, loading: false });
  }), []);

  const login = async (email, password) => {
    setState((s) => ({ ...s, error: null }));
    await backend.signIn(email, password);
  };

  return (
    <Ctx.Provider value={{ ...state, isDemo: backend.isDemo, login, logout: () => backend.signOut() }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
