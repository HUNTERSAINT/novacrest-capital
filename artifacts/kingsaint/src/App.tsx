import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { PublicLayout } from '@/components/layout/public-layout';
import { AppLayout } from '@/components/layout/app-layout';

// Pages
import Home from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Dashboard from '@/pages/dashboard';
import Plans from '@/pages/plans';
import Invest from '@/pages/invest';
import Investments from '@/pages/investments';
import Transactions from '@/pages/transactions';
import Deposit from '@/pages/deposit';
import Withdraw from '@/pages/withdraw';
import Referrals from '@/pages/referrals';
import Profile from '@/pages/profile';
import FAQ from '@/pages/faq';
import Signals from '@/pages/signals';
import KYCPage from '@/pages/kyc';
import CopyTrading from '@/pages/copy-trading';
import ProfitHistory from '@/pages/profit-history';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminUsers from '@/pages/admin/users';
import AdminUserDetail from '@/pages/admin/user-detail';
import AdminTransactions from '@/pages/admin/transactions';
import AdminPlans from '@/pages/admin/plans';
import AdminWallets from '@/pages/admin/wallets';
import AdminKyc from '@/pages/admin/kyc';
import AdminSignals from '@/pages/admin/signals';
import AdminCopyTrading from '@/pages/admin/copy-trading';
import AdminChat from '@/pages/admin/chat';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (adminOnly && user.role !== 'admin') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function PublicRoute({ component: Component }: { component: any }) {
  return (
    <PublicLayout>
      <Component />
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={() => <PublicRoute component={Home} />} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      <Route path="/plans" component={() => <PublicRoute component={Plans} />} />
      <Route path="/faq" component={() => <PublicRoute component={FAQ} />} />

      {/* Member Routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/invest/:planId" component={() => <ProtectedRoute component={Invest} />} />
      <Route path="/investments" component={() => <ProtectedRoute component={Investments} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Transactions} />} />
      <Route path="/deposit" component={() => <ProtectedRoute component={Deposit} />} />
      <Route path="/withdraw" component={() => <ProtectedRoute component={Withdraw} />} />
      <Route path="/referrals" component={() => <ProtectedRoute component={Referrals} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/signals" component={() => <ProtectedRoute component={Signals} />} />
      <Route path="/kyc" component={() => <ProtectedRoute component={KYCPage} />} />
      <Route path="/copy-trading" component={() => <ProtectedRoute component={CopyTrading} />} />
      <Route path="/profit-history" component={() => <ProtectedRoute component={ProfitHistory} />} />

      {/* Admin Routes */}
      <Route path="/admin" component={() => <ProtectedRoute adminOnly component={AdminDashboard} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute adminOnly component={AdminUsers} />} />
      <Route path="/admin/users/:id" component={() => <ProtectedRoute adminOnly component={AdminUserDetail} />} />
      <Route path="/admin/transactions" component={() => <ProtectedRoute adminOnly component={AdminTransactions} />} />
      <Route path="/admin/plans" component={() => <ProtectedRoute adminOnly component={AdminPlans} />} />
      <Route path="/admin/wallets" component={() => <ProtectedRoute adminOnly component={AdminWallets} />} />
      <Route path="/admin/kyc" component={() => <ProtectedRoute adminOnly component={AdminKyc} />} />
      <Route path="/admin/signals" component={() => <ProtectedRoute adminOnly component={AdminSignals} />} />
      <Route path="/admin/copy-trading" component={() => <ProtectedRoute adminOnly component={AdminCopyTrading} />} />
      <Route path="/admin/chat" component={() => <ProtectedRoute adminOnly component={AdminChat} />} />

      <Route component={() => <PublicRoute component={NotFound} />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
