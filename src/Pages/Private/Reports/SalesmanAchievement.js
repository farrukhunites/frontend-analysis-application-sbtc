import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Table, Select, Skeleton, message, Button, Divider, Modal, Spin, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getSalesmanAchievement, getSalesmanCustomerBreakdown } from "../../../API/Reports";

const slug = (name) => name.replace(/\s+/g, "_").toLowerCase();

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

const SalesmanAchievement = () => {
  const { selectedMonth }   = useDateFilter();
  const { unitType, valueType } = useContext(UnitValueContext);

  const [branches, setBranches]                 = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [products, setProducts]                 = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [reportData, setReportData]             = useState({ products: [], results: [] });
  const [breakdown, setBreakdown]               = useState({ open: false, loading: false, title: "", subtitle: "", data: [], total: 0 });

  // Load branches + products once
  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
    });
    getAllProducts().then((res) => {
      const list = (res?.results || []).filter((p) => !["9999901","9999902"].includes(p.code));
      setProducts(list);
      setSelectedProducts(list.map((p) => p.code));
    });
  }, []);

  // Fetch report when filters change
  useEffect(() => {
    if (!selectedMonth || !selectedBranches.length || !selectedProducts.length) return;
    setLoading(true);
    getSalesmanAchievement({
      month:        selectedMonth,
      unitType,
      valueType,
      branchCodes:  selectedBranches,
      productCodes: selectedProducts,
    }).then((res) => {
      if (res?.error) message.error("Failed to load report");
      else setReportData(res);
      setLoading(false);
    });
  }, [selectedMonth, unitType, valueType, selectedBranches, selectedProducts]);

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
      data: [], total: 0,
    });

    const res = await getSalesmanCustomerBreakdown({
      salesmanCd:  row.salesman_code,
      month:       selectedMonth,
      productCodes,
      unitType,
      valueType,
      branchCodes: selectedBranches,
    });

    if (res?.error) {
      message.error("Failed to load breakdown");
      setBreakdown((p) => ({ ...p, loading: false }));
    } else {
      setBreakdown((p) => ({ ...p, loading: false, data: res.results || [], total: res.total || 0 }));
    }
  }, [selectedMonth, unitType, valueType, selectedProducts, selectedBranches, productNameToCode]);

  // Dynamic columns
  const columns = useMemo(() => {
    const { products } = reportData;
    if (!products?.length) return [];

    const productCols = products.map((p) => ({
      title:    <span style={{ fontWeight: 700 }}>{p}</span>,
      align:    "center",
      children: [
        {
          title:     "Target",
          dataIndex: `${slug(p)}_target`,
          align:     "right",
          width:     90,
          render:    (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
        },
        {
          title:     "MTD",
          dataIndex: `${slug(p)}_actual`,
          align:     "right",
          width:     90,
          render:    (v, r) => v ? (
            <b onClick={() => openBreakdown(r, p)} style={{ cursor: "pointer", color: "var(--color-accent)" }}>{fmtNum(v)}</b>
          ) : <b>{fmtNum(v)}</b>,
        },
        {
          title:     "+/-",
          dataIndex: `${slug(p)}_variance`,
          align:     "center",
          width:     90,
          sorter:    (a, b) => (a[`${slug(p)}_variance`] || 0) - (b[`${slug(p)}_variance`] || 0),
          render:    (v) => <VarCell v={v} />,
        },
      ],
    }));

    return [
      {
        title:     "#",
        width:     44,
        align:     "center",
        render:    (_, __, i) => <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
      },
      {
        title:     "Salesman",
        fixed:     "left",
        width:     200,
        render:    (_, r) => (
          <div>
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
        onFilter:  (v, r) => r.branch === v,
        render:    (v) => <span style={{ fontSize: 12 }}>{v}</span>,
      },
      ...productCols,
      {
        title:    <span style={{ fontWeight: 700 }}>TOTAL</span>,
        align:    "center",
        children: [
          {
            title:     "Target",
            dataIndex: "total_target",
            align:     "right",
            width:     100,
            sorter:    (a, b) => (a.total_target || 0) - (b.total_target || 0),
            render:    (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
          },
          {
            title:     "MTD",
            dataIndex: "total_actual",
            align:     "right",
            width:     100,
            sorter:    (a, b) => (a.total_actual || 0) - (b.total_actual || 0),
            render:    (v, r) => v ? (
              <b onClick={() => openBreakdown(r, null)} style={{ cursor: "pointer", color: "var(--color-accent)" }}>{fmtNum(v)}</b>
            ) : <b style={{ color: "var(--color-primary)" }}>{fmtNum(v)}</b>,
          },
          {
            title:     "+/-",
            dataIndex: "total_variance",
            align:     "center",
            width:     100,
            defaultSortOrder: "ascend",
            sorter:    (a, b) => (a.total_variance || 0) - (b.total_variance || 0),
            render:    (v) => <VarCell v={v} />,
          },
        ],
      },
    ];
  }, [reportData, openBreakdown]);

  const exportToExcel = async () => {
    const { products, results } = reportData;
    if (!results.length) { message.warning("No data to export"); return; }

    const ExcelJS  = (await import("exceljs")).default;
    const wb       = new ExcelJS.Workbook();
    wb.creator     = "SBTC Sales Analysis";
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
      ws.mergeCells(1, col, 1, col + 2);
      col += 3;
    });
    // Total group
    r1.getCell(col).value = "TOTAL";
    r1.getCell(col).style = hdr(NAV2);
    ws.mergeCells(1, col, 1, col + 2);

    // Row 2: sub-headers
    const r2 = ws.getRow(2); r2.height = 18;
    col = 4;
    products.forEach(() => {
      ["Target", "MTD", "+/-"].forEach((lbl, i) => {
        r2.getCell(col + i).value = lbl;
        r2.getCell(col + i).style = hdr(NAV);
      });
      col += 3;
    });
    ["Target", "MTD", "+/-"].forEach((lbl, i) => {
      r2.getCell(col + i).value = lbl;
      r2.getCell(col + i).style = hdr(NAV2);
    });

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 14;
    for (let c = 4; c <= 4 + products.length * 3 + 2; c++) ws.getColumn(c).width = 12;

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

      let c = 4;
      products.forEach((p) => {
        const s = slug(p);
        [row[`${s}_target`], row[`${s}_actual`], row[`${s}_variance`]].forEach((val, i) => {
          const cell = dr.getCell(c + i);
          cell.value  = val || null;
          const isVar = i === 2;
          const varBg = isVar && val < 0 ? "FFFFC7CE"
                      : isVar && val > 0 ? "FFC6EFCE" : bg;
          cell.style = {
            numFmt,
            font:      { size: 10, bold: i === 1,
                         color: { argb: isVar && val < 0 ? "FF9C0006"
                                       : isVar && val > 0 ? "FF276221" : "FF1E293B" } },
            fill:      { type: "pattern", pattern: "solid", fgColor: { argb: varBg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border:    bdr,
          };
        });
        c += 3;
      });

      // Total columns
      [row.total_target, row.total_actual, row.total_variance].forEach((val, i) => {
        const cell = dr.getCell(c + i);
        cell.value  = val || null;
        const isVar = i === 2;
        const varBg = isVar && val < 0 ? "FFFFC7CE"
                    : isVar && val > 0 ? "FFC6EFCE" : bg;
        cell.style = {
          numFmt,
          font:      { size: 10, bold: true,
                       color: { argb: isVar && val < 0 ? "FF9C0006"
                                     : isVar && val > 0 ? "FF276221" : "FF002060" } },
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

    const gtCol = (cell, val, isVar, isTotalGroup) => {
      cell.value = Math.round(val) || null;
      cell.style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: {
          bold: true, size: 10,
          color: { argb: isVar && val < 0 ? "FF9C0006"
                       : isVar && val > 0 ? "FF276221"
                       : isTotalGroup ? "FF002060" : "FF1E293B" },
        },
      });
    };

    let gc = 4;
    products.forEach((p) => {
      const s = slug(p);
      gtCol(gtr.getCell(gc),     sumField(`${s}_target`),   false, false);
      gtCol(gtr.getCell(gc + 1), sumField(`${s}_actual`),   false, false);
      gtCol(gtr.getCell(gc + 2), sumField(`${s}_variance`), true,  false);
      gc += 3;
    });
    gtCol(gtr.getCell(gc),     sumField("total_target"),   false, true);
    gtCol(gtr.getCell(gc + 1), sumField("total_actual"),   false, true);
    gtCol(gtr.getCell(gc + 2), sumField("total_variance"), true,  true);

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `Salesman_Achievement_${selectedMonth}.xlsx`;
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
          dataSource={reportData.results.map((r, i) => ({ ...r, key: i }))}
          columns={columns}
          pagination={{ pageSize: 25, showSizeChanger: false, size: "small" }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Select a month with available targets to view the report" }}
          summary={() => {
            const { products: prods, results } = reportData;
            if (!results.length) return null;
            const sum = (field) => results.reduce((acc, r) => acc + (r[field] || 0), 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: "#FEF3C7", fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} />
                  <Table.Summary.Cell index={1}><b>GRAND TOTAL</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                  {prods.flatMap((p, pi) => {
                    const s = slug(p);
                    const t = sum(`${s}_target`), a = sum(`${s}_actual`), v = a - t;
                    return [
                      <Table.Summary.Cell key={`${pi}t`} align="right"><b style={{ color: "#64748B" }}>{fmtNum(t)}</b></Table.Summary.Cell>,
                      <Table.Summary.Cell key={`${pi}a`} align="right"><b>{fmtNum(a)}</b></Table.Summary.Cell>,
                      <Table.Summary.Cell key={`${pi}v`} align="center"><VarCell v={Math.round(v)} /></Table.Summary.Cell>,
                    ];
                  })}
                  <Table.Summary.Cell align="right"><b style={{ color: "#64748B" }}>{fmtNum(sum("total_target"))}</b></Table.Summary.Cell>
                  <Table.Summary.Cell align="right"><b style={{ color: "var(--color-primary)" }}>{fmtNum(sum("total_actual"))}</b></Table.Summary.Cell>
                  <Table.Summary.Cell align="center"><VarCell v={Math.round(sum("total_variance"))} /></Table.Summary.Cell>
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
                {" "}{unitType?.toUpperCase()}
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
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{r.customer_code}</div>
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
                title: `Sales (${unitType?.toUpperCase()})`,
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
