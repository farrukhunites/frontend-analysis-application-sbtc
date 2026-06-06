import { useContext, useEffect, useMemo, useState } from "react";
import {
  Table, Input, Select, Skeleton, message, Tag, Empty, Card, Tooltip,
} from "antd";
import {
  UserOutlined, LoginOutlined, ApiOutlined, TeamOutlined, SearchOutlined,
} from "@ant-design/icons";
import { Navigate } from "react-router-dom";
import { UserContext } from "../../../App";
import { getUserActivity } from "../../../API/UserActivity";
import "./style.css";

const fmtNum = (v) =>
  v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtTs = (ts) => {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const methodColor = (m) =>
  ({ GET: "blue", POST: "green", PUT: "orange", PATCH: "gold", DELETE: "red" }[m] || "default");

const statusColor = (s) => {
  if (s >= 500) return "red";
  if (s >= 400) return "orange";
  if (s >= 300) return "geekblue";
  return "green";
};

const StatCard = ({ icon, label, value, accent }) => (
  <div className="activity-stat-card">
    <div className="activity-stat-icon" style={{ background: `${accent}1A`, color: accent }}>
      {icon}
    </div>
    <div>
      <div className="activity-stat-label">{label}</div>
      <div className="activity-stat-value">{fmtNum(value)}</div>
    </div>
  </div>
);

const TopBar = ({ items, getLabel, getCount, colorFor }) => {
  const max = Math.max(...items.map(getCount), 1);
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />;
  return (
    <div className="activity-bar-list">
      {items.map((it, i) => {
        const c = getCount(it);
        const pct = (c / max) * 100;
        return (
          <div key={i} className="activity-bar-row">
            <div className="activity-bar-label">{getLabel(it)}</div>
            <div className="activity-bar-track">
              <div
                className="activity-bar-fill"
                style={{ width: `${pct}%`, background: colorFor ? colorFor(it) : "#3B82F6" }}
              />
            </div>
            <div className="activity-bar-count">{fmtNum(c)}</div>
          </div>
        );
      })}
    </div>
  );
};

const UserActivity = () => {
  const { userData } = useContext(UserContext);
  const isAdmin = userData?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [userFilter, setUserFilter] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getUserActivity({ days, user: userFilter, path: pathFilter, page, pageSize }).then((res) => {
      if (res?.error) message.error("Failed to load activity");
      else setData(res);
      setLoading(false);
    });
  }, [isAdmin, days, userFilter, pathFilter, page, pageSize]);

  const columns = useMemo(() => [
    {
      title: "Time", dataIndex: "timestamp", width: 200,
      render: (v) => <span style={{ fontSize: 12, color: "#475569" }}>{fmtTs(v)}</span>,
    },
    {
      title: "User", dataIndex: "username", width: 160,
      render: (v) => v ? (
        <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>
      ) : <span style={{ color: "#CBD5E1" }}>anonymous</span>,
    },
    {
      title: "IP", dataIndex: "ip", width: 140,
      render: (v) => v ? <code style={{ fontSize: 11 }}>{v}</code> : <span style={{ color: "#CBD5E1" }}>-</span>,
    },
    {
      title: "Method", dataIndex: "method", width: 90, align: "center",
      render: (v) => <Tag color={methodColor(v)} style={{ margin: 0, fontWeight: 600 }}>{v}</Tag>,
    },
    {
      title: "Endpoint", dataIndex: "path",
      render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: "Status", dataIndex: "status_code", width: 90, align: "center",
      render: (v) => <Tag color={statusColor(v)} style={{ margin: 0 }}>{v}</Tag>,
    },
    {
      title: "Duration",
      dataIndex: "duration_ms",
      width: 100,
      align: "right",
      render: (v) => <span style={{ fontSize: 12, color: "#64748B" }}>{v} ms</span>,
    },
  ], []);

  if (!isAdmin) return <Navigate to="/" replace />;

  const summary = data?.summary || {};
  const topUsers = data?.top_users || [];
  const topEndpoints = data?.top_endpoints || [];
  const recent = data?.recent || { results: [], total: 0 };

  return (
    <div className="user-activity-page">
      <div className="settings-header">
        <h1 className="settings-title">User Activity</h1>
        <p className="settings-subtitle">Audit log of every authenticated API call (admin only)</p>
      </div>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          <div className="activity-stats-row">
            <StatCard icon={<LoginOutlined />} label="Logins Today" value={summary.logins_today} accent="#3B82F6" />
            <StatCard icon={<LoginOutlined />} label="Logins (7d)" value={summary.logins_7d} accent="#6366F1" />
            <StatCard icon={<ApiOutlined />}   label="API Calls Today" value={summary.calls_today} accent="#10B981" />
            <StatCard icon={<ApiOutlined />}   label="API Calls (7d)" value={summary.calls_7d} accent="#F59E0B" />
            <StatCard icon={<TeamOutlined />}  label="Active Users (7d)" value={summary.active_users_7d} accent="#EF4444" />
          </div>

          <div className="activity-charts-row">
            <Card
              title={<span><UserOutlined /> Top 5 Users (7d)</span>}
              size="small"
              className="activity-chart-card"
            >
              <TopBar
                items={topUsers}
                getLabel={(u) => u.username || "anonymous"}
                getCount={(u) => u.call_count}
              />
            </Card>

            <Card
              title={<span><ApiOutlined /> Top 10 Endpoints (7d)</span>}
              size="small"
              className="activity-chart-card"
            >
              <TopBar
                items={topEndpoints}
                getLabel={(e) => (
                  <Tooltip title={e.path}>
                    <span>
                      <Tag color={methodColor(e.method)} style={{ marginRight: 6 }}>{e.method}</Tag>
                      <code style={{ fontSize: 11 }}>{e.path.replace(/^\/api\//, "")}</code>
                    </span>
                  </Tooltip>
                )}
                getCount={(e) => e.call_count}
                colorFor={() => "#6366F1"}
              />
            </Card>
          </div>

          <Card
            size="small"
            className="activity-table-card"
            title={
              <div className="activity-filters">
                <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</span>
                <Input
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Filter by user"
                  value={userFilter}
                  onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                  style={{ width: 180 }}
                  allowClear
                />
                <Input
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Filter by endpoint"
                  value={pathFilter}
                  onChange={(e) => { setPathFilter(e.target.value); setPage(1); }}
                  style={{ width: 220 }}
                  allowClear
                />
                <Select
                  size="small"
                  value={days}
                  onChange={(v) => { setDays(v); setPage(1); }}
                  style={{ width: 120 }}
                  options={[
                    { value: 1,  label: "Last 24h" },
                    { value: 7,  label: "Last 7 days" },
                    { value: 30, label: "Last 30 days" },
                    { value: 90, label: "Last 90 days" },
                  ]}
                />
              </div>
            }
          >
            <Table
              size="small"
              bordered
              rowKey="id"
              loading={loading}
              dataSource={recent.results}
              columns={columns}
              pagination={{
                current: page,
                pageSize,
                total: recent.total,
                showSizeChanger: true,
                pageSizeOptions: [25, 50, 100, 200],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                size: "small",
              }}
              scroll={{ x: "max-content", y: "50vh" }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default UserActivity;
