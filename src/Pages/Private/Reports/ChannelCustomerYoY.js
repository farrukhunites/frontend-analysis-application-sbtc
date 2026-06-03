import { useContext, useEffect, useMemo, useState } from "react";
import { Table, Select, Skeleton, message, Button, Empty, Input, Space } from "antd";
import { DownloadOutlined, PlusOutlined, MinusOutlined, SearchOutlined } from "@ant-design/icons";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllChannels } from "../../../API/Channels";
import { getChannelCustomerYoY, getCustomerInvoiceBreakdown } from "../../../API/Reports";
import InvoiceBreakdownModal from "./InvoiceBreakdownModal";
import "./ChannelCustomerYoY.css";
import "./reports.css";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const openCustomerAnalysis = ({ customerCode, branchCode, channel, productCode }) => {
  const params = new URLSearchParams({
    customer_code: customerCode,
    branch_code:   branchCode || "",
    channel_code:  channel || "",
    ...(productCode && { product_code: productCode }),
  });
  window.open(`/customer-analysis?${params.toString()}`, "_blank");
};

// Column search-by-name props (grand-total row stays pinned regardless of filter)
const nameSearchProps = (getName) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        placeholder="Search customer"
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
  filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "var(--color-accent)" : undefined }} />,
  onFilter: (value, record) =>
    record.isGrandTotal || (getName(record) || "").toString().toLowerCase().includes(value.toLowerCase()),
});

const GrowthCell = ({ pct, value }) => {
  if (pct == null || value == null || value === 0) return <span style={{ color: "#64748B" }}>-</span>;
  const up = value >= 0;
  const color = up ? "#10B981" : "#EF4444";
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div style={{ color, fontWeight: 600, fontSize: 12 }}>
        {up ? "+" : ""}{(pct * 100).toFixed(0)}%
      </div>
      <div style={{ color: "#94A3B8", fontSize: 10 }}>{up ? "+" : ""}{fmtNum(value)}</div>
    </div>
  );
};

const ChannelCustomerYoY = () => {
  const { selectedProduct }     = useContext(ProductContext);
  const { unitType, valueType } = useContext(UnitValueContext);

  const [channels, setChannels]               = useState([]);
  const [branches, setBranches]               = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedBranch, setSelectedBranch]   = useState("ALL");
  const [loading, setLoading]                 = useState(false);
  const [data, setData]                       = useState(null);
  const [expandedYears, setExpandedYears]     = useState(new Set());
  const [breakdown, setBreakdown]             = useState({
    open: false, loading: false, data: null,
    customerCode: null, customerName: null,
    year: null, month: null, isKa: false,
    channel: null, branchCode: null, productCode: null,
  });

  // Load channels + branches once
  useEffect(() => {
    getAllChannels().then((res) => {
      const list = res?.results || [];
      setChannels(list);
      // SalesTransaction.otlcd stores the channel NAME (e.g. "WS"), not the code
      if (list.length) setSelectedChannel(list[0].name);
    });
    getAllBranches().then((res) => setBranches(res?.results || []));
  }, []);

  const isKAChannel = (selectedChannel || "").toUpperCase() === "KA";

  // "All Branches" is only valid for KA — fall back to first branch otherwise
  useEffect(() => {
    if (!isKAChannel && selectedBranch === "ALL" && branches.length) {
      setSelectedBranch(branches[0].code);
    }
  }, [isKAChannel, selectedBranch, branches]);

  // Fetch report
  useEffect(() => {
    if (!selectedChannel || !selectedProduct?.code) return;
    setLoading(true);
    getChannelCustomerYoY({
      channel:      selectedChannel,
      branchCode:   selectedBranch,
      productCodes: selectedProduct.code,
      unitType,
      valueType,
    }).then((res) => {
      if (res?.error) { message.error("Failed to load report"); setData(null); }
      else setData(res);
      setLoading(false);
    });
  }, [selectedChannel, selectedBranch, selectedProduct, unitType, valueType]);

  const toggleYear = (year) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  // Cell click only works with a single branch (need branch_code on the backend)
  const breakdownClickable = selectedBranch !== "ALL";

  const openBreakdown = ({ row, year, month }) => {
    if (!breakdownClickable || row.isGrandTotal) return;
    setBreakdown({
      open: true, loading: true, data: null,
      customerCode: row.code,
      customerName: row.name,
      year, month, isKa: isKAChannel,
      channel:     selectedChannel,
      branchCode:  selectedBranch,
      productCode: selectedProduct?.code,
    });
    getCustomerInvoiceBreakdown({
      customerCode: row.code,
      isKa:         isKAChannel,
      channel:      selectedChannel,
      branchCode:   selectedBranch,
      productCodes: selectedProduct?.code,
      year,
      month,
      unitType,
      valueType,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load invoice breakdown");
        setBreakdown((b) => ({ ...b, loading: false }));
      } else {
        setBreakdown((b) => ({ ...b, loading: false, data: res }));
      }
    });
  };

  const closeBreakdown = () => setBreakdown((b) => ({ ...b, open: false }));

  const columns = useMemo(() => {
    if (!data) return [];
    const { years, months_by_year, growth_pairs } = data;

    const isKA = (selectedChannel || "").toUpperCase() === "KA";
    const linkable = !isKA && selectedBranch !== "ALL";   // need a single customer + single branch

    const cols = [
      {
        title: "Customer",
        fixed: "left",
        width: 220,
        ...nameSearchProps((r) => r.name),
        render: (_, r) => {
          if (r.isGrandTotal) return <b>{r.name}</b>;
          const nameEl = linkable ? (
            <div
              className="report-clickable-name"
              style={{ fontSize: 12 }}
              onClick={() => openCustomerAnalysis({
                customerCode: r.code,
                branchCode:   selectedBranch,
                channel:      selectedChannel,
                productCode:  selectedProduct?.code,
              })}
            >
              {r.name}
            </div>
          ) : (
            <div style={{ fontWeight: 500, fontSize: 12 }}>{r.name}</div>
          );
          return (
            <div>
              {nameEl}
              <div style={{ fontSize: 11, color: "#64748B" }}>{r.code}</div>
            </div>
          );
        },
      },
    ];

    years.forEach((year) => {
      const expanded = expandedYears.has(year);
      const monthCols = expanded
        ? (months_by_year[String(year)] || []).map((m) => ({
            title: MONTHS[m],
            dataIndex: `m_${year}_${String(m).padStart(2, "0")}`,
            align: "right",
            width: 64,
            render: (v, r) => {
              if (v == null || v === 0 || r.isGrandTotal || !breakdownClickable) {
                return <span style={{ fontSize: 12 }}>{fmtNum(v)}</span>;
              }
              return (
                <span
                  className="report-clickable-name"
                  style={{ fontSize: 12 }}
                  onClick={() => openBreakdown({ row: r, year, month: m })}
                >
                  {fmtNum(v)}
                </span>
              );
            },
          }))
        : [];

      cols.push({
        title: (
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {year}
            <span
              className="yoy-year-toggle"
              onClick={(e) => { e.stopPropagation(); toggleYear(year); }}
              title={expanded ? "Hide months" : "Show months"}
            >
              {expanded ? <MinusOutlined /> : <PlusOutlined />}
            </span>
          </span>
        ),
        children: [
          ...monthCols,
          {
            title: "Total",
            dataIndex: `y_${year}`,
            align: "right",
            width: 96,
            sorter: (a, b) => (a[`y_${year}`] || 0) - (b[`y_${year}`] || 0),
            render: (v, r) => {
              if (v == null || v === 0 || r.isGrandTotal || !breakdownClickable) {
                return <b style={{ color: "var(--color-primary)" }}>{fmtNum(v)}</b>;
              }
              return (
                <b
                  className="report-clickable-name"
                  style={{ color: "var(--color-primary)" }}
                  onClick={() => openBreakdown({ row: r, year, month: null })}
                >
                  {fmtNum(v)}
                </b>
              );
            },
            onCell: () => ({ style: { background: "rgba(245,158,11,0.08)" } }),
            onHeaderCell: () => ({ style: { background: "#243f6a" } }),
          },
        ],
      });
    });

    growth_pairs.forEach((g) => {
      const shortLabel = g.partial ? `${g.prev}→${g.curr}*` : `${g.prev}→${g.curr}`;
      cols.push({
        title: shortLabel,
        dataIndex: `gp_${g.prev}_${g.curr}`,
        align: "center",
        width: 92,
        sorter: (a, b) => (a[`gp_${g.prev}_${g.curr}`] || 0) - (b[`gp_${g.prev}_${g.curr}`] || 0),
        render: (pct, r) => <GrowthCell pct={pct} value={r[`gv_${g.prev}_${g.curr}`]} />,
      });
    });

    return cols;
  }, [data, expandedYears, selectedChannel, selectedBranch, selectedProduct, breakdownClickable]);

  const dataSource = useMemo(() => {
    if (!data) return [];
    const rows = data.rows.map((r, i) => ({ ...r, key: i }));
    return [...rows, { ...data.grand_total, key: "grand-total", isGrandTotal: true }];
  }, [data]);

  // ── Excel export (full monthly matrix) ──────────────────────────────────
  const exportToExcel = async () => {
    if (!data || !data.rows.length) { message.warning("No data to export"); return; }
    const { years, months_by_year, growth_pairs, rows, grand_total } = data;

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "SBTC Sales Analysis";
    const ws = wb.addWorksheet("Customer YoY", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });

    const NAV = "1E3A5F";  const NAV2 = "243F6A";
    const GOLD = "FEF3C7"; const TOTAL_FILL = "FFF3CD";
    const WHITE = "FFFFFFFF";
    const thin = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';

    const hdr = (bg) => ({
      font: { bold: true, size: 10, color: { argb: WHITE } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: bdr,
    });

    // Build flat column plan
    const plan = [{ key: "name", label: "Customer", sub: "", group: "" }];
    years.forEach((y) => {
      (months_by_year[String(y)] || []).forEach((m) => {
        plan.push({ key: `m_${y}_${String(m).padStart(2, "0")}`, label: String(y), sub: MONTHS[m], group: "year", isTotal: false });
      });
      plan.push({ key: `y_${y}`, label: String(y), sub: "Total", group: "year", isTotal: true });
    });
    growth_pairs.forEach((g) => {
      plan.push({ key: `gv_${g.prev}_${g.curr}`, label: g.label, sub: "Value", group: "growth", isPct: false });
      plan.push({ key: `gp_${g.prev}_${g.curr}`, label: g.label, sub: "%",     group: "growth", isPct: true });
    });

    // Row 1 (group headers, merged) + Row 2 (subheaders)
    const r1 = ws.getRow(1); r1.height = 20;
    const r2 = ws.getRow(2); r2.height = 18;
    r1.getCell(1).value = "Customer"; r1.getCell(1).style = hdr(NAV);
    r2.getCell(1).value = "";          r2.getCell(1).style = hdr(NAV);
    ws.mergeCells(1, 1, 2, 1);

    // Merge group headers across contiguous same-label columns
    let c = 2;
    while (c <= plan.length) {
      const p = plan[c - 1];
      let span = 1;
      while (c - 1 + span < plan.length && plan[c - 1 + span].label === p.label && plan[c - 1 + span].group === p.group) span++;
      const bg = p.group === "growth" ? NAV2 : NAV;
      r1.getCell(c).value = p.label;
      r1.getCell(c).style = hdr(bg);
      if (span > 1) ws.mergeCells(1, c, 1, c + span - 1);
      for (let k = 0; k < span; k++) {
        const cell = r2.getCell(c + k);
        cell.value = plan[c - 1 + k].sub;
        cell.style = hdr(plan[c - 1 + k].isTotal ? NAV2 : bg);
      }
      c += span;
    }

    // Data + grand total rows
    const allRows = [...rows, { ...grand_total, isGrandTotal: true }];
    allRows.forEach((row, ri) => {
      const dr = ws.addRow({}); dr.height = 16;
      const isGT = row.isGrandTotal;
      const baseBg = isGT ? `FF${GOLD}` : ri % 2 === 0 ? WHITE : "FFF8FAFC";

      plan.forEach((p, pi) => {
        const cell = dr.getCell(pi + 1);
        if (p.key === "name") {
          cell.value = isGT ? row.name : `${row.name} (${row.code})`;
          cell.style = {
            font: { bold: isGT, size: 10 },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } },
            alignment: { vertical: "middle" }, border: bdr,
          };
          return;
        }
        const val = row[p.key];
        if (p.isPct) {
          cell.value = (val == null) ? null : val;
          const pos = (val || 0) >= 0;
          cell.style = {
            numFmt: "0%",
            font: { bold: isGT, size: 10, color: { argb: val == null ? "FF64748B" : pos ? "FF008000" : "FFFF0000" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } },
            alignment: { horizontal: "right", vertical: "middle" }, border: bdr,
          };
        } else {
          const isGrowthVal = p.group === "growth";
          const pos = (val || 0) >= 0;
          cell.value = val || null;
          cell.style = {
            numFmt,
            font: { bold: isGT || p.isTotal, size: 10,
                    color: { argb: isGrowthVal && val ? (pos ? "FF008000" : "FFFF0000") : "FF1E293B" } },
            fill: { type: "pattern", pattern: "solid",
                    fgColor: { argb: isGT ? `FF${GOLD}` : p.isTotal ? `FF${TOTAL_FILL}` : baseBg } },
            alignment: { horizontal: "right", vertical: "middle" }, border: bdr,
          };
        }
      });
    });

    // Column widths
    ws.getColumn(1).width = 34;
    for (let i = 2; i <= plan.length; i++) {
      ws.getColumn(i).width = plan[i - 1].group === "growth" ? 13 : plan[i - 1].isTotal ? 12 : 9;
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const chName = selectedChannel;
    const brName = selectedBranch === "ALL" ? "All_Branches" : (branches.find((b) => b.code === selectedBranch)?.name || selectedBranch);
    a.href = url;
    a.download = `Customer_YoY_${chName}_${brName}_${selectedProduct?.name || ""}.xlsx`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Channel:</span>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ minWidth: 160 }}
          value={selectedChannel}
          onChange={setSelectedChannel}
          options={channels.map((ch) => ({ value: ch.name, label: ch.name }))}
        />

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Branch:</span>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ minWidth: 200 }}
          value={selectedBranch}
          onChange={setSelectedBranch}
          options={[
            { value: "ALL", label: "All Branches", disabled: !isKAChannel },
            ...branches.map((b) => ({ value: b.code, label: b.name })),
          ]}
        />

        <span style={{ fontSize: 12, color: "#94A3B8" }}>
          Product: <b style={{ color: "#64748B" }}>{selectedProduct?.name || "-"}</b> · {valueType?.toUpperCase()} · {unitType?.toUpperCase()}
        </span>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          style={{ marginLeft: "auto" }}
          disabled={loading || !data?.rows?.length}
          onClick={exportToExcel}
        >
          Export to Excel
        </Button>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : !data || !data.rows.length ? (
        <Empty description="No data for this selection" />
      ) : (
        <Table
          bordered
          size="small"
          columns={columns}
          dataSource={dataSource}
          pagination={{ pageSize: 50, showSizeChanger: false, size: "small" }}
          scroll={{ x: "max-content", y: "55vh" }}
          rowClassName={(r) => (r.isGrandTotal ? "yoy-grand-total-row" : "")}
        />
      )}

      {data?.growth_pairs?.some((g) => g.partial) && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
          * Latest growth column compares Jan–{MONTHS[data.current_month]} of both years (year-to-date).
        </div>
      )}

      <InvoiceBreakdownModal
        state={breakdown}
        onClose={closeBreakdown}
        unitType={unitType}
      />
    </div>
  );
};

export default ChannelCustomerYoY;
