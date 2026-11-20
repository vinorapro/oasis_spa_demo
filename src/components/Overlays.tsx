import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '../store/store';
import type { Customer } from '../store/types';
import { UICtx, type ApptPrefill, type UI } from './uiContext';
import AppointmentForm from './AppointmentForm';
import AppointmentDrawer from './AppointmentDrawer';
import InvoicePreview from './InvoicePreview';
import { CustomerFormModal } from './CustomerForm';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

type ApptForm = { mode: 'new'; prefill?: ApptPrefill } | { mode: 'edit'; id: string };
type CustForm = { mode: 'new'; prefill?: Partial<Customer>; onCreated?: (c: Customer) => void } | { mode: 'edit'; id: string };

export function UIProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [apptForm, setApptForm] = useState<ApptForm | null>(null);
  const [custForm, setCustForm] = useState<CustForm | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const seq = useRef(0);

  // Overlays belong to the page they were opened on — close them when the route changes.
  useEffect(() => {
    const close = () => {
      setDrawerId(null);
      setApptForm(null);
      setCustForm(null);
      setInvoiceId(null);
    };
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const ui = useMemo<UI>(
    () => ({
      toast,
      openAppt: (id) => setDrawerId(id),
      newAppt: (prefill) => {
        setDrawerId(null);
        setApptForm({ mode: 'new', prefill });
      },
      editAppt: (id) => {
        setDrawerId(null);
        setApptForm({ mode: 'edit', id });
      },
      newCustomer: (opts) => setCustForm({ mode: 'new', prefill: opts?.prefill, onCreated: opts?.onCreated }),
      editCustomer: (id) => setCustForm({ mode: 'edit', id }),
      previewInvoice: (id) => setInvoiceId(id),
    }),
    [toast],
  );

  const editingAppt = apptForm?.mode === 'edit' ? state.appointments.find((a) => a.id === apptForm.id) : undefined;
  const editingCustomer = custForm?.mode === 'edit' ? state.customers.find((c) => c.id === custForm.id) : undefined;

  const closeDrawer = useCallback(() => setDrawerId(null), []);
  const closeAppt = useCallback(() => setApptForm(null), []);
  const closeCust = useCallback(() => setCustForm(null), []);
  const closeInvoice = useCallback(() => setInvoiceId(null), []);

  return (
    <UICtx.Provider value={ui}>
      {children}

      {drawerId && <AppointmentDrawer id={drawerId} onClose={closeDrawer} />}
      {apptForm && <AppointmentForm existing={editingAppt} prefill={apptForm.mode === 'new' ? apptForm.prefill : undefined} onClose={closeAppt} />}
      {custForm && (
        <CustomerFormModal
          customer={editingCustomer}
          prefill={custForm.mode === 'new' ? custForm.prefill : undefined}
          onClose={closeCust}
          onSaved={(c) => {
            toast(custForm.mode === 'edit' ? 'Profile updated' : `Customer ${c.name} registered`);
            if (custForm.mode === 'new') custForm.onCreated?.(c);
          }}
        />
      )}
      {invoiceId && <InvoicePreview id={invoiceId} onClose={closeInvoice} />}

      <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lift text-sm font-medium animate-fade-in max-w-sm ${
              t.tone === 'error' ? 'bg-rose-600 text-white' : t.tone === 'info' ? 'bg-forest-800 text-white' : 'bg-forest-900 text-white'
            }`}
          >
            {t.tone === 'error' ? <AlertTriangle size={16} /> : t.tone === 'info' ? <Info size={16} /> : <CheckCircle2 size={16} className="text-gold-light" />}
            {t.message}
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}
