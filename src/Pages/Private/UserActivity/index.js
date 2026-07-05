import { useContext, useEffect, useMemo, useState } from "react";
import {
  Table, Input, Select, Skeleton, message, Tag, Empty, Card, Tooltip, Modal, Button,
} from "antd";
import {
  UserOutlined, LoginOutlined, ApiOutlined, TeamOutlined, SearchOutlined,
  ThunderboltOutlined, ClockCircleOutlined, DashboardOutlined, HourglassOutlined,
} from "@ant-design/icons";
import { Navigate } from "react-router-dom";
import { UserContext } from "../../../App";
import { getUserActivity } from "../../../API/UserActivity";
import "./style.css";

const fmtNum = (v) =>
  v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

// Human-friendly duration formatter — ms for anything under 1 s so tiny
// endpoints don't read as "0.03 s", seconds thereafter.
const fmtMs = (v) => {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)} s`;
};

// Tiered color: green fast, amber medium, red slow. Used by both the
// duration column and the slowest-endpoints chart bars.
const durationColor = (ms) => {
  if (ms == null) return "#64748B";
  if (ms < 300) return "#10B981";
  if (ms < 1000) return "#F59E0B";
  if (ms < 3000) return "#F97316";
  return "#EF4444";
};

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

const StatCard = ({ icon, label, value, accent, display, hint }) => (
  <div className="activity-stat-card">
    <div className="activity-stat-icon" style={{ background: `${accent}1A`, color: accent }}>
      {icon}
    </div>
    <div>
      <div className="activity-stat-label">{label}</div>
      <div className="activity-stat-value">{display ?? fmtNum(value)}</div>
      {hint ? <div className="activity-stat-hint">{hint}</div> : null}
    </div>
  </div>
);

const TopBar = ({ items, getLabel, getCount, colorFor, formatCount }) => {
  const max = Math.max(...items.map(getCount), 1);
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />;
  const fmt = formatCount || fmtNum;
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
            <div className="activity-bar-count">{fmt(c)}</div>
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
  const [allUsersModal, setAllUsersModal] = useState({ open: false, scope: "today" });

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
      width: 110,
      align: "right",
      sorter: (a, b) => (a.duration_ms || 0) - (b.duration_ms || 0),
      render: (v) => (
        <span
          style={{
            fontSize: 12,
            color: durationColor(v),
            fontWeight: v >= 1000 ? 600 : 500,
          }}
        >
          {fmtMs(v)}
        </span>
      ),
    },
  ], []);

  if (!isAdmin) return <Navigate to="/" replace />;

  const summary = data?.summary || {};
  const topUsersToday = data?.top_users_today || [];
  const topUsers3d    = data?.top_users_3d    || [];
  const topEndpoints = data?.top_endpoints || [];
  const slowestEndpoints = data?.slowest_endpoints || [];
  const recent = data?.recent || { results: [], total: 0 };

  const modalUsers = allUsersModal.scope === "today" ? topUsersToday : topUsers3d;
  const modalLabel = allUsersModal.scope === "today" ? "Today" : "Last 3 Days";

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

          {/* Latency stats — separate row so the query-count numbers stay
              visually distinct from the timing metrics. Login endpoint is
              excluded server-side (password hashing skews the picture). */}
          <div className="activity-stats-row activity-stats-row-latency">
            <StatCard
              icon={<ClockCircleOutlined />}
              label="Avg Query Time (Today)"
              display={fmtMs(summary.avg_ms_today)}
              accent={durationColor(summary.avg_ms_today)}
              hint="Mean response time across all API calls today"
            />
            <StatCard
              icon={<DashboardOutlined />}
              label="Avg Query Time (7d)"
              display={fmtMs(summary.avg_ms_7d)}
              accent={durationColor(summary.avg_ms_7d)}
              hint="Rolling 7-day mean"
            />
            <StatCard
              icon={<HourglassOutlined />}
              label="P95 Latency (7d)"
              display={fmtMs(summary.p95_ms_7d)}
              accent={durationColor(summary.p95_ms_7d)}
              hint="95% of requests finish under this"
            />
            <StatCard
              icon={<HourglassOutlined />}
              label="P99 Latency (7d)"
              display={fmtMs(summary.p99_ms_7d)}
              accent={durationColor(summary.p99_ms_7d)}
              hint="Tail latency — worst 1% cutoff"
            />
            <StatCard
              icon={<ThunderboltOutlined />}
              label="Slowest Call (7d)"
              display={fmtMs(summary.max_ms_7d)}
              accent={durationColor(summary.max_ms_7d)}
              hint="Single slowest request observed"
            />
          </div>

          <div className="activity-charts-row">
            <Card
              title={<span><UserOutlined /> Top {Math.min(5, topUsersToday.length)} Users (Today)</span>}
              size="small"
              className="activity-chart-card"
              extra={topUsersToday.length > 5 ? (
                <Button type="link" size="small" onClick={() => setAllUsersModal({ open: true, scope: "today" })}>
                  View all ({topUsersToday.length})
                </Button>
              ) : null}
            >
              <TopBar
                items={topUsersToday.slice(0, 5)}
                getLabel={(u) => u.username || "anonymous"}
                getCount={(u) => u.call_count}
              />
            </Card>

            <Card
              title={<span><UserOutlined /> Top {Math.min(5, topUsers3d.length)} Users (3d)</span>}
              size="small"
              className="activity-chart-card"
              extra={topUsers3d.length > 5 ? (
                <Button type="link" size="small" onClick={() => setAllUsersModal({ open: true, scope: "3d" })}>
                  View all ({topUsers3d.length})
                </Button>
              ) : null}
            >
              <TopBar
                items={topUsers3d.slice(0, 5)}
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
                  <Tooltip title={`${e.path} · avg ${fmtMs(e.avg_ms)}`}>
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

          {/* Latency-focused chart row: ranks endpoints by AVG duration so
              slow-but-rarely-called routes surface (they'd be invisible in
              the top-by-count list above). */}
          <div className="activity-charts-row activity-charts-row-single">
            <Card
              title={
                <span>
                  <HourglassOutlined /> Slowest Endpoints by Avg Duration (7d)
                </span>
              }
              size="small"
              className="activity-chart-card"
              extra={
                <span style={{ fontSize: 11, color: "#94A3B8" }}>
                  min 3 calls · login excluded
                </span>
              }
            >
              {slowestEndpoints.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No endpoints qualify yet"
                />
              ) : (
                <TopBar
                  items={slowestEndpoints}
                  getLabel={(e) => (
                    <Tooltip
                      title={
                        <div>
                          <div>{e.path}</div>
                          <div>Avg: {fmtMs(e.avg_ms)}</div>
                          <div>Max: {fmtMs(e.max_ms)}</div>
                          <div>Calls: {fmtNum(e.call_count)}</div>
                        </div>
                      }
                    >
                      <span>
                        <Tag color={methodColor(e.method)} style={{ marginRight: 6 }}>
                          {e.method}
                        </Tag>
                        <code style={{ fontSize: 11 }}>
                          {e.path.replace(/^\/api\//, "")}
                        </code>
                      </span>
                    </Tooltip>
                  )}
                  getCount={(e) => e.avg_ms}
                  formatCount={(v) => fmtMs(v)}
                  colorFor={(e) => durationColor(e.avg_ms)}
                />
              )}
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

          <Modal
            open={allUsersModal.open}
            onCancel={() => setAllUsersModal({ open: false, scope: allUsersModal.scope })}
            footer={null}
            width={620}
            title={
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  <UserOutlined /> All Active Users ({modalLabel})
                </div>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
                  {modalUsers.length} user{modalUsers.length !== 1 ? "s" : ""} ranked by API call count
                </div>
              </div>
            }
            destroyOnClose
          >
            <Table
              size="small"
              bordered
              rowKey={(r) => r.username || "anonymous"}
              dataSource={modalUsers}
              pagination={{ pageSize: 15, size: "small", showSizeChanger: false }}
              scroll={{ y: 420 }}
              columns={[
                {
                  title: "#", width: 50, align: "center",
                  render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span>,
                },
                {
                  title: "User", dataIndex: "username",
                  render: (v) => v
                    ? <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>
                    : <span style={{ color: "#CBD5E1" }}>anonymous</span>,
                },
                {
                  title: "API Calls", dataIndex: "call_count", width: 140, align: "right",
                  sorter: (a, b) => a.call_count - b.call_count,
                  defaultSortOrder: "descend",
                  render: (v) => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span>,
                },
              ]}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default UserActivity;
