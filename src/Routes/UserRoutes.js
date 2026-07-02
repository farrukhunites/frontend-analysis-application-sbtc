import { lazy, Suspense, useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "antd";
import { UserContext } from "../App";
import { PAGE_KEYS, isPageBlocked } from "../Utils/access";

// Lazy-load every page so each route is its own JS chunk
const BranchAnalysis     = lazy(() => import("../Pages/Private/BranchAnalysis"));
const CustomerAnalysis   = lazy(() => import("../Pages/Private/CustomerAnalysis"));
const SalesmanAnalysis   = lazy(() => import("../Pages/Private/SalesmanAnalysis"));
const ChannelAnalysis    = lazy(() => import("../Pages/Private/ChannelAnalysis"));
const Reports            = lazy(() => import("../Pages/Private/Reports"));
const MOR                = lazy(() => import("../Pages/Private/MOR"));
const Settings           = lazy(() => import("../Pages/Private/Settings"));
const UserActivity       = lazy(() => import("../Pages/Private/UserActivity"));

const PageLoader = () => (
  <div style={{ padding: 24 }}>
    <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 24 }} />
    <Skeleton active paragraph={{ rows: 6 }} />
  </div>
);

// Fallback target when the current page is blocked. Settings is always available
// for everyone (covers password change), so it's a safe last-resort.
const FALLBACK_ROUTE = "/settings";

// Ordered route candidates we'll redirect to when the user tries to hit a
// page they don't have access to. First page they *do* have access to wins.
const DEFAULT_ROUTE_ORDER = [
  { path: "/",                    pageKey: PAGE_KEYS.DASHBOARD },
  { path: "/customer-analysis",   pageKey: PAGE_KEYS.CUSTOMER_ANALYSIS },
  { path: "/salesman-analysis",   pageKey: PAGE_KEYS.SALESMAN_ANALYSIS },
  { path: "/reports",             pageKey: PAGE_KEYS.REPORTS },
  { path: "/mor",                 pageKey: PAGE_KEYS.MOR },
];

const pickFirstAllowedPath = (userData) => {
  const allowed = DEFAULT_ROUTE_ORDER.find((r) => !isPageBlocked(userData, r.pageKey));
  return allowed ? allowed.path : FALLBACK_ROUTE;
};

const Guarded = ({ pageKey, children }) => {
  const { userData } = useContext(UserContext);
  if (pageKey && isPageBlocked(userData, pageKey)) {
    return <Navigate to={pickFirstAllowedPath(userData)} replace />;
  }
  return children;
};

const UserRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={
        <Guarded pageKey={PAGE_KEYS.DASHBOARD}><BranchAnalysis /></Guarded>
      } />
      <Route path="branch-analysis"     element={<Navigate to="/" replace />} />
      <Route path="customer-analysis"   element={
        <Guarded pageKey={PAGE_KEYS.CUSTOMER_ANALYSIS}><CustomerAnalysis /></Guarded>
      } />
      <Route path="salesman-analysis"   element={
        <Guarded pageKey={PAGE_KEYS.SALESMAN_ANALYSIS}><SalesmanAnalysis /></Guarded>
      } />
      <Route path="channel-analysis"    element={<ChannelAnalysis />} />
      <Route path="reports"             element={
        <Guarded pageKey={PAGE_KEYS.REPORTS}><Reports /></Guarded>
      } />
      <Route path="daily-stt"           element={<Navigate to="/reports" />} />
      <Route path="daily-sales"         element={<Navigate to="/reports" />} />
      <Route path="potential-customers" element={<Navigate to="/reports" />} />
      <Route path="mor"                 element={
        <Guarded pageKey={PAGE_KEYS.MOR}><MOR /></Guarded>
      } />
      <Route path="settings"            element={<Settings />} />
      <Route path="user-activity"       element={
        <Guarded pageKey={PAGE_KEYS.USER_ACTIVITY}><UserActivity /></Guarded>
      } />
      <Route path="*"                   element={<Navigate to="/" />} />
    </Routes>
  </Suspense>
);

export default UserRoutes;
