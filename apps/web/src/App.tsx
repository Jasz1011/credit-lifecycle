import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/auth-context';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/Feedback';

const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then((module) => ({ default: module.ApplicationsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const DisbursementsPage = lazy(() => import('./pages/DisbursementsPage').then((module) => ({ default: module.DisbursementsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage').then((module) => ({ default: module.NewApplicationPage })));
const PaymentSchedulePage = lazy(() => import('./pages/PaymentSchedulePage').then((module) => ({ default: module.PaymentSchedulePage })));
const RiskCommitteePage = lazy(() => import('./pages/RiskCommitteePage').then((module) => ({ default: module.RiskCommitteePage })));

function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const { t } = useTranslation();
  if (initializing) return <div className="fullscreen-state"><LoadingState label={t('common.loading')} /></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppLoading() {
  const { t } = useTranslation();
  return <div className="fullscreen-state"><LoadingState label={t('common.loading')} /></div>;
}

export function App() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/new" element={<NewApplicationPage />} />
            <Route path="risk-committee" element={<RiskCommitteePage />} />
            <Route path="risk-committee/:id" element={<RiskCommitteePage />} />
            <Route path="disbursements" element={<DisbursementsPage />} />
            <Route path="payment-schedule" element={<PaymentSchedulePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
