import { useContext, useEffect, useState } from "react";
import {
  Table,
  Skeleton,
  message,
  Button,
  Tag,
  Space,
} from "antd";
import { CloseCircleFilled, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getSalesTargetOverview } from "../../../API/Reports";
import MonthRangePicker from "../../../Components/MonthRangePicker";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./reports.css";

const fmtNum = (v) =>
  v === 0 || v == null
    ? "-"
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const PctCell = ({ v, kind }) => {
  if (v == null || !isFinite(v))
    return <span style={{ color: "#94A3B8", fontSize: 11 }}>—</span>;
  const good = kind === "achv" ? v >= 90 : v >= 0;
  const color = good ? "#10B981" : "#EF4444";
  const bg = good ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  const sign = kind === "grow" && v > 0 ? "+" : "";
  return (
    <span
      style={{
        color,
        background: bg,
        padding: "1px 5px",
        borderRadius: 3,
        fontWeight: 600,
        fontSize: 11,
        display: "inline-block",
        textAlign: "right",
      }}
    >
      {sign}
      {v.toFixed(1)}%
    </span>
  );
};

// Small helper: render a value in the summary row.
const totalNumCell = (v) => (
  <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtNum(v)}</span>
);

const SalesTargetOverview = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, valueType, effectiveUnitType, mode } =
    useContext(UnitValueContext);
  const isValueMode = mode === "val";
  // Column headers use the navy background — white keeps the riyal glyph
  // legible there. Non-value units are already rendered as plain white text.
  const unitLabel = isValueMode ? (
    <RiyalIcon width={11} height={11} color="#FFFFFF" />
  ) : (
    (unitType || "ctn").toUpperCase()
  );
  const unitLabelStr = isValueMode ? "SAR" : (unitType || "ctn").toUpperCase();

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);

  // Picker always drives the report — default to selectedMonth (or current
  // calendar month) so the toolbar isn't blank on first render.
  const initialMonth = selectedMonth
    ? dayjs(selectedMonth, "YYYYMM")
    : dayjs().startOf("month");
  const [fromMonth, setFromMonth] = useState(initialMonth);
  const [toMonth,   setToMonth]   = useState(initialMonth);
  const fromMonthStr = fromMonth ? fromMonth.format("YYYYMM") : null;
  const toMonthStr   = toMonth   ? toMonth.format("YYYYMM")   : null;
  const isRangeActive = !!(fromMonthStr && toMonthStr);

  // Multi-select: click a row to toggle its inclusion. Empty arrays mean
  // "no filter — show everything in scope".
  const [selectedProductCodes, setSelectedProductCodes] = useState([]);
  const [selectedBranchCodes, setSelectedBranchCodes] = useState([]);

  const toggleCode = (codes, code) =>
    codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code];

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    getAllBranches().then((r) => setBranches(r?.results || []));
    getAllProducts().then((r) => setProducts(r?.results || []));
  }, []);

  useEffect(() => {
    if (!fromMonthStr || !toMonthStr) return;
    setLoading(true);
    getSalesTargetOverview({
      fromMonth: fromMonthStr,
      toMonth:   toMonthStr,
      unitType:  effectiveUnitType,
      valueType,
      selectedBranchCodes,
      selectedProductCodes,
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
    selectedProductCodes,
  ]);

  // Names lookup used by both the row-tags and the header labels below.
  const productLabelFor = (code) => {
    if (code === "9999901") return "INDOMIE PILLOW (All)";
    if (code === "9999902") return "INDOMIE CUP (All)";
    return products.find((p) => p.code === code)?.name || code;
  };
  const branchLabelFor = (code) =>
    branches.find((b) => b.code === code)?.name || code;

  const onProductRow = (row) => ({
    onClick: () => setSelectedProductCodes((cur) => toggleCode(cur, row.code)),
    style: { cursor: "pointer" },
  });
  const onBranchRow = (row) => ({
    onClick: () => setSelectedBranchCodes((cur) => toggleCode(cur, row.code)),
    style: { cursor: "pointer" },
  });

  const rowClassName = (selectedCodes) => (row) =>
    selectedCodes.includes(row.code) ? "sto-row-selected" : "";

  // Compute width from the widest formatted value in a numeric column
  // (including the total row and header). Char-to-px is calibrated for the
  // 11px font used across the table. Kept within a min/max so a single huge
  // outlier doesn't blow up the layout.
  const numWidth = (rows, total, key, headerText, kind) => {
    const CHAR_PX  = 7.2;
    const PADDING  = 20; // cell padding + sort caret room
    const MIN      = kind === "pct" ? 62 : 70;
    const MAX      = kind === "pct" ? 90 : 140;
    const fmt      = kind === "pct"
      ? (v) => (v == null || !isFinite(v) ? "—" : `${v > 0 && kind === "pct" ? "+" : ""}${v.toFixed(1)}%`)
      : (v) => fmtNum(v);
    let widest = String(headerText).length;
    rows.forEach((r) => { widest = Math.max(widest, String(fmt(r[key])).length); });
    if (total) widest = Math.max(widest, String(fmt(total[key])).length);
    return Math.max(MIN, Math.min(MAX, Math.round(widest * CHAR_PX + PADDING)));
  };

  const nameWidth = (rows, headerText) => {
    const CHAR_PX = 6.4;
    const PADDING = 20;
    const MIN     = 120;
    const MAX     = 260;
    let widest = String(headerText).length;
    rows.forEach((r) => { widest = Math.max(widest, String(r.name || "").length); });
    return Math.max(MIN, Math.min(MAX, Math.round(widest * CHAR_PX + PADDING)));
  };

  const buildColumns = (nameHeader, rows, total) => [
    {
      title: nameHeader,
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: nameWidth(rows, nameHeader),
      render: (v) => <span style={{ fontWeight: 500, fontSize: 11 }}>{v}</span>,
    },
    {
      title: <span>TY ({unitLabel})</span>,
      dataIndex: "this_year",
      key: "this_year",
      align: "right",
      width: numWidth(rows, total, "this_year", "TY (XXX)", "num"),
      render: (v) => <span style={{ fontSize: 11 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.this_year || 0) - (b.this_year || 0),
    },
    {
      title: <span>Target</span>,
      dataIndex: "target",
      key: "target",
      align: "right",
      width: numWidth(rows, total, "target", "Target", "num"),
      render: (v) => <span style={{ fontSize: 11 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.target || 0) - (b.target || 0),
    },
    {
      title: "Achv%",
      dataIndex: "achv_pct",
      key: "achv_pct",
      align: "center",
      width: numWidth(rows, total, "achv_pct", "Achv%", "pct"),
      render: (v) => <PctCell v={v} kind="achv" />,
      sorter: (a, b) => (a.achv_pct ?? -Infinity) - (b.achv_pct ?? -Infinity),
    },
    {
      title: <span>LY ({unitLabel})</span>,
      dataIndex: "last_year",
      key: "last_year",
      align: "right",
      width: numWidth(rows, total, "last_year", "LY (XXX)", "num"),
      render: (v) => <span style={{ fontSize: 11 }}>{fmtNum(v)}</span>,
      sorter: (a, b) => (a.last_year || 0) - (b.last_year || 0),
    },
    {
      title: "Grow%",
      dataIndex: "grow_pct",
      key: "grow_pct",
      align: "center",
      width: numWidth(rows, total, "grow_pct", "Grow%", "pct"),
      render: (v) => <PctCell v={v} kind="grow" />,
      sorter: (a, b) => (a.grow_pct ?? -Infinity) - (b.grow_pct ?? -Infinity),
    },
  ];

  // Fixed summary row: uses AntD's <Table.Summary fixed> so it stays visible
  // when the body scrolls. Kept out of `dataSource` so it can't be sorted away.
  // Optional `rollups` render below Total as informational aggregate rows
  // (e.g. Indomie Pillow/Cup) — they are deliberately excluded from the total.
  const renderSummary = (total, rollups = []) => () => (
    <Table.Summary fixed>
      <Table.Summary.Row className="sto-total-row">
        <Table.Summary.Cell index={0}>
          <b style={{ fontSize: 11 }}>Total</b>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          {totalNumCell(total?.this_year)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} align="right">
          {totalNumCell(total?.target)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} align="center">
          <PctCell v={total?.achv_pct} kind="achv" />
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} align="right">
          {totalNumCell(total?.last_year)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="center">
          <PctCell v={total?.grow_pct} kind="grow" />
        </Table.Summary.Cell>
      </Table.Summary.Row>
      {rollups.map((r) => {
        const isSelected = selectedProductCodes.includes(r.code);
        const onClick = () =>
          setSelectedProductCodes((cur) => toggleCode(cur, r.code));
        const rowStyle = { cursor: "pointer" };
        return (
          <Table.Summary.Row
            key={r.code}
            className={`sto-rollup-row${isSelected ? " sto-row-selected" : ""}`}
          >
            <Table.Summary.Cell index={0} onClick={onClick} style={rowStyle}>
              <span style={{ fontSize: 11, fontStyle: "italic", fontWeight: 600 }}>
                {r.name}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right" onClick={onClick} style={rowStyle}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{fmtNum(r.this_year)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right" onClick={onClick} style={rowStyle}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{fmtNum(r.target)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="center" onClick={onClick} style={rowStyle}>
              <PctCell v={r.achv_pct} kind="achv" />
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right" onClick={onClick} style={rowStyle}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{fmtNum(r.last_year)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="center" onClick={onClick} style={rowStyle}>
              <PctCell v={r.grow_pct} kind="grow" />
            </Table.Summary.Cell>
          </Table.Summary.Row>
        );
      })}
    </Table.Summary>
  );

  // Header suffix reflects the filter: single label when one code is selected,
  // count when multiple, blank otherwise.
  const scopeSuffix = (codes, labelFor, noun) => {
    if (!codes.length) return "";
    if (codes.length === 1) return ` — ${labelFor(codes[0])}`;
    return ` — ${codes.length} ${noun}`;
  };
  const productHeader = "Sales Target by Product"
    + scopeSuffix(selectedBranchCodes, branchLabelFor, "branches");
  const branchHeader = "Sales Target by Branch"
    + scopeSuffix(selectedProductCodes, productLabelFor, "products");

  const exportToExcel = async () => {
    if (!data) {
      message.warning("No data to export");
      return;
    }
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";

    const NAV = "002060";
    const AGOLD = "FEF3C7";
    const WHITE = "FFFFFFFF";
    const thin = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    const hdr = {
      font: { bold: true, size: 10, color: { argb: WHITE } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${NAV}` },
      },
      alignment: { horizontal: "center", vertical: "middle" },
      border: bdr,
    };
    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt = '0.0"%";[Red]-0.0"%";"—"';

    const period = fromMonthStr === toMonthStr
      ? fromMonthStr
      : `${fromMonthStr} — ${toMonthStr}`;

    const addSheet = (name, rows, total, groupTitle, rollups = []) => {
      const ws = wb.addWorksheet(name, {
        views: [{ state: "frozen", ySplit: 3 }],
      });
      ws.getCell("A1").value =
        `${groupTitle} · Period ${period} · Unit ${unitLabelStr} · ${valueType.toUpperCase()}`;
      ws.getCell("A1").font = { bold: true, size: 11 };
      ws.mergeCells("A1:F1");

      const headers = [
        name === "Products" ? "Sub Group" : "SBTC Branch",
        `TY (${unitLabelStr})`,
        "Target",
        "Achv %",
        `LY (${unitLabelStr})`,
        "Grow %",
      ];
      const hdrRow = ws.getRow(3);
      headers.forEach((h, i) => {
        const c = hdrRow.getCell(i + 1);
        c.value = h;
        c.style = hdr;
      });
      hdrRow.height = 22;

      rows.forEach((r, idx) => {
        const row = ws.getRow(4 + idx);
        row.getCell(1).value = r.name;
        row.getCell(2).value = r.this_year || 0;
        row.getCell(3).value = r.target || 0;
        row.getCell(4).value = r.achv_pct == null ? null : r.achv_pct;
        row.getCell(5).value = r.last_year || 0;
        row.getCell(6).value = r.grow_pct == null ? null : r.grow_pct;
        [2, 3, 5].forEach((i) => {
          row.getCell(i).numFmt = numFmt;
        });
        [4, 6].forEach((i) => {
          row.getCell(i).numFmt = pctFmt;
        });
        row.eachCell((c) => {
          c.border = bdr;
        });
      });

      const totalRow = ws.getRow(4 + rows.length);
      totalRow.getCell(1).value = "Total";
      totalRow.getCell(2).value = total?.this_year || 0;
      totalRow.getCell(3).value = total?.target || 0;
      totalRow.getCell(4).value =
        total?.achv_pct == null ? null : total.achv_pct;
      totalRow.getCell(5).value = total?.last_year || 0;
      totalRow.getCell(6).value =
        total?.grow_pct == null ? null : total.grow_pct;
      [2, 3, 5].forEach((i) => {
        totalRow.getCell(i).numFmt = numFmt;
      });
      [4, 6].forEach((i) => {
        totalRow.getCell(i).numFmt = pctFmt;
      });
      totalRow.eachCell((c) => {
        c.font = { bold: true };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${AGOLD}` },
        };
        c.border = bdr;
      });

      // Rollup rows (Indomie Pillow/Cup) — appended AFTER the total with a
      // muted slate fill so it's clear they're aggregates, not part of it.
      const ROLLUP_FILL = "F1F5F9";
      rollups.forEach((r, idx) => {
        const rowNum = 4 + rows.length + 1 + idx;
        const row = ws.getRow(rowNum);
        row.getCell(1).value = r.name;
        row.getCell(2).value = r.this_year || 0;
        row.getCell(3).value = r.target || 0;
        row.getCell(4).value = r.achv_pct == null ? null : r.achv_pct;
        row.getCell(5).value = r.last_year || 0;
        row.getCell(6).value = r.grow_pct == null ? null : r.grow_pct;
        [2, 3, 5].forEach((i) => { row.getCell(i).numFmt = numFmt; });
        [4, 6].forEach((i) => { row.getCell(i).numFmt = pctFmt; });
        row.eachCell((c) => {
          c.font = { italic: true, bold: true, color: { argb: "FF334155" } };
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${ROLLUP_FILL}` },
          };
          c.border = bdr;
        });
      });

      ws.columns = [
        { width: 28 },
        { width: 16 },
        { width: 16 },
        { width: 12 },
        { width: 16 },
        { width: 12 },
      ];
    };

    addSheet(
      "Products",
      data.products || [],
      data.products_total,
      productHeader,
      data.product_rollups || [],
    );
    addSheet(
      "Branches",
      data.branches || [],
      data.branches_total,
      branchHeader,
    );

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sales_Target_Overview_${(period || "").replace(/\s+/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div style={{ flex: 1 }} />
        {(selectedProductCodes.length > 0 || selectedBranchCodes.length > 0) && (
          <Space size={4} wrap>
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
            <Button
              size="small"
              icon={<CloseCircleFilled />}
              onClick={() => {
                setSelectedProductCodes([]);
                setSelectedBranchCodes([]);
              }}
            >
              Clear filters
            </Button>
          </Space>
        )}
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          disabled={!data}
          onClick={exportToExcel}
        >
          Export Excel
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div
            style={{
              background: "var(--color-bg-card)",
              borderRadius: 8,
              padding: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1E293B",
                padding: "2px 4px 6px",
              }}
            >
              {productHeader}
            </div>
            <Table
              rowKey="code"
              size="small"
              className="sto-table"
              pagination={false}
              loading={loading}
              dataSource={data?.products || []}
              columns={buildColumns("Sub Group", data?.products || [], data?.products_total)}
              onRow={onProductRow}
              rowClassName={rowClassName(selectedProductCodes)}
              scroll={{ y: "calc(100vh - 400px)" }}
              tableLayout="fixed"
              summary={renderSummary(data?.products_total, data?.product_rollups || [])}
              sticky
            />
          </div>
          <div
            style={{
              background: "var(--color-bg-card)",
              borderRadius: 8,
              padding: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1E293B",
                padding: "2px 4px 6px",
              }}
            >
              {branchHeader}
            </div>
            <Table
              rowKey="code"
              size="small"
              className="sto-table"
              pagination={false}
              loading={loading}
              dataSource={data?.branches || []}
              columns={buildColumns("SBTC Branch", data?.branches || [], data?.branches_total)}
              onRow={onBranchRow}
              rowClassName={rowClassName(selectedBranchCodes)}
              scroll={{ y: "calc(100vh - 400px)" }}
              tableLayout="fixed"
              summary={renderSummary(data?.branches_total)}
              sticky
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTargetOverview;
