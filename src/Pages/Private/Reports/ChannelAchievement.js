import { useContext, useEffect, useMemo, useState } from "react";
import {
  Table, Select, Skeleton, message, Button, Empty, Modal, Tag,
} from "antd";
import { DownloadOutlined, ApartmentOutlined } from "@ant-design/icons";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { ProductContext } from "../../../Contexts/ProductContext";
import { getAllBranches } from "../../../API/Branches";
import {
  getChannelAchievement,
  getChannelCustomerMonthBreakdown,
  getCustomerInvoiceBreakdown,
} from "../../../API/Reports";
import InvoiceBreakdownModal from "./InvoiceBreakdownModal";
import { pinGrandTotal } from "./reportUtils";
import "./reports.css";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtPct = (v) => {
  if (v == null || !isFinite(v)) return "-";
  return `${(v * 100).toFixed(1)}%`;
};

const pctColor = (v, threshold = 0.9) => {
  if (v == null || !isFinite(v)) return "#94A3B8";
  return v >= threshold ? "#10B981" : "#EF4444";
};

const StatChip = ({ label, value, accent }) => (
  <div style={{ padding: "8px 14px", background: "#F1F5F9", borderRadius: 8, minWidth: 130 }}>
    <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: accent || "#1E293B" }}>{value}</div>
  </div>
);

const ChannelAchievement = () => {
  const { selectedMonth }       = useDateFilter();
  const { unitType, valueType } = useContext(UnitValueContext);
  const { selectedProduct }     = useContext(ProductContext);

  const [branches, setBranches]         = useState([]);
  const [branchCode, setBranchCode]     = useState("ALL");
  const [lookbackMonths, setLookbackMonths] = useState(12);
  const [loading, setLoading]           = useState(false);
  const [data, setData]                 = useState(null);

  // 1st-level modal: customers in cell (channel × branch-scope × month)
  const [custBreakdown, setCustBreakdown] = useState({
    open: false, loading: false, data: null,
    channel: null, monthYYYYMM: null, monthLabel: null,
  });
  // 2nd-level modal: invoices for a single customer in that month
  const [invBreakdown, setInvBreakdown] = useState({
    open: false, loading: false, data: null,
    customerCode: null, customerName: null,
    year: null, month: null, isKa: false,
    channel: null, branchCode: null, productCode: null,
  });

  useEffect(() => {
    getAllBranches().then((res) => setBranches(res?.results || []));
  }, []);

  // Fetch report
  useEffect(() => {
    if (!selectedMonth || !selectedProduct?.code) return;
    setLoading(true);
    getChannelAchievement({
      productCodes: selectedProduct.code,
      branchCode,
      month: selectedMonth,
      unitType,
      valueType,
      lookbackMonths,
    }).then((res) => {
      if (res?.error) { message.error("Failed to load report"); setData(null); }
      else setData(res);
      setLoading(false);
    });
  }, [selectedProduct, branchCode, selectedMonth, unitType, valueType, lookbackMonths]);

  // ── Drill-down handlers ─────────────────────────────────────────────────
  const openCustomerBreakdown = ({ row, monthNum }) => {
    if (row.isTotal) return;
    const year = data?.year;
    if (!year) return;
    const mYYYYMM = `${year}${String(monthNum).padStart(2, "0")}`;
    const monthLabel = `${MONTHS[monthNum]} ${year}`;
    setCustBreakdown({
      open: true, loading: true, data: null,
      channel: row.channel,
      monthYYYYMM: mYYYYMM,
      monthLabel,
    });
    getChannelCustomerMonthBreakdown({
      channel:      row.channel,
      branchCode,
      month:        mYYYYMM,
      productCodes: selectedProduct?.code,
      unitType,
      valueType,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load customer breakdown");
        setCustBreakdown((b) => ({ ...b, loading: false }));
      } else {
        setCustBreakdown((b) => ({ ...b, loading: false, data: res }));
      }
    });
  };

  const closeCustomerBreakdown = () => setCustBreakdown((b) => ({ ...b, open: false }));

  // From the customer list → drill into a single customer's invoice paid/free
  const openInvoiceBreakdown = (customer) => {
    if (!data || !customBreakdownContext()) return;
    const { year, monthNum } = customBreakdownContext();
    setInvBreakdown({
      open: true, loading: true, data: null,
      customerCode: customer.customer_code,
      customerName: customer.customer_name,
      year, month: monthNum, isKa: false,
      channel:     custBreakdown.channel,
      branchCode:  customer.branch_code,
      productCode: selectedProduct?.code,
    });
    getCustomerInvoiceBreakdown({
      customerCode: customer.customer_code,
      isKa:         false,
      channel:      custBreakdown.channel,
      branchCode:   customer.branch_code,        // always the customer's branch
      productCodes: selectedProduct?.code,
      year,
      month:        monthNum,
      unitType,
      valueType,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load invoice breakdown");
        setInvBreakdown((b) => ({ ...b, loading: false }));
      } else {
        setInvBreakdown((b) => ({ ...b, loading: false, data: res }));
      }
    });
  };

  // Derive year+monthNum from the open cell-month modal so the invoice drill
  // knows exactly which period to query.
  const customBreakdownContext = () => {
    if (!custBreakdown.monthYYYYMM) return null;
    return {
      year:     parseInt(custBreakdown.monthYYYYMM.slice(0, 4), 10),
      monthNum: parseInt(custBreakdown.monthYYYYMM.slice(4), 10),
    };
  };

  const closeInvoiceBreakdown = () => setInvBreakdown((b) => ({ ...b, open: false }));

  // ── Table ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    if (!data) return [];
    const { months, month: latestMonth } = data;

    const monthCols = months.map((m) => ({
      title: m === latestMonth ? <span style={{ color: "#F59E0B" }}>{MONTHS[m]} ★</span> : MONTHS[m],
      dataIndex: `m_${String(m).padStart(2, "0")}`,
      align: "right",
      width: 84,
      render: (v, r) => {
        if (v == null || v === 0 || r.isTotal) {
          return <span style={{ fontSize: 12 }}>{fmtNum(v)}</span>;
        }
        return (
          <span
            className="report-clickable-name"
            style={{ fontSize: 12 }}
            onClick={() => openCustomerBreakdown({ row: r, monthNum: m })}
          >
            {fmtNum(v)}
          </span>
        );
      },
    }));

    return [
      {
        title: "Channel",
        dataIndex: "channel",
        fixed: "left",
        width: 130,
        render: (v, r) =>
          r.isTotal
            ? <b>{v}</b>
            : <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>,
      },
      ...monthCols,
      {
        title: (
          <span>
            Target
            <span style={{ fontSize: 9, marginLeft: 4, color: "#94A3B8", fontStyle: "italic" }}>(est.)</span>
          </span>
        ),
        dataIndex: "month_target",
        align: "right",
        width: 110,
        sorter: pinGrandTotal((a, b) => (a.month_target || 0) - (b.month_target || 0)),
        render: (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
        onHeaderCell: () => ({ style: { background: "#243f6a" } }),
      },
      {
        title: (
          <span>
            Contrib %
            <span style={{ fontSize: 9, marginLeft: 4, color: "#94A3B8", fontStyle: "italic" }}>
              ({data.lookback_months || 12}mo)
            </span>
          </span>
        ),
        dataIndex: "contribution",
        align: "right",
        width: 100,
        sorter: pinGrandTotal((a, b) => (a.contribution || 0) - (b.contribution || 0)),
        render: (v) => <span style={{ color: "#64748B", fontSize: 12 }}>{fmtPct(v)}</span>,
      },
      {
        title: "MTD",
        dataIndex: "mtd_sales",
        align: "right",
        width: 110,
        defaultSortOrder: "descend",
        sorter: pinGrandTotal((a, b) => (a.mtd_sales || 0) - (b.mtd_sales || 0)),
        render: (v, r) => {
          if (v == null || v === 0 || r.isTotal) {
            return <b style={{ color: "var(--color-primary)" }}>{fmtNum(v)}</b>;
          }
          return (
            <b
              className="report-clickable-name"
              style={{ color: "var(--color-primary)" }}
              onClick={() => openCustomerBreakdown({ row: r, monthNum: data.month })}
            >
              {fmtNum(v)}
            </b>
          );
        },
        onCell: () => ({ style: { background: "rgba(245,158,11,0.08)" } }),
        onHeaderCell: () => ({ style: { background: "#243f6a" } }),
      },
      {
        title: "Ach %",
        dataIndex: "achievement_pct",
        align: "right",
        width: 90,
        sorter: pinGrandTotal((a, b) => (a.achievement_pct || 0) - (b.achievement_pct || 0)),
        render: (v) => (
          <b style={{ color: pctColor(v) }}>{fmtPct(v)}</b>
        ),
      },
      {
        title: (
          <span>
            Daily Ach %
            {data.is_current_month && (
              <span style={{ fontSize: 9, marginLeft: 4, color: "#94A3B8" }}>
                (day {data.elapsed_days}/{data.total_days})
              </span>
            )}
          </span>
        ),
        dataIndex: "daily_ach_pct",
        align: "right",
        width: 130,
        sorter: pinGrandTotal((a, b) => (a.daily_ach_pct || 0) - (b.daily_ach_pct || 0)),
        render: (v) => (
          <b style={{
            color: pctColor(v),
            background: v != null && isFinite(v)
              ? (v >= 0.9 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)")
              : "transparent",
            padding: "2px 8px", borderRadius: 4,
          }}>
            {fmtPct(v)}
          </b>
        ),
      },
    ];
  }, [data, branchCode, selectedProduct, unitType, valueType]);

  const dataSource = useMemo(() => {
    if (!data) return [];
    const rows = (data.rows || []).map((r, i) => ({ ...r, key: i }));
    const total = data.total ? [{ ...data.total, key: "total", isTotal: true }] : [];
    return [...rows, ...total];
  }, [data]);

  // ── Excel export (single sheet of the current view) ────────────────────
  const exportToExcel = async () => {
    if (!data || !data.rows?.length) { message.warning("No data to export"); return; }
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";
    const brName = branchCode === "ALL"
      ? "All Kingdom"
      : (branches.find((b) => b.code === branchCode)?.name || branchCode);
    const ws = wb.addWorksheet("Channel Achievement", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });

    const NAV = "1E3A5F";  const NAV2 = "243F6A";
    const GOLD = "FEF3C7"; const TOTAL_FILL = "FFF3CD";
    const WHITE = "FFFFFFFF";
    const thin = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt = "0.0%";

    const hdr = (bg) => ({
      font: { bold: true, size: 10, color: { argb: WHITE } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: bdr,
    });

    const monthKeys = data.months.map((m) => ({ m, key: `m_${String(m).padStart(2, "0")}` }));
    const tailCols = [
      { key: "month_target",    label: "Target (est.)", pct: false, emphasis: true  },
      { key: "contribution",    label: "Contrib %",   pct: true,  emphasis: false },
      { key: "mtd_sales",       label: "MTD",         pct: false, emphasis: true  },
      { key: "achievement_pct", label: "Ach %",       pct: true,  emphasis: true  },
      { key: "daily_ach_pct",   label: "Daily Ach %", pct: true,  emphasis: true, colored: true },
    ];

    // Header row
    const headerRow = ws.getRow(1); headerRow.height = 20;
    headerRow.getCell(1).value = "Channel"; headerRow.getCell(1).style = hdr(NAV);
    monthKeys.forEach((mk, i) => {
      const c = headerRow.getCell(2 + i);
      c.value = MONTHS[mk.m];
      c.style = hdr(NAV);
    });
    tailCols.forEach((t, i) => {
      const c = headerRow.getCell(2 + monthKeys.length + i);
      c.value = t.label;
      c.style = hdr(t.emphasis ? NAV2 : NAV);
    });

    // Data rows + total
    const allRows = [
      ...(data.rows || []).map((r) => ({ ...r, isTotal: false })),
      ...(data.total ? [{ ...data.total, isTotal: true }] : []),
    ];

    allRows.forEach((row, ri) => {
      const dr = ws.addRow({}); dr.height = 16;
      const isGT = row.isTotal;
      const baseBg = isGT ? `FF${GOLD}` : ri % 2 === 0 ? WHITE : "FFF8FAFC";

      // Channel name
      const nameCell = dr.getCell(1);
      nameCell.value = row.channel;
      nameCell.style = {
        font: { bold: isGT, size: 10 },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } },
        alignment: { vertical: "middle" },
        border: bdr,
      };

      // Monthly pivot
      monthKeys.forEach((mk, i) => {
        const cell = dr.getCell(2 + i);
        const v = row[mk.key];
        cell.value = v || null;
        cell.style = {
          numFmt,
          font: { bold: isGT, size: 10, color: { argb: "FF1E293B" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
      });

      // Tail columns
      tailCols.forEach((t, i) => {
        const cell = dr.getCell(2 + monthKeys.length + i);
        const v = row[t.key];
        cell.value = (v == null) ? null : v;
        let color = "FF1E293B";
        if (t.colored && v != null && isFinite(v)) {
          color = v >= 0.9 ? "FF008000" : "FFFF0000";
        }
        cell.style = {
          numFmt: t.pct ? pctFmt : numFmt,
          font: { bold: isGT || t.emphasis, size: 10, color: { argb: color } },
          fill: { type: "pattern", pattern: "solid",
                  fgColor: { argb: isGT ? `FF${GOLD}` : t.emphasis ? `FF${TOTAL_FILL}` : baseBg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
      });
    });

    // Column widths
    ws.getColumn(1).width = 18;
    for (let i = 2; i <= 1 + monthKeys.length; i++) ws.getColumn(i).width = 11;
    const tailStart = 2 + monthKeys.length;
    ws.getColumn(tailStart).width     = 13;   // Target
    ws.getColumn(tailStart + 1).width = 11;   // Contrib %
    ws.getColumn(tailStart + 2).width = 13;   // MTD
    ws.getColumn(tailStart + 3).width = 11;   // Ach %
    ws.getColumn(tailStart + 4).width = 13;   // Daily Ach %

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Channel_Achievement_${data.product_label}_${brName}_${selectedMonth}.xlsx`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>
          Product: <b style={{ color: "#1E293B" }}>{selectedProduct?.name || data?.product_label || "-"}</b>
        </span>

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, marginLeft: 8 }}>
          <ApartmentOutlined /> Branch:
        </span>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ minWidth: 220 }}
          value={branchCode}
          onChange={setBranchCode}
          options={[
            { value: "ALL", label: "All Kingdom" },
            ...branches.map((b) => ({ value: b.code, label: b.name })),
          ]}
        />

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, marginLeft: 8 }}>
          Contrib. lookback:
        </span>
        <Select
          style={{ width: 130 }}
          value={lookbackMonths}
          onChange={setLookbackMonths}
          options={[
            { value: 3,  label: "Last 3 months"  },
            { value: 6,  label: "Last 6 months"  },
            { value: 9,  label: "Last 9 months"  },
            { value: 12, label: "Last 12 months" },
          ]}
        />

        <span style={{ fontSize: 12, color: "#94A3B8" }}>
          Month: <b style={{ color: "#64748B" }}>{selectedMonth || "-"}</b> · {valueType?.toUpperCase()} · {unitType?.toUpperCase()}
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

      {/* Summary chips */}
      {data && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <StatChip
            label={`Total Target (${unitType.toUpperCase()})`}
            value={fmtNum(data.total_target)}
          />
          <StatChip
            label={`MTD Sales`}
            value={fmtNum(data.total?.mtd_sales)}
            accent="#3B82F6"
          />
          <StatChip
            label={`Achievement`}
            value={fmtPct(data.total?.achievement_pct)}
            accent={pctColor(data.total?.achievement_pct)}
          />
          <StatChip
            label={`Daily Ach (day ${data.elapsed_days}/${data.total_days})`}
            value={fmtPct(data.total?.daily_ach_pct)}
            accent={pctColor(data.total?.daily_ach_pct)}
          />
        </div>
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : !selectedMonth ? (
        <Empty description="Select a month from the date filter" />
      ) : !data || !data.rows?.length ? (
        <Empty description="No data for this selection" />
      ) : (
        <Table
          bordered
          size="small"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: "max-content", y: "55vh" }}
          rowClassName={(r) => (r.isTotal ? "report-grand-total-row" : "")}
        />
      )}

      {/* Customer-level breakdown modal */}
      <CustomerBreakdownModal
        state={custBreakdown}
        onClose={closeCustomerBreakdown}
        onPickCustomer={openInvoiceBreakdown}
        unitType={unitType}
        productLabel={data?.product_label}
      />

      {/* Invoice-level paid/free modal (shared with Customer YoY) */}
      <InvoiceBreakdownModal
        state={invBreakdown}
        onClose={closeInvoiceBreakdown}
        unitType={unitType}
      />
    </div>
  );
};

// ── 1st-level drill: customers in (channel × branch-scope × month) ───────
const CustomerBreakdownModal = ({ state, onClose, onPickCustomer, unitType, productLabel }) => {
  const { open, loading, data, channel, monthLabel } = state;
  const unitLabel = (unitType || "ctn").toUpperCase();

  const columns = [
    { title: "#", width: 50, align: "center",
      render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span> },
    { title: "Customer", dataIndex: "customer_name", key: "customer_name",
      render: (v, r) => (
        <div
          className="report-clickable-name"
          onClick={() => onPickCustomer(r)}
          title="Click to see invoice paid/free breakdown"
        >
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
        </div>
      ) },
    { title: "Branch", dataIndex: "branch_name", key: "branch_name", width: 160,
      render: (v) => <Tag color="blue">{v}</Tag> },
    { title: `Sales (${unitLabel})`, dataIndex: "sales", align: "right", width: 140,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.sales || 0) - (b.sales || 0),
      render: (v) => <b>{fmtNum(v)}</b> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {productLabel} · {channel} channel
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            {monthLabel} · click a customer for invoice paid/free
          </div>
        </div>
      }
      destroyOnClose
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !data || !data.results?.length ? (
        <Empty description="No customers in this period" />
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <StatChip label="Customers" value={data.results.length} />
            <StatChip label={`Total (${unitLabel})`} value={fmtNum(data.total)} accent="#3B82F6" />
          </div>
          <Table
            size="small"
            bordered
            rowKey={(r) => `${r.customer_code}-${r.branch_code}`}
            columns={columns}
            dataSource={data.results}
            pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
            scroll={{ y: "55vh" }}
          />
        </>
      )}
    </Modal>
  );
};

export default ChannelAchievement;
