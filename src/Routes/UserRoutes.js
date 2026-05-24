import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "antd";

// Lazy-load every page so each route is its own JS chunk
const Dashboard          = lazy(() => import("../Pages/Private/Dashboard"));
const BranchAnalysis     = lazy(() => import("../Pages/Private/BranchAnalysis"));
const CustomerAnalysis   = lazy(() => import("../Pages/Private/CustomerAnalysis"));
const ChannelAnalysis    = lazy(() => import("../Pages/Private/ChannelAnalysis"));
const DailySTT           = lazy(() => import("../Pages/Private/DailySTT"));
const DailySalesByBranch = lazy(() => import("../Pages/Private/DailySalesByBranch"));
const PotentialCustomers = lazy(() => import("../Pages/Private/PotentialCustomers"));
const MOR                = lazy(() => import("../Pages/Private/MOR"));
const Settings              = lazy(() => import("../Pages/Private/Settings"));
const SalesmanPerformance   = lazy(() => import("../Pages/Private/SalesmanPerformance"));

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
      <Route path="channel-analysis"    element={<ChannelAnalysis />} />
      <Route path="daily-stt"           element={<DailySTT />} />
      <Route path="daily-sales"         element={<DailySalesByBranch />} />
      <Route path="potential-customers" element={<PotentialCustomers />} />
      <Route path="mor"                 element={<MOR />} />
      <Route path="settings"             element={<Settings />} />
      <Route path="salesman-performance" element={<SalesmanPerformance />} />
      <Route path="*"                   element={<Navigate to="/" />} />
    </Routes>
  </Suspense>
);

export default UserRoutes;
