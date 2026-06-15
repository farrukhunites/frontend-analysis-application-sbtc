import React, { useContext, useEffect, useRef, useState } from "react";
import { Form, Input, Button, message, Divider, Skeleton, Radio, DatePicker, Select } from "antd";
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
} from "@ant-design/icons";
import { changePassword, getAdminUsers, adminSetPassword } from "../../../API/Auth";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getAllChannels } from "../../../API/Channels";
import { streamForceRefresh } from "../../../API/ForceRefresh";
import { UserContext } from "../../../App";
import "./style.css";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { userData } = useContext(UserContext);
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

  // Resolve allowed_branches / allowed_products codes → names
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
  }, [userData]);

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
