import { useState, useEffect, useMemo, useContext } from "react";
import { Table, message, Skeleton, Tabs, Select, Button, Modal, Spin, Tag } from "antd";
import { DownloadOutlined, DoubleLeftOutlined, DoubleRightOutlined } from "@ant-design/icons";
import { ProductContext } from "../../../Contexts/ProductContext";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllProducts } from "../../../API/Products";
import { getDailyBranchSales, getDailyCustomerBreakdown } from "../../../API/Daily STT Report";
import { openSalesmanAnalysis } from "../Reports/reportUtils";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./style.css";

const { Option } = Select;

const DailySalesByBranch = () => {
  const { selectedMonth } = useDateFilter();
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);

  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [dayColumns, setDayColumns] = useState([]);
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const [channels, setChannels] = useState([
    "BRN",
    "RTI",
    "WS",
    "PHA",
    "CFC",
    "CSM",
    "DSC",
    "ECM",
    "HRC",
    "KA",
    "MM",
    "RTA",
  ]);
  const [selectedChannels, setSelectedChannels] = useState(channels);

  // Default: only the most recent 7 day-columns are visible to avoid horizontal scroll.
  const [showAllDays, setShowAllDays] = useState(false);
  const DEFAULT_RECENT_DAYS = 7;

  // Drill-down modal state
  const [drillModal, setDrillModal] = useState({ open: false, loading: false, title: "", data: [], total: 0, branchCode: "" });

  // ------------------------------
  // Fetch products
  // ------------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts();
        const products = res?.results || [];

        const hasIndomie = products.some((p) =>
          p?.name?.toLowerCase()?.includes("indomie"),
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
        if (!selectedProduct && products.length > 0)
          setSelectedProduct(products[0]);
      } catch (err) {
        message.error("Error fetching products: " + err.message);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedProduct, setSelectedProduct]);

  // ------------------------------
  // Fetch sales data
  // ------------------------------
  useEffect(() => {
    const fetchSales = async () => {
      if (!selectedProduct) return;
      setLoading(true);
      try {
        const res = await getDailyBranchSales(
          selectedMonth,
          selectedProduct.code,
          effectiveUnitType,
          valueType,
          selectedChannels,
        );

        const results = res?.results || [];
        const mappedDays = (res?.day_columns || []).map((d) => ({
          key:      d.key,
          title:    d.title,
          shortDay: d.shortDay,
        }));

        setDayColumns(mappedDays);
        setSalesData(results);
      } catch (err) {
        message.error("Error fetching daily sales: " + err.message);
      }
      setLoading(false);
    };

    fetchSales();
  }, [selectedProduct, effectiveUnitType, valueType, selectedMonth, selectedChannels]);

  // ------------------------------
  // Columns for Table
  // ------------------------------
  const columns = useMemo(() => {
    const canCollapse = dayColumns.length > DEFAULT_RECENT_DAYS;
    const visibleDayColumns = (showAllDays || !canCollapse)
      ? dayColumns
      : dayColumns.slice(-DEFAULT_RECENT_DAYS);
    const hiddenCount = dayColumns.length - visibleDayColumns.length;

    const dayCols = visibleDayColumns.map((d) => ({
      title: (
        <div style={{ textAlign: "center", lineHeight: 1.3 }}>
          <div>{d.title}</div>
          <div style={{ fontSize: 10, opacity: 0.65 }}>{d.shortDay}</div>
        </div>
      ),
      dataIndex: d.key,
      key: d.key,
      width: 52,
      align: "right",
      sorter: (a, b) =>
        a.isTotal ? 1 : b.isTotal ? -1 : (a[d.key] || 0) - (b[d.key] || 0),
      render: (v, row) => {
        if (!v || row.isTotal) return renderNumber(v, "#000", false);
        return (
          <span
            onClick={() => handleCellClick(row, d)}
            style={{ cursor: "pointer" }}
          >
            {v.toLocaleString()}
          </span>
        );
      },
    }));

    // Insert a clickable expander/collapser column at the start of the day strip.
    if (canCollapse) {
      const expanded = showAllDays;
      dayCols.unshift({
        title: (
          <div
            onClick={() => setShowAllDays((v) => !v)}
            style={{
              textAlign: "center",
              cursor: "pointer",
              color: "#3B82F6",
              fontSize: 11,
              lineHeight: 1.3,
              padding: "2px 4px",
              userSelect: "none",
            }}
            title={expanded ? "Hide earlier days" : `Show all ${dayColumns.length} days`}
          >
            {expanded ? (
              <>
                <DoubleRightOutlined style={{ fontSize: 10 }} />
                <div style={{ fontSize: 10, opacity: 0.85 }}>hide</div>
              </>
            ) : (
              <>
                <DoubleLeftOutlined style={{ fontSize: 10 }} />
                <div style={{ fontSize: 10, opacity: 0.85 }}>+{hiddenCount} earlier</div>
              </>
            )}
          </div>
        ),
        key: "__day_toggle__",
        width: 64,
        align: "center",
        render: () => <span style={{ color: "#CBD5E1" }}>·</span>,
      });
    }

    const renderNumber = (v, color = "#000", bold = true) => {
      if (v === 0 || v === null || v === undefined) return "-";
      return bold ? (
        <b style={{ color }}>{v.toLocaleString()}</b>
      ) : (
        <span style={{ color }}>{v.toLocaleString()}</span>
      );
    };

    const numericCols = [
      {
        title: "MTD",
        dataIndex: "total",
        key: "total",
        align: "right",
        sorter: (a, b) =>
          a.isTotal ? 1 : b.isTotal ? -1 : (a.total || 0) - (b.total || 0),
        render: (v) => renderNumber(v, "#3B82F6"),
      },
      {
        title: "Remaining",
        dataIndex: "remaining",
        key: "remaining",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.remaining || 0) - (b.remaining || 0),
        render: (v) => renderNumber(v, "#F59E0B"),
      },
      {
        title: "Target",
        dataIndex: "target",
        key: "target",
        align: "right",
        sorter: (a, b) =>
          a.isTotal ? 1 : b.isTotal ? -1 : (a.target || 0) - (b.target || 0),
        render: (v) => renderNumber(v, "#000000ff"),
      },
      {
        title: "Achievement %",
        dataIndex: "achievement",
        key: "achievement",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.achievement || 0) - (b.achievement || 0),
        render: (v) =>
          !v ? (
            "-"
          ) : (
            <b style={{ color: v >= 100 ? "green" : "red" }}>
              {v.toFixed(2)}%
            </b>
          ),
      },
      {
        title: "Daily Ach %",
        dataIndex: "dailyAch",
        key: "dailyAch",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.dailyAch || 0) - (b.dailyAch || 0),
        render: (v) =>
          !v ? (
            "-"
          ) : (
            <b style={{ color: v >= 100 ? "green" : "red" }}>
              {v.toFixed(2)}%
            </b>
          ),
      },
    ];

    return [
      {
        title: "Branch",
        dataIndex: "branch",
        key: "branch",
        fixed: "left",
        width: 160,
        render: (v, row) =>
          row.isChannel ? (
            <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
              <Tag style={{ margin: 0, fontSize: 11 }}>{v}</Tag>
            </span>
          ) : (
            <b style={{ color: "#000000ff" }}>{v?.toLocaleString()}</b>
          ),
      },
      ...dayCols,
      ...numericCols,
    ];
  }, [dayColumns, showAllDays]);

  // ------------------------------
  // Append Grand Total Row
  // ------------------------------
  const dataWithTotal = useMemo(() => {
    if (!salesData.length) return [];

    const totalRow = {
      branch: "GRAND TOTAL",
      key: "grand-total",
      isTotal: true,
    };

    // Sum each day
    dayColumns.forEach((d) => {
      totalRow[d.key] = salesData.reduce((sum, r) => sum + (r[d.key] || 0), 0);
    });

    totalRow.total = salesData.reduce((sum, r) => sum + (r.total || 0), 0);
    totalRow.target = salesData.reduce((sum, r) => sum + (r.target || 0), 0);
    totalRow.remaining = totalRow.target - totalRow.total;
    totalRow.achievement = totalRow.target
      ? (totalRow.total / totalRow.target) * 100
      : 0;
    totalRow.dailyAch = totalRow.target
      ? (totalRow[dayColumns[dayColumns.length - 1].key] /
          (totalRow.target / salesData.length)) *
        100
      : 0;

    const branchRows = salesData.map((r, idx) => ({
      key: `b-${idx}`,
      ...r,
      children: (r.channels || []).length
        ? r.channels.map((c, ci) => ({ key: `b-${idx}-c-${ci}`, ...c }))
        : undefined,
    }));

    return [...branchRows, totalRow];
  }, [salesData, dayColumns]);

  const productTabs = productOptions.map((p) => ({
    label: p.name,
    key: p.code,
  }));

  const handleCellClick = async (row, dayMeta) => {
    if (!row.branchCode || row.isTotal) return;
    const dayNum = parseInt(dayMeta.title, 10);
    const year   = parseInt(selectedMonth.slice(0, 4), 10);
    const month  = parseInt(selectedMonth.slice(4), 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const productCodes = selectedProduct?.code || "";

    const drillChannels = row.isChannel ? [row.channel] : selectedChannels;
    const titlePrefix = row.isChannel
      ? `${row.channel} (channel) — ${dayMeta.title} ${dayMeta.shortDay}`
      : `${row.branch} — ${dayMeta.title} ${dayMeta.shortDay}`;
    setDrillModal({ open: true, loading: true, title: titlePrefix, data: [], total: 0, branchCode: row.branchCode });

    const res = await getDailyCustomerBreakdown({
      branchCode:   row.branchCode,
      date:         dateStr,
      productCodes,
      unitType:     effectiveUnitType,
      valueType,
      channels:     drillChannels,
    });

    if (res?.error) {
      message.error("Failed to load breakdown");
      setDrillModal((p) => ({ ...p, loading: false }));
    } else {
      setDrillModal((p) => ({ ...p, loading: false, data: res.results || [], total: res.total || 0 }));
    }
  };

  const exportToExcel = async () => {
    if (!dataWithTotal.length) {
      message.warning("No data to export");
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Wazalytics";
    const sheet = workbook.addWorksheet("Daily Sales", {
      views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
    });

    // ── Palette ───────────────────────────────────────────────
    const NAV   = "1E3A5F";
    const BLUE  = "3B82F6";
    const AMBER = "F59E0B";
    const GREEN = "10B981";
    const RED   = "EF4444";
    const LGRAY = "F1F5F9";
    const AGOLD = "FEF3C7";

    // ── Column definitions ────────────────────────────────────
    const summaryKeys = [
      { key: "total",       header: "MTD",           color: BLUE  },
      { key: "target",      header: "Target",        color: null  },
      { key: "remaining",   header: "Remaining",     color: AMBER },
      { key: "achievement", header: "Achievement %", color: null  },
      { key: "dailyAch",    header: "Daily Ach %",   color: null  },
    ];

    // Widths will be patched after data rows are written — set 10 as placeholder
    sheet.columns = [
      { key: "branch", header: "Branch", width: 10 },
      ...dayColumns.map((d) => ({ key: d.key, header: `${d.title} ${d.shortDay}`, width: 10 })),
      ...summaryKeys.map((s) => ({ key: s.key, header: s.header, width: 10 })),
    ];

    // Track max char length per column index (1-based)
    const colWidths = new Array(sheet.columns.length).fill(0);
    const measureCol = (colIdx0, text) => {
      const len = String(text ?? "").length;
      if (len > colWidths[colIdx0]) colWidths[colIdx0] = len;
    };

    // Seed widths from header labels
    sheet.columns.forEach((col, i) => measureCol(i, col.header));

    // ── Header row style ──────────────────────────────────────
    const headerStyle = (bgArgb) => ({
      font:      { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgArgb}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: {
        top:    { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left:   { style: "thin", color: { argb: "FFE2E8F0" } },
        right:  { style: "thin", color: { argb: "FFE2E8F0" } },
      },
    });

    const hRow = sheet.getRow(1);
    hRow.height = 32;

    // Branch header
    Object.assign(hRow.getCell(1), { value: "Branch", style: headerStyle(NAV) });

    // Day headers
    dayColumns.forEach((d, i) => {
      Object.assign(hRow.getCell(i + 2), {
        value: `${d.title}\n${d.shortDay}`,
        style: headerStyle(NAV),
      });
    });

    // Summary headers — slightly lighter shade for last columns
    const summaryStartCol = dayColumns.length + 2;
    summaryKeys.forEach((s, i) => {
      Object.assign(hRow.getCell(summaryStartCol + i), {
        value: s.header,
        style: headerStyle(s.color || NAV),
      });
    });

    // ── Data rows ─────────────────────────────────────────────
    const numFmt    = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt    = "0.00%";
    const borderThin = (argb = "FFE2E8F0") => ({ style: "thin", color: { argb } });
    const cellBorder = {
      top: borderThin(), bottom: borderThin(), left: borderThin(), right: borderThin(),
    };

    dataWithTotal.forEach((row, rowIdx) => {
      const isGrandTotal = row.isTotal;
      const isEven       = rowIdx % 2 === 0;
      const bgArgb       = isGrandTotal ? `FF${AGOLD}` : isEven ? "FFFFFFFF" : `FF${LGRAY}`;

      const dataRow  = sheet.addRow({});
      dataRow.height = 18;

      // Branch cell
      measureCol(0, row.branch);
      const branchCell = dataRow.getCell(1);
      branchCell.value = row.branch;
      branchCell.style = {
        font:      { bold: isGrandTotal, size: 10, color: { argb: "FF1E293B" } },
        fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
        alignment: { vertical: "middle" },
        border:    cellBorder,
      };

      // Day value cells
      dayColumns.forEach((d, i) => {
        const cell = dataRow.getCell(i + 2);
        const val  = row[d.key] || 0;
        cell.value = val === 0 ? null : val;
        measureCol(i + 1, val === 0 ? "-" : val.toLocaleString());
        cell.style = {
          numFmt:    numFmt,
          font:      { bold: isGrandTotal, size: 10 },
          fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
          alignment: { horizontal: "right", vertical: "middle" },
          border:    cellBorder,
        };
      });

      // Summary cells
      summaryKeys.forEach((s, i) => {
        const cell = dataRow.getCell(summaryStartCol + i);
        const raw  = row[s.key];

        if (s.key === "achievement" || s.key === "dailyAch") {
          cell.value = raw ? raw / 100 : null;
          measureCol(summaryStartCol - 1 + i, raw ? `${raw.toFixed(2)}%` : "-");
          const aboveTarget = raw >= 100;
          cell.style = {
            numFmt:    pctFmt,
            font:      { bold: true, size: 10, color: { argb: raw ? `FF${aboveTarget ? GREEN : RED}` : "FF64748B" } },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
            alignment: { horizontal: "right", vertical: "middle" },
            border:    cellBorder,
          };
        } else {
          const val = raw || 0;
          cell.value = val === 0 ? null : val;
          measureCol(summaryStartCol - 1 + i, val === 0 ? "-" : val.toLocaleString());
          const txtArgb = s.color ? `FF${s.color}` : "FF1E293B";
          cell.style = {
            numFmt:    numFmt,
            font:      { bold: isGrandTotal || !!s.color, size: 10, color: { argb: txtArgb } },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
            alignment: { horizontal: "right", vertical: "middle" },
            border:    cellBorder,
          };
        }
      });
    });

    // ── Apply auto-fit column widths (min 8, max 40, +2 padding) ─
    sheet.columns.forEach((col, i) => {
      col.width = Math.min(40, Math.max(8, colWidths[i] + 2));
    });

    // ── Write & download ──────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href     = url;
    a.download = `Daily_Sales_${selectedMonth}_${selectedProduct?.name}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChannelChange = (values) => {
    if (values.includes("ALL")) {
      setSelectedChannels(channels); // select all
    } else if (values.includes("NONE")) {
      setSelectedChannels([]); // unselect all
    } else {
      setSelectedChannels(values);
    }
  };

  return (
    <div className="daily-sales-report" style={{ padding: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <h2>Daily Sales by Branch</h2>
        {/* Channel Select */}
        <Select
          mode="multiple"
          loading={loading}
          value={selectedChannels}
          onChange={handleChannelChange}
          style={{ flex: 1, maxWidth: "500px" }}
          placeholder="Select Channels"
        >
          <Option key="ALL" value="ALL">
            Select All
          </Option>
          <Option key="NONE" value="NONE">
            Unselect All
          </Option>
          {channels.map((channel) => (
            <Option key={channel} value={channel}>
              {channel}
            </Option>
          ))}
        </Select>
      </div>

      {loading && <Skeleton active paragraph={{ rows: 10 }} style={{ marginBottom: 20 }} />}

      <Tabs
        activeKey={selectedProduct?.code}
        onChange={(key) => {
          const prod = productOptions.find((p) => p.code === key);
          if (prod) setSelectedProduct(prod);
        }}
        style={{ marginBottom: 20 }}
      >
        {productTabs.map((tab) => (
          <Tabs.TabPane tab={tab.label} key={tab.key} />
        ))}
      </Tabs>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={exportToExcel}
          disabled={loading || !dataWithTotal.length}
          type="primary"
        >
          Export to Excel
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={dataWithTotal}
        bordered
        size="middle"
        scroll={{ x: "max-content", y: "60vh" }}
        pagination={false}
        rowClassName={(record) => (record.isTotal ? "grand-total-row" : "")}
        style={{ background: "#fff", borderRadius: 8 }}
      />

      {/* ── Customer Breakdown Modal ───────────────────────── */}
      <Modal
        title={
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
              {drillModal.title}
            </div>
            {!drillModal.loading && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {drillModal.data.length} customer{drillModal.data.length !== 1 ? "s" : ""}
                {" · "}Total: <b style={{ color: "var(--color-primary)" }}>{drillModal.total?.toLocaleString()}</b>
                {" "}
                {isValueMode ? (
                  <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "-2px" }}>
                    <RiyalIcon width={12} height={12} color="var(--color-primary)" />
                  </span>
                ) : (
                  unitType?.toUpperCase()
                )}
              </div>
            )}
          </div>
        }
        open={drillModal.open}
        onCancel={() => setDrillModal((p) => ({ ...p, open: false }))}
        footer={null}
        width={900}
        styles={{ body: { padding: "12px 0 0" } }}
      >
        {drillModal.loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            size="small"
            bordered
            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
            dataSource={drillModal.data.map((r, i) => ({ ...r, key: i }))}
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
                render: (v, r) => {
                  const params = new URLSearchParams({
                    customer_code: r.customer_code,
                    branch_code:   drillModal.branchCode,
                    channel_code:  r.channel,
                    ...(selectedProduct?.code && { product_code: selectedProduct.code }),
                  });
                  return (
                    <div onClick={() => window.open(`/customer-analysis?${params.toString()}`, "_blank")} style={{ cursor: "pointer" }}>
                      <div style={{ fontWeight: 500, fontSize: 12, color: "var(--color-accent)" }}>{v}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{r.customer_code}</div>
                    </div>
                  );
                },
              },
              {
                title: "Channel",
                dataIndex: "channel",
                key: "channel",
                width: 80,
                align: "center",
                render: (v) => <Tag style={{ fontSize: 11, margin: 0 }}>{v}</Tag>,
              },
              {
                title: "Salesman",
                dataIndex: "salesman",
                key: "salesman",
                ellipsis: true,
                render: (v, r) => (r.salesman_code && r.salesman_code !== "-") ? (
                  <div
                    onClick={() => openSalesmanAnalysis({
                      salesmanCode: r.salesman_code,
                      branchCode:   drillModal.branchCode,
                      productCode:  selectedProduct?.code,
                    })}
                    style={{ cursor: "pointer" }}
                    title="Open Salesman Analysis in new tab"
                  >
                    <div style={{ fontWeight: 500, fontSize: 12, color: "var(--color-accent)" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{r.salesman_code}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>—</div>
                  </div>
                ),
              },
              {
                title: isValueMode ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    Sales (<RiyalIcon width={11} height={11} color="#FFFFFF" />)
                  </span>
                ) : `Sales (${unitType?.toUpperCase()})`,
                dataIndex: "sales",
                key: "sales",
                width: 110,
                align: "right",
                render: (v) => (
                  <b style={{ color: "var(--color-primary)" }}>{v?.toLocaleString()}</b>
                ),
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <b style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>Total</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <b style={{ color: "var(--color-primary)" }}>{drillModal.total?.toLocaleString()}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default DailySalesByBranch;
