import { createContext, useContext } from 'react';
import type { Customer } from '../store/types';

export interface ApptPrefill {
  customerId?: string;
  serviceId?: string;
  employeeId?: string;
  roomId?: string;
  date?: string;
  start?: string;
  leadId?: string;
  source?: string;
}

export interface UI {
  toast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  openAppt: (id: string) => void;
  newAppt: (prefill?: ApptPrefill) => void;
  editAppt: (id: string) => void;
  newCustomer: (opts?: { prefill?: Partial<Customer>; onCreated?: (c: Customer) => void }) => void;
  editCustomer: (id: string) => void;
  previewInvoice: (id: string) => void;
}

export const UICtx = createContext<UI | undefined>(undefined);

export function useUI(): UI {
  const c = useContext(UICtx);
  if (!c) throw new Error('useUI must be used inside UIProvider');
  return c;
}
