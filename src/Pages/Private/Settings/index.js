import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Form, Input, Button, message, Divider, Skeleton, Radio, DatePicker, Select, Switch, Tooltip } from "antd";
import dayjs from "dayjs";
import {
  LockOutlined,
  UserOutlined,
  IdcardOutlined,
  BankOutlined,
  AppstoreOutlined,
  ShopOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  ReloadOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { changePassword, getAdminUsers, adminSetPassword } from "../../../API/Auth";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getAllChannels } from "../../../API/Channels";
import { streamForceRefresh } from "../../../API/ForceRefresh";
import { UserContext } from "../../../App";
import { isReportBlocked } from "../../../Utils/access";
import { REPORT_CATALOG, getReportPrefs, saveReportPrefs, clearReportPrefs } from "../../../Utils/reportPrefs";
import "./style.css";

// Sortable row for the Report Preferences card. Drag handle is the leftmost
// icon — clicking the visibility Switch must NOT start a drag, which the
// PointerSensor activationConstraint distance:5 already handles.
const SortableReportRow = ({ entry, index, isHidden, onToggle }) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: entry.key });
  const Icon = entry.icon;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : "auto",
    boxShadow: isDragging ? "0 8px 24px rgba(30, 58, 95, 0.15)" : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`report-prefs-row${isHidden ? " report-prefs-row--hidden" : ""}${isDragging ? " report-prefs-row--dragging" : ""}`}
    >
      <span
        className="report-prefs-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <HolderOutlined />
      </span>
      <span className="report-prefs-position">{index + 1}</span>
      <Icon className="report-prefs-icon" />
      <span className="report-prefs-label">{entry.label}</span>
      <div className="report-prefs-actions">
        <Tooltip title={isHidden ? "Show this report" : "Hide this report"}>
          <Switch
            size="small"
            checked={!isHidden}
            onChange={(checked) => onToggle(entry.key, checked)}
          />
        </Tooltip>
      </div>
    </div>
  );
};

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { userData, setUserData } = useContext(UserContext);
  const [msgAPI, contextHolder] = message.useMessage();

  const [refreshRunning, setRefreshRunning] = useState(false);
  const [refreshLogs, setRefreshLogs] = useState([]);
  const [refreshStatus, setRefreshStatus] = useState(null); // null | "completed" | "failed" | "skipped" | "error"
  const [refreshDuration, setRefreshDuration] = useState(null);
  const [refreshScope, setRefreshScope] = useState("month");
  const [refreshMonth, setRefreshMonth] = useState(() => dayjs());
  const [refreshYear, setRefreshYear] = useState(() => dayjs());
  const logEndRef = useRef(null);
  const abortRef = useRef(null);

  const ESTIMATES = {
    month: "~5–10 min",
    year: "~30–60 min",
  };

  const [branchNames, setBranchNames] = useState([]);
  const [productNames, setProductNames] = useState([]);
  const [channelNames, setChannelNames] = useState([]);
  const [resolving, setResolving] = useState(true);

  // Admin: reset any user's password
  const [adminForm] = Form.useForm();
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminResetLoading, setAdminResetLoading] = useState(false);

  const isAdmin = userData?.role === "admin";

  // Report preferences (order + hidden). Backed by user.report_prefs on the
  // server; local state mirrors userData for fast UI response, and each
  // change is PATCHed to the backend. Reports blocked by admin ACL are
  // excluded from the list — user can't toggle what they don't have access to.
  const [reportPrefs, setReportPrefs] = useState(() => getReportPrefs(userData));
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Rehydrate from userData only when content actually changes. Skipping
  // no-op updates avoids an extra render + SortableContext items array
  // rebuild after every save, which was showing up as a subtle flicker.
  useEffect(() => {
    const next = getReportPrefs(userData);
    setReportPrefs((prev) => {
      const same =
        prev.order.length === next.order.length &&
        prev.hidden.length === next.hidden.length &&
        prev.order.every((k, i) => k === next.order[i]) &&
        prev.hidden.every((k, i) => k === next.hidden[i]);
      return same ? prev : next;
    });
  }, [userData]);

  const orderedReports = useMemo(() => {
    const byKey = new Map(REPORT_CATALOG.map((r) => [r.key, r]));
    return reportPrefs.order
      .map((k) => byKey.get(k))
      .filter(Boolean)
      .filter((r) => !isReportBlocked(userData, r.reportKey));
  }, [reportPrefs.order, userData]);

  const persistPrefs = async (next) => {
    setReportPrefs(next);           // optimistic
    setPrefsSaving(true);
    const res = await saveReportPrefs(setUserData, next);
    setPrefsSaving(false);
    if (!res.ok) {
      msgAPI.error("Failed to save report preferences");
      // Rehydrate from server truth so UI doesn't lie about what got saved.
      setReportPrefs(getReportPrefs(userData));
    }
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Visible list can be a subset of order[] (admin-blocked keys are hidden
    // from the UI). Reorder only within the visible subset, then splice back
    // into the full order preserving the blocked keys' original positions.
    const visibleKeys = orderedReports.map((r) => r.key);
    const oldVIdx = visibleKeys.indexOf(active.id);
    const newVIdx = visibleKeys.indexOf(over.id);
    if (oldVIdx < 0 || newVIdx < 0) return;
    const newVisible = arrayMove(visibleKeys, oldVIdx, newVIdx);

    const visibleSet = new Set(visibleKeys);
    let cursor = 0;
    const nextOrder = reportPrefs.order.map((k) =>
      visibleSet.has(k) ? newVisible[cursor++] : k
    );
    persistPrefs({ ...reportPrefs, order: nextOrder });
  };

  const toggleReportVisible = (key, visible) => {
    const hiddenSet = new Set(reportPrefs.hidden);
    if (visible) hiddenSet.delete(key);
    else hiddenSet.add(key);
    persistPrefs({ ...reportPrefs, hidden: Array.from(hiddenSet) });
  };

  const resetReportPrefs = async () => {
    setPrefsSaving(true);
    const res = await clearReportPrefs(setUserData);
    setPrefsSaving(false);
    if (res.ok) {
      msgAPI.success("Report preferences reset to default");
    } else {
      msgAPI.error("Failed to reset report preferences");
    }
  };

  const visibleReportsCount = orderedReports.filter(
    (r) => !reportPrefs.hidden.includes(r.key)
  ).length;

  useEffect(() => {
    if (!isAdmin) return;
    setAdminUsersLoading(true);
    getAdminUsers()
      .then((res) => setAdminUsers(res?.results || []))
      .finally(() => setAdminUsersLoading(false));
  }, [isAdmin]);

  const onAdminResetPassword = async (values) => {
    setAdminResetLoading(true);
    const res = await adminSetPassword(values);
    if (Math.floor(res?.status / 100) === 2) {
      msgAPI.success(res?.data?.message || "Password updated successfully!");
      adminForm.resetFields();
    } else {
      msgAPI.error(res?.data?.error || "Failed to update password");
    }
    setAdminResetLoading(false);
  };

  // Resolve allowed_branches / allowed_products codes → names.
  // Dep key intentionally excludes unrelated userData fields (e.g. report_prefs)
  // so PATCHing prefs elsewhere in this page doesn't retrigger the resolver
  // and flash the profile skeleton.
  const aclKey = JSON.stringify({
    b: userData?.allowed_branches ?? null,
    p: userData?.allowed_products ?? null,
    c: userData?.allowed_channels ?? null,
  });
  useEffect(() => {
    const resolveCodes = async () => {
      setResolving(true);
      try {
        const [branchRes, productRes, channelRes] = await Promise.all([
          getAllBranches(),
          getAllProducts(),
          getAllChannels(),
        ]);

        const allBranches = branchRes?.results || [];
        const allProducts = productRes?.results || [];
        const allChannels = channelRes?.results || [];

        const allowedBranchCodes = Array.isArray(userData?.allowed_branches)
          ? userData.allowed_branches
          : [];

        const allowedProductCodes = Array.isArray(userData?.allowed_products)
          ? userData.allowed_products
          : [];

        const allowedChannelCodes = Array.isArray(userData?.allowed_channels)
          ? userData.allowed_channels
          : [];

        if (allowedBranchCodes.length === 0) {
          setBranchNames(["All Branches"]);
        } else {
          const names = allowedBranchCodes.map(
            (code) => allBranches.find((b) => b.code === code)?.name || code
          );
          setBranchNames(names);
        }

        if (allowedProductCodes.length === 0) {
          setProductNames(["All Products"]);
        } else {
          const names = allowedProductCodes.map(
            (code) => allProducts.find((p) => p.code === code)?.name || code
          );
          setProductNames(names);
        }

        if (allowedChannelCodes.length === 0) {
          setChannelNames(["All Channels"]);
        } else {
          const names = allowedChannelCodes.map(
            (name) => allChannels.find((c) => c.name === name)?.name || name
          );
          setChannelNames(names);
        }
      } catch {
        setBranchNames(
          Array.isArray(userData?.allowed_branches)
            ? userData.allowed_branches
            : ["All Branches"]
        );
        setProductNames(
          Array.isArray(userData?.allowed_products)
            ? userData.allowed_products
            : ["All Products"]
        );
        setChannelNames(
          Array.isArray(userData?.allowed_channels)
            ? userData.allowed_channels
            : ["All Channels"]
        );
      } finally {
        setResolving(false);
      }
    };

    if (userData) resolveCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aclKey]);

  // Auto-scroll log console to bottom on new entries
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [refreshLogs]);

  const handleForceRefresh = () => {
    const scopeArg =
      refreshScope === "year"
        ? { scope: "year", year: refreshYear.format("YYYY") }
        : { scope: "month", month: refreshMonth.format("YYYYMM") };

    setRefreshRunning(true);
    setRefreshLogs([]);
    setRefreshStatus(null);
    setRefreshDuration(null);

    abortRef.current = streamForceRefresh(
      (log) => setRefreshLogs((prev) => [...prev, log]),
      (status, duration) => {
        setRefreshStatus(status);
        setRefreshDuration(duration);
        setRefreshRunning(false);
      },
      scopeArg,
    );
  };

  const refreshTargetLabel =
    refreshScope === "year"
      ? `year ${refreshYear.format("YYYY")}`
      : refreshMonth.format("MMMM YYYY");

  const onFinish = async (values) => {
    setLoading(true);
    const res = await changePassword(values);
    if (Math.floor(res?.status / 100) === 2) {
      msgAPI.success("Password updated successfully!");
      form.resetFields();
    } else {
      msgAPI.error(res?.data?.error || "Failed to update password");
    }
    setLoading(false);
  };

  const initials = userData?.name
    ? userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="settings-page">
      {contextHolder}

      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account preferences</p>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card">
          <div className="card-section-header">
            <div className="section-icon">
              <UserOutlined />
            </div>
            <div>
              <div className="section-title">Profile</div>
              <div className="section-desc">Your account information</div>
            </div>
          </div>
          <Divider style={{ margin: "16px 0" }} />

          <div className="profile-avatar-row">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{userData?.name || "—"}</div>
              <div className="profile-position">{userData?.position || "—"}</div>
            </div>
          </div>

          <div className="profile-info-list">
            <div className="info-row">
              <IdcardOutlined className="info-icon" />
              <div>
                <div className="info-label">Employee Code</div>
                <div className="info-value">{userData?.employee_code || "—"}</div>
              </div>
            </div>

            <div className="info-row">
              <BankOutlined className="info-icon" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="info-label">Allowed Branches</div>
                {resolving
                  ? <Skeleton active title={false} paragraph={{ rows: 1, width: "80%" }} style={{ marginTop: 8 }} />
                  : <div className="info-tags">
                      {branchNames.map((name) => (
                        <span key={name} className="info-tag info-tag--branch">{name}</span>
                      ))}
                    </div>}
              </div>
            </div>

            <div className="info-row">
              <AppstoreOutlined className="info-icon" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="info-label">Allowed Products</div>
                {resolving
                  ? <Skeleton active title={false} paragraph={{ rows: 1, width: "60%" }} style={{ marginTop: 8 }} />
                  : <div className="info-tags">
                      {productNames.map((name) => (
                        <span key={name} className="info-tag info-tag--product">{name}</span>
                      ))}
                    </div>}
              </div>
            </div>

            <div className="info-row">
              <ShopOutlined className="info-icon" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="info-label">Allowed Channels</div>
                {resolving
                  ? <Skeleton active title={false} paragraph={{ rows: 1, width: "70%" }} style={{ marginTop: 8 }} />
                  : <div className="info-tags">
                      {channelNames.map((name) => (
                        <span key={name} className="info-tag info-tag--channel">{name}</span>
                      ))}
                    </div>}
              </div>
            </div>

            <div className="info-row">
              <TeamOutlined className="info-icon" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="info-label">Allowed Salesmen</div>
                <div className="info-tags">
                  {(() => {
                    const codes = Array.isArray(userData?.allowed_salesmen)
                      ? userData.allowed_salesmen
                      : [];
                    if (codes.length === 0) {
                      return <span className="info-tag info-tag--salesman">All Salesmen</span>;
                    }
                    return codes.map((code) => (
                      <span key={code} className="info-tag info-tag--salesman">{code}</span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="settings-card">
          <div className="card-section-header">
            <div className="section-icon security">
              <LockOutlined />
            </div>
            <div>
              <div className="section-title">Security</div>
              <div className="section-desc">Update your password</div>
            </div>
          </div>
          <Divider style={{ margin: "16px 0" }} />

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="old_password"
              label="Current Password"
              rules={[{ required: true, message: "Please enter current password" }]}
            >
              <Input.Password size="large" placeholder="Enter current password" />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[{ required: true, message: "Please enter new password" }]}
            >
              <Input.Password size="large" placeholder="Enter new password" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm Password"
              rules={[
                { required: true, message: "Please confirm new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("new_password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject("Passwords do not match");
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Re-enter new password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ marginTop: 8 }}
            >
              Update Password
            </Button>
          </Form>
        </div>
      </div>

      {/* Report Preferences: drag to reorder + toggle to hide (per-user, synced) */}
      <div className="settings-card settings-card--full" style={{ marginTop: 20 }}>
        <div className="card-section-header">
          <div className="section-icon reports">
            <FileTextOutlined />
          </div>
          <div style={{ flex: 1 }}>
            <div className="section-title">Report Preferences</div>
            <div className="section-desc">
              Drag to reorder by priority or toggle off the ones you don't use. Synced to your account.
            </div>
          </div>
          <Tooltip title="Reset to default order and show all">
            <Button
              icon={<ReloadOutlined />}
              onClick={resetReportPrefs}
              size="small"
              loading={prefsSaving}
            >
              Reset
            </Button>
          </Tooltip>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {orderedReports.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
            You don't have access to any reports.
          </div>
        ) : (
          <>
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedReports.map((r) => r.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="report-prefs-list">
                  {orderedReports.map((r, idx) => (
                    <SortableReportRow
                      key={r.key}
                      entry={r}
                      index={idx}
                      isHidden={reportPrefs.hidden.includes(r.key)}
                      onToggle={toggleReportVisible}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="report-prefs-footer">
              <span>
                Showing <b>{visibleReportsCount}</b> of <b>{orderedReports.length}</b> reports
              </span>
              <span>{prefsSaving ? "Saving…" : "Changes are saved automatically."}</span>
            </div>
          </>
        )}
      </div>

      {/* Admin-only: reset password for any user */}
      {isAdmin && (
        <div className="settings-card settings-card--full" style={{ marginTop: 20 }}>
          <div className="card-section-header">
            <div className="section-icon admin">
              <TeamOutlined />
            </div>
            <div>
              <div className="section-title">Reset User Password</div>
              <div className="section-desc">Set a new password for any user (admin only)</div>
            </div>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          <Form
            form={adminForm}
            layout="vertical"
            onFinish={onAdminResetPassword}
            style={{ maxWidth: 560 }}
          >
            <Form.Item
              name="user_id"
              label="User"
              rules={[{ required: true, message: "Please select a user" }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Search by name, username, or employee code"
                loading={adminUsersLoading}
                optionFilterProp="label"
                options={adminUsers.map((u) => ({
                  value: u.id,
                  label: `${u.name || u.username} · ${u.username}${u.employee_code ? ` · ${u.employee_code}` : ""}${u.role === "admin" ? " · admin" : ""}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[
                { required: true, message: "Please enter new password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password size="large" placeholder="Enter new password" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm Password"
              dependencies={["new_password"]}
              rules={[
                { required: true, message: "Please confirm new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("new_password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject("Passwords do not match");
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Re-enter new password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={adminResetLoading}
              size="large"
              style={{ marginTop: 8 }}
            >
              Reset Password
            </Button>
          </Form>
        </div>
      )}

      {/* Admin-only: Force Refresh */}
      {userData?.role === "admin" && (
        <div className="settings-card settings-card--full" style={{ marginTop: 20 }}>
          <div className="card-section-header">
            <div className="section-icon admin">
              <SyncOutlined spin={refreshRunning} />
            </div>
            <div>
              <div className="section-title">Force Refresh</div>
              <div className="section-desc">Manually rebuild aggregates for a specific month or year (admin only)</div>
            </div>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          <div className="refresh-controls">
            <div className="refresh-control-row">
              <span className="refresh-control-label">Scope</span>
              <Radio.Group
                value={refreshScope}
                onChange={(e) => setRefreshScope(e.target.value)}
                disabled={refreshRunning}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "Month", value: "month" },
                  { label: "Year",  value: "year"  },
                ]}
              />
            </div>

            <div className="refresh-control-row">
              <span className="refresh-control-label">
                {refreshScope === "year" ? "Year" : "Month"}
              </span>
              {refreshScope === "year" ? (
                <DatePicker
                  picker="year"
                  value={refreshYear}
                  onChange={(d) => d && setRefreshYear(d)}
                  disabled={refreshRunning}
                  allowClear={false}
                  style={{ width: 160 }}
                />
              ) : (
                <DatePicker
                  picker="month"
                  value={refreshMonth}
                  onChange={(d) => d && setRefreshMonth(d)}
                  disabled={refreshRunning}
                  allowClear={false}
                  format="MMM YYYY"
                  style={{ width: 160 }}
                />
              )}
            </div>

            <div className="refresh-control-row refresh-estimate">
              <ClockCircleOutlined />
              <span>
                Estimated time: <b>{ESTIMATES[refreshScope]}</b> — rebuilding {refreshTargetLabel}
              </span>
            </div>

            <Button
              type="primary"
              danger={refreshStatus === "failed" || refreshStatus === "error"}
              loading={refreshRunning}
              disabled={refreshRunning}
              onClick={handleForceRefresh}
              icon={<SyncOutlined />}
              size="large"
            >
              {refreshRunning ? "Running..." : `Run Refresh (${refreshTargetLabel})`}
            </Button>
          </div>

          {(refreshLogs.length > 0 || refreshRunning) && (
            <>
              <Divider style={{ margin: "16px 0" }} />
              <div className="refresh-console">
                {refreshLogs.map((log, idx) => (
                  <div key={idx} className={`refresh-log refresh-log--${log.level}`}>
                    <span className="refresh-log-text">{log.message}</span>
                  </div>
                ))}
                {refreshRunning && (
                  <div className="refresh-log refresh-log--info">
                    <span className="refresh-log-cursor">█</span>
                  </div>
                )}
                <div ref={logEndRef} />
              </div>
              {refreshStatus && !refreshRunning && (
                <div className={`refresh-status refresh-status--${refreshStatus}`}>
                  {refreshStatus === "completed" && `✓ Refresh completed successfully${refreshDuration ? ` — ${refreshDuration}` : ""}`}
                  {refreshStatus === "skipped" && `⚠ No new data — pipeline skipped${refreshDuration ? ` — ${refreshDuration}` : ""}`}
                  {(refreshStatus === "failed" || refreshStatus === "error") && `✗ Refresh failed — check logs above${refreshDuration ? ` — ${refreshDuration}` : ""}`}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
