import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Table, Select, Skeleton, message, Button, Divider, Modal, Spin, Tag, Input, Space, Switch } from "antd";
import MonthRangePicker from "../../../Components/MonthRangePicker";
import { DownloadOutlined, SearchOutlined, PlusSquareOutlined, MinusSquareOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getSalesmanAchievement, getSalesmanCustomerBreakdown } from "../../../API/Reports";
import { pinGrandTotal } from "./reportUtils";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./reports.css";

const slug = (name) => name.replace(/\s+/g, "_").toLowerCase();

const openCustomerAnalysis = ({ customerCode, branchCode, channel, productCode }) => {
  const params = new URLSearchParams({
    customer_code: customerCode,
    branch_code:   branchCode || "",
    channel_code:  channel || "",
    ...(productCode && { product_code: productCode }),
  });
  window.open(`/customer-analysis?${params.toString()}`, "_blank");
};

const openSalesmanAnalysis = ({ salesmanCode, branchCode, productCode }) => {
  if (!salesmanCode) return;
  const params = new URLSearchParams();
  params.set("salesman_code", salesmanCode);
  if (branchCode) params.set("branch_code", branchCode);
  if (productCode) params.set("product_code", productCode);
  window.open(`/salesman-analysis?${params.toString()}`, "_blank", "noopener");
};

// Column search-by-name props (keeps grand-total row pinned regardless of filter)
const nameSearchProps = (getName) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        placeholder="Search name"
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

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const VarCell = ({ v }) => {
  if (v == null || v === 0) return <span style={{ color: "#64748B" }}>-</span>;
  const color = v >= 0 ? "#10B981" : "#EF4444";
  const bg    = v >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
  return (
    <span style={{ color, background: bg, padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
      {v > 0 ? "+" : ""}{fmtNum(v)}
    </span>
  );
};

// Growth % against a prior-year baseline. LY == 0 → dash (undefined ratio).
const growthPct = (cur, ly) => (!ly ? null : ((cur - ly) / ly) * 100);
const GrowthCell = ({ cur, ly }) => {
  const g = growthPct(cur, ly);
  if (g == null) return <span style={{ color: "#64748B" }}>—</span>;
  const color = g >= 0 ? "#10B981" : "#EF4444";
  const bg    = g >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
  return (
    <span style={{ color, background: bg, padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
      {g > 0 ? "+" : ""}{g.toFixed(1)}%
    </span>
  );
};

const SalesmanAchievement = () => {
  const { selectedMonth }   = useDateFilter();
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const unitLabelNode = isValueMode
    ? <RiyalIcon width={11} height={11} color="#FFFFFF" />
    : (unitType || "ctn").toUpperCase();

  const [branches, setBranches]                 = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [products, setProducts]                 = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [reportData, setReportData]             = useState({ products: [], results: [] });
  const [breakdown, setBreakdown]               = useState({ open: false, loading: false, title: "", subtitle: "", data: [], total: 0 });

  // Month range drives the report. Default = navbar's selectedMonth (or the
  // current month if unset) for both bounds → single-month behaviour by default.
  const [fromMonth, setFromMonth] = useState(() =>
    selectedMonth ? dayjs(selectedMonth, "YYYYMM") : dayjs().startOf("month"),
  );
  const [toMonth, setToMonth] = useState(() =>
    selectedMonth ? dayjs(selectedMonth, "YYYYMM") : dayjs().startOf("month"),
  );

  // Comparison toggle → adds "Sales LY" + "Growth %" columns per group
  const [comparison, setComparison] = useState(false);

  // Per-group month expansion (multi-month only). Keys: product name or "__total__".
  const [expandedCols, setExpandedCols] = useState(() => new Set());
  const toggleExpand = (key) => setExpandedCols((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const fromMonthStr = fromMonth ? fromMonth.format("YYYYMM") : null;
  const toMonthStr   = toMonth   ? toMonth.format("YYYYMM")   : null;
  const isMultiMonth = !!(fromMonthStr && toMonthStr && fromMonthStr !== toMonthStr);

  // Load branches + products once
  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
    });
    getAllProducts().then((res) => {
      let list = res?.results || [];
      // Add the virtual Indomie aggregate codes (same as the navbar) when Indomie products exist
      const hasIndomie = list.some((p) => p?.name?.toLowerCase().includes("indomie"));
      if (hasIndomie) {
        [
          { code: "9999901", name: "INDOMIE PILLOW (All)" },
          { code: "9999902", name: "INDOMIE CUP (All)" },
        ].forEach((sp) => { if (!list.some((p) => p.code === sp.code)) list = [...list, sp]; });
      }
      setProducts(list);
      // Default-select real products only — the virtual codes just expand to these
      setSelectedProducts(list.filter((p) => !["9999901", "9999902"].includes(p.code)).map((p) => p.code));
    });
  }, []);

  // Fetch report when filters change
  useEffect(() => {
    if (!selectedBranches.length || !selectedProducts.length) return;
    if (!fromMonthStr || !toMonthStr) return;
    setLoading(true);
    getSalesmanAchievement({
      fromMonth:    fromMonthStr,
      toMonth:      toMonthStr,
      unitType:     effectiveUnitType,
      valueType,
      branchCodes:  selectedBranches,
      productCodes: selectedProducts,
      comparison,
    }).then((res) => {
      if (res?.error) message.error("Failed to load report");
      else setReportData(res);
      setLoading(false);
    });
  }, [fromMonthStr, toMonthStr, effectiveUnitType, valueType, selectedBranches, selectedProducts, comparison]);

  // product name → code (from the full product list used by the filter)
  const productNameToCode = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.name] = p.code; });
    return m;
  }, [products]);

  // Open the customer-breakdown modal for a salesman's MTD cell.
  // productName === null → all selected products (the TOTAL column).
  const openBreakdown = useCallback(async (row, productName) => {
    const productCodes = productName
      ? (productNameToCode[productName] || "")
      : selectedProducts.join(",");

    setBreakdown({
      open: true, loading: true,
      title: `${row.salesman_name} — ${productName || "All Products"}`,
      subtitle: row.branch,
      // single product → carry its code for the customer-analysis link; "All" → leave blank
      productCode: productName ? (productNameToCode[productName] || "") : "",
      data: [], total: 0,
    });

    const res = await getSalesmanCustomerBreakdown({
      salesmanCd:  row.salesman_code,
      fromMonth:   fromMonthStr,
      toMonth:     toMonthStr,
      productCodes,
      unitType:    effectiveUnitType,
      valueType,
      branchCodes: selectedBranches,
    });

    if (res?.error) {
      message.error("Failed to load breakdown");
      setBreakdown((p) => ({ ...p, loading: false }));
    } else {
      setBreakdown((p) => ({ ...p, loading: false, data: res.results || [], total: res.total || 0 }));
    }
  }, [fromMonthStr, toMonthStr, effectiveUnitType, valueType, selectedProducts, selectedBranches, productNameToCode]);

  // Dynamic columns
  const columns = useMemo(() => {
    const { products, months = [] } = reportData;
    if (!products?.length) return [];

    const isMultiMonth = months.length > 1;
    const ymLabel = (ym) => dayjs(String(ym), "YYYYMM").format("MMM YYYY");

    // Metric sub-columns for a given prefix (e.g. "indomie" or "total", or "indomie_202601").
    // `productName` is used for the breakdown modal — null → TOTAL group.
    // `variantSuffix` differentiates per-month sorter/key from the totals.
    const buildMetrics = (prefix, productName, variantSuffix = "") => {
      const k = (name) => `${prefix}_${name}${variantSuffix}`;
      const cells = [
        {
          title:     "Target",
          dataIndex: `${prefix}_target`,
          key:       k("target"),
          align:     "right",
          width:     90,
          render:    (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
        },
        {
          title:     isMultiMonth ? "Sales" : "MTD",
          dataIndex: `${prefix}_actual`,
          key:       k("actual"),
          align:     "right",
          width:     90,
          render:    (v, r) => (v && !r.isGrandTotal) ? (
            <b onClick={() => openBreakdown(r, productName)} style={{ cursor: "pointer", color: "var(--color-accent)" }}>{fmtNum(v)}</b>
          ) : <b>{fmtNum(v)}</b>,
        },
        {
          title:     "+/-",
          dataIndex: `${prefix}_variance`,
          key:       k("variance"),
          align:     "center",
          width:     90,
          sorter:    pinGrandTotal((a, b) => (a[`${prefix}_variance`] || 0) - (b[`${prefix}_variance`] || 0)),
          render:    (v) => <VarCell v={v} />,
        },
      ];
      if (comparison) {
        cells.push({
          title:     "Sales LY",
          dataIndex: `${prefix}_actual_ly`,
          key:       k("actual_ly"),
          align:     "right",
          width:     90,
          sorter:    pinGrandTotal((a, b) => (a[`${prefix}_actual_ly`] || 0) - (b[`${prefix}_actual_ly`] || 0)),
          render:    (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
        });
        cells.push({
          title:     "Growth %",
          key:       k("growth"),
          align:     "center",
          width:     90,
          sorter:    pinGrandTotal((a, b) =>
            (growthPct(a[`${prefix}_actual`], a[`${prefix}_actual_ly`]) ?? -Infinity) -
            (growthPct(b[`${prefix}_actual`], b[`${prefix}_actual_ly`]) ?? -Infinity)
          ),
          render:    (_, r) => <GrowthCell cur={r[`${prefix}_actual`]} ly={r[`${prefix}_actual_ly`]} />,
        });
      }
      return cells;
    };

    // Header with expand/collapse toggle (only when multi-month).
    const expandTitle = (key, label) => (
      <span
        onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", fontWeight: 700 }}
        title={expandedCols.has(key) ? "Collapse months" : "Expand months"}
      >
        {expandedCols.has(key) ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
        <span>{label}</span>
      </span>
    );

    const buildGroup = (key, label, prefix, productName) => {
      if (!isMultiMonth) {
        return { title: <span style={{ fontWeight: 700 }}>{label}</span>, align: "center", children: buildMetrics(prefix, productName) };
      }
      const expanded = expandedCols.has(key);
      const titleEl  = expandTitle(key, label);
      if (!expanded) {
        return { title: titleEl, align: "center", children: buildMetrics(prefix, productName) };
      }
      const monthCols = months.map((ym) => ({
        title:    <span style={{ fontWeight: 600 }}>{ymLabel(ym)}</span>,
        align:    "center",
        children: buildMetrics(`${prefix}_${ym}`, productName, `_${ym}`),
      }));
      monthCols.push({
        title:    <span style={{ fontWeight: 700 }}>Total</span>,
        align:    "center",
        children: buildMetrics(prefix, productName, "_total"),
      });
      return { title: titleEl, align: "center", children: monthCols };
    };

    const productCols = products.map((p) => buildGroup(p, p, slug(p), p));

    return [
      {
        title:     "#",
        width:     44,
        align:     "center",
        fixed:     "left",
        render:    (_, r, i) => r.isGrandTotal ? "" : <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
      },
      {
        title:     "Salesman",
        fixed:     "left",
        width:     200,
        ...nameSearchProps((r) => r.salesman_name),
        render:    (_, r) => r.isGrandTotal ? (
          <b>GRAND TOTAL</b>
        ) : (
          <div
            className="report-clickable-name"
            onClick={() => openSalesmanAnalysis({
              salesmanCode: r.salesman_code,
              branchCode:   r.branch_code,
              productCode:  selectedProducts.length === 1 ? selectedProducts[0] : "",
            })}
            title="Open Salesman Analysis in new tab"
          >
            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.salesman_name}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{r.salesman_code}</div>
          </div>
        ),
      },
      {
        title:     "Branch",
        dataIndex: "branch",
        fixed:     "left",
        width:     110,
        filters:   [...new Set(reportData.results.map((r) => r.branch))].map((b) => ({ text: b, value: b })),
        onFilter:  (v, r) => r.isGrandTotal || r.branch === v,
        render:    (v, r) => r.isGrandTotal ? "" : <span style={{ fontSize: 12 }}>{v}</span>,
      },
      ...productCols,
      buildGroup("__total__", "TOTAL", "total", null),
    ];
  }, [reportData, openBreakdown, comparison, selectedProducts, expandedCols]);

  const dataSource = useMemo(() => {
    const { results } = reportData;
    if (!results?.length) return [];
    return results.map((r, i) => ({ ...r, key: i }));
  }, [reportData]);

  // Sticky grand-total — rendered via Table.summary so it stays visible
  // regardless of pagination/scroll.
  const grandTotals = useMemo(() => {
    const { products: prods, results, months = [] } = reportData;
    if (!results?.length) return null;
    const sum = (field) => results.reduce((acc, r) => acc + (r[field] || 0), 0);
    const gt = { isGrandTotal: true };
    prods.forEach((p) => {
      const s = slug(p);
      gt[`${s}_target`]   = sum(`${s}_target`);
      gt[`${s}_actual`]   = sum(`${s}_actual`);
      gt[`${s}_variance`] = sum(`${s}_variance`);
      if (comparison) gt[`${s}_actual_ly`] = sum(`${s}_actual_ly`);
      months.forEach((ym) => {
        gt[`${s}_${ym}_target`]   = sum(`${s}_${ym}_target`);
        gt[`${s}_${ym}_actual`]   = sum(`${s}_${ym}_actual`);
        gt[`${s}_${ym}_variance`] = sum(`${s}_${ym}_variance`);
        if (comparison) gt[`${s}_${ym}_actual_ly`] = sum(`${s}_${ym}_actual_ly`);
      });
    });
    gt.total_target   = sum("total_target");
    gt.total_actual   = sum("total_actual");
    gt.total_variance = sum("total_variance");
    if (comparison) gt.total_actual_ly = sum("total_actual_ly");
    months.forEach((ym) => {
      gt[`total_${ym}_target`]   = sum(`total_${ym}_target`);
      gt[`total_${ym}_actual`]   = sum(`total_${ym}_actual`);
      gt[`total_${ym}_variance`] = sum(`total_${ym}_variance`);
      if (comparison) gt[`total_${ym}_actual_ly`] = sum(`total_${ym}_actual_ly`);
    });
    return gt;
  }, [reportData, comparison]);

  const exportToExcel = async () => {
    const { products, results } = reportData;
    if (!results.length) { message.warning("No data to export"); return; }

    const ExcelJS  = (await import("exceljs")).default;
    const wb       = new ExcelJS.Workbook();
    wb.creator     = "Wazalytics";
    const ws       = wb.addWorksheet("Salesman Achievement", {
      views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
    });

    const NAV   = "002060";  const NAV2  = "1E3A5F";
    const GREEN = "10B981";  const RED   = "EF4444";
    const LGRAY = "F1F5F9";  const AGOLD = "FEF3C7";
    const WHITE = "FFFFFFFF";
    const thin  = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr   = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    const hdr = (bg) => ({
      font:      { bold: true, size: 10, color: { argb: WHITE } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border:    bdr,
    });

    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt = '0.0"%";[Red]-0.0"%";"—"';

    // Group column count grows when Comparison is on (Target/MTD/+/- ± Sales LY/Growth %).
    const groupCols  = comparison ? 5 : 3;
    const subHeaders = comparison
      ? ["Target", isMultiMonth ? "Sales" : "MTD", "+/-", "Sales LY", "Growth %"]
      : ["Target", isMultiMonth ? "Sales" : "MTD", "+/-"];

    // Row 1: product group headers
    const r1 = ws.getRow(1); r1.height = 22;
    // Static headers (#, Salesman, Branch)
    [1, 2, 3].forEach((c) => { r1.getCell(c).value = ""; r1.getCell(c).style = hdr(NAV); });
    ws.mergeCells(1, 1, 2, 1);  // # (merged)
    ws.mergeCells(1, 2, 2, 2);  // Salesman
    ws.mergeCells(1, 3, 2, 3);  // Branch
    r1.getCell(1).value = "#";
    r1.getCell(2).value = "Salesman";
    r1.getCell(3).value = "Branch";

    let col = 4;
    products.forEach((p) => {
      r1.getCell(col).value = p.toUpperCase();
      r1.getCell(col).style = hdr(NAV);
      ws.mergeCells(1, col, 1, col + groupCols - 1);
      col += groupCols;
    });
    // Total group
    r1.getCell(col).value = "TOTAL";
    r1.getCell(col).style = hdr(NAV2);
    ws.mergeCells(1, col, 1, col + groupCols - 1);

    // Row 2: sub-headers
    const r2 = ws.getRow(2); r2.height = 18;
    col = 4;
    products.forEach(() => {
      subHeaders.forEach((lbl, i) => {
        r2.getCell(col + i).value = lbl;
        r2.getCell(col + i).style = hdr(NAV);
      });
      col += groupCols;
    });
    subHeaders.forEach((lbl, i) => {
      r2.getCell(col + i).value = lbl;
      r2.getCell(col + i).style = hdr(NAV2);
    });

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 14;
    for (let c = 4; c <= 4 + products.length * groupCols + groupCols - 1; c++) ws.getColumn(c).width = 12;

    // Data rows
    results.forEach((row, idx) => {
      const dr = ws.addRow({}); dr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? WHITE : `FF${LGRAY}`;

      const cellStyle = (extra = {}) => ({
        fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
        alignment: { vertical: "middle" },
        border:    bdr,
        ...extra,
      });

      dr.getCell(1).value = idx + 1;
      dr.getCell(1).style = cellStyle({ alignment: { horizontal: "center", vertical: "middle" }, numFmt });
      dr.getCell(2).value = `${row.salesman_name} (${row.salesman_code})`;
      dr.getCell(2).style = cellStyle({ font: { bold: false, size: 10 } });
      dr.getCell(3).value = row.branch;
      dr.getCell(3).style = cellStyle({ font: { size: 10 } });

      // Growth % as a fraction (0.15 = 15%). Excel formats via pctFmt.
      const growthFrac = (cur, ly) => (!ly ? null : (cur - ly) / ly * 100);

      let c = 4;
      products.forEach((p) => {
        const s = slug(p);
        const cur = row[`${s}_actual`];
        const ly  = row[`${s}_actual_ly`];
        const vals = comparison
          ? [row[`${s}_target`], cur, row[`${s}_variance`], ly, growthFrac(cur, ly)]
          : [row[`${s}_target`], cur, row[`${s}_variance`]];
        vals.forEach((val, i) => {
          const cell = dr.getCell(c + i);
          cell.value  = (val === null || val === undefined) ? null : (val || null);
          const isVar    = i === 2;
          const isGrowth = comparison && i === 4;
          const isLy     = comparison && i === 3;
          const posNeg   = (isVar || isGrowth) && val != null ? (val < 0 ? -1 : val > 0 ? 1 : 0) : 0;
          const varBg = posNeg < 0 ? "FFFFC7CE"
                      : posNeg > 0 ? "FFC6EFCE" : bg;
          cell.style = {
            numFmt: isGrowth ? pctFmt : numFmt,
            font:      { size: 10, bold: i === 1,
                         color: { argb: posNeg < 0 ? "FF9C0006"
                                       : posNeg > 0 ? "FF276221"
                                       : isLy ? "FF64748B" : "FF1E293B" } },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: varBg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border:    bdr,
          };
        });
        c += groupCols;
      });

      // Total columns
      const tCur = row.total_actual;
      const tLy  = row.total_actual_ly;
      const totalVals = comparison
        ? [row.total_target, tCur, row.total_variance, tLy, growthFrac(tCur, tLy)]
        : [row.total_target, tCur, row.total_variance];
      totalVals.forEach((val, i) => {
        const cell = dr.getCell(c + i);
        cell.value  = (val === null || val === undefined) ? null : (val || null);
        const isVar    = i === 2;
        const isGrowth = comparison && i === 4;
        const isLy     = comparison && i === 3;
        const posNeg   = (isVar || isGrowth) && val != null ? (val < 0 ? -1 : val > 0 ? 1 : 0) : 0;
        const varBg = posNeg < 0 ? "FFFFC7CE"
                    : posNeg > 0 ? "FFC6EFCE" : bg;
        cell.style = {
          numFmt: isGrowth ? pctFmt : numFmt,
          font:      { size: 10, bold: true,
                       color: { argb: posNeg < 0 ? "FF9C0006"
                                     : posNeg > 0 ? "FF276221"
                                     : isLy ? "FF64748B" : "FF002060" } },
          fill:      { type: "pattern", pattern: "solid", fgColor: { argb: varBg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border:    bdr,
        };
      });
    });

    // ── Grand Total row ───────────────────────────────────────────────────
    const sumField = (f) => results.reduce((acc, r) => acc + (r[f] || 0), 0);
    const GT_BG = `FF${AGOLD}`;
    const gtr = ws.addRow({}); gtr.height = 18;

    const gtStyle = (extra = {}) => ({
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: GT_BG } },
      font:      { bold: true, size: 10, color: { argb: "FF1E293B" } },
      alignment: { vertical: "middle" },
      border:    bdr,
      ...extra,
    });

    gtr.getCell(1).value = "";
    gtr.getCell(1).style = gtStyle();
    gtr.getCell(2).value = "GRAND TOTAL";
    gtr.getCell(2).style = gtStyle();
    gtr.getCell(3).value = "";
    gtr.getCell(3).style = gtStyle();

    const gtCol = (cell, val, kind, isTotalGroup) => {
      // kind: "num" | "var" | "ly" | "growth"
      const isVar    = kind === "var";
      const isGrowth = kind === "growth";
      const isLy     = kind === "ly";
      const posNeg   = (isVar || isGrowth) && val != null ? (val < 0 ? -1 : val > 0 ? 1 : 0) : 0;
      cell.value = val == null ? null : (isGrowth ? val : Math.round(val) || null);
      cell.style = gtStyle({
        numFmt: isGrowth ? pctFmt : numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: {
          bold: true, size: 10,
          color: { argb: posNeg < 0 ? "FF9C0006"
                       : posNeg > 0 ? "FF276221"
                       : isLy ? "FF64748B"
                       : isTotalGroup ? "FF002060" : "FF1E293B" },
        },
      });
    };

    const gtGrowth = (cur, ly) => (!ly ? null : (cur - ly) / ly * 100);

    let gc = 4;
    products.forEach((p) => {
      const s = slug(p);
      const cur = sumField(`${s}_actual`);
      const ly  = comparison ? sumField(`${s}_actual_ly`) : 0;
      gtCol(gtr.getCell(gc),     sumField(`${s}_target`),   "num", false);
      gtCol(gtr.getCell(gc + 1), cur,                       "num", false);
      gtCol(gtr.getCell(gc + 2), sumField(`${s}_variance`), "var", false);
      if (comparison) {
        gtCol(gtr.getCell(gc + 3), ly,                     "ly",     false);
        gtCol(gtr.getCell(gc + 4), gtGrowth(cur, ly),      "growth", false);
      }
      gc += groupCols;
    });
    const tCur = sumField("total_actual");
    const tLy  = comparison ? sumField("total_actual_ly") : 0;
    gtCol(gtr.getCell(gc),     sumField("total_target"),   "num", true);
    gtCol(gtr.getCell(gc + 1), tCur,                       "num", true);
    gtCol(gtr.getCell(gc + 2), sumField("total_variance"), "var", true);
    if (comparison) {
      gtCol(gtr.getCell(gc + 3), tLy,                "ly",     true);
      gtCol(gtr.getCell(gc + 4), gtGrowth(tCur, tLy), "growth", true);
    }

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = isMultiMonth
      ? `Salesman_Achievement_${fromMonthStr}_to_${toMonthStr}.xlsx`
      : `Salesman_Achievement_${fromMonthStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Branch:</span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="All branches"
          value={selectedBranches}
          onChange={setSelectedBranches}
          maxTagCount="responsive"
          options={branches.map((b) => ({ value: b.code, label: b.name }))}
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

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Product:</span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="All products"
          value={selectedProducts}
          onChange={setSelectedProducts}
          maxTagCount="responsive"
          options={products.map((p) => ({ value: p.code, label: p.name }))}
          dropdownRender={(menu) => (
            <>
              <div style={{ padding: "4px 8px", display: "flex", gap: 8 }}>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedProducts(products.map((p) => p.code))}>Select All</Button>
                <Divider type="vertical" />
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedProducts([])}>Unselect All</Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>From – To:</span>
        <MonthRangePicker
          value={[fromMonth, toMonth]}
          onChange={([from, to]) => {
            setFromMonth(from);
            setToMonth(to);
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <Switch size="small" checked={comparison} onChange={setComparison} />
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Comparison</span>
        </div>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          disabled={loading || !reportData.results.length}
          onClick={exportToExcel}
        >
          Export to Excel
        </Button>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Table
          bordered
          size="small"
          dataSource={dataSource}
          columns={columns}
          pagination={{ pageSize: 25, showSizeChanger: false, size: "small" }}
          scroll={{ x: "max-content", y: "55vh" }}
          locale={{ emptyText: "Select a month with available targets to view the report" }}
          rowClassName={(r) => (r.isGrandTotal ? "report-grand-total-row" : "")}
          summary={() => {
            if (!grandTotals) return null;
            const { products: prods, months = [] } = reportData;
            const isMultiMonth = months.length > 1;
            let idx = 0;
            const cell = (content, opts = {}) => (
              <Table.Summary.Cell
                key={idx}
                index={idx++}
                align={opts.align || "right"}
                colSpan={opts.colSpan}
              >
                {content}
              </Table.Summary.Cell>
            );
            // Render metric cells for a given prefix (product slug or "total").
            const metricCells = (prefix, isTotalGroup) => {
              const cells = [
                cell(<span style={{ color: "#64748B" }}>{fmtNum(grandTotals[`${prefix}_target`])}</span>),
                cell(isTotalGroup
                  ? <b style={{ color: "var(--color-primary)" }}>{fmtNum(grandTotals[`${prefix}_actual`])}</b>
                  : <b>{fmtNum(grandTotals[`${prefix}_actual`])}</b>),
                cell(<VarCell v={grandTotals[`${prefix}_variance`]} />, { align: "center" }),
              ];
              if (comparison) {
                cells.push(cell(<span style={{ color: "#64748B" }}>{fmtNum(grandTotals[`${prefix}_actual_ly`])}</span>));
                cells.push(cell(<GrowthCell cur={grandTotals[`${prefix}_actual`]} ly={grandTotals[`${prefix}_actual_ly`]} />, { align: "center" }));
              }
              return cells;
            };
            // Group cells: expanded → per-month metric cells + total; collapsed → just totals.
            const groupCells = (key, prefix, isTotalGroup) => {
              if (isMultiMonth && expandedCols.has(key)) {
                return [
                  ...months.flatMap((ym) => metricCells(`${prefix}_${ym}`, isTotalGroup)),
                  ...metricCells(prefix, isTotalGroup),
                ];
              }
              return metricCells(prefix, isTotalGroup);
            };
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="report-grand-total-row">
                  {cell("", { align: "center" })}
                  {cell(<b>GRAND TOTAL</b>, { colSpan: 2, align: "left" })}
                  {prods.flatMap((p) => groupCells(p, slug(p), false))}
                  {groupCells("__total__", "total", true)}
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      )}

      {/* ── Customer Breakdown Modal ───────────────────────── */}
      <Modal
        title={
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
              {breakdown.title}
            </div>
            {!breakdown.loading && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {breakdown.subtitle} · {breakdown.data.length} customer{breakdown.data.length !== 1 ? "s" : ""}
                {" · "}Total: <b style={{ color: "var(--color-primary)" }}>{breakdown.total?.toLocaleString()}</b>
                {" "}{isValueMode ? <RiyalIcon width={11} height={11} color="#1E3A5F" /> : unitType?.toUpperCase()}
              </div>
            )}
          </div>
        }
        open={breakdown.open}
        onCancel={() => setBreakdown((p) => ({ ...p, open: false }))}
        footer={null}
        width={640}
        styles={{ body: { padding: "12px 0 0" } }}
      >
        {breakdown.loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            size="small"
            bordered
            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
            dataSource={breakdown.data.map((r, i) => ({ ...r, key: i }))}
            columns={[
              {
                title: "#",
                width: 40,
                align: "center",
                render: (_, __, i) => <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{i + 1}</span>,
              },
              {
                title: "Customer",
                dataIndex: "customer_name",
                key: "customer_name",
                ellipsis: true,
                render: (v, r) => (
                  <div
                    className="report-clickable-name"
                    onClick={() => openCustomerAnalysis({
                      customerCode: r.customer_code,
                      branchCode:   r.branch_code,
                      channel:      r.channel,
                      productCode:  breakdown.productCode,
                    })}
                  >
                    <div style={{ fontSize: 12 }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400 }}>{r.customer_code}</div>
                  </div>
                ),
              },
              {
                title: "Channel",
                dataIndex: "channel",
                key: "channel",
                width: 90,
                align: "center",
                render: (v) => <Tag style={{ fontSize: 11, margin: 0 }}>{v}</Tag>,
              },
              {
                title: isValueMode ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    Sales (<RiyalIcon width={11} height={11} color="#FFFFFF" />)
                  </span>
                ) : `Sales (${unitType?.toUpperCase()})`,
                dataIndex: "sales",
                key: "sales",
                width: 120,
                align: "right",
                render: (v) => <b style={{ color: "var(--color-primary)" }}>{v?.toLocaleString()}</b>,
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <b style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>Total</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <b style={{ color: "var(--color-primary)" }}>{breakdown.total?.toLocaleString()}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default SalesmanAchievement;
