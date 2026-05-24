import { useEffect, useState } from "react";
import { Table, Skeleton } from "antd";
import "./style.css";
import { getSalesmanPerformance } from "../../../API/Salesman Performance";

const fmtNum = (v, dec = 1) =>
  v === 0 ? "0" : Number(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const PctBadge = ({ value, thresholds }) => {
  const { high, mid } = thresholds;
  let cls = "pct-badge pct-badge--low";
  if (value >= high) cls = "pct-badge pct-badge--high";
  else if (value >= mid) cls = "pct-badge pct-badge--mid";
  return <span className={cls}>{fmtNum(value, 1)}%</span>;
};

const COLUMNS = [
  {
    title: "Salesman",
    dataIndex: "name",
    key: "name",
    fixed: "left",
    width: 220,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (v) => <span className="salesman-name">{v}</span>,
  },
  {
    title: "Customer Base",
    children: [
      {
        title: "Total",
        dataIndex: "totalCustomerBase",
        key: "totalCustomerBase",
        width: 80,
        align: "center",
        sorter: (a, b) => a.totalCustomerBase - b.totalCustomerBase,
        render: (v) => <span className="cell-num">{v}</span>,
      },
      {
        title: "Avg Daily Visits",
        dataIndex: "avgDailyVisits",
        key: "avgDailyVisits",
        width: 110,
        align: "center",
        sorter: (a, b) => a.avgDailyVisits - b.avgDailyVisits,
        render: (v) => <span className="cell-num">{fmtNum(v, 1)}</span>,
      },
    ],
  },
  {
    title: "Monthly Visits",
    children: [
      {
        title: "RPS",
        dataIndex: "avgMonthlyRpsVisit",
        key: "avgMonthlyRpsVisit",
        width: 80,
        align: "center",
        sorter: (a, b) => a.avgMonthlyRpsVisit - b.avgMonthlyRpsVisit,
        render: (v) => <span className="cell-num">{fmtNum(v, 0)}</span>,
      },
      {
        title: "Non-RPS",
        dataIndex: "avgMonthlyNonRpsVisit",
        key: "avgMonthlyNonRpsVisit",
        width: 90,
        align: "center",
        sorter: (a, b) => a.avgMonthlyNonRpsVisit - b.avgMonthlyNonRpsVisit,
        render: (v) => <span className="cell-num">{fmtNum(v, 0)}</span>,
      },
      {
        title: "Total",
        dataIndex: "avgMonthlyTotalVisit",
        key: "avgMonthlyTotalVisit",
        width: 75,
        align: "center",
        sorter: (a, b) => a.avgMonthlyTotalVisit - b.avgMonthlyTotalVisit,
        render: (v) => <span className="cell-num cell-num--bold">{fmtNum(v, 0)}</span>,
      },
      {
        title: "Visit %",
        dataIndex: "avgMonthlyVisitPct",
        key: "avgMonthlyVisitPct",
        width: 90,
        align: "center",
        sorter: (a, b) => a.avgMonthlyVisitPct - b.avgMonthlyVisitPct,
        render: (v) => <PctBadge value={v} thresholds={{ high: 90, mid: 60 }} />,
      },
    ],
  },
  {
    title: "Outlet Quality",
    children: [
      {
        title: "Avg Time in Outlet",
        dataIndex: "avgTimeInOutlet",
        key: "avgTimeInOutlet",
        width: 120,
        align: "center",
        sorter: (a, b) => a.avgTimeInOutlet - b.avgTimeInOutlet,
        render: (v) => (
          <span className="cell-num">
            {fmtNum(v, 1)} <span className="unit">min</span>
          </span>
        ),
      },
    ],
  },
  {
    title: "Effective Calls (Daily Avg)",
    children: [
      {
        title: "Calls",
        dataIndex: "avgDailyEffCall",
        key: "avgDailyEffCall",
        width: 75,
        align: "center",
        sorter: (a, b) => a.avgDailyEffCall - b.avgDailyEffCall,
        render: (v) => <span className="cell-num">{fmtNum(v, 1)}</span>,
      },
      {
        title: "Call %",
        dataIndex: "avgDailyEffCallPct",
        key: "avgDailyEffCallPct",
        width: 90,
        align: "center",
        sorter: (a, b) => a.avgDailyEffCallPct - b.avgDailyEffCallPct,
        render: (v) => <PctBadge value={v} thresholds={{ high: 15, mid: 7 }} />,
      },
    ],
  },
];

const SalesmanPerformance = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSalesmanPerformance().then((res) => {
      if (res?.error) {
        setError("Failed to load data.");
      } else {
        setData(res.map((row, i) => ({ ...row, key: i })));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="salesman-perf">
      <div className="salesman-perf__header">
        <div>
          <h2 className="salesman-perf__title">Salesman Performance</h2>
          <p className="salesman-perf__subtitle">
            Riyadh Branch · Jan–Apr 2026 · Averages computed from daily activity records
          </p>
        </div>
        <div className="salesman-perf__badge">
          <span className="badge-dot badge-dot--high" /> ≥ Threshold
          <span className="badge-dot badge-dot--mid" /> Moderate
          <span className="badge-dot badge-dot--low" /> Below Target
        </div>
      </div>

      {loading ? (
        <div className="salesman-perf__card" style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : error ? (
        <div className="salesman-perf__card" style={{ padding: 24, color: "var(--color-error)" }}>
          {error}
        </div>
      ) : (
        <div className="salesman-perf__card">
          <Table
            className="salesman-perf__table"
            columns={COLUMNS}
            dataSource={data}
            bordered
            size="small"
            pagination={false}
            scroll={{ x: 1500 }}
            rowClassName={(_, index) => (index % 2 === 0 ? "row-even" : "row-odd")}
          />
        </div>
      )}
    </div>
  );
};

export default SalesmanPerformance;
