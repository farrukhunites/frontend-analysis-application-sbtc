// Keep in sync with backend `core/access.py`.
// Empty denied list = full access.

export const PAGE_KEYS = {
  DASHBOARD:           "dashboard",
  CUSTOMER_ANALYSIS:   "customer_analysis",
  SALESMAN_ANALYSIS:   "salesman_analysis",
  REPORTS:             "reports",
  POTENTIAL_CUSTOMERS: "potential_customers",
  MOR:                 "mor",
  USER_ACTIVITY:       "user_activity",
  SETTINGS:            "settings",
};

export const REPORT_KEYS = {
  DAILY_SALES:          "daily_sales",
  MONTHLY_SALES:        "monthly_sales",
  SALESMAN_ACHIEVEMENT: "salesman_achievement",
  CUSTOMER_YOY:         "customer_yoy",
  CHANNEL_ACHIEVEMENT:  "channel_achievement",
  CHANNEL_COVERAGE:     "channel_coverage",
  TARGET_FEASIBILITY:   "target_feasibility",
  RAW_DATA:             "raw_data",
};

export const isPageBlocked = (userData, pageKey) =>
  Array.isArray(userData?.denied_pages) && userData.denied_pages.includes(pageKey);

export const isReportBlocked = (userData, reportKey) =>
  Array.isArray(userData?.denied_reports) && userData.denied_reports.includes(reportKey);
