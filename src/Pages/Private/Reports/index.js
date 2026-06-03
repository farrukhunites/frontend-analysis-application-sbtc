import { lazy, Suspense, useState } from "react";
import { Tabs, Skeleton } from "antd";
import { CalendarOutlined, AimOutlined, TrophyOutlined, RiseOutlined } from "@ant-design/icons";

const DailySalesByBranch  = lazy(() => import("../DailySalesByBranch"));
const DailySTT            = lazy(() => import("../DailySTT"));
const SalesmanAchievement = lazy(() => import("./SalesmanAchievement"));
const ChannelCustomerYoY  = lazy(() => import("./ChannelCustomerYoY"));

const TabLoader = () => (
  <div style={{ padding: "24px 0" }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </div>
);

const TABS = [
  {
    key:      "daily-sales",
    label:    (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CalendarOutlined /> Daily Sales
      </span>
    ),
    children: (
      <Suspense fallback={<TabLoader />}>
        <DailySalesByBranch />
      </Suspense>
    ),
  },
  {
    key:      "monthly-sales",
    label:    (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <AimOutlined /> Monthly Sales
      </span>
    ),
    children: (
      <Suspense fallback={<TabLoader />}>
        <DailySTT />
      </Suspense>
    ),
  },
  {
    key:      "salesman-achievement",
    label:    (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <TrophyOutlined /> Salesman Achievement
      </span>
    ),
    children: (
      <Suspense fallback={<TabLoader />}>
        <SalesmanAchievement />
      </Suspense>
    ),
  },
  {
    key:      "customer-yoy",
    label:    (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <RiseOutlined /> Customer YoY
      </span>
    ),
    children: (
      <Suspense fallback={<TabLoader />}>
        <ChannelCustomerYoY />
      </Suspense>
    ),
  },
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState("daily-sales");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Reports
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
          Sales performance reports by branch and period
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TABS}
        destroyInactiveTabPane={false}
        style={{ background: "var(--color-bg-card)", borderRadius: 12, padding: "0 16px 16px" }}
      />
    </div>
  );
};

export default Reports;
