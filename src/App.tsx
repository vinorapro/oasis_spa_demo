import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Inventory from './pages/Inventory';
import BillingInvoices from './pages/BillingInvoices';
import Payroll from './pages/Payroll';
import Commission from './pages/Commission';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WhatsApp from './pages/WhatsApp';

function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      {(page) => {
        switch (page) {
          case 'Dashboard':
            return <Dashboard />;
          case 'Appointments':
            return <Appointments />;
          case 'Customers':
            return <Customers />;
          case 'Staff':
            return <Staff />;
          case 'Attendance':
            return <Attendance />;
          case 'Leave Requests':
            return <LeaveRequests />;
          case 'Inventory':
            return <Inventory />;
          case 'Billing & Invoices':
            return <BillingInvoices />;
          case 'WhatsApp':
            return <WhatsApp />;
          case 'Payroll':
            return <Payroll />;
          case 'Commission':
            return <Commission />;
          case 'Reports':
            return <Reports />;
          case 'Settings':
            return <Settings />;
          default:
            return <Dashboard />;
        }
      }}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <AppShell />
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
