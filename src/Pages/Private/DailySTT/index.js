import { useContext, useEffect, useMemo, useState } from "react";
import { Table, Select, message, DatePicker, Button, Space } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./style.css";
import { getAllProducts } from "../../../API/Products";
import { ProductContext } from "../../../Contexts/ProductContext";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getDailySTT } from "../../../API/Daily STT Report";

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
  const [msgApi, contextHolder] = message.useMessage();
  const { unitType, valueType } = useContext(UnitValueContext);

  // From / To month range (local — not tied to global DateFilter)
  const [fromMonth, setFromMonth] = useState(selectedMonth || dayjs().format("YYYYMM"));
  const [toMonth,   setToMonth]   = useState(selectedMonth || dayjs().format("YYYYMM"));

  const getProductColumns = (product) => {
    const slug =
      product?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
    return {
      title: product?.name || "Unknown",
      children: [
        {
          title: "Sales",
          dataIndex: `${slug}_sales`,
          render: (v) => v?.toLocaleString(),
          sorter: (a, b) =>
            (a[`${slug}_sales`] || 0) - (b[`${slug}_sales`] || 0),
        },
        {
          title: "Target",
          dataIndex: `${slug}_target`,
          render: (v) => v?.toLocaleString(),
          sorter: (a, b) =>
            (a[`${slug}_target`] || 0) - (b[`${slug}_target`] || 0),
        },
        {
          title: "Ach %",
          render: (_, record) => {
            const sales = record[`${slug}_sales`] || 0;
            const target = record[`${slug}_target`] || 0;
            const achievement = target ? (sales / target) * 100 : 0;
            return (
              <span style={{ color: achievement < 90 ? "red" : "green" }}>
                {achievement.toFixed(1)}%
              </span>
            );
          },
          sorter: (a, b) => {
            const aVal = a[`${slug}_target`]
              ? (a[`${slug}_sales`] / a[`${slug}_target`]) * 100
              : 0;
            const bVal = b[`${slug}_target`]
              ? (b[`${slug}_sales`] / b[`${slug}_target`]) * 100
              : 0;
            return aVal - bVal;
          },
        },
        {
          title: "Last Yr",
          dataIndex: `${slug}_prev`,
          render: (v) => v?.toLocaleString(),
          sorter: (a, b) => (a[`${slug}_prev`] || 0) - (b[`${slug}_prev`] || 0),
        },
        {
          title: "Growth %",
          render: (_, record) => {
            const g =
              ((record[`${slug}_sales`] - record[`${slug}_prev`]) /
                (record[`${slug}_prev`] || 1)) *
              100;
            return (
              <span style={{ color: g < 0 ? "red" : "green" }}>
                {g?.toFixed(1)}%
              </span>
            );
          },

          sorter: (a, b) => {
            const aVal =
              ((a[`${slug}_sales`] - a[`${slug}_prev`]) /
                (a[`${slug}_prev`] || 1)) *
              100;
            const bVal =
              ((b[`${slug}_sales`] - b[`${slug}_prev`]) /
                (b[`${slug}_prev`] || 1)) *
              100;
            return aVal - bVal;
          },
        },
      ],
    };
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
              gross_ctn: b.gross_sales_ctn || 0,
              gross_pcs: b.gross_sales_pcs || 0,
              target_ctn: b.target_ctn || 0,
              target_pcs: b.target_pcs || 0,
              prev_net_ctn: b.prev_net_sales_ctn || 0,
              prev_net_pcs: b.prev_net_sales_pcs || 0,
              prev_gross_ctn: b.prev_gross_sales_ctn || 0,
              prev_gross_pcs: b.prev_gross_sales_pcs || 0,
            };
          });
        });

        setDailySTTReport(Object.values(branchMap));
      } catch (error) {
        msgApi.error("Error fetching daily STT report: " + error.message);
      }
      setLoading(false);
    };

    fetchDailySTTReport();
  }, [fromMonth, toMonth, selectedProducts, msgApi]);

  const columns = useMemo(() => {
    const dynamicCols = selectedProducts?.map(getProductColumns) || [];
    const totalCol = {
      title: "TOTAL (Selected Products)",
      children: [
        {
          title: "Sales",
          dataIndex: "total_sales",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Target",
          dataIndex: "total_target",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Ach %",
          render: (_, record) => {
            const achievement = record.total_target
              ? (record.total_sales / record.total_target) * 100
              : 0;
            return (
              <span style={{ color: achievement < 90 ? "red" : "green" }}>
                {achievement.toFixed(1)}%
              </span>
            );
          },
        },
        {
          title: "Last Yr",
          dataIndex: "total_prev",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Growth %",
          render: (_, record) => {
            const growth =
              ((record.total_sales - record.total_prev) /
                (record.total_prev || 1)) *
              100;
            return (
              <span style={{ color: growth < 0 ? "red" : "green" }}>
                {growth.toFixed(1)}%
              </span>
            );
          },
        },
      ],
    };
    return [
      { title: "Branch", dataIndex: "branch", fixed: "left", width: 150 },
      ...dynamicCols,
      totalCol,
    ];
  }, [selectedProducts]);

  const processedData = useMemo(() => {
    if (!dailySTTReport?.length) return [];

    const regionGroups = {};
    dailySTTReport.forEach((branch) => {
      const region =
        branch_region_map[branch.branch_name.toUpperCase()] || "UNKNOWN";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(branch);
    });

    const result = [];

    Object.entries(regionGroups).forEach(([region, rows]) => {
      // Add branch rows
      rows.forEach((r) => {
        const row = { key: r.branch_code, branch: r.branch_name || "Unknown" };
        selectedProducts.forEach((p) => {
          const slug = p.name.toLowerCase().replace(/\s+/g, "_");
          const prod = r.products[slug] || {};
          row[`${slug}_sales`] = prod[`${valueType}_${unitType}`] || 0;
          row[`${slug}_target`] = prod[`target_${unitType}`] || 0;
          row[`${slug}_prev`] = prod[`prev_${valueType}_${unitType}`] || 0;
        });

        row.total_sales = selectedProducts.reduce(
          (sum, p) =>
            sum +
            (row[`${p.name.toLowerCase().replace(/\s+/g, "_")}_sales`] || 0),
          0
        );
        row.total_target = selectedProducts.reduce(
          (sum, p) =>
            sum +
            (row[`${p.name.toLowerCase().replace(/\s+/g, "_")}_target`] || 0),
          0
        );
        row.total_prev = selectedProducts.reduce(
          (sum, p) =>
            sum +
            (row[`${p.name.toLowerCase().replace(/\s+/g, "_")}_prev`] || 0),
          0
        );

        result.push(row);
      });

      // Subtotal per region
      const subtotal = {
        key: `${region}-subtotal`,
        branch: `SUB TOTAL (${region})`,
      };
      selectedProducts.forEach((p) => {
        const slug = p.name.toLowerCase().replace(/\s+/g, "_");
        subtotal[`${slug}_sales`] = rows.reduce(
          (sum, r) =>
            sum + (r.products[slug]?.[`${valueType}_${unitType}`] || 0),
          0
        );
        subtotal[`${slug}_target`] = rows.reduce(
          (sum, r) => sum + (r.products[slug]?.[`target_${unitType}`] || 0),
          0
        );
        subtotal[`${slug}_prev`] = rows.reduce(
          (sum, r) =>
            sum + (r.products[slug]?.[`prev_${valueType}_${unitType}`] || 0),
          0
        );
      });

      subtotal.total_sales = selectedProducts.reduce(
        (sum, p) =>
          sum +
          (subtotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_sales`] || 0),
        0
      );
      subtotal.total_target = selectedProducts.reduce(
        (sum, p) =>
          sum +
          (subtotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_target`] ||
            0),
        0
      );
      subtotal.total_prev = selectedProducts.reduce(
        (sum, p) =>
          sum +
          (subtotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_prev`] || 0),
        0
      );

      result.push(subtotal);
    });

    // Grand total row
    const grandTotal = { key: "grand-total", branch: "GRAND TOTAL" };
    selectedProducts.forEach((p) => {
      const slug = p.name.toLowerCase().replace(/\s+/g, "_");
      grandTotal[`${slug}_sales`] = dailySTTReport.reduce(
        (sum, r) => sum + (r.products[slug]?.[`${valueType}_${unitType}`] || 0),
        0
      );
      grandTotal[`${slug}_target`] = dailySTTReport.reduce(
        (sum, r) => sum + (r.products[slug]?.[`target_${unitType}`] || 0),
        0
      );
      grandTotal[`${slug}_prev`] = dailySTTReport.reduce(
        (sum, r) =>
          sum + (r.products[slug]?.[`prev_${valueType}_${unitType}`] || 0),
        0
      );
    });

    grandTotal.total_sales = selectedProducts.reduce(
      (sum, p) =>
        sum +
        (grandTotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_sales`] || 0),
      0
    );
    grandTotal.total_target = selectedProducts.reduce(
      (sum, p) =>
        sum +
        (grandTotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_target`] ||
          0),
      0
    );
    grandTotal.total_prev = selectedProducts.reduce(
      (sum, p) =>
        sum +
        (grandTotal[`${p.name.toLowerCase().replace(/\s+/g, "_")}_prev`] || 0),
      0
    );

    result.push(grandTotal);

    return result;
  }, [dailySTTReport, selectedProducts, valueType, unitType]);

  const exportToExcel = async () => {
    if (!processedData.length) { message.warning("No data to export"); return; }

    const ExcelJS = (await import("exceljs")).default;
    const wb  = new ExcelJS.Workbook();
    wb.creator = "SBTC Sales Analysis";
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
