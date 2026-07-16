import { useContext, useEffect, useMemo, useState } from "react";
import {
  Table,
  Skeleton,
  message,
  Button,
  Tag,
  Space,
  Select,
  Switch,
  Tooltip,
  Input,
} from "antd";
import {
  CloseCircleFilled,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getAllChannels } from "../../../API/Channels";
import { getCustomerSalesVariance } from "../../../API/Reports";
import MonthRangePicker from "../../../Components/MonthRangePicker";
import RiyalIcon from "../../../Utils/RiyalIcon";
import { openCustomerAnalysis, exportRowsToExcel, pinGrandTotal } from "./reportUtils";
import "./reports.css";

const fmtNum = (v) =>
  v === 0 || v == null
    ? "-"
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const VarianceCell = ({ v }) => {
  if (v == null || v === 0)
    return <span style={{ color: "#64748B", fontSize: 11 }}>-</span>;
  const good = v >= 0;
  const color = good ? "#10B981" : "#EF4444";
  const bg = good ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  return (
    <span
      style={{
        color,
        background: bg,
        padding: "1px 6px",
        borderRadius: 3,
        fontWeight: 600,
        fontSize: 11,
        display: "inline-block",
      }}
    >
      {good ? "+" : ""}
      {fmtNum(v)}
    </span>
  );
};

// Column search wrapper — grand total row stays pinned regardless of filter.
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

const CustomerSalesVariance = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";

  const unitLabel = isValueMode ? (
    <RiyalIcon width={11} height={11} color="#FFFFFF" />
  ) : (
    (unitType || "ctn").toUpperCase()
  );
  const unitLabelStr = isValueMode ? "SAR" : (unitType || "ctn").toUpperCase();

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedBranchCodes, setSelectedBranchCodes] = useState([]);
  const [selectedProductCodes, setSelectedProductCodes] = useState([]);

  // Default range = YTD: Jan of current year → current calendar month. This is
  // the framing this report is usually consumed in (biggest droppers vs LY YTD).
  const anchorMonth = selectedMonth ? dayjs(selectedMonth, "YYYYMM") : dayjs();
  const [fromMonth, setFromMonth] = useState(anchorMonth.startOf("year"));
  const [toMonth,   setToMonth]   = useState(anchorMonth.startOf("month"));
  const fromMonthStr = fromMonth ? fromMonth.format("YYYYMM") : null;
  const toMonthStr   = toMonth   ? toMonth.format("YYYYMM")   : null;

  // "full" = LY window mirrors TY months in whole
  // "exact" = when TY tail is the current calendar month, LY tail is clipped
  //           day-for-day (matches Sales Target Overview's LY MTD toggle).
  // Default to exact so the comparison is like-for-like at first glance.
  const [lyExactMode, setLyExactMode] = useState(true);
  const lyMode = lyExactMode ? "exact" : "full";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
    getAllProducts().then((r) => setProducts(r?.results || []));
    getAllChannels().then((r) => setChannels(r?.results || []));
  }, []);

  useEffect(() => {
    if (!fromMonthStr || !toMonthStr) return;
    setLoading(true);
    getCustomerSalesVariance({
      fromMonth:    fromMonthStr,
      toMonth:      toMonthStr,
      unitType:     effectiveUnitType,
      valueType,
      branchCodes:  selectedBranchCodes,
      channels:     selectedChannels,
      productCodes: selectedProductCodes,
      lyMode,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load report");
        setData(null);
      } else setData(res);
      setLoading(false);
    });
  }, [
    fromMonthStr,
    toMonthStr,
    effectiveUnitType,
    valueType,
    selectedBranchCodes,
    selectedChannels,
    selectedProductCodes,
    lyMode,
  ]);

  const branchLabelFor = (code) =>
    branches.find((b) => b.code === code)?.name || code;
  const productLabelFor = (code) => {
    if (code === "9999901") return "INDOMIE PILLOW (All)";
    if (code === "9999902") return "INDOMIE CUP (All)";
    return products.find((p) => p.code === code)?.name || code;
  };

  // Rows for the table: append a pinned grand-total row so it survives sort.
  const rows = useMemo(() => {
    const results = data?.results || [];
    if (!results.length) return [];
    const t = data?.totals || {};
    return [
      ...results,
      {
        isGrandTotal:  true,
        customer_code: "",
        customer_name: "Grand Total",
        channel:       "",
        branch_short:  "",
        branch_code:   "",
        salesman_code: "",
        salesman_name: "",
        mobile_no:     "",
        this_year:     t.this_year || 0,
        last_year:     t.last_year || 0,
        variance:      t.variance  || 0,
      },
    ];
  }, [data]);

  // Channel filter options come from the current result set so users only see
  // channels that actually appear in the visible rows.
  const channelFilterOptions = useMemo(() => {
    const seen = new Set();
    (data?.results || []).forEach((r) => {
      if (r.channel) seen.add(r.channel);
    });
    return [...seen].sort().map((c) => ({ text: c, value: c }));
  }, [data]);

  const columns = [
    {
      title: "Branch",
      dataIndex: "branch_short",
      key: "branch_short",
      width: 110,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.branch_short, "Search branch"),
    },
    {
      title: "Cust. No.",
      dataIndex: "customer_code",
      key: "customer_code",
      width: 90,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.customer_code, "Search code"),
    },
    {
      title: "Customer Name",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 220,
      ellipsis: true,
      render: (v, r) => {
        if (r.isGrandTotal) return <b style={{ fontSize: 11 }}>{v}</b>;
        return (
          <span
            className="report-clickable-name"
            style={{ fontSize: 11 }}
            onClick={() =>
              openCustomerAnalysis({
                customerCode: r.customer_code,
                branchCode:   r.branch_code,
                channel:      r.channel,
              })
            }
          >
            {v}
          </span>
        );
      },
      ...textSearchProps((r) => r.customer_name, "Search customer"),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 90,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      filters: channelFilterOptions,
      filterMultiple: true,
      onFilter: (value, record) => record.isGrandTotal || record.channel === value,
    },
    {
      title: "Salesman No.",
      dataIndex: "salesman_code",
      key: "salesman_code",
      width: 100,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.salesman_code, "Search code"),
    },
    {
      title: "Salesman Name",
      dataIndex: "salesman_name",
      key: "salesman_name",
      width: 220,
      ellipsis: true,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.salesman_name, "Search salesman"),
    },
    {
      title: "Mobile No.",
      dataIndex: "mobile_no",
      key: "mobile_no",
      width: 120,
      render: (v, r) =>
        r.isGrandTotal ? "" : <span style={{ fontSize: 11 }}>{v}</span>,
      ...textSearchProps((r) => r.mobile_no, "Search mobile"),
    },
    {
      title: <span>This Year ({unitLabel})</span>,
      dataIndex: "this_year",
      key: "this_year",
      width: 110,
      align: "right",
      render: (v, r) => (
        <span style={{ fontSize: 11, fontWeight: r.isGrandTotal ? 700 : 400 }}>
          {fmtNum(v)}
        </span>
      ),
      sorter: pinGrandTotal((a, b) => (a.this_year || 0) - (b.this_year || 0)),
    },
    {
      title: <span>Last Year ({unitLabel})</span>,
      dataIndex: "last_year",
      key: "last_year",
      width: 110,
      align: "right",
      render: (v, r) => (
        <span style={{ fontSize: 11, fontWeight: r.isGrandTotal ? 700 : 400 }}>
          {fmtNum(v)}
        </span>
      ),
      sorter: pinGrandTotal((a, b) => (a.last_year || 0) - (b.last_year || 0)),
    },
    {
      title: <span>Variance ({unitLabel})</span>,
      dataIndex: "variance",
      key: "variance",
      width: 120,
      align: "right",
      defaultSortOrder: "ascend",
      render: (v) => <VarianceCell v={v} />,
      sorter: pinGrandTotal((a, b) => (a.variance || 0) - (b.variance || 0)),
    },
  ];

  const exportToExcel = async () => {
    const results = data?.results || [];
    if (!results.length) {
      message.warning("No data to export");
      return;
    }
    const period = fromMonthStr === toMonthStr
      ? fromMonthStr
      : `${fromMonthStr} — ${toMonthStr}`;
    const lySuffix = data?.ly_exact_active ? ` · LY exact day 1–${dayjs().date()}` : "";
    const channelSuffix = selectedChannels.length
      ? ` · Channels ${selectedChannels.join(", ")}`
      : "";

    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const cols = [
      { header: "Branch",         key: "branch_short",  width: 22 },
      { header: "Cust. No.",      key: "customer_code", width: 12 },
      { header: "Customer Name",  key: "customer_name", width: 32 },
      { header: "Channel",        key: "channel",       width: 10 },
      { header: "Salesman No.",   key: "salesman_code", width: 12 },
      { header: "Salesman Name",  key: "salesman_name", width: 26 },
      { header: "Mobile No.",     key: "mobile_no",     width: 14 },
      { header: `This Year (${unitLabelStr})`, key: "this_year", width: 16, type: "number", format: numFmt },
      { header: `Last Year (${unitLabelStr})`, key: "last_year", width: 16, type: "number", format: numFmt },
      { header: `Variance (${unitLabelStr})`,  key: "variance",  width: 16, type: "number", format: numFmt },
    ];
    const t = data?.totals || {};
    const rowsForExcel = [
      ...results,
      {
        branch_short:  "",
        customer_code: "",
        customer_name: "Grand Total",
        channel:       "",
        salesman_code: "",
        salesman_name: "",
        mobile_no:     "",
        this_year:     t.this_year || 0,
        last_year:     t.last_year || 0,
        variance:      t.variance  || 0,
      },
    ];
    await exportRowsToExcel({
      sheetName: "Customer Sales Variance",
      fileName:  `Customer_Sales_Variance_${(period || "").replace(/\s+/g, "_")}`,
      subtitle:  `Period ${period} · Unit ${unitLabelStr} · ${valueType.toUpperCase()}${channelSuffix}${lySuffix}`,
      columns:   cols,
      rows:      rowsForExcel,
    });
  };

  const hasFilters =
    selectedBranchCodes.length ||
    selectedChannels.length ||
    selectedProductCodes.length;

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: "12px 4px",
        }}
      >
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>From – To:</span>
          <MonthRangePicker
            value={[fromMonth, toMonth]}
            onChange={([from, to]) => {
              setFromMonth(from);
              setToMonth(to);
            }}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Branches:</span>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All branches"
            value={selectedBranchCodes}
            onChange={setSelectedBranchCodes}
            style={{ minWidth: 200 }}
            size="small"
            maxTagCount="responsive"
            options={branches.map((b) => ({ label: b.name, value: b.code }))}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Channels:</span>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All channels"
            value={selectedChannels}
            onChange={setSelectedChannels}
            style={{ minWidth: 200 }}
            size="small"
            maxTagCount="responsive"
            options={channels.map((c) => ({ label: c.name, value: c.name }))}
          />
        </Space>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Products:</span>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All products"
            value={selectedProductCodes}
            onChange={setSelectedProductCodes}
            style={{ minWidth: 220 }}
            size="small"
            maxTagCount="responsive"
            options={products.map((p) => ({ label: p.name, value: p.code }))}
          />
        </Space>
        <Space>
          <Tooltip
            title={
              lyExactMode
                ? "LY tail is day 1..today of last year (day-anchored)."
                : "LY tail is the full same month(s) of last year."
            }
          >
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>LY:</span>
          </Tooltip>
          <Switch
            size="small"
            checked={lyExactMode}
            onChange={setLyExactMode}
            checkedChildren="Exact"
            unCheckedChildren="Whole"
          />
          {data?.ly_exact_active && (
            <Tag color="gold" style={{ fontSize: 11 }}>
              LY: day 1–{dayjs().date()}
            </Tag>
          )}
        </Space>
        <div style={{ flex: 1 }} />
        {hasFilters ? (
          <Space size={4} wrap>
            {selectedBranchCodes.map((code) => (
              <Tag
                key={`b-${code}`}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  setSelectedBranchCodes((cur) => cur.filter((c) => c !== code));
                }}
                color="geekblue"
              >
                Branch: {branchLabelFor(code)}
              </Tag>
            ))}
            {selectedChannels.map((name) => (
              <Tag
                key={`c-${name}`}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  setSelectedChannels((cur) => cur.filter((n) => n !== name));
                }}
                color="purple"
              >
                Channel: {name}
              </Tag>
            ))}
            {selectedProductCodes.map((code) => (
              <Tag
                key={`p-${code}`}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  setSelectedProductCodes((cur) => cur.filter((c) => c !== code));
                }}
                color="blue"
              >
                Product: {productLabelFor(code)}
              </Tag>
            ))}
            <Button
              size="small"
              icon={<CloseCircleFilled />}
              onClick={() => {
                setSelectedBranchCodes([]);
                setSelectedChannels([]);
                setSelectedProductCodes([]);
              }}
            >
              Clear filters
            </Button>
          </Space>
        ) : null}
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          disabled={!data?.results?.length}
          onClick={exportToExcel}
        >
          Export Excel
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div
          style={{
            background: "var(--color-bg-card)",
            borderRadius: 8,
            padding: 6,
          }}
        >
          <Table
            rowKey={(r) => (r.isGrandTotal ? "__grand_total__" : `${r.customer_code}-${r.branch_code}`)}
            size="small"
            className="sto-table"
            pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 200], showTotal: (total) => `${total} customers` }}
            loading={loading}
            dataSource={rows}
            columns={columns}
            rowClassName={(r) => (r.isGrandTotal ? "report-grand-total-row" : "")}
            scroll={{ x: 1350, y: "calc(100vh - 380px)" }}
            sticky
          />
        </div>
      )}
    </div>
  );
};

export default CustomerSalesVariance;
