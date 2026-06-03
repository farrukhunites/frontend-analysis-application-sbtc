import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "antd";

// Lazy-load every page so each route is its own JS chunk
const Dashboard          = lazy(() => import("../Pages/Private/Dashboard"));
const BranchAnalysis     = lazy(() => import("../Pages/Private/BranchAnalysis"));
const CustomerAnalysis   = lazy(() => import("../Pages/Private/CustomerAnalysis"));
const SalesmanAnalysis   = lazy(() => import("../Pages/Private/SalesmanAnalysis"));
const ChannelAnalysis    = lazy(() => import("../Pages/Private/ChannelAnalysis"));
const Reports            = lazy(() => import("../Pages/Private/Reports"));
const PotentialCustomers = lazy(() => import("../Pages/Private/PotentialCustomers"));
const MOR                = lazy(() => import("../Pages/Private/MOR"));
const Settings           = lazy(() => import("../Pages/Private/Settings"));

const PageLoader = () => (
  <div style={{ padding: 24 }}>
    <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 24 }} />
    <Skeleton active paragraph={{ rows: 6 }} />
  </div>
);

const UserRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="branch-analysis"     element={<BranchAnalysis />} />
      <Route path="customer-analysis"   element={<CustomerAnalysis />} />
      <Route path="salesman-analysis"   element={<SalesmanAnalysis />} />
      <Route path="channel-analysis"    element={<ChannelAnalysis />} />
      <Route path="reports"              element={<Reports />} />
      <Route path="daily-stt"           element={<Navigate to="/reports" />} />
      <Route path="daily-sales"         element={<Navigate to="/reports" />} />
      <Route path="potential-customers" element={<PotentialCustomers />} />
      <Route path="mor"                 element={<MOR />} />
      <Route path="settings"            element={<Settings />} />
      <Route path="*"                   element={<Navigate to="/" />} />
    </Routes>
  </Suspense>
);

export default UserRoutes;
