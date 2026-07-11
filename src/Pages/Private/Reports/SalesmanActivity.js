import { useEffect, useState } from "react";
import { Table, Skeleton, Space, Select, message, Empty, Segmented, DatePicker, Modal, Tabs, Tag, Button, Divider } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllBranches } from "../../../API/Branches";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import {
  getSalesmanActivity,
  getSalesmanActivityCustomers,
  getSalesmanActivityPeriodCustomers,
} from "../../../API/Reports";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./reports.css";

// Inline SAR chip: <RiyalIcon /> + formatted number, matching dashboard style.
const SarValue = ({ v, size = 11, color = "#64748B", weight = 400 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color, fontWeight: weight }}>
    <RiyalIcon width={size} height={size} color={color} />
    {v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}
  </span>
);

// Blue clickable numeric cell for drill-down entry points.
const ClickableNum = ({ v, onClick, digits = 0, disabled = false }) => {
  if (disabled || v == null || v === 0) return <NumCell v={v} digits={digits} />;
  return (
    <span
      onClick={onClick}
      style={{
        cursor: "pointer",
        color: "#2563EB",
        fontWeight: 600,
        textDecoration: "underline dotted",
        fontSize: 12,
      }}
      title="Click to see customer list"
    >
      {Number(v).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}
    </span>
  );
};

// Clickable numeric cell that preserves NumCell's plain styling (no colour
// or underline change) — just adds a pointer cursor and click handler.
const PlainClickableNum = ({ v, onClick, digits = 0 }) => {
  if (v == null || v === 0) return <NumCell v={v} digits={digits} />;
  return (
    <span onClick={onClick} style={{ cursor: "pointer" }} title="Click to see customers">
      <NumCell v={v} digits={digits} />
    </span>
  );
};

// Percent-cell colouring. Thresholds are conservative defaults — tune per KPI.
const pctTone = (v, { good = 90, ok = 70 } = {}) => {
  if (v == null || !isFinite(v)) return { color: "#94A3B8", bg: "transparent" };
  if (v >= good) return { color: "#059669", bg: "rgba(16,185,129,0.14)" };
  if (v >= ok)   return { color: "#B45309", bg: "rgba(245,158,11,0.16)" };
  return { color: "#DC2626", bg: "rgba(239,68,68,0.14)" };
};

const PctCell = ({ v, thresholds }) => {
  const t = pctTone(v, thresholds);
  return (
    <span
      style={{
        color: t.color,
        background: t.bg,
        padding: "2px 8px",
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 11,
        display: "inline-block",
        minWidth: 52,
        textAlign: "center",
      }}
    >
      {v == null || !isFinite(v) ? "—" : `${v.toFixed(1)}%`}
    </span>
  );
};

const NumCell = ({ v, digits = 0 }) => (
  <span style={{ fontSize: 12 }}>
    {v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}
  </span>
);

// Weighted-score cell: colour tone by ratio (v / max) using the same
// thresholds as PctCell so the whole report reads consistently.
const ScoreCell = ({ v, max, bold = false }) => {
  if (v == null || !isFinite(v)) return <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>;
  const pct = max ? (v / max) * 100 : 0;
  const t = pctTone(pct, { good: 90, ok: 70 });
  return (
    <span
      style={{
        color: t.color,
        background: t.bg,
        padding: "2px 8px",
        borderRadius: 12,
        fontWeight: bold ? 700 : 600,
        fontSize: bold ? 12 : 11,
        display: "inline-block",
        minWidth: 46,
        textAlign: "center",
      }}
    >
      {v.toFixed(1)}
    </span>
  );
};

const MinCell = ({ v }) => (
  <span style={{ fontSize: 12 }}>
    {v == null ? "—" : `${v.toFixed(1)} `}<span style={{ color: "#64748B", fontSize: 10 }}>min</span>
  </span>
);

// Renders minutes as "Xh Ym" when ≥ 60, else "N min". Useful for full-day totals.
const HoursMinCell = ({ v }) => {
  if (v == null) return <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>;
  if (v < 60) {
    return (
      <span style={{ fontSize: 12 }}>
        {v.toFixed(0)} <span style={{ color: "#64748B", fontSize: 10 }}>min</span>
      </span>
    );
  }
  const h = Math.floor(v / 60);
  const m = Math.round(v - h * 60);
  return (
    <span style={{ fontSize: 12 }}>
      {h}<span style={{ color: "#64748B", fontSize: 10 }}>h</span>{" "}
      {m}<span style={{ color: "#64748B", fontSize: 10 }}>m</span>
    </span>
  );
};

const MoneyCell = ({ v }) => (
  <span style={{ fontSize: 12, fontWeight: 500 }}>
    {v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}
  </span>
);

const fmtTime = (iso) => (iso ? dayjs(iso).format("HH:mm") : "—");

// Minutes between two ISO timestamps, or null if either is missing / invalid / negative.
const durationMin = (inIso, outIso) => {
  if (!inIso || !outIso) return null;
  const mins = dayjs(outIso).diff(dayjs(inIso), "minute", true);
  return mins >= 0 ? mins : null;
};

const DurationCell = ({ inIso, outIso }) => {
  const m = durationMin(inIso, outIso);
  if (m == null) return <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>;
  const color = m < 5 ? "#DC2626" : m < 10 ? "#B45309" : "#059669";
  return (
    <span style={{ fontSize: 12, color, fontWeight: 500 }}>
      {m.toFixed(1)} <span style={{ color: "#64748B", fontSize: 10, fontWeight: 400 }}>min</span>
    </span>
  );
};

// ── Drill modal for Daily-mode Sales cell ─────────────────────────────────
const DrillModal = ({ open, onClose, date, salesman, branchScope }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !salesman || !date) return;
    setLoading(true);
    getSalesmanActivityCustomers({
      date:        date.format("YYYY-MM-DD"),
      salesmanCd:  salesman.salesman_code,
      branchCodes: branchScope,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load breakdown");
        setData(null);
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [open, salesman, date, branchScope]);

  const custSubtitle = (r) => {
    const parts = [r.cust_cd];
    if (r.channel)  parts.push(r.channel);
    if (r.branch_nm || r.branch_cd) parts.push(r.branch_nm || r.branch_cd);
    return parts.join(" · ");
  };

  const visitedCols = [
    {
      title: "Customer",
      dataIndex: "cust_nm",
      key: "cust_nm",
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>{custSubtitle(r)}</div>
        </div>
      ),
    },
    { title: "In",  dataIndex: "visit_in_dt",  key: "in",  width: 70, align: "center", render: (v) => <span style={{ fontSize: 12 }}>{fmtTime(v)}</span> },
    { title: "Out", dataIndex: "visit_out_dt", key: "out", width: 70, align: "center", render: (v) => <span style={{ fontSize: 12 }}>{fmtTime(v)}</span> },
    { title: "Time in Outlet", key: "duration", width: 110, align: "center",
      render: (_, r) => <DurationCell inIso={r.visit_in_dt} outIso={r.visit_out_dt} />,
      sorter: (a, b) => (durationMin(a.visit_in_dt, a.visit_out_dt) ?? -1) - (durationMin(b.visit_in_dt, b.visit_out_dt) ?? -1) },
    { title: "Type", dataIndex: "is_rps", key: "is_rps", width: 80, align: "center",
      render: (v) => v ? <Tag color="blue" style={{ margin: 0 }}>RPS</Tag> : <Tag style={{ margin: 0 }}>Non-RPS</Tag> },
    { title: "Qty",   dataIndex: "sales_qty",   key: "qty",   width: 90,  align: "right", render: (v) => <NumCell v={v} digits={2} /> },
    { title: "Sales", dataIndex: "sales_value", key: "sales", width: 120, align: "right", render: (v) => <MoneyCell v={v} /> },
    { title: "Collection", dataIndex: "collection", key: "collection", width: 120, align: "right",
      render: (v) => (v == null || v === 0)
        ? <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
        : <SarValue v={v} size={11} color="#0F172A" weight={500} />,
      sorter: (a, b) => (a.collection || 0) - (b.collection || 0) },
  ];

  const unvisitedCols = [
    {
      title: "Customer",
      dataIndex: "cust_nm",
      key: "cust_nm",
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>{custSubtitle(r)}</div>
        </div>
      ),
    },
    {
      title: "Last Invoice",
      key: "last_inv",
      width: 200,
      render: (_, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12 }}>
            {r.last_invoice_date || "—"}{" "}
            {r.days_since != null && (
              <span style={{ color: r.days_since > 30 ? "#DC2626" : "#64748B", fontSize: 10 }}>
                ({r.days_since}d ago)
              </span>
            )}
          </div>
          <div style={{ fontSize: 11 }}>
            {r.last_invoice_amount == null
              ? <span style={{ color: "#64748B" }}>—</span>
              : <SarValue v={r.last_invoice_amount} />}
          </div>
        </div>
      ),
    },
  ];

  const noVisitCols = [
    {
      title: "Customer",
      dataIndex: "cust_nm",
      key: "cust_nm",
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>
            {custSubtitle(r)}
            {r.on_rps && <Tag color="orange" style={{ marginLeft: 6 }}>Was on RPS</Tag>}
          </div>
        </div>
      ),
    },
    { title: "Qty",   dataIndex: "sales_qty",   key: "qty",   width: 90,  align: "right", render: (v) => <NumCell v={v} digits={2} /> },
    { title: "Sales", dataIndex: "sales_value", key: "sales", width: 120, align: "right", render: (v) => <MoneyCell v={v} /> },
  ];

  const visited   = data?.visited        || [];
  const unvisited = data?.unvisited_rps  || [];
  const noVisit   = data?.no_visit_sales || [];
  const totalSales    = visited.reduce((s, v) => s + (v.sales_value || 0), 0);
  const totalNoVisit  = noVisit.reduce((s, v) => s + (v.sales_value || 0), 0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {salesman?.salesman_name || "—"}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
            {date?.format("ddd, DD MMM YYYY")} · {salesman?.branch_name || salesman?.branch_code}
          </div>
        </div>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Tabs
          size="small"
          items={[
            {
              key: "visited",
              label: (
                <span>
                  Visited ({visited.length}) · <SarValue v={totalSales} size={11} color="#64748B" />
                </span>
              ),
              children: visited.length ? (
                <Table
                  rowKey={(r) => `${r.cust_cd}-${r.visit_in_dt || ""}`}
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={visited}
                  columns={visitedCols}
                  scroll={{ y: 380 }}
                />
              ) : (
                <Empty description="No visits recorded" />
              ),
            },
            {
              key: "unvisited",
              label: `Missed RPS (${unvisited.length})`,
              children: unvisited.length ? (
                <Table
                  rowKey="cust_cd"
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={unvisited}
                  columns={unvisitedCols}
                  scroll={{ y: 380 }}
                />
              ) : (
                <Empty description="All planned RPS customers were visited" />
              ),
            },
            {
              key: "no_visit",
              label: (
                <span>
                  Invoiced w/o Visit ({noVisit.length}) · <SarValue v={totalNoVisit} size={11} color="#64748B" />
                </span>
              ),
              children: noVisit.length ? (
                <Table
                  rowKey="cust_cd"
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={noVisit}
                  columns={noVisitCols}
                  scroll={{ y: 380 }}
                />
              ) : (
                <Empty description="No phantom invoices — every sale had a recorded visit" />
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
};


// ── Period-mode drill modal: customers behind a numeric cell ─────────────
const METRIC_LABEL = {
  customer_base:   "Customer Base",
  rps_visits:      "RPS Visits",
  non_rps_visits:  "Non-RPS Visits",
  total_visits:    "Total Visits",
  planned_rps:     "Planned RPS Visits",
};

const PeriodDrillModal = ({ open, onClose, salesman, metric, fromMonth, toMonth, branchScope }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows]       = useState([]);

  useEffect(() => {
    if (!open || !salesman || !metric) return;
    setLoading(true);
    getSalesmanActivityPeriodCustomers({
      salesmanCd:  salesman.salesman_code,
      fromMonth:   fromMonth?.format("YYYYMM"),
      toMonth:     toMonth?.format("YYYYMM"),
      branchCodes: branchScope,
      metric,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load customer list");
        setRows([]);
      } else {
        setRows(res?.customers || []);
      }
      setLoading(false);
    });
  }, [open, salesman, metric, fromMonth, toMonth, branchScope]);

  // Base metric never shows a visit_count column — the others do.
  const showVisits = metric !== "customer_base";
  const isPlanned  = metric === "planned_rps";

  const columns = [
    {
      title: "Customer",
      dataIndex: "cust_nm",
      key: "cust_nm",
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{v || "—"}</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>
            {r.cust_cd}
            {r.channel  && <> · {r.channel}</>}
            {(r.branch_nm || r.branch_cd) && <> · {r.branch_nm || r.branch_cd}</>}
          </div>
        </div>
      ),
    },
    ...(showVisits ? [{
      title: isPlanned ? "Planned" : "Visits",
      dataIndex: "visit_count",
      key: "visit_count",
      width: 90,
      align: "center",
      render: (v) => <NumCell v={v} />,
      sorter: (a, b) => (a.visit_count || 0) - (b.visit_count || 0),
      defaultSortOrder: "descend",
    }] : []),
    ...(isPlanned ? [{
      title: "Actual",
      dataIndex: "actual_count",
      key: "actual_count",
      width: 90,
      align: "center",
      render: (v, r) => {
        const planned = r.visit_count || 0;
        const missed  = planned - (v || 0);
        const color = (v || 0) >= planned ? "#059669" : missed > 0 ? "#DC2626" : "#64748B";
        return <span style={{ fontSize: 12, color, fontWeight: 500 }}>{v || 0}</span>;
      },
      sorter: (a, b) => (a.actual_count || 0) - (b.actual_count || 0),
    }] : []),
  ];

  const rangeLabel = fromMonth && toMonth
    ? (fromMonth.isSame(toMonth, "month")
        ? fromMonth.format("MMM YYYY")
        : `${fromMonth.format("MMM YYYY")} – ${toMonth.format("MMM YYYY")}`)
    : "";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {salesman?.salesman_name || "—"} · {METRIC_LABEL[metric] || metric}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
            {rangeLabel} · {rows.length} customer{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : rows.length ? (
        <Table
          rowKey="cust_cd"
          size="small"
          bordered
          pagination={false}
          dataSource={rows}
          columns={columns}
          scroll={{ y: 420 }}
        />
      ) : (
        <Empty description="No customers to show" />
      )}
    </Modal>
  );
};


// ── Daily-mode drill modal for visit-count cells ──────────────────────────
const DAILY_METRIC_LABEL = {
  rps_visits:     "RPS Visits",
  non_rps_visits: "Non-RPS Visits",
  total_visits:   "Total Visits",
  planned_rps:    "Planned RPS",
};

const DailyDrillModal = ({ open, onClose, date, salesman, metric, branchScope }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);

  useEffect(() => {
    if (!open || !salesman || !date || !metric) return;
    setLoading(true);
    getSalesmanActivityCustomers({
      date:        date.format("YYYY-MM-DD"),
      salesmanCd:  salesman.salesman_code,
      branchCodes: branchScope,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load customer list");
        setData(null);
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [open, salesman, date, metric, branchScope]);

  // Slice the returned lists by the clicked metric.
  const visited   = data?.visited       || [];
  const unvisited = data?.unvisited_rps || [];

  let rows = [];
  let showStatus = false;
  if (metric === "rps_visits") {
    rows = visited.filter((v) => v.is_rps);
  } else if (metric === "non_rps_visits") {
    rows = visited.filter((v) => !v.is_rps);
  } else if (metric === "total_visits") {
    rows = visited;
  } else if (metric === "planned_rps") {
    showStatus = true;
    rows = [
      ...visited.filter((v) => v.is_rps).map((v) => ({ ...v, _status: "visited" })),
      ...unvisited.map((v) => ({ ...v, _status: "missed" })),
    ];
  }

  const custSubtitle = (r) => {
    const parts = [r.cust_cd];
    if (r.channel)  parts.push(r.channel);
    if (r.branch_nm || r.branch_cd) parts.push(r.branch_nm || r.branch_cd);
    return parts.join(" · ");
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "cust_nm",
      key: "cust_nm",
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>{custSubtitle(r)}</div>
        </div>
      ),
    },
    ...(showStatus ? [{
      title: "Status",
      key: "_status",
      width: 100,
      align: "center",
      render: (_, r) => r._status === "visited"
        ? <Tag color="green" style={{ margin: 0 }}>Visited</Tag>
        : <Tag color="red" style={{ margin: 0 }}>Missed</Tag>,
    }] : [
      { title: "In",  dataIndex: "visit_in_dt",  key: "in",  width: 70, align: "center",
        render: (v) => <span style={{ fontSize: 12 }}>{fmtTime(v)}</span> },
      { title: "Out", dataIndex: "visit_out_dt", key: "out", width: 70, align: "center",
        render: (v) => <span style={{ fontSize: 12 }}>{fmtTime(v)}</span> },
      { title: "Time in Outlet", key: "duration", width: 110, align: "center",
        render: (_, r) => <DurationCell inIso={r.visit_in_dt} outIso={r.visit_out_dt} />,
        sorter: (a, b) => (durationMin(a.visit_in_dt, a.visit_out_dt) ?? -1) - (durationMin(b.visit_in_dt, b.visit_out_dt) ?? -1) },
    ]),
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {salesman?.salesman_name || "—"} · {DAILY_METRIC_LABEL[metric] || metric}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
            {date?.format("ddd, DD MMM YYYY")} · {rows.length} customer{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : rows.length ? (
        <Table
          rowKey={(r) => `${r.cust_cd}-${r.visit_in_dt || r._status || ""}`}
          size="small"
          bordered
          pagination={false}
          dataSource={rows}
          columns={columns}
          scroll={{ y: 420 }}
        />
      ) : (
        <Empty description="No customers to show" />
      )}
    </Modal>
  );
};


const SalesmanActivity = () => {
  const { selectedMonth } = useDateFilter();
  // Period mode is driven by the navbar's global month. Fall back to the
  // current month if the context has no value yet.
  const navMonth = selectedMonth
    ? dayjs(selectedMonth, "YYYYMM").startOf("month")
    : dayjs().startOf("month");
  const [mode, setMode]         = useState("period"); // "period" | "daily"
  const fromMonth = navMonth;
  const toMonth   = navMonth;
  const [day, setDay]           = useState(dayjs());
  const [branches, setBranches]                 = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [drill, setDrill]     = useState(null); // salesman row (daily-mode sales)
  const [periodDrill, setPeriodDrill] = useState(null); // { salesman, metric }
  const [dailyDrill, setDailyDrill]   = useState(null); // { salesman, metric }

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
  }, []);

  useEffect(() => {
    if (mode === "period" && (!fromMonth || !toMonth)) return;
    if (mode === "daily" && !day) return;
    setLoading(true);
    getSalesmanActivity({
      mode,
      ...(mode === "period"
        ? { fromMonth: fromMonth.format("YYYYMM"), toMonth: toMonth.format("YYYYMM") }
        : { date: day.format("YYYY-MM-DD") }),
      branchCodes: selectedBranches,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load report");
        setData(null);
      } else {
        setData(res);
        if (res?.meta?.errors?.length) {
          message.warning(res.meta.errors.join(" · "));
        }
      }
      setLoading(false);
    });
  }, [mode, selectedMonth, day, selectedBranches]);

  // ── Column sets ────────────────────────────────────────────────────────
  const salesmanCol = {
    title: "Salesman",
    dataIndex: "salesman_name",
    key: "salesman_name",
    fixed: "left",
    width: 220,
    render: (v, r) => (
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{v}</div>
        <div style={{ fontSize: 10, color: "#64748B" }}>{r.salesman_code}</div>
      </div>
    ),
    sorter: (a, b) => (a.salesman_name || "").localeCompare(b.salesman_name || ""),
  };

  const branchCol = {
    title: "Branch",
    dataIndex: "branch_name",
    key: "branch_name",
    fixed: "left",
    width: 140,
    render: (v, r) => (
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 12, color: "#1E293B" }}>{v || "—"}</div>
        <div style={{ fontSize: 10, color: "#64748B" }}>{r.branch_code}</div>
      </div>
    ),
    sorter: (a, b) => (a.branch_name || "").localeCompare(b.branch_name || ""),
  };

  const drillTo = (row, metric) => setPeriodDrill({ salesman: row, metric });

  const periodColumns = [
    salesmanCol,
    branchCol,
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Customer Base</span>,
      align: "center",
      children: [
        { title: "Total", dataIndex: "customer_base", key: "customer_base", align: "center", width: 130,
          render: (v, r) => <ClickableNum v={v} onClick={() => drillTo(r, "customer_base")} />,
          sorter: (a, b) => (a.customer_base || 0) - (b.customer_base || 0) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Monthly Visits</span>,
      align: "center",
      children: [
        { title: "RPS",     dataIndex: "rps_visits",     key: "rps_visits",     align: "center", width: 80,
          render: (v, r) => <ClickableNum v={v} onClick={() => drillTo(r, "rps_visits")} />,
          sorter: (a, b) => (a.rps_visits || 0) - (b.rps_visits || 0) },
        { title: "Non-RPS", dataIndex: "non_rps_visits", key: "non_rps_visits", align: "center", width: 90,
          render: (v, r) => <ClickableNum v={v} onClick={() => drillTo(r, "non_rps_visits")} />,
          sorter: (a, b) => (a.non_rps_visits || 0) - (b.non_rps_visits || 0) },
        { title: "Total",   dataIndex: "total_visits",   key: "total_visits",   align: "center", width: 80,
          render: (v, r) => <ClickableNum v={v} onClick={() => drillTo(r, "total_visits")} />,
          sorter: (a, b) => (a.total_visits || 0) - (b.total_visits || 0) },
        { title: "Planned", dataIndex: "planned_rps",    key: "planned_rps",    align: "center", width: 90,
          render: (v, r) => <ClickableNum v={v} onClick={() => drillTo(r, "planned_rps")} />,
          sorter: (a, b) => (a.planned_rps || 0) - (b.planned_rps || 0) },
        { title: "Visit %", dataIndex: "visit_pct",      key: "visit_pct",      align: "center", width: 90,
          render: (v) => <PctCell v={v} thresholds={{ good: 90, ok: 70 }} />,
          sorter: (a, b) => (a.visit_pct ?? -Infinity) - (b.visit_pct ?? -Infinity) },
        { title: "Total Time in Outlet", dataIndex: "total_time_min", key: "total_time_min", align: "center", width: 130,
          render: (v) => <HoursMinCell v={v} />,
          sorter: (a, b) => (a.total_time_min ?? -Infinity) - (b.total_time_min ?? -Infinity) },
        { title: "Time in Outlet / Day", dataIndex: "time_per_day_min", key: "time_per_day_min", align: "center", width: 140,
          render: (v) => <HoursMinCell v={v} />,
          sorter: (a, b) => (a.time_per_day_min ?? -Infinity) - (b.time_per_day_min ?? -Infinity) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Outlet Quality</span>,
      align: "center",
      children: [
        { title: "Avg Time in Outlet", dataIndex: "avg_time_min", key: "avg_time_min", align: "center", width: 140,
          render: (v) => <MinCell v={v} />,
          sorter: (a, b) => (a.avg_time_min ?? -Infinity) - (b.avg_time_min ?? -Infinity) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Effective Calls (Daily Avg)</span>,
      align: "center",
      children: [
        { title: "Calls",  dataIndex: "effective_daily", key: "effective_daily", align: "center", width: 80,
          render: (v) => <NumCell v={v} digits={1} />,
          sorter: (a, b) => (a.effective_daily ?? -Infinity) - (b.effective_daily ?? -Infinity) },
        { title: "Call %", dataIndex: "call_pct",       key: "call_pct",        align: "center", width: 90,
          render: (v) => <PctCell v={v} thresholds={{ good: 10, ok: 5 }} />,
          sorter: (a, b) => (a.call_pct ?? -Infinity) - (b.call_pct ?? -Infinity) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Score (Out of 100)</span>,
      align: "center",
      children: [
        { title: "RPS (/15)",           dataIndex: "score_rps",   key: "score_rps",   align: "center", width: 90,
          render: (v) => <ScoreCell v={v} max={15} />,
          sorter: (a, b) => (a.score_rps ?? -Infinity) - (b.score_rps ?? -Infinity) },
        { title: "Time in Outlet (/15)", dataIndex: "score_time",  key: "score_time",  align: "center", width: 130,
          render: (v) => <ScoreCell v={v} max={15} />,
          sorter: (a, b) => (a.score_time ?? -Infinity) - (b.score_time ?? -Infinity) },
        { title: "Effective Call (/70)", dataIndex: "score_call",  key: "score_call",  align: "center", width: 130,
          render: (v) => <ScoreCell v={v} max={70} />,
          sorter: (a, b) => (a.score_call ?? -Infinity) - (b.score_call ?? -Infinity) },
        { title: "Total (/100)",         dataIndex: "score_total", key: "score_total", align: "center", width: 110,
          render: (v) => <ScoreCell v={v} max={100} bold />,
          sorter: (a, b) => (a.score_total ?? -Infinity) - (b.score_total ?? -Infinity),
          defaultSortOrder: "descend" },
      ],
    },
  ];

  const dailyColumns = [
    salesmanCol,
    branchCol,
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Visits</span>,
      align: "center",
      children: [
        { title: "RPS",     dataIndex: "rps_visits",     key: "rps_visits",     align: "center", width: 80,
          render: (v, r) => <PlainClickableNum v={v} onClick={() => setDailyDrill({ salesman: r, metric: "rps_visits" })} />,
          sorter: (a, b) => (a.rps_visits || 0) - (b.rps_visits || 0) },
        { title: "Non-RPS", dataIndex: "non_rps_visits", key: "non_rps_visits", align: "center", width: 90,
          render: (v, r) => <PlainClickableNum v={v} onClick={() => setDailyDrill({ salesman: r, metric: "non_rps_visits" })} />,
          sorter: (a, b) => (a.non_rps_visits || 0) - (b.non_rps_visits || 0) },
        { title: "Total",   dataIndex: "total_visits",   key: "total_visits",   align: "center", width: 80,
          render: (v, r) => <PlainClickableNum v={v} onClick={() => setDailyDrill({ salesman: r, metric: "total_visits" })} />,
          sorter: (a, b) => (a.total_visits || 0) - (b.total_visits || 0) },
        { title: "Planned", dataIndex: "planned_rps",    key: "planned_rps",    align: "center", width: 80,
          render: (v, r) => <PlainClickableNum v={v} onClick={() => setDailyDrill({ salesman: r, metric: "planned_rps" })} />,
          sorter: (a, b) => (a.planned_rps || 0) - (b.planned_rps || 0) },
        { title: "Visit %", dataIndex: "visit_pct",      key: "visit_pct",      align: "center", width: 90,
          render: (v) => <PctCell v={v} thresholds={{ good: 90, ok: 70 }} />,
          sorter: (a, b) => (a.visit_pct ?? -Infinity) - (b.visit_pct ?? -Infinity) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Outlet Time</span>,
      align: "center",
      children: [
        { title: "Total", dataIndex: "total_time_min", key: "total_time_min", align: "center", width: 110,
          render: (v) => <HoursMinCell v={v} />,
          sorter: (a, b) => (a.total_time_min ?? -Infinity) - (b.total_time_min ?? -Infinity) },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Sales</span>,
      align: "center",
      children: [
        {
          title: "Value",
          dataIndex: "sales_value",
          key: "sales_value",
          align: "right",
          width: 140,
          render: (v, r) => (
            <span
              onClick={() => setDrill(r)}
              style={{
                cursor: "pointer", color: "#2563EB", fontWeight: 600, textDecoration: "underline dotted",
              }}
              title="Click to see breakdown"
            >
              <MoneyCell v={v} />
            </span>
          ),
          sorter: (a, b) => (a.sales_value || 0) - (b.sales_value || 0),
        },
      ],
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700 }}>Collection</span>,
      align: "center",
      children: [
        {
          title: "Value",
          dataIndex: "collection",
          key: "collection",
          align: "right",
          width: 140,
          render: (v) => (v == null || v === 0)
            ? <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
            : <SarValue v={v} size={11} color="#0F172A" weight={500} />,
          sorter: (a, b) => (a.collection || 0) - (b.collection || 0),
        },
      ],
    },
  ];

  const columns = mode === "daily" ? dailyColumns : periodColumns;

  // ── Export to Excel ────────────────────────────────────────────────────
  const exportToExcel = async () => {
    const rows = data?.salesmen || [];
    if (!rows.length) { message.warning("No data to export"); return; }

    const ExcelJS = (await import("exceljs")).default;
    const wb      = new ExcelJS.Workbook();
    wb.creator    = "Wazalytics";

    const isDaily = mode === "daily";
    const sheetName = isDaily
      ? `Daily ${day.format("YYYY-MM-DD")}`
      : `Period ${fromMonth.format("YYYY-MM")}`;
    const ws = wb.addWorksheet(sheetName.substring(0, 31), {
      views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
    });

    const NAV   = "002060";
    const LGRAY = "F1F5F9";
    const AGOLD = "FEF3C7";
    const WHITE = "FFFFFFFF";
    const thin  = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr   = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const decFmt = '_(* #,##0.0_);[Red]_(* (#,##0.0);_(* "-"_);_(@_)';
    const pctFmt = '0.0"%";[Red]-0.0"%";"—"';

    const hdrStyle = {
      font: { bold: true, size: 10, color: { argb: WHITE } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAV}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: bdr,
    };

    // Column definitions per mode. Each: { header, key, width, kind }
    const periodCols = [
      { header: "#",              key: "idx",              width: 5,  kind: "num" },
      { header: "Salesman",       key: "salesman",         width: 30, kind: "text" },
      { header: "Branch",         key: "branch",           width: 20, kind: "text" },
      { header: "Customer Base",  key: "customer_base",    width: 14, kind: "num" },
      { header: "RPS Visits",     key: "rps_visits",       width: 12, kind: "num" },
      { header: "Non-RPS Visits", key: "non_rps_visits",   width: 14, kind: "num" },
      { header: "Total Visits",   key: "total_visits",     width: 12, kind: "num" },
      { header: "Planned RPS",    key: "planned_rps",      width: 12, kind: "num" },
      { header: "Visit %",        key: "visit_pct",        width: 10, kind: "pct" },
      { header: "Total Time (min)",     key: "total_time_min",   width: 15, kind: "dec" },
      { header: "Time / Day (min)",     key: "time_per_day_min", width: 15, kind: "dec" },
      { header: "Avg Time / Visit (min)", key: "avg_time_min",   width: 18, kind: "dec" },
      { header: "Effective Calls",  key: "effective_calls",  width: 14, kind: "num" },
      { header: "Call %",         key: "call_pct",         width: 10, kind: "pct" },
      { header: "Score RPS (/15)",         key: "score_rps",   width: 14, kind: "dec" },
      { header: "Score Time (/15)",        key: "score_time",  width: 14, kind: "dec" },
      { header: "Score Eff Call (/70)",    key: "score_call",  width: 16, kind: "dec" },
      { header: "Score Total (/100)",      key: "score_total", width: 16, kind: "dec" },
    ];
    const dailyCols = [
      { header: "#",              key: "idx",             width: 5,  kind: "num" },
      { header: "Salesman",       key: "salesman",        width: 30, kind: "text" },
      { header: "Branch",         key: "branch",          width: 20, kind: "text" },
      { header: "RPS Visits",     key: "rps_visits",      width: 12, kind: "num" },
      { header: "Non-RPS Visits", key: "non_rps_visits",  width: 14, kind: "num" },
      { header: "Total Visits",   key: "total_visits",    width: 12, kind: "num" },
      { header: "Planned RPS",    key: "planned_rps",     width: 12, kind: "num" },
      { header: "Visit %",        key: "visit_pct",       width: 10, kind: "pct" },
      { header: "Total Time (min)", key: "total_time_min", width: 15, kind: "dec" },
      { header: "Sales Value",    key: "sales_value",     width: 15, kind: "num" },
      { header: "Collection",     key: "collection",      width: 15, kind: "num" },
    ];
    const colDefs = isDaily ? dailyCols : periodCols;

    const hdrRow = ws.getRow(1); hdrRow.height = 22;
    colDefs.forEach((c, i) => {
      const cell = hdrRow.getCell(i + 1);
      cell.value = c.header;
      cell.style = hdrStyle;
      ws.getColumn(i + 1).width = c.width;
    });

    const numFmtFor = (kind) => kind === "pct" ? pctFmt : kind === "dec" ? decFmt : numFmt;

    // Data rows
    rows.forEach((r, idx) => {
      const dr = ws.addRow({}); dr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? WHITE : `FF${LGRAY}`;
      const rowValues = {
        idx:              idx + 1,
        salesman:         `${r.salesman_name} (${r.salesman_code})`,
        branch:           r.branch_name || r.branch_code || "",
        customer_base:    r.customer_base,
        rps_visits:       r.rps_visits,
        non_rps_visits:   r.non_rps_visits,
        total_visits:     r.total_visits,
        planned_rps:      r.planned_rps,
        visit_pct:        r.visit_pct,
        total_time_min:   r.total_time_min,
        time_per_day_min: r.time_per_day_min,
        avg_time_min:     r.avg_time_min,
        effective_calls:  r.effective_calls,
        call_pct:         r.call_pct,
        score_rps:        r.score_rps,
        score_time:       r.score_time,
        score_call:       r.score_call,
        score_total:      r.score_total,
        sales_value:      r.sales_value,
        collection:       r.collection,
      };
      colDefs.forEach((c, i) => {
        const cell = dr.getCell(i + 1);
        const v = rowValues[c.key];
        cell.value = (v === undefined || v === null || v === "") ? null : v;
        cell.style = {
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          font: { size: 10 },
          alignment: { horizontal: c.kind === "text" ? "left" : c.kind === "num" && c.key === "idx" ? "center" : "right", vertical: "middle" },
          border: bdr,
          numFmt: c.kind === "text" ? undefined : numFmtFor(c.kind),
        };
      });
    });

    // Grand total row from data.totals
    const t = data?.totals || {};
    const gtRow = ws.addRow({}); gtRow.height = 18;
    const GT_BG = `FF${AGOLD}`;
    const gtStyle = {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: GT_BG } },
      font: { bold: true, size: 10, color: { argb: "FF1E293B" } },
      alignment: { vertical: "middle" },
      border: bdr,
    };
    const totalValues = {
      idx: "",
      salesman: "TOTAL",
      branch: "",
      customer_base:    t.customer_base,
      rps_visits:       t.rps_visits,
      non_rps_visits:   t.non_rps_visits,
      total_visits:     t.total_visits,
      planned_rps:      t.planned_rps,
      visit_pct:        t.visit_pct,
      total_time_min:   t.total_time_min,
      time_per_day_min: t.time_per_day_min,
      avg_time_min:     t.avg_time_min,
      effective_calls:  t.effective_calls,
      call_pct:         t.call_pct,
      score_rps:        t.score_rps,
      score_time:       t.score_time,
      score_call:       t.score_call,
      score_total:      t.score_total,
      sales_value:      t.sales_value,
      collection:       t.collection,
    };
    colDefs.forEach((c, i) => {
      const cell = gtRow.getCell(i + 1);
      const v = totalValues[c.key];
      cell.value = (v === undefined || v === null || v === "") ? null : v;
      cell.style = {
        ...gtStyle,
        alignment: { horizontal: c.kind === "text" ? "left" : "right", vertical: "middle" },
        numFmt: c.kind === "text" ? undefined : numFmtFor(c.kind),
      };
    });

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = isDaily
      ? `Salesman_Activity_Daily_${day.format("YYYY-MM-DD")}.xlsx`
      : `Salesman_Activity_${fromMonth.format("YYYY-MM")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = mode === "daily"
    ? (day ? day.format("ddd, DD MMM YYYY") : "")
    : (fromMonth ? fromMonth.format("MMM YYYY") : "");

  // ── Summary row (mode-aware) ───────────────────────────────────────────
  const summaryRow = data?.totals && (
    <Table.Summary fixed>
      <Table.Summary.Row style={{ background: "#F8FAFC", fontWeight: 700 }}>
        <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
        <Table.Summary.Cell index={1} />
        {mode === "period" ? (
          <>
            <Table.Summary.Cell index={2} align="center"><NumCell v={data.totals.customer_base} /></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="center"><NumCell v={data.totals.rps_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="center"><NumCell v={data.totals.non_rps_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="center"><NumCell v={data.totals.total_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="center"><NumCell v={data.totals.planned_rps} /></Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="center"><PctCell v={data.totals.visit_pct} thresholds={{ good: 90, ok: 70 }} /></Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="center"><HoursMinCell v={data.totals.total_time_min} /></Table.Summary.Cell>
            <Table.Summary.Cell index={9} align="center"><HoursMinCell v={data.totals.time_per_day_min} /></Table.Summary.Cell>
            <Table.Summary.Cell index={10} align="center"><MinCell v={data.totals.avg_time_min} /></Table.Summary.Cell>
            <Table.Summary.Cell index={11} align="center"><NumCell v={data.totals.effective_calls} /></Table.Summary.Cell>
            <Table.Summary.Cell index={12} align="center"><PctCell v={data.totals.call_pct} thresholds={{ good: 10, ok: 5 }} /></Table.Summary.Cell>
            <Table.Summary.Cell index={13} align="center"><ScoreCell v={data.totals.score_rps}   max={15} /></Table.Summary.Cell>
            <Table.Summary.Cell index={14} align="center"><ScoreCell v={data.totals.score_time}  max={15} /></Table.Summary.Cell>
            <Table.Summary.Cell index={15} align="center"><ScoreCell v={data.totals.score_call}  max={70} /></Table.Summary.Cell>
            <Table.Summary.Cell index={16} align="center"><ScoreCell v={data.totals.score_total} max={100} bold /></Table.Summary.Cell>
          </>
        ) : (
          <>
            <Table.Summary.Cell index={2} align="center"><NumCell v={data.totals.rps_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="center"><NumCell v={data.totals.non_rps_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="center"><NumCell v={data.totals.total_visits} /></Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="center"><NumCell v={data.totals.planned_rps} /></Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="center"><PctCell v={data.totals.visit_pct} thresholds={{ good: 90, ok: 70 }} /></Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="center"><HoursMinCell v={data.totals.total_time_min} /></Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="right"><MoneyCell v={data.totals.sales_value} /></Table.Summary.Cell>
            <Table.Summary.Cell index={9} align="right">
              {(!data.totals.collection || data.totals.collection === 0)
                ? <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
                : <SarValue v={data.totals.collection} size={11} color="#0F172A" weight={600} />}
            </Table.Summary.Cell>
          </>
        )}
      </Table.Summary.Row>
    </Table.Summary>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 4px 12px" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>Salesman Performance</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            {rangeLabel && <>{rangeLabel} · </>}
            {mode === "daily"
              ? "Single-day view — click a Sales value for the customer breakdown"
              : "Averages computed from daily activity records"}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "0 4px 12px" }}>
        <Space>
          <Segmented
            size="small"
            value={mode}
            onChange={setMode}
            options={[
              { label: "Period", value: "period" },
              { label: "Daily",  value: "daily" },
            ]}
          />
        </Space>
        {mode === "daily" && (
          <Space>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Date:</span>
            <DatePicker
              size="small"
              value={day}
              onChange={setDay}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </Space>
        )}
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Branch:</span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          placeholder="All branches"
          value={selectedBranches}
          onChange={setSelectedBranches}
          style={{ flex: 1, minWidth: 220 }}
          maxTagCount="responsive"
          options={branches.map((b) => ({ label: b.name, value: b.code }))}
          dropdownRender={(menu) => (
            <>
              <div style={{ padding: "4px 8px", display: "flex", gap: 8 }}>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedBranches(branches.map((b) => b.code))}>Select All</Button>
                <Divider type="vertical" />
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedBranches([])}>Unselect All</Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          disabled={loading || !data?.salesmen?.length}
          onClick={exportToExcel}
        >
          Export to Excel
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !data?.salesmen?.length ? (
        <Empty description={mode === "daily"
          ? "No activity recorded for this date"
          : "No activity records for the selected period"} />
      ) : (
        <Table
          rowKey="salesman_code"
          size="small"
          className="sto-table"
          bordered
          pagination={false}
          loading={loading}
          dataSource={data.salesmen}
          columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
          summary={() => summaryRow}
          sticky
        />
      )}

      <DrillModal
        open={!!drill}
        onClose={() => setDrill(null)}
        date={day}
        salesman={drill}
        branchScope={selectedBranches}
      />

      <PeriodDrillModal
        open={!!periodDrill}
        onClose={() => setPeriodDrill(null)}
        salesman={periodDrill?.salesman}
        metric={periodDrill?.metric}
        fromMonth={fromMonth}
        toMonth={toMonth}
        branchScope={selectedBranches}
      />

      <DailyDrillModal
        open={!!dailyDrill}
        onClose={() => setDailyDrill(null)}
        date={day}
        salesman={dailyDrill?.salesman}
        metric={dailyDrill?.metric}
        branchScope={selectedBranches}
      />
    </div>
  );
};

export default SalesmanActivity;
