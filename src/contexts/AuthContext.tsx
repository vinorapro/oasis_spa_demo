import { createContext, useContext, useState, ReactNode } from 'react';
import { Role } from '../data/mockData';

export interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  title: string;
}

/* Demo credentials shown on the login screen for the presentation. */
export const demoUsers: DemoUser[] = [
  { name: 'Priya Sharma', email: 'priya@oasisspa.com', password: 'oasis123', role: 'Admin', title: 'Spa Director' },
  { name: 'Meera Patel', email: 'meera@oasisspa.com', password: 'oasis123', role: 'Manager', title: 'Operations Manager' },
  { name: 'Rohan Dsouza', email: 'rohan@oasisspa.com', password: 'oasis123', role: 'Receptionist', title: 'Front Desk' },
  { name: 'Anita Nair', email: 'anita@oasisspa.com', password: 'oasis123', role: 'Therapist', title: 'Senior Therapist' },
];

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
  title: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (email: string, password: string) => {
    const match = demoUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!match) {
      return { ok: false, error: 'Invalid email or password. Try a demo account below.' };
    }
    setUser({ name: match.name, email: match.email, role: match.role, title: match.title });
    return { ok: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
