import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "../Pages/Dashboard";
import BranchAnalysis from "../Pages/BranchAnalysis";
import CustomerAnalysis from "../Pages/CustomerAnalysis";
import ChannelAnalysis from "../Pages/ChannelAnalysis";
import AppLayout from "../Layout";
import DailySTT from "../Pages/DailySTT";
import MOR from "../Pages/MOR";

const PrivateRoutes = () => {
  return (
    <Routes>
      <Route index element={<AppLayout content={<Dashboard />} />} />
      <Route
        path="branch-analysis"
        element={<AppLayout content={<BranchAnalysis />} />}
      />
      <Route
        path="customer-analysis"
        element={<AppLayout content={<CustomerAnalysis />} />}
      />
      <Route
        path="channel-analysis"
        element={<AppLayout content={<ChannelAnalysis />} />}
      />

      <Route path="daily-stt" element={<AppLayout content={<DailySTT />} />} />
      <Route path="mor" element={<AppLayout content={<MOR />} />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default PrivateRoutes;
