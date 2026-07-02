import { lazy, Suspense, useContext, useMemo, useState } from "react";
import { Tabs, Skeleton, Empty } from "antd";
import { CalendarOutlined, AimOutlined, TrophyOutlined, RiseOutlined, AppstoreOutlined, TeamOutlined, DatabaseOutlined, BulbOutlined, UsergroupAddOutlined, PieChartOutlined } from "@ant-design/icons";
import { UserContext } from "../../../App";
import { REPORT_KEYS, isReportBlocked } from "../../../Utils/access";

const SalesTargetOverview = lazy(() => import("./SalesTargetOverview"));
const DailySalesByBranch  = lazy(() => import("../DailySalesByBranch"));
const DailySTT            = lazy(() => import("../DailySTT"));
const SalesmanAchievement = lazy(() => import("./SalesmanAchievement"));
const ChannelCustomerYoY  = lazy(() => import("./ChannelCustomerYoY"));
const ChannelAchievement  = lazy(() => import("./ChannelAchievement"));
const ChannelCoverage     = lazy(() => import("./ChannelCoverage"));
const TargetFeasibility   = lazy(() => import("./TargetFeasibility"));
const RawData             = lazy(() => import("./RawData"));
const PotentialCustomers  = lazy(() => import("../PotentialCustomers"));

const TabLoader = () => (
  <div style={{ padding: "24px 0" }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </div>
);

const TABS = [
  {
    key:       "sales-target-overview",
    reportKey: REPORT_KEYS.SALES_TARGET_OVERVIEW,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PieChartOutlined /> Sales Target Overview
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <SalesTargetOverview />
      </Suspense>
    ),
  },
  {
    key:       "daily-sales",
    reportKey: REPORT_KEYS.DAILY_SALES,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CalendarOutlined /> Daily Sales
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <DailySalesByBranch />
      </Suspense>
    ),
  },
  {
    key:       "monthly-sales",
    reportKey: REPORT_KEYS.MONTHLY_SALES,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <AimOutlined /> Monthly Sales
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <DailySTT />
      </Suspense>
    ),
  },
  {
    key:       "salesman-achievement",
    reportKey: REPORT_KEYS.SALESMAN_ACHIEVEMENT,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <TrophyOutlined /> Salesman Achievement
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <SalesmanAchievement />
      </Suspense>
    ),
  },
  {
    key:       "customer-yoy",
    reportKey: REPORT_KEYS.CUSTOMER_YOY,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <RiseOutlined /> Customer YoY
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <ChannelCustomerYoY />
      </Suspense>
    ),
  },
  {
    key:       "channel-achievement",
    reportKey: REPORT_KEYS.CHANNEL_ACHIEVEMENT,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <AppstoreOutlined /> Channel Achievement
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <ChannelAchievement />
      </Suspense>
    ),
  },
  {
    key:       "channel-coverage",
    reportKey: REPORT_KEYS.CHANNEL_COVERAGE,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <TeamOutlined /> Coverage Report
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <ChannelCoverage />
      </Suspense>
    ),
  },
  {
    key:       "target-feasibility",
    reportKey: REPORT_KEYS.TARGET_FEASIBILITY,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <BulbOutlined /> Target Feasibility
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <TargetFeasibility />
      </Suspense>
    ),
  },
  {
    key:       "raw-data",
    reportKey: REPORT_KEYS.RAW_DATA,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <DatabaseOutlined /> Raw Data
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <RawData />
      </Suspense>
    ),
  },
  {
    key:       "potential-customers",
    reportKey: REPORT_KEYS.POTENTIAL_CUSTOMERS,
    label:     (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UsergroupAddOutlined /> Potential Customers
      </span>
    ),
    children:  (
      <Suspense fallback={<TabLoader />}>
        <PotentialCustomers />
      </Suspense>
    ),
  },
];

const Reports = () => {
  const { userData } = useContext(UserContext);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => !isReportBlocked(userData, tab.reportKey)),
    [userData]
  );

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);

  // If denied list changes (e.g. after re-login) and current tab is no longer
  // visible, fall back to the first available one.
  if (visibleTabs.length && !visibleTabs.some((t) => t.key === activeTab)) {
    setActiveTab(visibleTabs[0].key);
  }

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

      {visibleTabs.length === 0 ? (
        <div style={{ background: "var(--color-bg-card)", borderRadius: 12, padding: 48 }}>
          <Empty description="You don't have access to any reports. Contact your administrator." />
        </div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={visibleTabs}
          destroyInactiveTabPane={false}
          style={{ background: "var(--color-bg-card)", borderRadius: 12, padding: "0 16px 16px" }}
        />
      )}
    </div>
  );
};

export default Reports;
