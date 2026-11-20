import { createContext, ReactNode, useContext, useState } from 'react';
import { DEMO_USERS, PAGE_ACCESS, PageKey } from '../config/venue';
import type { DemoUser } from './types';

const KEY = 'oasis-venue-demo:user';

interface AuthCtx {
  user: DemoUser | null;
  login: (userId: string) => void;
  logout: () => void;
  can: (page: PageKey) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function readUser(): DemoUser | null {
  try {
    const id = localStorage.getItem(KEY);
    return DEMO_USERS.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(readUser);

  const login = (userId: string) => {
    const u = DEMO_USERS.find((x) => x.id === userId) ?? null;
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, u.id);
    } catch {
      /* storage unavailable — session only */
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  const can = (page: PageKey) => !!user && PAGE_ACCESS[page].includes(user.role);

  return <Ctx.Provider value={{ user, login, logout, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
