import { useContext, useEffect, useMemo, useState } from "react";
import {
  Table, Skeleton, message, Button, Tag, Space, Select, Segmented, Input,
} from "antd";
import {
  CloseCircleFilled, DownloadOutlined, SearchOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllChannels } from "../../../API/Channels";
import { getPaymentHealthReport } from "../../../API/Reports";
import RiyalIcon from "../../../Utils/RiyalIcon";
import { openCustomerAnalysis, exportRowsToExcel, pinGrandTotal } from "./reportUtils";
import "./reports.css";

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const CAT_COLOR = { A: "green", B: "blue", C: "orange", D: "red" };

const SalesCatTag = ({ v }) => {
  if (!v) return <span style={{ color: "#CBD5E1" }}>-</span>;
  if (v === "Unidentified") return <Tag style={{ fontSize: 11, margin: 0 }}>Unidentified</Tag>;
  return <Tag color={CAT_COLOR[v]} style={{ fontSize: 11, margin: 0 }}>{v}</Tag>;
};

const RiskCatTag = ({ v }) =>
  v ? <Tag color={CAT_COLOR[v]} style={{ fontSize: 11, margin: 0 }}>{v}</Tag>
    : <span style={{ color: "#CBD5E1" }}>-</span>;

const ScoreCell = ({ score, max }) => {
  const ratio = max ? score / max : 0;
  const color =
    ratio >= 0.75 ? "#16A34A"
    : ratio >= 0.5  ? "#F59E0B"
    : ratio >= 0.25 ? "#EA580C"
    :                 "#DC2626";
  return (
    <span style={{
      display: "inline-block", fontWeight: 700, color: "white", background: color,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, minWidth: 44, textAlign: "center",
    }}>
      {score}<span style={{ opacity: 0.7, fontWeight: 500 }}> / {max}</span>
    </span>
  );
};

const textSearchProps = (getText, placeholder) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        placeholder={placeholder}
        value={selectedKeys[0]}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
        style={{ marginBottom: 8, display: "block", width: 200 }}
      />
      <Space>
        <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => confirm()}>Search</Button>
        <Button size="small" onClick={() => { clearFilters && clearFilters(); confirm(); }}>Reset</Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered) => (
    <SearchOutlined style={{ color: filtered ? "var(--color-accent)" : undefined }} />
  ),
  onFilter: (value, record) =>
    record.isGrandTotal ||
    (getText(record) || "").toString().toLowerCase().includes(value.toLowerCase()),
});

const PaymentHealthReport = () => {
  const { valueType } = useContext(UnitValueContext);

  const [branches, setBranches] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedBranchCodes, setSelectedBranchCodes] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [salesCatFilter, setSalesCatFilter] = useState(null); // A/B/C/Unidentified
  const [riskCatFilter,  setRiskCatFilter]  = useState(null); // A/B/C

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
    getAllChannels().then((r) => setChannels(r?.results || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    getPaymentHealthReport({
      valueType,
      branchCodes:   selectedBranchCodes,
      channels:      selectedChannels,
      salesCategory: salesCatFilter,
      riskCategory:  riskCatFilter,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load report");
        setData(null);
      } else setData(res);
      setLoading(false);
    });
  }, [valueType, selectedBranchCodes, selectedChannels, salesCatFilter, riskCatFilter]);

  const branchLabelFor = (code) => branches.find((b) => b.code === code)?.name || code;

  const channelFilterOptions = useMemo(() => {
    const seen = new Set();
    (data?.results || []).forEach((r) => { if (r.channel) seen.add(r.channel); });
    return [...seen].sort().map((c) => ({ text: c, value: c }));
  }, [data]);

  const rows = useMemo(() => {
    const results = data?.results || [];
    if (!results.length) return [];
    const t = data?.totals || {};
    return [
      ...results,
      {
        isGrandTotal:    true,
        customer_code:   "",
        customer_name:   "Grand Total",
        channel:         "",
        branch_short:    "",
        branch_code:     "",
        salesman_code:   "",
        salesman_name:   "",
        salesman_mobile: "",
        overdue_balance: t.overdue_balance || 0,
        not_yet_due:     t.not_yet_due     || 0,
        total_due:       t.total_due       || 0,
        ytd_sales_value: t.ytd_sales_value || 0,
      },
    ];
  }, [data]);

  const SarCell = ({ v, r, danger }) => (
    <span style={{
      fontSize: 11,
      fontWeight: r.isGrandTotal ? 700 : 500,
      color: danger && v > 0 ? "#DC2626" : undefined,
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      {fmtNum(v)} {v !== 0 && v != null && <RiyalIcon width={9} height={9} color="currentColor" />}
    </span>
  );

  const columns = [
    { title: "Branch", dataIndex: "branch_short", key: "branch_short", width: 110, fixed: "left",
      render: (v, r) => r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.branch_short, "Search branch") },
    { title: "Cust. No.", dataIndex: "customer_code", key: "customer_code", width: 90,
      render: (v, r) => r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.customer_code, "Search code") },
    { title: "Customer", dataIndex: "customer_name", key: "customer_name", width: 220, ellipsis: true,
      render: (v, r) => {
        if (r.isGrandTotal) return <b style={{ fontSize: 11 }}>{v}</b>;
        return (
          <span className="report-clickable-name" style={{ fontSize: 11 }}
            onClick={() => openCustomerAnalysis({
              customerCode: r.customer_code, branchCode: r.branch_code, channel: r.channel,
            })}>
            {v}
          </span>
        );
      },
      ...textSearchProps((r) => r.customer_name, "Search customer") },
    { title: "Channel", dataIndex: "channel", key: "channel", width: 90,
      render: (v, r) => r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      filters: channelFilterOptions, filterMultiple: true,
      onFilter: (value, record) => record.isGrandTotal || record.channel === value },
    { title: <span>Overdue <RiyalIcon width={10} height={10} color="#FFFFFF" /></span>,
      dataIndex: "overdue_balance", key: "overdue_balance", width: 120, align: "right",
      render: (v, r) => <SarCell v={v} r={r} danger />,
      sorter: pinGrandTotal((a, b) => (a.overdue_balance || 0) - (b.overdue_balance || 0)) },
    { title: <span>Not Yet Due <RiyalIcon width={10} height={10} color="#FFFFFF" /></span>,
      dataIndex: "not_yet_due", key: "not_yet_due", width: 120, align: "right",
      render: (v, r) => <SarCell v={v} r={r} />,
      sorter: pinGrandTotal((a, b) => (a.not_yet_due || 0) - (b.not_yet_due || 0)) },
    { title: <span>Total Due <RiyalIcon width={10} height={10} color="#FFFFFF" /></span>,
      dataIndex: "total_due", key: "total_due", width: 120, align: "right",
      render: (v, r) => <SarCell v={v} r={r} />,
      sorter: pinGrandTotal((a, b) => (a.total_due || 0) - (b.total_due || 0)) },
    { title: <span>YTD Sales <RiyalIcon width={10} height={10} color="#FFFFFF" /></span>,
      dataIndex: "ytd_sales_value", key: "ytd_sales_value", width: 130, align: "right",
      render: (v, r) => <SarCell v={v} r={r} />,
      sorter: pinGrandTotal((a, b) => (a.ytd_sales_value || 0) - (b.ytd_sales_value || 0)) },
    { title: <span>Monthly Avg <RiyalIcon width={10} height={10} color="#FFFFFF" /></span>,
      dataIndex: "monthly_avg_sales", key: "monthly_avg_sales", width: 130, align: "right",
      render: (v, r) => r.isGrandTotal ? "" : <SarCell v={v} r={r} />,
      sorter: pinGrandTotal((a, b) => (a.monthly_avg_sales || 0) - (b.monthly_avg_sales || 0)) },
    { title: "Risk %", dataIndex: "risk_pct", key: "risk_pct", width: 90, align: "right",
      render: (v, r) => {
        if (r.isGrandTotal) return "";
        if (v == null) return <span style={{ color: "#94A3B8", fontSize: 11 }}>-</span>;
        const color = v > 70 ? "#DC2626" : v > 20 ? "#F59E0B" : "#16A34A";
        return <span style={{ color, fontSize: 11, fontWeight: 600 }}>{v}%</span>;
      },
      sorter: pinGrandTotal((a, b) => (a.risk_pct ?? -Infinity) - (b.risk_pct ?? -Infinity)) },
    { title: "Sales Cat", dataIndex: "sales_category", key: "sales_category", width: 100, align: "center",
      render: (v, r) => r.isGrandTotal ? "" : <SalesCatTag v={v} /> },
    { title: "Risk Cat", dataIndex: "risk_category", key: "risk_category", width: 80, align: "center",
      render: (v, r) => r.isGrandTotal ? "" : <RiskCatTag v={v} /> },
    { title: "Score", dataIndex: "score", key: "score", width: 100, align: "center", fixed: "right",
      render: (v, r) => r.isGrandTotal ? "" : <ScoreCell score={v} max={r.max_score} />,
      defaultSortOrder: "ascend",
      sorter: pinGrandTotal((a, b) => (a.score || 0) - (b.score || 0)) },
  ];

  const exportToExcel = async () => {
    const results = data?.results || [];
    if (!results.length) {
      message.warning("No data to export");
      return;
    }
    const t = data?.totals || {};
    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const scoreFill = (r) => {
      if (!r.max_score) return null;
      const ratio = (r.score || 0) / r.max_score;
      if (ratio >= 0.75) return "FF16A34A";
      if (ratio >= 0.5)  return "FFF59E0B";
      if (ratio >= 0.25) return "FFEA580C";
      return "FFDC2626";
    };
    const cols = [
      { header: "Branch",         key: "branch_short",    width: 22 },
      { header: "Cust. No.",      key: "customer_code",   width: 12 },
      { header: "Customer Name",  key: "customer_name",   width: 32 },
      { header: "Channel",        key: "channel",         width: 10 },
      { header: "Overdue (SAR)",     key: "overdue_balance",   width: 16, type: "number", format: numFmt },
      { header: "Not Yet Due (SAR)", key: "not_yet_due",       width: 16, type: "number", format: numFmt },
      { header: "Total Due (SAR)",   key: "total_due",         width: 16, type: "number", format: numFmt },
      { header: "YTD Sales (SAR)",   key: "ytd_sales_value",   width: 18, type: "number", format: numFmt },
      { header: "Monthly Avg (SAR)", key: "monthly_avg_sales", width: 18, type: "number", format: numFmt },
      { header: "Risk %",         key: "risk_pct",        width: 10, type: "number" },
      { header: "Sales Cat",      key: "sales_category",  width: 12 },
      { header: "Risk Cat",       key: "risk_category",   width: 10 },
      { header: "Score",          key: "score",           width: 8, type: "number", align: "center",
        cellStyle: (r) => {
          const fill = scoreFill(r);
          return fill ? { fill, font: "FFFFFFFF", bold: true } : null;
        } },
    ];
    const rowsForExcel = [
      ...results,
      {
        branch_short: "", customer_code: "", customer_name: "Grand Total",
        channel: "",
        overdue_balance: t.overdue_balance || 0,
        not_yet_due:     t.not_yet_due     || 0,
        total_due:       t.total_due       || 0,
        ytd_sales_value: t.ytd_sales_value || 0,
        monthly_avg_sales: "", risk_pct: "", sales_category: "", risk_category: "",
        score: "",
      },
    ];
    const scopeParts = [
      `${valueType.toUpperCase()} value · YTD ${data?.months_elapsed || ""} month${data?.months_elapsed === 1 ? "" : "s"}`,
    ];
    if (selectedBranchCodes.length) scopeParts.push(`Branches ${selectedBranchCodes.map(branchLabelFor).join(", ")}`);
    if (selectedChannels.length)     scopeParts.push(`Channels ${selectedChannels.join(", ")}`);
    if (salesCatFilter)              scopeParts.push(`Sales ${salesCatFilter}`);
    if (riskCatFilter)               scopeParts.push(`Risk ${riskCatFilter}`);

    await exportRowsToExcel({
      sheetName: "Payment Health",
      fileName:  "Payment_Health_Report",
      subtitle:  scopeParts.join(" · "),
      columns:   cols,
      rows:      rowsForExcel,
    });
  };

  const hasFilters = selectedBranchCodes.length || selectedChannels.length || salesCatFilter || riskCatFilter;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "12px 4px" }}>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Branches:</span>
          <Select
            mode="multiple" allowClear showSearch optionFilterProp="label"
            placeholder="All branches"
            value={selectedBranchCodes} onChange={setSelectedBranchCodes}
            style={{ minWidth: 200 }} maxTagCount="responsive"
            options={branches.map((b) => ({ label: b.name, value: b.code }))}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Channels:</span>
          <Select
            mode="multiple" allowClear showSearch optionFilterProp="label"
            placeholder="All channels"
            value={selectedChannels} onChange={setSelectedChannels}
            style={{ minWidth: 200 }} maxTagCount="responsive"
            options={channels.map((c) => ({ label: c.name, value: c.name }))}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Sales:</span>
          <Segmented
            value={salesCatFilter || "all"}
            onChange={(v) => setSalesCatFilter(v === "all" ? null : v)}
            options={[
              { label: "All", value: "all" },
              { label: "A", value: "A" }, { label: "B", value: "B" }, { label: "C", value: "C" },
              { label: "Unidentified", value: "Unidentified" },
            ]}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Risk:</span>
          <Segmented
            value={riskCatFilter || "all"}
            onChange={(v) => setRiskCatFilter(v === "all" ? null : v)}
            options={[
              { label: "All", value: "all" },
              { label: "A", value: "A" }, { label: "B", value: "B" }, { label: "C", value: "C" },
            ]}
          />
        </Space>
        <div style={{ flex: 1 }} />
        {hasFilters ? (
          <Space size={4} wrap>
            {selectedBranchCodes.map((code) => (
              <Tag key={`b-${code}`} closable
                onClose={(e) => { e.preventDefault(); setSelectedBranchCodes((c) => c.filter((x) => x !== code)); }}
                color="geekblue">Branch: {branchLabelFor(code)}</Tag>
            ))}
            {selectedChannels.map((name) => (
              <Tag key={`c-${name}`} closable
                onClose={(e) => { e.preventDefault(); setSelectedChannels((c) => c.filter((x) => x !== name)); }}
                color="purple">Channel: {name}</Tag>
            ))}
            {salesCatFilter && (
              <Tag closable onClose={(e) => { e.preventDefault(); setSalesCatFilter(null); }} color="cyan">
                Sales: {salesCatFilter}
              </Tag>
            )}
            {riskCatFilter && (
              <Tag closable onClose={(e) => { e.preventDefault(); setRiskCatFilter(null); }} color="volcano">
                Risk: {riskCatFilter}
              </Tag>
            )}
            <Button icon={<CloseCircleFilled />}
              onClick={() => {
                setSelectedBranchCodes([]);
                setSelectedChannels([]);
                setSalesCatFilter(null);
                setRiskCatFilter(null);
              }}>
              Clear filters
            </Button>
          </Space>
        ) : null}
        <Button type="primary" icon={<DownloadOutlined />}
          disabled={!data?.results?.length} onClick={exportToExcel}>
          Export Excel
        </Button>
      </div>

      {/* Summary strip */}
      {data?.totals && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, padding: "6px 4px 12px",
          fontSize: 12, color: "#64748B",
        }}>
          <div><SafetyCertificateOutlined /> <b>{fmtNum(data.totals.customer_count)}</b> customers</div>
          <div>·</div>
          <div>Total Due <b style={{ color: "#0F172A" }}>{fmtNum(data.totals.total_due)}</b> SAR</div>
          <div>·</div>
          <div>Overdue <b style={{ color: "#DC2626" }}>{fmtNum(data.totals.overdue_balance)}</b> SAR</div>
          <div>·</div>
          <div>Not Yet Due <b style={{ color: "#0F766E" }}>{fmtNum(data.totals.not_yet_due)}</b> SAR</div>
          <div>·</div>
          <div>YTD Sales <b style={{ color: "#0F172A" }}>{fmtNum(data.totals.ytd_sales_value)}</b> SAR</div>
        </div>
      )}

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div style={{ background: "var(--color-bg-card)", borderRadius: 8, padding: 6 }}>
          <Table
            rowKey={(r) => (r.isGrandTotal ? "__grand_total__" : `${r.customer_code}-${r.branch_code}`)}
            size="small"
            className="sto-table"
            pagination={{
              current: currentPage,
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: [25, 50, 100, 200],
              showTotal: (total) => `${total} customers`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
              onShowSizeChange: (_, size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
            }}
            loading={loading}
            dataSource={rows}
            columns={columns}
            rowClassName={(r) => (r.isGrandTotal ? "report-grand-total-row" : "")}
            scroll={{ x: 1600, y: "calc(100vh - 400px)" }}
            sticky
          />
        </div>
      )}
    </div>
  );
};

export default PaymentHealthReport;
