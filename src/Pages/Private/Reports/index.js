import { lazy, Suspense, useContext, useMemo, useState } from "react";
import { Tabs, Skeleton, Empty } from "antd";
import { UserContext } from "../../../App";
import { isReportBlocked } from "../../../Utils/access";
import { REPORT_CATALOG, getReportPrefs } from "../../../Utils/reportPrefs";

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
const SalesmanActivity    = lazy(() => import("./SalesmanActivity"));
const CustomerSalesVariance = lazy(() => import("./CustomerSalesVariance"));

const TabLoader = () => (
  <div style={{ padding: "24px 0" }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </div>
);

// Map catalog key -> lazy component. Adding a report is one entry here plus
// one entry in REPORT_CATALOG.
const REPORT_COMPONENTS = {
  "sales-target-overview": SalesTargetOverview,
  "daily-sales":           DailySalesByBranch,
  "monthly-sales":         DailySTT,
  "salesman-achievement":  SalesmanAchievement,
  "customer-yoy":          ChannelCustomerYoY,
  "channel-achievement":   ChannelAchievement,
  "channel-coverage":      ChannelCoverage,
  "target-feasibility":    TargetFeasibility,
  "raw-data":              RawData,
  "potential-customers":   PotentialCustomers,
  "salesman-activity":     SalesmanActivity,
  "customer-sales-variance": CustomerSalesVariance,
};

const buildTab = (entry) => {
  const Icon = entry.icon;
  const Component = REPORT_COMPONENTS[entry.key];
  return {
    key:       entry.key,
    reportKey: entry.reportKey,
    label: (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon /> {entry.label}
      </span>
    ),
    children: (
      <Suspense fallback={<TabLoader />}>
        {Component ? <Component /> : null}
      </Suspense>
    ),
  };
};

const Reports = () => {
  const { userData } = useContext(UserContext);

  const visibleTabs = useMemo(() => {
    const prefs = getReportPrefs(userData);
    const byKey = new Map(REPORT_CATALOG.map((r) => [r.key, r]));
    const hidden = new Set(prefs.hidden);
    return prefs.order
      .map((k) => byKey.get(k))
      .filter(Boolean)
      .filter((entry) => !hidden.has(entry.key))
      .filter((entry) => !isReportBlocked(userData, entry.reportKey))
      .map(buildTab);
  }, [userData]);

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);

  // If the visible tab set changes (ACL/pref update, or first paint) and the
  // current tab is no longer visible, fall back to the first available one.
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
          <Empty description="No reports to display. Enable some in Settings > Report Preferences, or contact your administrator." />
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
