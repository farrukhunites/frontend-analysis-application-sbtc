import { useContext, useEffect, useMemo, useState } from "react";
import { Table, Skeleton, message, Button, Tag, Space, Switch, DatePicker } from "antd";
import { CloseCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getSalesTargetOverview } from "../../../API/Reports";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./reports.css";

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const PctCell = ({ v, kind }) => {
  if (v == null || !isFinite(v)) return <span style={{ color: "#94A3B8", fontSize: 11 }}>—</span>;
  const good = kind === "achv" ? v >= 90 : v >= 0;
  const color = good ? "#10B981" : "#EF4444";
  const bg    = good ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  const sign  = kind === "grow" && v > 0 ? "+" : "";
  return (
    <span style={{
      color, background: bg, padding: "1px 5px", borderRadius: 3,
      fontWeight: 600, fontSize: 11, display: "inline-block", textAlign: "right",
    }}>
      {sign}{v.toFixed(1)}%
    </span>
  );
};

const SalesTargetOverview = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const unitLabel = isValueMode
    ? <RiyalIcon width={11} height={11} color="#1E293B" />
    : (unitType || "ctn").toUpperCase();

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);

  const [rangeMode, setRangeMode] = useState(false);
  const [fromMonth, setFromMonth] = useState(null);
  const [toMonth,   setToMonth]   = useState(null);
  const fromMonthStr  = fromMonth ? fromMonth.format("YYYYMM") : null;
  const toMonthStr    = toMonth   ? toMonth.format("YYYYMM")   : null;
  const isRangeActive = rangeMode && fromMonthStr && toMonthStr;

  // Cross-filter picks: click a row on one table to filter the other.
  const [selectedProductCode, setSelectedProductCode] = useState(null);
  const [selectedBranchCode,  setSelectedBranchCode]  = useState(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
    getAllProducts().then((r) => setProducts(r?.results || []));
  }, []);

  useEffect(() => {
    if (!isRangeActive && !selectedMonth) return;
    setLoading(true);
    getSalesTargetOverview({
      ...(isRangeActive
        ? { fromMonth: fromMonthStr, toMonth: toMonthStr }
        : { month: selectedMonth }),
      unitType:            effectiveUnitType,
      valueType,
      selectedBranchCode,
      selectedProductCode,
    }).then((res) => {
      if (res?.error) { message.error("Failed to load report"); setData(null); }
      else setData(res);
      setLoading(false);
    });
  }, [selectedMonth, isRangeActive, fromMonthStr, toMonthStr, effectiveUnitType, valueType, selectedBranchCode, selectedProductCode]);

  const productName = useMemo(
    () => products.find((p) => p.code === selectedProductCode)?.name,
    [selectedProductCode, products]
  );
  const branchName = useMemo(
    () => branches.find((b) => b.code === selectedBranchCode)?.name,
    [selectedBranchCode, branches]
  );

  // Cross-filter row click. Clicking a highlighted row again clears the filter.
  const onProductRow = (row) => ({
    onClick: () => setSelectedProductCode((cur) => cur === row.code ? null : row.code),
    style:   { cursor: "pointer" },
  });
  const onBranchRow = (row) => ({
    onClick: () => setSelectedBranchCode((cur) => cur === row.code ? null : row.code),
    style:   { cursor: "pointer" },
  });

  const rowClassName = (selectedCode) => (row) =>
    row.isTotal ? "grand-total-row"
    : (row.code === selectedCode ? "sto-row-selected" : "");

  const buildColumns = (nameHeader) => [
    {
      title: nameHeader,
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (v, r) => r.isTotal
        ? <b style={{ fontSize: 11 }}>Total</b>
        : <span style={{ fontWeight: 500, fontSize: 11 }}>{v}</span>,
    },
    {
      title: <span>TY ({unitLabel})</span>,
      dataIndex: "this_year",
      key: "this_year",
      align: "right",
      width: 80,
      render: (v, r) => <span style={{ fontSize: 11, fontWeight: r.isTotal ? 700 : 400 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.this_year || 0) - (b.this_year || 0),
    },
    {
      title: <span>Target</span>,
      dataIndex: "target",
      key: "target",
      align: "right",
      width: 80,
      render: (v, r) => <span style={{ fontSize: 11, fontWeight: r.isTotal ? 700 : 400 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.target || 0) - (b.target || 0),
    },
    {
      title: "Achv%",
      dataIndex: "achv_pct",
      key: "achv_pct",
      align: "center",
      width: 68,
      render: (v) => <PctCell v={v} kind="achv" />,
      sorter: (a, b) => (a.achv_pct ?? -Infinity) - (b.achv_pct ?? -Infinity),
    },
    {
      title: <span>LY ({unitLabel})</span>,
      dataIndex: "last_year",
      key: "last_year",
      align: "right",
      width: 80,
      render: (v, r) => <span style={{ fontSize: 11, fontWeight: r.isTotal ? 700 : 400 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.last_year || 0) - (b.last_year || 0),
    },
    {
      title: "Grow%",
      dataIndex: "grow_pct",
      key: "grow_pct",
      align: "center",
      width: 68,
      render: (v) => <PctCell v={v} kind="grow" />,
      sorter: (a, b) => (a.grow_pct ?? -Infinity) - (b.grow_pct ?? -Infinity),
    },
  ];

  const productRows = useMemo(() => {
    if (!data) return [];
    return [...(data.products || []), { ...(data.products_total || {}), isTotal: true, name: "Total", code: "__total__" }];
  }, [data]);

  const branchRows = useMemo(() => {
    if (!data) return [];
    return [...(data.branches || []), { ...(data.branches_total || {}), isTotal: true, name: "Total", code: "__total__" }];
  }, [data]);

  const productHeader = selectedBranchCode
    ? `Sales Target by Product — ${branchName || selectedBranchCode}`
    : "Sales Target by Product";
  const branchHeader = selectedProductCode
    ? `Sales Target by Branch — ${productName || selectedProductCode}`
    : "Sales Target by Branch";

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "12px 4px" }}>
        <Space>
          <span style={{ fontSize: 12, color: "#64748B" }}>Multi-month</span>
          <Switch
            checked={rangeMode}
            onChange={(v) => { setRangeMode(v); if (!v) { setFromMonth(null); setToMonth(null); } }}
            size="small"
          />
        </Space>
        {rangeMode && (
          <Space>
            <DatePicker picker="month" value={fromMonth} onChange={setFromMonth} placeholder="From month" />
            <DatePicker picker="month" value={toMonth}   onChange={setToMonth}   placeholder="To month" />
          </Space>
        )}
        <div style={{ flex: 1 }} />
        {(selectedProductCode || selectedBranchCode) && (
          <Space>
            {selectedProductCode && (
              <Tag closable onClose={(e) => { e.preventDefault(); setSelectedProductCode(null); }} color="blue">
                Product: {productName || selectedProductCode}
              </Tag>
            )}
            {selectedBranchCode && (
              <Tag closable onClose={(e) => { e.preventDefault(); setSelectedBranchCode(null); }} color="geekblue">
                Branch: {branchName || selectedBranchCode}
              </Tag>
            )}
            <Button
              size="small"
              icon={<CloseCircleFilled />}
              onClick={() => { setSelectedProductCode(null); setSelectedBranchCode(null); }}
            >
              Clear filters
            </Button>
          </Space>
        )}
      </div>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "var(--color-bg-card)", borderRadius: 8, padding: 6, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", padding: "2px 4px 6px" }}>
              {productHeader}
            </div>
            <Table
              rowKey="code"
              size="small"
              className="sto-table"
              pagination={false}
              loading={loading}
              dataSource={productRows}
              columns={buildColumns("Sub Group")}
              onRow={(r) => (r.isTotal ? {} : onProductRow(r))}
              rowClassName={rowClassName(selectedProductCode)}
              scroll={{ y: 560 }}
              tableLayout="fixed"
            />
          </div>
          <div style={{ background: "var(--color-bg-card)", borderRadius: 8, padding: 6, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", padding: "2px 4px 6px" }}>
              {branchHeader}
            </div>
            <Table
              rowKey="code"
              size="small"
              className="sto-table"
              pagination={false}
              loading={loading}
              dataSource={branchRows}
              columns={buildColumns("SBTC Branch")}
              onRow={(r) => (r.isTotal ? {} : onBranchRow(r))}
              rowClassName={rowClassName(selectedBranchCode)}
              scroll={{ y: 560 }}
              tableLayout="fixed"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTargetOverview;
