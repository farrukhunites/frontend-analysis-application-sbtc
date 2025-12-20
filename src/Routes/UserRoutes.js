import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../Pages/Private/Dashboard";
import BranchAnalysis from "../Pages/Private/BranchAnalysis";
import CustomerAnalysis from "../Pages/Private/CustomerAnalysis";
import ChannelAnalysis from "../Pages/Private/ChannelAnalysis";
import DailySTT from "../Pages/Private/DailySTT";
import MOR from "../Pages/Private/MOR";
import Settings from "../Pages/Private/Settings";
import PotentialCustomers from "../Pages/Private/PotentialCustomers";

const UserRoutes = () => {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="branch-analysis" element={<BranchAnalysis />} />
      <Route path="customer-analysis" element={<CustomerAnalysis />} />
      <Route path="channel-analysis" element={<ChannelAnalysis />} />

      <Route path="daily-stt" element={<DailySTT />} />
      <Route path="potential-customers" element={<PotentialCustomers />} />
      <Route path="mor" element={<MOR />} />

      <Route path="settings" element={<Settings />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default UserRoutes;
