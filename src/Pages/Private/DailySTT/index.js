import { useContext, useEffect, useMemo, useState } from "react";
import { Table, Select, message, DatePicker, Button, Space } from "antd";
import { DownloadOutlined, PlusSquareOutlined, MinusSquareOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./style.css";
import { getAllProducts } from "../../../API/Products";
import { ProductContext } from "../../../Contexts/ProductContext";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getDailySTT } from "../../../API/Daily STT Report";
import RiyalIcon from "../../../Utils/RiyalIcon";

const branch_region_map = {
  "SBTC BISHA": "SOUTHERN",
  "SBTC KHAMIS MUSHAIT": "SOUTHERN",
  "SBTC NAJRAN": "SOUTHERN",
  "SBTC QONFUDA": "SOUTHERN",
  "SBTC DAWADMI": "NORTH & CENTRAL",
  "SBTC GASIEM": "NORTH & CENTRAL",
  "SBTC HAIL": "NORTH & CENTRAL",
  "SBTC SKAKA": "NORTH & CENTRAL",
  "SBTC TABUK": "NORTH & CENTRAL",
  "SBTC HAFR BATIN": "EASTERN",
  "SBTC HUFUF": "EASTERN",
  "SBTC JUBAIL": "EASTERN",
  "SBTC KHOBAR": "EASTERN",
  "SBTC MADINAH": "WESTERN",
  "SBTC MAKKAH": "WESTERN",
  "SBTC TAIF": "WESTERN",
  "SBTC YANBU": "WESTERN",
  "SBTC KHARJ": "RIYADH & KHARJ",
  "SBTC RIYADH": "RIYADH & KHARJ",
  "SBTC JEDDAH": "JEDDAH",
  "SBTC JIZAN": "JIZAN",
};

const DailySTT = () => {
  const [loading, setLoading] = useState(false);
  const { selectedMonth } = useDateFilter();
  const { selectedProduct } = useContext(ProductContext);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(
    selectedProduct ? [selectedProduct] : []
  );
  const [dailySTTReport, setDailySTTReport] = useState([]);
  const [reportMonths, setReportMonths]     = useState([]); // YYYYMM ints from backend
  const [expandedCols, setExpandedCols]     = useState(() => new Set()); // product codes (or "__total__") expanded
  const [msgApi, contextHolder] = message.useMessage();
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";

  // From / To month range (local — not tied to global DateFilter)
  const [fromMonth, setFromMonth] = useState(selectedMonth || dayjs().format("YYYYMM"));
  const [toMonth,   setToMonth]   = useState(selectedMonth || dayjs().format("YYYYMM"));

  const isMultiMonth = reportMonths.length > 1;

  const ymLabel = (ym) => {
    if (!ym) return "";
    const s = String(ym);
    return dayjs(s, "YYYYMM").format("MMM YYYY");
  };

  const toggleExpand = (key) => {
    setExpandedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandToggleEl = (key, label) => (
    <span
      onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
      title={expandedCols.has(key) ? "Collapse months" : "Expand months"}
    >
      {expandedCols.has(key) ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
      <span>{label}</span>
    </span>
  );

  const buildMetricCols = (prefix) => [
    {
      title: "Sales",
      dataIndex: `${prefix}_sales`,
      render: (v) => v?.toLocaleString(),
      sorter: (a, b) => (a[`${prefix}_sales`] || 0) - (b[`${prefix}_sales`] || 0),
    },
    {
      title: "Target",
      dataIndex: `${prefix}_target`,
      render: (v) => v?.toLocaleString(),
      sorter: (a, b) => (a[`${prefix}_target`] || 0) - (b[`${prefix}_target`] || 0),
    },
    {
      title: "Ach %",
      render: (_, record) => {
        const sales = record[`${prefix}_sales`] || 0;
        const target = record[`${prefix}_target`] || 0;
        const achievement = target ? (sales / target) * 100 : 0;
        return (
          <span style={{ color: achievement < 90 ? "red" : "green" }}>
            {achievement.toFixed(1)}%
          </span>
        );
      },
      sorter: (a, b) => {
        const aVal = a[`${prefix}_target`]
          ? (a[`${prefix}_sales`] / a[`${prefix}_target`]) * 100
          : 0;
        const bVal = b[`${prefix}_target`]
          ? (b[`${prefix}_sales`] / b[`${prefix}_target`]) * 100
          : 0;
        return aVal - bVal;
      },
    },
    {
      title: "Last Yr",
      dataIndex: `${prefix}_prev`,
      render: (v) => v?.toLocaleString(),
      sorter: (a, b) => (a[`${prefix}_prev`] || 0) - (b[`${prefix}_prev`] || 0),
    },
    {
      title: "Growth %",
      render: (_, record) => {
        const g =
          ((record[`${prefix}_sales`] - record[`${prefix}_prev`]) /
            (record[`${prefix}_prev`] || 1)) *
          100;
        return (
          <span style={{ color: g < 0 ? "red" : "green" }}>
            {g?.toFixed(1)}%
          </span>
        );
      },
      sorter: (a, b) => {
        const aVal =
          ((a[`${prefix}_sales`] - a[`${prefix}_prev`]) /
            (a[`${prefix}_prev`] || 1)) *
          100;
        const bVal =
          ((b[`${prefix}_sales`] - b[`${prefix}_prev`]) /
            (b[`${prefix}_prev`] || 1)) *
          100;
        return aVal - bVal;
      },
    },
  ];

  const buildGroupColumn = (key, label, prefix) => {
    // When in multi-month mode, render an expandable group; otherwise a flat group.
    if (!isMultiMonth) {
      return { title: label, children: buildMetricCols(prefix) };
    }
    const expanded = expandedCols.has(key);
    const titleEl = expandToggleEl(key, label);
    if (!expanded) {
      return { title: titleEl, children: buildMetricCols(prefix) };
    }
    const monthGroups = reportMonths.map((ym) => ({
      title: ymLabel(ym),
      children: buildMetricCols(`${prefix}_${ym}`),
    }));
    monthGroups.push({ title: "Total", children: buildMetricCols(prefix) });
    return { title: titleEl, children: monthGroups };
  };

  useEffect(() => {
    const fetchProductOptions = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts();
        let products = res?.results || [];

        const hasIndomie = products.some((p) =>
          p?.name?.toLowerCase()?.includes("indomie")
        );
        if (hasIndomie) {
          const specialIndomie = [
            { code: "9999901", name: "INDOMIE PILLOW (All)" },
            { code: "9999902", name: "INDOMIE CUP (All)" },
          ];
          specialIndomie.forEach((p) => {
            if (!products.some((prod) => prod?.code === p?.code))
              products.push(p);
          });
        }

        setProductOptions(products);
        if (!selectedProducts.length && products.length > 0)
          setSelectedProducts([products[0]]);
      } catch (error) {
        msgApi.error("Error fetching products: " + error?.message);
      }
      setLoading(false);
    };

    fetchProductOptions();
  }, []);

  useEffect(() => {
    const fetchDailySTTReport = async () => {
      if (!selectedProducts?.length) return;
      setLoading(true);
      try {
        const codes = selectedProducts.map((p) => p.code).join(",");
        const res = await getDailySTT(fromMonth, codes, toMonth);

        const branchMap = {}; // key = branch_code
        selectedProducts.forEach((p) => {
          const productData = res.products.find(
            (x) => x.product_code === p.code
          );
          if (!productData) return;

          productData.branches.forEach((b) => {
            if (!branchMap[b.branch_code]) {
              branchMap[b.branch_code] = {
                branch_name: b.branch_name,
                branch_code: b.branch_code,
                products: {},
              };
            }
            // Store sales, target, prev **per product**
            const slug = p.name.toLowerCase().replace(/\s+/g, "_");
            branchMap[b.branch_code].products[slug] = {
              net_ctn: b.net_sales_ctn || 0,
              net_pcs: b.net_sales_pcs || 0,
              net_val: b.net_sales_val || 0,
              gross_ctn: b.gross_sales_ctn || 0,
              gross_pcs: b.gross_sales_pcs || 0,
              gross_val: b.gross_sales_val || 0,
              target_ctn: b.target_ctn || 0,
              target_pcs: b.target_pcs || 0,
              target_val: b.target_val || 0,
              prev_net_ctn: b.prev_net_sales_ctn || 0,
              prev_net_pcs: b.prev_net_sales_pcs || 0,
              prev_net_val: b.prev_net_sales_val || 0,
              prev_gross_ctn: b.prev_gross_sales_ctn || 0,
              prev_gross_pcs: b.prev_gross_sales_pcs || 0,
              prev_gross_val: b.prev_gross_sales_val || 0,
              monthly: (b.monthly_breakdown || []).map((m) => ({
                year_month:     m.year_month,
                net_ctn:        m.net_sales_ctn   || 0,
                net_pcs:        m.net_sales_pcs   || 0,
                net_val:        m.net_sales_val   || 0,
                gross_ctn:      m.gross_sales_ctn || 0,
                gross_pcs:      m.gross_sales_pcs || 0,
                gross_val:      m.gross_sales_val || 0,
                target_ctn:     m.target_ctn     || 0,
                target_pcs:     m.target_pcs     || 0,
                target_val:     m.target_val     || 0,
                prev_net_ctn:   m.prev_net_sales_ctn   || 0,
                prev_net_pcs:   m.prev_net_sales_pcs   || 0,
                prev_net_val:   m.prev_net_sales_val   || 0,
                prev_gross_ctn: m.prev_gross_sales_ctn || 0,
                prev_gross_pcs: m.prev_gross_sales_pcs || 0,
                prev_gross_val: m.prev_gross_sales_val || 0,
              })),
            };
          });
        });

        setDailySTTReport(Object.values(branchMap));
        setReportMonths(Array.isArray(res?.months) ? res.months : []);
      } catch (error) {
        msgApi.error("Error fetching daily STT report: " + error.message);
      }
      setLoading(false);
    };

    fetchDailySTTReport();
  }, [fromMonth, toMonth, selectedProducts, msgApi]);

  const columns = useMemo(() => {
    const dynamicCols = (selectedProducts || []).map((p) => {
      const slug = p?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
      return buildGroupColumn(p.code, p?.name || "Unknown", slug);
    });
    const totalCol = buildGroupColumn(
      "__total__",
      "TOTAL (Selected Products)",
      "total"
    );
    return [
      { title: "Branch", dataIndex: "branch", fixed: "left", width: 150 },
      ...dynamicCols,
      totalCol,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, expandedCols, reportMonths, isMultiMonth]);

  const processedData = useMemo(() => {
    if (!dailySTTReport?.length) return [];

    const slugOf = (p) => p.name.toLowerCase().replace(/\s+/g, "_");
    const salesKey  = `${valueType}_${effectiveUnitType}`;        // e.g. net_ctn / gross_pcs / net_val
    const targetKey = `target_${effectiveUnitType}`;
    const prevKey   = `prev_${valueType}_${effectiveUnitType}`;

    const aggregateInto = (target, branchList) => {
      selectedProducts.forEach((p) => {
        const slug = slugOf(p);
        let s = 0, t = 0, pr = 0;
        branchList.forEach((r) => {
          const prod = r.products[slug];
          if (!prod) return;
          s  += prod[salesKey]  || 0;
          t  += prod[targetKey] || 0;
          pr += prod[prevKey]   || 0;
        });
        target[`${slug}_sales`]  = s;
        target[`${slug}_target`] = t;
        target[`${slug}_prev`]   = pr;

        if (reportMonths.length > 1) {
          reportMonths.forEach((ym) => {
            let ms = 0, mt = 0, mp = 0;
            branchList.forEach((r) => {
              const prod = r.products[slug];
              if (!prod?.monthly) return;
              const m = prod.monthly.find((x) => x.year_month === ym);
              if (!m) return;
              ms += m[salesKey]  || 0;
              mt += m[targetKey] || 0;
              mp += m[prevKey]   || 0;
            });
            target[`${slug}_${ym}_sales`]  = ms;
            target[`${slug}_${ym}_target`] = mt;
            target[`${slug}_${ym}_prev`]   = mp;
          });
        }
      });

      target.total_sales  = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_sales`]  || 0), 0);
      target.total_target = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_target`] || 0), 0);
      target.total_prev   = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_prev`]   || 0), 0);

      if (reportMonths.length > 1) {
        reportMonths.forEach((ym) => {
          target[`total_${ym}_sales`]  = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_${ym}_sales`]  || 0), 0);
          target[`total_${ym}_target`] = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_${ym}_target`] || 0), 0);
          target[`total_${ym}_prev`]   = selectedProducts.reduce((sum, p) => sum + (target[`${slugOf(p)}_${ym}_prev`]   || 0), 0);
        });
      }
    };

    const regionGroups = {};
    dailySTTReport.forEach((branch) => {
      const region =
        branch_region_map[branch.branch_name.toUpperCase()] || "UNKNOWN";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(branch);
    });

    const result = [];

    Object.entries(regionGroups).forEach(([region, rows]) => {
      rows.forEach((r) => {
        const row = { key: r.branch_code, branch: r.branch_name || "Unknown" };
        aggregateInto(row, [r]);
        result.push(row);
      });

      const subtotal = {
        key: `${region}-subtotal`,
        branch: `SUB TOTAL (${region})`,
      };
      aggregateInto(subtotal, rows);
      result.push(subtotal);
    });

    const grandTotal = { key: "grand-total", branch: "GRAND TOTAL" };
    aggregateInto(grandTotal, dailySTTReport);
    result.push(grandTotal);

    return result;
  }, [dailySTTReport, selectedProducts, valueType, effectiveUnitType, reportMonths]);

  const exportToExcel = async () => {
    if (!processedData.length) { message.warning("No data to export"); return; }

    const ExcelJS = (await import("exceljs")).default;
    const wb  = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";
    const ws = wb.addWorksheet("Monthly Sales", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });

    const NAV   = "1E3A5F";  const NAVY2 = "243F6A";
    const GREEN = "10B981";  const RED   = "EF4444";
    const LGRAY = "F1F5F9";  const AGOLD = "FEF3C7";
    const STGRY = "E8EDF2";
    const WHITE = "FFFFFFFF";

    const thin  = (argb = "FFE2E8F0") => ({ style: "thin", color: { argb } });
    const border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    const hdrStyle = (bg) => ({
      font:      { bold: true, size: 10, color: { argb: WHITE } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border,
    });

    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt = "0.0%";

    // Build flat column list
    const colDefs = [{ label: "Branch", key: "branch", width: 22, isHeader: true }];
    selectedProducts.forEach((p) => {
      const s = p.name.toLowerCase().replace(/\s+/g, "_");
      colDefs.push(
        { label: "Sales",    key: `${s}_sales`,  product: p.name, width: 14 },
        { label: "Target",   key: `${s}_target`, product: p.name, width: 14 },
        { label: "Ach %",    key: `${s}_ach`,    product: p.name, width: 10, isPct: true },
        { label: "Last Yr",  key: `${s}_prev`,   product: p.name, width: 14 },
        { label: "Growth %", key: `${s}_growth`, product: p.name, width: 11, isPct: true },
      );
    });
    colDefs.push(
      { label: "Sales",    key: "total_sales",  product: "TOTAL", width: 14 },
      { label: "Target",   key: "total_target", product: "TOTAL", width: 14 },
      { label: "Ach %",    key: "total_ach",    product: "TOTAL", width: 10, isPct: true },
      { label: "Last Yr",  key: "total_prev",   product: "TOTAL", width: 14 },
      { label: "Growth %", key: "total_growth", product: "TOTAL", width: 11, isPct: true },
    );

    ws.columns = colDefs.map((c) => ({ key: c.key, width: c.width }));

    // Row 1 — product group headers (merged per product)
    const r1 = ws.getRow(1); r1.height = 20;
    r1.getCell(1).value = ""; r1.getCell(1).style = hdrStyle(NAV);
    let col = 2;
    const productGroups = [
      ...selectedProducts.map((p) => ({ name: p.name, span: 5, bg: NAV })),
      { name: "TOTAL (Selected Products)", span: 5, bg: NAVY2 },
    ];
    productGroups.forEach(({ name, span, bg }) => {
      r1.getCell(col).value = name;
      r1.getCell(col).style = hdrStyle(bg);
      ws.mergeCells(1, col, 1, col + span - 1);
      col += span;
    });

    // Row 2 — sub-headers
    const r2 = ws.getRow(2); r2.height = 20;
    colDefs.forEach((c, i) => {
      const cell = r2.getCell(i + 1);
      cell.value = c.label;
      cell.style = hdrStyle(c.isHeader ? NAV : NAVY2);
    });

    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

    // Track col widths
    const widths = colDefs.map((c) => c.label.length);
    const measure = (i, v) => { const l = String(v ?? "").length; if (l > widths[i]) widths[i] = l; };

    // Data rows
    processedData.forEach((row, idx) => {
      const isSubtotal   = row.branch?.includes("SUB TOTAL");
      const isGrandTotal = row.branch?.includes("GRAND TOTAL");
      const bgArgb = isGrandTotal ? `FF${AGOLD}` : isSubtotal ? `FF${STGRY}` : idx % 2 === 0 ? WHITE : `FF${LGRAY}`;

      const dr = ws.addRow({}); dr.height = 17;

      colDefs.forEach((c, i) => {
        const cell = dr.getCell(i + 1);
        let val = null;

        if (c.key === "branch") {
          val = row.branch;
        } else if (c.isPct) {
          // Compute from sibling sales/target or sales/prev fields
          const base = c.key.replace(/_ach$|_growth$/, "");
          if (c.key.endsWith("_ach")) {
            const s = row[`${base}_sales`] || 0, t = row[`${base}_target`] || 0;
            val = t ? s / t : null;
          } else {
            const s = row[`${base}_sales`] || 0, p = row[`${base}_prev`] || 0;
            val = p ? (s - p) / p : null;
          }
        } else {
          val = row[c.key] || null;
        }

        if (c.key === "branch") {
          cell.value = val;
          cell.style = {
            font:      { bold: isSubtotal || isGrandTotal, size: 10 },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
            alignment: { vertical: "middle" },
            border,
          };
        } else if (c.isPct) {
          cell.value = val;
          const above = val !== null && (c.key.endsWith("_ach") ? val >= 0.9 : val >= 0);
          cell.style = {
            numFmt: pctFmt,
            font:   { bold: isSubtotal || isGrandTotal, size: 10, color: { argb: val === null ? "FF64748B" : above ? `FF${GREEN}` : `FF${RED}` } },
            fill:   { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
            alignment: { horizontal: "right", vertical: "middle" },
            border,
          };
        } else {
          cell.value = val;
          cell.style = {
            numFmt,
            font:      { bold: isSubtotal || isGrandTotal, size: 10 },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
            alignment: { horizontal: "right", vertical: "middle" },
            border,
          };
          measure(i, val ? val.toLocaleString() : "-");
        }
      });
      measure(0, row.branch);
    });

    // Apply widths
    ws.columns.forEach((col, i) => { col.width = Math.min(40, Math.max(8, widths[i] + 2)); });

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `Monthly_Sales_${fromMonth}${toMonth !== fromMonth ? "_to_" + toMonth : ""}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {contextHolder}
      <div className="daily-stt" style={{ padding: 16 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <Select
            mode="multiple"
            style={{ flex: 1, minWidth: 200 }}
            showSearch
            placeholder="Select products"
            value={selectedProducts?.map((p) => p?.code)}
            onChange={(codes) => {
              const selected = productOptions?.filter((p) => codes.includes(p?.code));
              setSelectedProducts(selected);
            }}
            options={productOptions?.map((p) => ({ value: p?.code, label: p?.name || "Unknown" }))}
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
          />

          <Space>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>From:</span>
            <DatePicker
              picker="month"
              value={fromMonth ? dayjs(fromMonth, "YYYYMM") : null}
              onChange={(v) => v && setFromMonth(v.format("YYYYMM"))}
              allowClear={false}
            />
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>To:</span>
            <DatePicker
              picker="month"
              value={toMonth ? dayjs(toMonth, "YYYYMM") : null}
              disabledDate={(d) => fromMonth && d.isBefore(dayjs(fromMonth, "YYYYMM"), "month")}
              onChange={(v) => v && setToMonth(v.format("YYYYMM"))}
              allowClear={false}
            />
          </Space>

          <Button
            icon={<DownloadOutlined />}
            type="primary"
            onClick={exportToExcel}
            disabled={loading || !processedData.length}
          >
            Export to Excel
          </Button>
        </div>

        <Table
          bordered
          size="small"
          dataSource={processedData}
          columns={columns}
          pagination={false}
          rowClassName={(record) => {
            if (record.branch?.includes("SUB TOTAL")) return "subtotal-row";
            if (record.branch?.includes("GRAND TOTAL")) return "grandtotal-row";
            return "";
          }}
          scroll={{ x: "max-content", y: "55vh" }}
          loading={loading}
        />
      </div>
    </>
  );
};

export default DailySTT;
