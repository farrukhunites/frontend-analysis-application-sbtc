import {
  CalendarOutlined,
  AimOutlined,
  TrophyOutlined,
  RiseOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BulbOutlined,
  UsergroupAddOutlined,
  PieChartOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { REPORT_KEYS } from "./access";
import { updateReportPrefs, resetReportPrefsAPI } from "../API/Auth";

// Single source of truth for the Reports tab bar and the Settings > Report
// Preferences card. `key` is the tab key (also stored in the backend's
// user.report_prefs). Add new reports here in the desired default order.
export const REPORT_CATALOG = [
  { key: "sales-target-overview", reportKey: REPORT_KEYS.SALES_TARGET_OVERVIEW, label: "Sales Target Overview", icon: PieChartOutlined },
  { key: "daily-sales",           reportKey: REPORT_KEYS.DAILY_SALES,           label: "Daily Sales",           icon: CalendarOutlined },
  { key: "monthly-sales",         reportKey: REPORT_KEYS.MONTHLY_SALES,         label: "Monthly Sales",         icon: AimOutlined },
  { key: "salesman-achievement",  reportKey: REPORT_KEYS.SALESMAN_ACHIEVEMENT,  label: "Salesman Achievement",  icon: TrophyOutlined },
  { key: "customer-yoy",          reportKey: REPORT_KEYS.CUSTOMER_YOY,          label: "Customer YoY",          icon: RiseOutlined },
  { key: "channel-achievement",   reportKey: REPORT_KEYS.CHANNEL_ACHIEVEMENT,   label: "Channel Achievement",   icon: AppstoreOutlined },
  { key: "channel-coverage",      reportKey: REPORT_KEYS.CHANNEL_COVERAGE,      label: "Coverage Report",       icon: TeamOutlined },
  { key: "target-feasibility",    reportKey: REPORT_KEYS.TARGET_FEASIBILITY,    label: "Target Feasibility",    icon: BulbOutlined },
  { key: "raw-data",              reportKey: REPORT_KEYS.RAW_DATA,              label: "Raw Data",              icon: DatabaseOutlined },
  { key: "potential-customers",   reportKey: REPORT_KEYS.POTENTIAL_CUSTOMERS,   label: "Potential Customers",   icon: UsergroupAddOutlined },
  { key: "salesman-activity",     reportKey: REPORT_KEYS.SALESMAN_ACTIVITY,     label: "Salesman Activity",     icon: EnvironmentOutlined },
];

// Reconcile raw prefs from the backend against the current catalog:
//   - drop unknown keys (report removed from catalog)
//   - append newly-added catalog keys to the end of `order`
//   - de-dup and preserve user-chosen order for the rest
// Callers never touch raw prefs — they always go through this.
export const reconcilePrefs = (raw) => {
  const catalogKeys = REPORT_CATALOG.map((r) => r.key);
  const catalogSet  = new Set(catalogKeys);

  const rawOrder  = Array.isArray(raw?.order)  ? raw.order  : [];
  const rawHidden = Array.isArray(raw?.hidden) ? raw.hidden : [];

  const orderedSet = new Set();
  const order = [];
  for (const k of rawOrder) {
    if (catalogSet.has(k) && !orderedSet.has(k)) {
      order.push(k);
      orderedSet.add(k);
    }
  }
  for (const k of catalogKeys) {
    if (!orderedSet.has(k)) order.push(k);
  }
  const hidden = rawHidden.filter((k) => catalogSet.has(k));
  return { order, hidden };
};

// Read the current user's prefs from userData (populated on login / auth/me).
export const getReportPrefs = (userData) =>
  reconcilePrefs(userData?.report_prefs || {});

// Persist to backend + patch the in-memory userData so consumers reading
// through UserContext see the change immediately.
export const saveReportPrefs = async (setUserData, prefs) => {
  const payload = {
    order:  Array.isArray(prefs?.order)  ? prefs.order  : [],
    hidden: Array.isArray(prefs?.hidden) ? prefs.hidden : [],
  };
  const res = await updateReportPrefs(payload);
  const nextPrefs = res?.report_prefs || payload;
  if (typeof setUserData === "function") {
    setUserData((prev) => ({ ...(prev || {}), report_prefs: nextPrefs }));
  }
  return { ok: !res?.error, prefs: nextPrefs, error: res?.error };
};

export const clearReportPrefs = async (setUserData) => {
  const res = await resetReportPrefsAPI();
  const nextPrefs = res?.report_prefs || {};
  if (typeof setUserData === "function") {
    setUserData((prev) => ({ ...(prev || {}), report_prefs: nextPrefs }));
  }
  return { ok: !res?.error, error: res?.error };
};
