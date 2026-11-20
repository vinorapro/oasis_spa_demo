import { useEffect } from 'react';
import { AuthProvider, useAuth } from './store/auth';
import { StoreProvider } from './store/store';
import { UIProvider } from './components/Overlays';
import Layout from './components/Layout';
import { HOME_PAGE, PageKey, PAGE_ACCESS } from './config/venue';
import { navigate, useRoute } from './lib/router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DemoGuide from './pages/DemoGuide';
import Reception from './pages/Reception';
import CalendarPage from './pages/Calendar';
import ServiceDesk from './pages/ServiceDesk';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Leads from './pages/Leads';
import Billing from './pages/Billing';
import Checkout from './pages/Checkout';
import Memberships from './pages/Memberships';
import WhatsApp from './pages/WhatsApp';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import VenueSetup from './pages/VenueSetup';
import Reports from './pages/Reports';
import ActivityLog from './pages/ActivityLog';
import Settings from './pages/Settings';

function Shell() {
  const { user, can } = useAuth();
  const route = useRoute();
  const page = route.page as PageKey;
  const allowed = !!user && !!page && page in PAGE_ACCESS && can(page);

  useEffect(() => {
    if (user && !allowed) navigate(HOME_PAGE[user.role]);
  }, [user, allowed]);

  if (!user) return <Login />;
  if (!allowed) return null;

  const content = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'guide': return <DemoGuide />;
      case 'reception': return <Reception />;
      case 'calendar': return <CalendarPage />;
      case 'service-desk': return <ServiceDesk />;
      case 'customers': return route.id ? <CustomerProfile id={route.id} /> : <Customers />;
      case 'leads': return <Leads openId={route.query.get('open') ?? undefined} />;
      case 'billing': return route.id ? <Checkout id={route.id} /> : <Billing />;
      case 'memberships': return <Memberships />;
      case 'whatsapp': return <WhatsApp />;
      case 'inventory': return <Inventory />;
      case 'staff': return <Staff />;
      case 'venue': return <VenueSetup />;
      case 'reports': return <Reports />;
      case 'activity': return <ActivityLog />;
      case 'settings': return <Settings />;
      default: return null;
    }
  })();

  return <Layout page={page}>{content}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <UIProvider>
          <Shell />
        </UIProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
