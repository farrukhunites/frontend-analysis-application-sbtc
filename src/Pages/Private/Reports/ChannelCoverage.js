import { useContext, useEffect, useMemo, useState } from "react";
import { Table, Select, Skeleton, message, Button, Divider, Input, Space } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { ProductContext } from "../../../Contexts/ProductContext";
import { getAllBranches } from "../../../API/Branches";
import { getChannelCoverage, getChannelCoverageCustomers } from "../../../API/Reports";
import { pinGrandTotal } from "./reportUtils";
import ChannelCoverageCustomersModal from "./ChannelCoverageCustomersModal";
import "./reports.css";

const slug = (name) => name.replace(/\s+/g, "_").toLowerCase();

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const PctCell = ({ v, allCount }) => {
  if (allCount == null || allCount === 0) return <span style={{ color: "#64748B" }}>-</span>;
  const good = v >= 80;
  const color = good ? "#15803D" : "#B91C1C";
  const bg = good ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)";
  return (
    <span style={{ color, background: bg, padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
      {Number(v).toFixed(1)}%
    </span>
  );
};

const nameSearchProps = (getName) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        placeholder="Search branch"
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

const ChannelCoverage = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, valueType } = useContext(UnitValueContext);
  const { selectedProduct } = useContext(ProductContext);

  const navbarProductCode = selectedProduct?.code;
  const productCodes = useMemo(
    () => (navbarProductCode && navbarProductCode !== "all" ? [navbarProductCode] : []),
    [navbarProductCode],
  );

  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ channels: [], results: [], has_product_filter: false });
  const [drillState, setDrillState] = useState({ open: false, loading: false, data: null });

  // branch name shown in the table is short (e.g. "DUBAI") but the API needs
  // the branch code — derive the code from the full branch_name on the row.
  const branchCodeByName = useMemo(() => {
    const map = {};
    branches.forEach((b) => { map[b.name] = b.code; });
    return map;
  }, [branches]);

  const openDrill = ({ row, channel, useProductFilter }) => {
    if (row.isGrandTotal) return;
    const branchCode = branchCodeByName[row.branch_name];
    if (!branchCode) return;
    const drillProducts = useProductFilter ? productCodes : [];
    setDrillState({
      open: true,
      loading: true,
      data: null,
      branchName: row.branch_name,
      channel: channel || null,
      hasProductFilter: useProductFilter && productCodes.length > 0,
      productName: selectedProduct?.name || null,
    });
    getChannelCoverageCustomers({
      month: selectedMonth,
      branchCode,
      channel: channel || undefined,
      productCodes: drillProducts,
      unitType,
      valueType,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load customers");
        setDrillState((s) => ({ ...s, open: false, loading: false }));
        return;
      }
      setDrillState((s) => ({ ...s, loading: false, data: res }));
    });
  };

  const closeDrill = () => setDrillState({ open: false, loading: false, data: null });

  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
    });
  }, []);

  useEffect(() => {
    if (!selectedMonth || !selectedBranches.length) return;
    setLoading(true);
    getChannelCoverage({
      month: selectedMonth,
      unitType,
      valueType,
      branchCodes: selectedBranches,
      productCodes,
    }).then((res) => {
      if (res?.error) message.error("Failed to load report");
      else setReportData(res);
      setLoading(false);
    });
  }, [selectedMonth, unitType, valueType, selectedBranches, productCodes]);

  const hasFilter = reportData.has_product_filter;

  const columns = useMemo(() => {
    const { channels } = reportData;
    if (!channels?.length) return [];

    const channelCols = channels.map((ch) => {
      const s = slug(ch);
      const drillCell = ({ v, row, useProductFilter, accent, bold }) => {
        if (!v || row.isGrandTotal) {
          const Tag = bold ? "b" : "span";
          return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
        }
        const Tag = bold ? "b" : "span";
        return (
          <Tag
            className="report-clickable-name"
            style={{ color: accent || "#1E293B", display: "inline-block" }}
            onClick={() => openDrill({ row, channel: ch, useProductFilter })}
            title="Open coverage drill-down"
          >
            {fmtNum(v)}
          </Tag>
        );
      };

      const children = hasFilter
        ? [
            {
              title: "All",
              dataIndex: `${s}_all`,
              align: "right",
              width: 80,
              render: (v, r) => drillCell({ v, row: r, useProductFilter: false, accent: "#64748B" }),
            },
            {
              title: "Selected",
              dataIndex: `${s}_selected`,
              align: "right",
              width: 90,
              sorter: pinGrandTotal((a, b) => (a[`${s}_selected`] || 0) - (b[`${s}_selected`] || 0)),
              render: (v, r) => drillCell({ v, row: r, useProductFilter: true, accent: "var(--color-accent)", bold: true }),
            },
            {
              title: "(%)",
              dataIndex: `${s}_pct`,
              align: "center",
              width: 80,
              sorter: pinGrandTotal((a, b) => (a[`${s}_pct`] || 0) - (b[`${s}_pct`] || 0)),
              render: (v, r) => <PctCell v={v} allCount={r[`${s}_all`]} />,
            },
          ]
        : [
            {
              title: "Customers",
              dataIndex: `${s}_all`,
              align: "right",
              width: 100,
              sorter: pinGrandTotal((a, b) => (a[`${s}_all`] || 0) - (b[`${s}_all`] || 0)),
              render: (v, r) => drillCell({ v, row: r, useProductFilter: false, accent: "var(--color-accent)", bold: true }),
            },
          ];

      return {
        title: <span style={{ fontWeight: 700 }}>{ch}</span>,
        align: "center",
        children,
      };
    });

    const totalDrillCell = ({ v, row, useProductFilter, accent, bold }) => {
      if (!v || row.isGrandTotal) {
        const Tag = bold ? "b" : "span";
        return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
      }
      const Tag = bold ? "b" : "span";
      return (
        <Tag
          className="report-clickable-name"
          style={{ color: accent || "#1E293B", display: "inline-block" }}
          onClick={() => openDrill({ row, channel: null, useProductFilter })}
          title="Open coverage drill-down (all channels)"
        >
          {fmtNum(v)}
        </Tag>
      );
    };

    const totalChildren = hasFilter
      ? [
          {
            title: "All",
            dataIndex: "total_all",
            align: "right",
            width: 100,
            sorter: pinGrandTotal((a, b) => (a.total_all || 0) - (b.total_all || 0)),
            render: (v, r) => totalDrillCell({ v, row: r, useProductFilter: false, accent: "#64748B" }),
          },
          {
            title: "Selected",
            dataIndex: "total_selected",
            align: "right",
            width: 110,
            sorter: pinGrandTotal((a, b) => (a.total_selected || 0) - (b.total_selected || 0)),
            render: (v, r) => totalDrillCell({ v, row: r, useProductFilter: true, accent: "var(--color-primary)", bold: true }),
          },
          {
            title: "(%)",
            dataIndex: "total_pct",
            align: "center",
            width: 100,
            defaultSortOrder: "ascend",
            sorter: pinGrandTotal((a, b) => (a.total_pct || 0) - (b.total_pct || 0)),
            render: (v, r) => <PctCell v={v} allCount={r.total_all} />,
          },
        ]
      : [
          {
            title: "Customers",
            dataIndex: "total_all",
            align: "right",
            width: 110,
            defaultSortOrder: "descend",
            sorter: pinGrandTotal((a, b) => (a.total_all || 0) - (b.total_all || 0)),
            render: (v, r) => totalDrillCell({ v, row: r, useProductFilter: false, accent: "var(--color-primary)", bold: true }),
          },
        ];

    return [
      {
        title: "#",
        width: 44,
        align: "center",
        fixed: "left",
        render: (_, r, i) => r.isGrandTotal ? "" : <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
      },
      {
        title: "Branch",
        fixed: "left",
        width: 160,
        ...nameSearchProps((r) => r.branch),
        render: (_, r) => r.isGrandTotal ? (
          <b>GRAND TOTAL</b>
        ) : (
          <span style={{ fontWeight: 600, fontSize: 12 }}>{r.branch}</span>
        ),
      },
      ...channelCols,
      {
        title: <span style={{ fontWeight: 700 }}>TOTAL</span>,
        align: "center",
        children: totalChildren,
      },
    ];
  }, [reportData, hasFilter, branchCodeByName, productCodes, selectedMonth, unitType, valueType, selectedProduct]);

  const dataSource = useMemo(() => {
    const { channels, results } = reportData;
    if (!results?.length) return [];
    const rows = results.map((r, i) => ({ ...r, key: i }));

    const sum = (field) => results.reduce((acc, r) => acc + (r[field] || 0), 0);
    const pct = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);
    const grand = { key: "grand-total", isGrandTotal: true, branch: "" };
    channels.forEach((ch) => {
      const s = slug(ch);
      const a = sum(`${s}_all`);
      const sel = sum(`${s}_selected`);
      grand[`${s}_all`] = a;
      grand[`${s}_selected`] = sel;
      grand[`${s}_pct`] = pct(sel, a);
    });
    grand.total_all = sum("total_all");
    grand.total_selected = sum("total_selected");
    grand.total_pct = pct(grand.total_selected, grand.total_all);

    return [...rows, grand];
  }, [reportData]);

  const exportToExcel = async () => {
    const { channels, results } = reportData;
    if (!results.length) { message.warning("No data to export"); return; }

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";
    const ws = wb.addWorksheet("Channel Coverage", {
      views: [{ state: "frozen", xSplit: 2, ySplit: 2 }],
    });

    const NAV = "002060";  const NAV2 = "1E3A5F";
    const LGRAY = "F1F5F9"; const AGOLD = "FEF3C7";
    const PCT_GOOD = "D1FAE5"; const PCT_BAD = "FEE2E2";
    const PCT_GOOD_TXT = "FF15803D"; const PCT_BAD_TXT = "FFB91C1C";
    const WHITE = "FFFFFFFF";
    const thin = (a = "FFE2E8F0") => ({ style: "thin", color: { argb: a } });
    const bdr = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    const hdr = (bg) => ({
      font: { bold: true, size: 10, color: { argb: WHITE } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: bdr,
    });

    const numFmt = '_(* #,##0_);[Red]_(* (#,##0);_(* "-"_);_(@_)';
    const pctFmt = '0.0"%"';
    const subHeaders = hasFilter ? ["All", "Selected", "(%)"] : ["Customers"];
    const stride = subHeaders.length;

    // Row 1: channel group headers
    const r1 = ws.getRow(1); r1.height = 22;
    ws.mergeCells(1, 1, 2, 1);
    ws.mergeCells(1, 2, 2, 2);
    r1.getCell(1).value = "#";  r1.getCell(1).style = hdr(NAV);
    r1.getCell(2).value = "Branch"; r1.getCell(2).style = hdr(NAV);

    let col = 3;
    channels.forEach((ch) => {
      r1.getCell(col).value = ch;
      r1.getCell(col).style = hdr(NAV);
      if (stride > 1) ws.mergeCells(1, col, 1, col + stride - 1);
      col += stride;
    });
    r1.getCell(col).value = "TOTAL";
    r1.getCell(col).style = hdr(NAV2);
    if (stride > 1) ws.mergeCells(1, col, 1, col + stride - 1);

    // Row 2: sub-headers
    const r2 = ws.getRow(2); r2.height = 18;
    col = 3;
    channels.forEach(() => {
      subHeaders.forEach((lbl, i) => {
        r2.getCell(col + i).value = lbl;
        r2.getCell(col + i).style = hdr(NAV);
      });
      col += stride;
    });
    subHeaders.forEach((lbl, i) => {
      r2.getCell(col + i).value = lbl;
      r2.getCell(col + i).style = hdr(NAV2);
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 22;
    for (let c = 3; c <= 3 + channels.length * stride + stride - 1; c++) {
      ws.getColumn(c).width = stride === 1 ? 14 : 11;
    }

    results.forEach((row, idx) => {
      const dr = ws.addRow({}); dr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? WHITE : `FF${LGRAY}`;

      const cellStyle = (extra = {}) => ({
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
        alignment: { vertical: "middle" },
        border: bdr,
        ...extra,
      });

      dr.getCell(1).value = idx + 1;
      dr.getCell(1).style = cellStyle({ alignment: { horizontal: "center", vertical: "middle" }, numFmt });
      dr.getCell(2).value = row.branch;
      dr.getCell(2).style = cellStyle({ font: { size: 10, bold: true } });

      const pctStyle = (val, allCount) => {
        if (allCount == null || allCount === 0) {
          return {
            numFmt: '"-"',
            font: { size: 10, color: { argb: "FF64748B" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "center", vertical: "middle" },
            border: bdr,
          };
        }
        const good = val >= 80;
        return {
          numFmt: pctFmt,
          font: { size: 10, bold: true, color: { argb: good ? PCT_GOOD_TXT : PCT_BAD_TXT } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${good ? PCT_GOOD : PCT_BAD}` } },
          alignment: { horizontal: "center", vertical: "middle" },
          border: bdr,
        };
      };

      let c = 3;
      channels.forEach((ch) => {
        const s = slug(ch);
        if (hasFilter) {
          const a = row[`${s}_all`];
          const sel = row[`${s}_selected`];
          const p = row[`${s}_pct`];
          dr.getCell(c).value = a || null;
          dr.getCell(c).style = {
            numFmt,
            font: { size: 10, color: { argb: "FF1E293B" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border: bdr,
          };
          dr.getCell(c + 1).value = sel || null;
          dr.getCell(c + 1).style = {
            numFmt,
            font: { size: 10, bold: true, color: { argb: "FF1E293B" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border: bdr,
          };
          dr.getCell(c + 2).value = a ? p / 100 : null;
          dr.getCell(c + 2).style = {
            ...pctStyle(p, a),
            numFmt: a ? '0.0"%"' : '"-"',
          };
          // ExcelJS percent format: use raw number p with custom 0.0"%" — set raw value
          dr.getCell(c + 2).value = a ? p : null;
        } else {
          dr.getCell(c).value = row[`${s}_all`] || null;
          dr.getCell(c).style = {
            numFmt,
            font: { size: 10, color: { argb: "FF1E293B" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border: bdr,
          };
        }
        c += stride;
      });

      if (hasFilter) {
        const a = row.total_all;
        const sel = row.total_selected;
        const p = row.total_pct;
        dr.getCell(c).value = a || null;
        dr.getCell(c).style = {
          numFmt,
          font: { size: 10, bold: true, color: { argb: "FF002060" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
        dr.getCell(c + 1).value = sel || null;
        dr.getCell(c + 1).style = {
          numFmt,
          font: { size: 10, bold: true, color: { argb: "FF002060" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
        dr.getCell(c + 2).value = a ? p : null;
        dr.getCell(c + 2).style = pctStyle(p, a);
      } else {
        dr.getCell(c).value = row.total_all || null;
        dr.getCell(c).style = {
          numFmt,
          font: { size: 10, bold: true, color: { argb: "FF002060" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
      }
    });

    // Grand total row
    const sumField = (f) => results.reduce((acc, r) => acc + (r[f] || 0), 0);
    const GT_BG = `FF${AGOLD}`;
    const gtr = ws.addRow({}); gtr.height = 18;

    const gtStyle = (extra = {}) => ({
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: GT_BG } },
      font: { bold: true, size: 10, color: { argb: "FF1E293B" } },
      alignment: { vertical: "middle" },
      border: bdr,
      ...extra,
    });

    gtr.getCell(1).value = "";
    gtr.getCell(1).style = gtStyle();
    gtr.getCell(2).value = "GRAND TOTAL";
    gtr.getCell(2).style = gtStyle();

    const pctOf = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);

    let gc = 3;
    channels.forEach((ch) => {
      const s = slug(ch);
      if (hasFilter) {
        const a = sumField(`${s}_all`);
        const sel = sumField(`${s}_selected`);
        const p = pctOf(sel, a);
        const good = p >= 80;
        gtr.getCell(gc).value = a || null;
        gtr.getCell(gc).style = gtStyle({ numFmt, alignment: { horizontal: "right", vertical: "middle" } });
        gtr.getCell(gc + 1).value = sel || null;
        gtr.getCell(gc + 1).style = gtStyle({ numFmt, alignment: { horizontal: "right", vertical: "middle" } });
        gtr.getCell(gc + 2).value = a ? p : null;
        gtr.getCell(gc + 2).style = {
          numFmt: a ? pctFmt : '"-"',
          font: { bold: true, size: 10, color: { argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG } },
          alignment: { horizontal: "center", vertical: "middle" },
          border: bdr,
        };
      } else {
        gtr.getCell(gc).value = sumField(`${s}_all`) || null;
        gtr.getCell(gc).style = gtStyle({ numFmt, alignment: { horizontal: "right", vertical: "middle" } });
      }
      gc += stride;
    });
    if (hasFilter) {
      const a = sumField("total_all");
      const sel = sumField("total_selected");
      const p = pctOf(sel, a);
      const good = p >= 80;
      gtr.getCell(gc).value = a || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt, alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 1).value = sel || null;
      gtr.getCell(gc + 1).style = gtStyle({
        numFmt, alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 2).value = a ? p : null;
      gtr.getCell(gc + 2).style = {
        numFmt: a ? pctFmt : '"-"',
        font: { bold: true, size: 10, color: { argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG } },
        alignment: { horizontal: "center", vertical: "middle" },
        border: bdr,
      };
    } else {
      gtr.getCell(gc).value = sumField("total_all") || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt, alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Channel_Coverage_${selectedMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
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
          locale={{ emptyText: "Select a month and branches to view the report" }}
          rowClassName={(r) => (r.isGrandTotal ? "report-grand-total-row" : "")}
        />
      )}

      <ChannelCoverageCustomersModal
        state={drillState}
        onClose={closeDrill}
        unitType={unitType}
        valueType={valueType}
        selectedProductCode={productCodes[0] || null}
      />
    </div>
  );
};

export default ChannelCoverage;
