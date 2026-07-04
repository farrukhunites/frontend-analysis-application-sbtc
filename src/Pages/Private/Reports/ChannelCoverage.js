import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Select,
  Skeleton,
  message,
  Button,
  Divider,
  Input,
  Space,
  Segmented,
} from "antd";
import MonthRangePicker from "../../../Components/MonthRangePicker";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { ProductContext } from "../../../Contexts/ProductContext";
import { getAllBranches } from "../../../API/Branches";
import {
  getChannelCoverage,
  getChannelCoverageCustomers,
} from "../../../API/Reports";
import { pinGrandTotal } from "./reportUtils";
import ChannelCoverageCustomersModal from "./ChannelCoverageCustomersModal";
import "./reports.css";

const slug = (name) => name.replace(/\s+/g, "_").toLowerCase();

const fmtNum = (v) =>
  v === 0 || v == null
    ? "-"
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const PctCell = ({ v, allCount }) => {
  if (allCount == null || allCount === 0)
    return <span style={{ color: "#64748B" }}>-</span>;
  const good = v >= 80;
  const color = good ? "#15803D" : "#B91C1C";
  const bg = good ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)";
  return (
    <span
      style={{
        color,
        background: bg,
        padding: "2px 6px",
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {Number(v).toFixed(1)}%
    </span>
  );
};

const nameSearchProps = (getName, placeholder = "Search branch") => ({
  filterDropdown: ({
    setSelectedKeys,
    selectedKeys,
    confirm,
    clearFilters,
  }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        placeholder={placeholder}
        value={selectedKeys[0]}
        onChange={(e) =>
          setSelectedKeys(e.target.value ? [e.target.value] : [])
        }
        onPressEnter={() => confirm()}
        style={{ marginBottom: 8, display: "block", width: 200 }}
      />
      <Space>
        <Button
          type="primary"
          size="small"
          icon={<SearchOutlined />}
          onClick={() => confirm()}
        >
          Search
        </Button>
        <Button
          size="small"
          onClick={() => {
            clearFilters && clearFilters();
            confirm();
          }}
        >
          Reset
        </Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered) => (
    <SearchOutlined
      style={{ color: filtered ? "var(--color-accent)" : undefined }}
    />
  ),
  onFilter: (value, record) =>
    record.isGrandTotal ||
    (getName(record) || "")
      .toString()
      .toLowerCase()
      .includes(value.toLowerCase()),
});

const ChannelCoverage = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const { selectedProduct } = useContext(ProductContext);

  const navbarProductCode = selectedProduct?.code;
  const productCodes = useMemo(
    () =>
      navbarProductCode && navbarProductCode !== "all"
        ? [navbarProductCode]
        : [],
    [navbarProductCode],
  );

  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  // Date range: default to YTD (Jan of anchor month → anchor month). The
  // anchor is the navbar's selectedMonth (or current month if unset).
  const anchorMonth = selectedMonth
    ? dayjs(`${selectedMonth.slice(0, 4)}-${selectedMonth.slice(4)}-01`)
    : dayjs().startOf("month");
  const [fromMonth, setFromMonth] = useState(anchorMonth.startOf("year"));
  const [toMonth, setToMonth] = useState(anchorMonth);
  // "byBranch" = rows are branches (default); "byChannel" = transposed:
  // rows are channels, columns are branches. Default flips to byChannel when
  // the user has access to fewer than 4 branches — the transposed layout is
  // easier to read when there are only 1-2 branch columns.
  const [viewOrientation, setViewOrientation] = useState("byBranch");
  const orientationLockedByUser = useRef(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    channels: [],
    results: [],
    has_product_filter: false,
  });
  const [drillState, setDrillState] = useState({
    open: false,
    loading: false,
    data: null,
  });

  // branch name shown in the table is short (e.g. "DUBAI") but the API needs
  // the branch code — derive the code from the full branch_name on the row.
  const branchCodeByName = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b.name] = b.code;
    });
    return map;
  }, [branches]);

  const fromMonthStr = fromMonth ? fromMonth.format("YYYYMM") : null;
  const toMonthStr = toMonth ? toMonth.format("YYYYMM") : null;

  const openDrill = ({ row, channel, branchName, useProductFilter, mode }) => {
    if (row.isGrandTotal) return;
    const bName = branchName || row.branch_name;
    const branchCode = branchCodeByName[bName];
    if (!branchCode) return;
    const drillProducts = useProductFilter ? productCodes : [];
    // When drilling on the TOTAL column, restrict the backend to the channels
    // currently visible in the report so the modal matches the cell value.
    const drillChannels = channel ? undefined : visibleChannels;
    setDrillState({
      open: true,
      loading: true,
      data: null,
      branchName: bName,
      channel: channel || null,
      channels: drillChannels || null,
      hasProductFilter: useProductFilter && productCodes.length > 0,
      productName: selectedProduct?.name || null,
      mode: mode || "all",
    });
    getChannelCoverageCustomers({
      month: selectedMonth,
      fromMonth: fromMonthStr,
      toMonth: toMonthStr,
      branchCode,
      channel: channel || undefined,
      channels: drillChannels,
      productCodes: drillProducts,
      unitType: effectiveUnitType,
      valueType,
      mode,
    }).then((res) => {
      if (res?.error) {
        message.error("Failed to load customers");
        setDrillState((s) => ({ ...s, open: false, loading: false }));
        return;
      }
      setDrillState((s) => ({ ...s, loading: false, data: res }));
    });
  };

  const closeDrill = () =>
    setDrillState({ open: false, loading: false, data: null });

  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
      if (!orientationLockedByUser.current) {
        setViewOrientation(list.length > 0 && list.length < 4 ? "byChannel" : "byBranch");
      }
    });
  }, []);

  useEffect(() => {
    if (!fromMonthStr || !toMonthStr || !selectedBranches.length) return;
    setLoading(true);
    getChannelCoverage({
      fromMonth: fromMonthStr,
      toMonth: toMonthStr,
      unitType: effectiveUnitType,
      valueType,
      branchCodes: selectedBranches,
      productCodes,
    }).then((res) => {
      if (res?.error) message.error("Failed to load report");
      else setReportData(res);
      setLoading(false);
    });
  }, [fromMonthStr, toMonthStr, effectiveUnitType, valueType, selectedBranches, productCodes]);

  // Channels ranked lower in importance — kept in the report but pushed to the
  // end of every ordering (columns, picker, default selection).
  const DEPRIORITIZED_CHANNELS = useMemo(
    () => new Set(["BRN", "CSM", "CFC"]),
    [],
  );

  // Reorder channels so priority channels come first, deprioritized ones last,
  // each group preserving the backend's original order.
  const orderedChannels = useMemo(() => {
    const apiChannels = reportData.channels || [];
    const priority = apiChannels.filter(
      (c) => !DEPRIORITIZED_CHANNELS.has(c.toUpperCase()),
    );
    const rest = apiChannels.filter((c) =>
      DEPRIORITIZED_CHANNELS.has(c.toUpperCase()),
    );
    return [...priority, ...rest];
  }, [reportData.channels, DEPRIORITIZED_CHANNELS]);

  // Seed the channel selector once per dataset: select ALL channels (priority
  // first, deprioritized last). Preserve the user's choice on later loads if
  // every selected channel still exists in the new response.
  useEffect(() => {
    if (!orderedChannels.length) return;
    setSelectedChannels((prev) => {
      const stillValid =
        prev.length && prev.every((c) => orderedChannels.includes(c));
      if (stillValid) return prev;
      return orderedChannels;
    });
  }, [orderedChannels]);

  const hasFilter = reportData.has_product_filter;

  const visibleChannels = useMemo(() => {
    const picked = new Set(selectedChannels);
    return orderedChannels.filter((c) => picked.has(c));
  }, [orderedChannels, selectedChannels]);

  const columns = useMemo(() => {
    const channels = visibleChannels;
    if (!channels?.length) return [];

    const channelCols = channels.map((ch) => {
      const s = slug(ch);
      const drillCell = ({ v, row, useProductFilter, mode, accent, bold }) => {
        if (!v || row.isGrandTotal) {
          const Tag = bold ? "b" : "span";
          return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
        }
        const Tag = bold ? "b" : "span";
        return (
          <Tag
            className="report-clickable-name"
            style={{ color: accent || "#1E293B", display: "inline-block" }}
            onClick={() =>
              openDrill({ row, channel: ch, useProductFilter, mode })
            }
            title={
              mode === "remaining"
                ? "Open remaining-customer list"
                : "Open coverage drill-down"
            }
          >
            {fmtNum(v)}
          </Tag>
        );
      };

      const children = hasFilter
        ? [
            {
              title: "All SBTC",
              dataIndex: `${s}_all`,
              align: "right",
              width: 80,
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: false,
                  accent: "#64748B",
                }),
            },
            {
              title: "Selected",
              dataIndex: `${s}_selected`,
              align: "right",
              width: 90,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_selected`] || 0) - (b[`${s}_selected`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: true,
                  accent: "var(--color-accent)",
                  bold: true,
                }),
            },
            {
              title: "Remaining",
              dataIndex: `${s}_remaining`,
              align: "right",
              width: 95,
              sorter: pinGrandTotal(
                (a, b) =>
                  (a[`${s}_remaining`] || 0) - (b[`${s}_remaining`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: true,
                  mode: "remaining",
                  accent: "#B91C1C",
                  bold: true,
                }),
            },
            {
              title: "(%)",
              dataIndex: `${s}_pct`,
              align: "center",
              width: 80,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_pct`] || 0) - (b[`${s}_pct`] || 0),
              ),
              render: (v, r) => <PctCell v={v} allCount={r[`${s}_all`]} />,
            },
          ]
        : [
            {
              title: "Customers",
              dataIndex: `${s}_all`,
              align: "right",
              width: 100,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_all`] || 0) - (b[`${s}_all`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: false,
                  accent: "var(--color-accent)",
                  bold: true,
                }),
            },
          ];

      return {
        title: <span style={{ fontWeight: 700 }}>{ch}</span>,
        align: "center",
        children,
      };
    });

    const totalDrillCell = ({
      v,
      row,
      useProductFilter,
      mode,
      accent,
      bold,
    }) => {
      if (!v || row.isGrandTotal) {
        const Tag = bold ? "b" : "span";
        return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
      }
      const Tag = bold ? "b" : "span";
      return (
        <Tag
          className="report-clickable-name"
          style={{ color: accent || "#1E293B", display: "inline-block" }}
          onClick={() =>
            openDrill({ row, channel: null, useProductFilter, mode })
          }
          title={
            mode === "remaining"
              ? "Open remaining-customer list (all channels)"
              : "Open coverage drill-down (all channels)"
          }
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
            sorter: pinGrandTotal(
              (a, b) => (a.total_all || 0) - (b.total_all || 0),
            ),
            render: (v, r) =>
              totalDrillCell({
                v,
                row: r,
                useProductFilter: false,
                accent: "#64748B",
              }),
          },
          {
            title: "Selected",
            dataIndex: "total_selected",
            align: "right",
            width: 110,
            sorter: pinGrandTotal(
              (a, b) => (a.total_selected || 0) - (b.total_selected || 0),
            ),
            render: (v, r) =>
              totalDrillCell({
                v,
                row: r,
                useProductFilter: true,
                accent: "var(--color-primary)",
                bold: true,
              }),
          },
          {
            title: "Remaining",
            dataIndex: "total_remaining",
            align: "right",
            width: 110,
            sorter: pinGrandTotal(
              (a, b) => (a.total_remaining || 0) - (b.total_remaining || 0),
            ),
            render: (v, r) =>
              totalDrillCell({
                v,
                row: r,
                useProductFilter: true,
                mode: "remaining",
                accent: "#B91C1C",
                bold: true,
              }),
          },
          {
            title: "(%)",
            dataIndex: "total_pct",
            align: "center",
            width: 100,
            defaultSortOrder: "ascend",
            sorter: pinGrandTotal(
              (a, b) => (a.total_pct || 0) - (b.total_pct || 0),
            ),
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
            sorter: pinGrandTotal(
              (a, b) => (a.total_all || 0) - (b.total_all || 0),
            ),
            render: (v, r) =>
              totalDrillCell({
                v,
                row: r,
                useProductFilter: false,
                accent: "var(--color-primary)",
                bold: true,
              }),
          },
        ];

    return [
      {
        title: "#",
        width: 44,
        align: "center",
        fixed: "left",
        render: (_, r, i) =>
          r.isGrandTotal ? (
            ""
          ) : (
            <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>
          ),
      },
      {
        title: "Branch",
        fixed: "left",
        width: 160,
        ...nameSearchProps((r) => r.branch),
        render: (_, r) =>
          r.isGrandTotal ? (
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
  }, [
    visibleChannels,
    hasFilter,
    branchCodeByName,
    productCodes,
    fromMonthStr,
    toMonthStr,
    effectiveUnitType,
    valueType,
    selectedProduct,
  ]);

  const dataSource = useMemo(() => {
    const { results } = reportData;
    const channels = visibleChannels;
    if (!results?.length) return [];
    const pct = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);

    // Each row's `total_*` from the backend covers ALL channels. Re-derive
    // them from the currently-visible channels so excluding (e.g.) BRN
    // actually drops it out of the TOTAL column too.
    return results.map((r, i) => {
      let a = 0, sel = 0;
      channels.forEach((ch) => {
        const s = slug(ch);
        a   += r[`${s}_all`]      || 0;
        sel += r[`${s}_selected`] || 0;
      });
      return {
        ...r,
        key: i,
        total_all:       a,
        total_selected:  sel,
        total_pct:       pct(sel, a),
        ...(hasFilter ? { total_remaining: Math.max(0, a - sel) } : null),
      };
    });
  }, [reportData, visibleChannels, hasFilter]);

  // Sticky grand-total — rendered via Table.summary so it stays visible
  // regardless of pagination/scroll position.
  const grandTotals = useMemo(() => {
    const channels = visibleChannels;
    if (!dataSource.length || !channels.length) return null;
    const pct = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);
    const sum = (field) => dataSource.reduce((acc, r) => acc + (r[field] || 0), 0);
    const gt = {};
    channels.forEach((ch) => {
      const s = slug(ch);
      const a = sum(`${s}_all`);
      const sel = sum(`${s}_selected`);
      gt[`${s}_all`] = a;
      gt[`${s}_selected`] = sel;
      gt[`${s}_pct`] = pct(sel, a);
      if (hasFilter) gt[`${s}_remaining`] = Math.max(0, a - sel);
    });
    gt.total_all = sum("total_all");
    gt.total_selected = sum("total_selected");
    gt.total_pct = pct(gt.total_selected, gt.total_all);
    if (hasFilter) gt.total_remaining = Math.max(0, gt.total_all - gt.total_selected);
    return gt;
  }, [dataSource, visibleChannels, hasFilter]);

  // Transposed view: rows are channels, columns are the branches present in
  // reportData.results. Each row exposes `${branch_slug}_all/selected/…` fields
  // built from the corresponding channel/branch cell in the byBranch dataset.
  const branchColsFromRows = useMemo(() => {
    const rows = reportData.results || [];
    return rows
      .filter((r) => !r.isGrandTotal)
      .map((r) => ({ branch: r.branch, branchName: r.branch_name }));
  }, [reportData.results]);

  const transposedDataSource = useMemo(() => {
    if (viewOrientation !== "byChannel") return [];
    const channels = visibleChannels;
    const rows = reportData.results || [];
    if (!channels.length || !rows.length) return [];
    const pct = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);

    return channels.map((ch, i) => {
      const cs = slug(ch);
      const out = { key: i, channel: ch };
      let totAll = 0, totSel = 0;
      rows.forEach((br) => {
        if (br.isGrandTotal) return;
        const bs = slug(br.branch);
        const a = br[`${cs}_all`] || 0;
        const sel = br[`${cs}_selected`] || 0;
        out[`${bs}_all`] = a;
        out[`${bs}_selected`] = sel;
        out[`${bs}_pct`] = pct(sel, a);
        if (hasFilter) out[`${bs}_remaining`] = Math.max(0, a - sel);
        totAll += a;
        totSel += sel;
      });
      out.total_all = totAll;
      out.total_selected = totSel;
      out.total_pct = pct(totSel, totAll);
      if (hasFilter) out.total_remaining = Math.max(0, totAll - totSel);
      return out;
    });
  }, [viewOrientation, visibleChannels, reportData.results, hasFilter]);

  const transposedColumns = useMemo(() => {
    if (viewOrientation !== "byChannel") return [];
    const branchInfos = branchColsFromRows;
    if (!branchInfos.length) return [];

    const branchCols = branchInfos.map(({ branch, branchName }) => {
      const s = slug(branch);
      const drillCell = ({ v, row, useProductFilter, mode, accent, bold }) => {
        if (!v || row.isGrandTotal) {
          const Tag = bold ? "b" : "span";
          return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
        }
        const Tag = bold ? "b" : "span";
        return (
          <Tag
            className="report-clickable-name"
            style={{ color: accent || "#1E293B", display: "inline-block" }}
            onClick={() =>
              openDrill({
                row,
                channel: row.channel,
                branchName,
                useProductFilter,
                mode,
              })
            }
            title={
              mode === "remaining"
                ? "Open remaining-customer list"
                : "Open coverage drill-down"
            }
          >
            {fmtNum(v)}
          </Tag>
        );
      };

      const children = hasFilter
        ? [
            {
              title: "All SBTC",
              dataIndex: `${s}_all`,
              align: "right",
              width: 80,
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: false,
                  accent: "#64748B",
                }),
            },
            {
              title: "Selected",
              dataIndex: `${s}_selected`,
              align: "right",
              width: 90,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_selected`] || 0) - (b[`${s}_selected`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: true,
                  accent: "var(--color-accent)",
                  bold: true,
                }),
            },
            {
              title: "Remaining",
              dataIndex: `${s}_remaining`,
              align: "right",
              width: 95,
              sorter: pinGrandTotal(
                (a, b) =>
                  (a[`${s}_remaining`] || 0) - (b[`${s}_remaining`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: true,
                  mode: "remaining",
                  accent: "#B91C1C",
                  bold: true,
                }),
            },
            {
              title: "(%)",
              dataIndex: `${s}_pct`,
              align: "center",
              width: 80,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_pct`] || 0) - (b[`${s}_pct`] || 0),
              ),
              render: (v, r) => <PctCell v={v} allCount={r[`${s}_all`]} />,
            },
          ]
        : [
            {
              title: "Customers",
              dataIndex: `${s}_all`,
              align: "right",
              width: 100,
              sorter: pinGrandTotal(
                (a, b) => (a[`${s}_all`] || 0) - (b[`${s}_all`] || 0),
              ),
              render: (v, r) =>
                drillCell({
                  v,
                  row: r,
                  useProductFilter: false,
                  accent: "var(--color-accent)",
                  bold: true,
                }),
            },
          ];

      return {
        title: <span style={{ fontWeight: 700 }}>{branch}</span>,
        align: "center",
        children,
      };
    });

    // TOTAL column in transposed view: sum across all branches for the row's
    // channel. Drill would need a "no branch filter" query which the modal
    // doesn't support, so leave these cells non-clickable.
    const totalStatic = ({ v, accent, bold }) => {
      const Tag = bold ? "b" : "span";
      return <Tag style={{ color: accent || "#1E293B" }}>{fmtNum(v)}</Tag>;
    };
    const totalChildren = hasFilter
      ? [
          {
            title: "All",
            dataIndex: "total_all",
            align: "right",
            width: 100,
            sorter: pinGrandTotal(
              (a, b) => (a.total_all || 0) - (b.total_all || 0),
            ),
            render: (v) => totalStatic({ v, accent: "#64748B" }),
          },
          {
            title: "Selected",
            dataIndex: "total_selected",
            align: "right",
            width: 110,
            sorter: pinGrandTotal(
              (a, b) => (a.total_selected || 0) - (b.total_selected || 0),
            ),
            render: (v) =>
              totalStatic({ v, accent: "var(--color-primary)", bold: true }),
          },
          {
            title: "Remaining",
            dataIndex: "total_remaining",
            align: "right",
            width: 110,
            sorter: pinGrandTotal(
              (a, b) => (a.total_remaining || 0) - (b.total_remaining || 0),
            ),
            render: (v) => totalStatic({ v, accent: "#B91C1C", bold: true }),
          },
          {
            title: "(%)",
            dataIndex: "total_pct",
            align: "center",
            width: 100,
            defaultSortOrder: "ascend",
            sorter: pinGrandTotal(
              (a, b) => (a.total_pct || 0) - (b.total_pct || 0),
            ),
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
            sorter: pinGrandTotal(
              (a, b) => (a.total_all || 0) - (b.total_all || 0),
            ),
            render: (v) =>
              totalStatic({ v, accent: "var(--color-primary)", bold: true }),
          },
        ];

    return [
      {
        title: "#",
        width: 44,
        align: "center",
        fixed: "left",
        render: (_, r, i) =>
          r.isGrandTotal ? (
            ""
          ) : (
            <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>
          ),
      },
      {
        title: "Channel",
        fixed: "left",
        width: 160,
        ...nameSearchProps((r) => r.channel, "Search channel"),
        render: (_, r) =>
          r.isGrandTotal ? (
            <b>GRAND TOTAL</b>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 12 }}>{r.channel}</span>
          ),
      },
      ...branchCols,
      {
        title: <span style={{ fontWeight: 700 }}>TOTAL</span>,
        align: "center",
        children: totalChildren,
      },
    ];
  }, [
    viewOrientation,
    branchColsFromRows,
    hasFilter,
    branchCodeByName,
    productCodes,
    fromMonthStr,
    toMonthStr,
    effectiveUnitType,
    valueType,
    selectedProduct,
  ]);

  const transposedGrandTotals = useMemo(() => {
    if (viewOrientation !== "byChannel") return null;
    const rows = transposedDataSource;
    if (!rows.length) return null;
    const pct = (s, a) => (a ? Math.round((s / a) * 1000) / 10 : 0);
    const sumField = (f) => rows.reduce((acc, r) => acc + (r[f] || 0), 0);
    const gt = {};
    branchColsFromRows.forEach(({ branch }) => {
      const s = slug(branch);
      const a = sumField(`${s}_all`);
      const sel = sumField(`${s}_selected`);
      gt[`${s}_all`] = a;
      gt[`${s}_selected`] = sel;
      gt[`${s}_pct`] = pct(sel, a);
      if (hasFilter) gt[`${s}_remaining`] = Math.max(0, a - sel);
    });
    gt.total_all = sumField("total_all");
    gt.total_selected = sumField("total_selected");
    gt.total_pct = pct(gt.total_selected, gt.total_all);
    if (hasFilter)
      gt.total_remaining = Math.max(0, gt.total_all - gt.total_selected);
    return gt;
  }, [viewOrientation, transposedDataSource, branchColsFromRows, hasFilter]);

  const exportTransposedToExcel = async () => {
    const branchInfos = branchColsFromRows;
    const results = transposedDataSource;
    if (!branchInfos.length || !results.length) {
      message.warning("No data to export");
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";
    const ws = wb.addWorksheet("Coverage Report", {
      views: [{ state: "frozen", xSplit: 2, ySplit: 2 }],
    });

    const NAV = "002060";
    const NAV2 = "1E3A5F";
    const LGRAY = "F1F5F9";
    const AGOLD = "FEF3C7";
    const PCT_GOOD = "D1FAE5";
    const PCT_BAD = "FEE2E2";
    const PCT_GOOD_TXT = "FF15803D";
    const PCT_BAD_TXT = "FFB91C1C";
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
    const subHeaders = hasFilter
      ? ["All", "Selected", "Remaining", "(%)"]
      : ["Customers"];
    const stride = subHeaders.length;

    const r1 = ws.getRow(1);
    r1.height = 22;
    ws.mergeCells(1, 1, 2, 1);
    ws.mergeCells(1, 2, 2, 2);
    r1.getCell(1).value = "#";
    r1.getCell(1).style = hdr(NAV);
    r1.getCell(2).value = "Channel";
    r1.getCell(2).style = hdr(NAV);

    let col = 3;
    branchInfos.forEach(({ branch }) => {
      r1.getCell(col).value = branch;
      r1.getCell(col).style = hdr(NAV);
      if (stride > 1) ws.mergeCells(1, col, 1, col + stride - 1);
      col += stride;
    });
    r1.getCell(col).value = "TOTAL";
    r1.getCell(col).style = hdr(NAV2);
    if (stride > 1) ws.mergeCells(1, col, 1, col + stride - 1);

    const r2 = ws.getRow(2);
    r2.height = 18;
    col = 3;
    branchInfos.forEach(() => {
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
    for (let c = 3; c <= 3 + branchInfos.length * stride + stride - 1; c++) {
      ws.getColumn(c).width = stride === 1 ? 14 : 11;
    }

    const pctStyleFactory = (bg) => (val, allCount) => {
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
        font: {
          size: 10,
          bold: true,
          color: { argb: good ? PCT_GOOD_TXT : PCT_BAD_TXT },
        },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${good ? PCT_GOOD : PCT_BAD}` },
        },
        alignment: { horizontal: "center", vertical: "middle" },
        border: bdr,
      };
    };

    results.forEach((row, idx) => {
      const dr = ws.addRow({});
      dr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? WHITE : `FF${LGRAY}`;
      const pctStyle = pctStyleFactory(bg);

      const cellStyle = (extra = {}) => ({
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
        alignment: { vertical: "middle" },
        border: bdr,
        ...extra,
      });

      dr.getCell(1).value = idx + 1;
      dr.getCell(1).style = cellStyle({
        alignment: { horizontal: "center", vertical: "middle" },
        numFmt,
      });
      dr.getCell(2).value = row.channel;
      dr.getCell(2).style = cellStyle({ font: { size: 10, bold: true } });

      let c = 3;
      branchInfos.forEach(({ branch }) => {
        const s = slug(branch);
        if (hasFilter) {
          const a = row[`${s}_all`];
          const sel = row[`${s}_selected`];
          const rem = row[`${s}_remaining`];
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
          dr.getCell(c + 2).value = rem || null;
          dr.getCell(c + 2).style = {
            numFmt,
            font: { size: 10, bold: true, color: { argb: "FFB91C1C" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border: bdr,
          };
          dr.getCell(c + 3).value = a ? p : null;
          dr.getCell(c + 3).style = {
            ...pctStyle(p, a),
            numFmt: a ? '0.0"%"' : '"-"',
          };
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
        const rem = row.total_remaining;
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
        dr.getCell(c + 2).value = rem || null;
        dr.getCell(c + 2).style = {
          numFmt,
          font: { size: 10, bold: true, color: { argb: "FFB91C1C" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
        dr.getCell(c + 3).value = a ? p : null;
        dr.getCell(c + 3).style = pctStyle(p, a);
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

    const sumField = (f) => results.reduce((acc, r) => acc + (r[f] || 0), 0);
    const GT_BG = `FF${AGOLD}`;
    const gtr = ws.addRow({});
    gtr.height = 18;

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
    branchInfos.forEach(({ branch }) => {
      const s = slug(branch);
      if (hasFilter) {
        const a = sumField(`${s}_all`);
        const sel = sumField(`${s}_selected`);
        const rem = Math.max(0, a - sel);
        const p = pctOf(sel, a);
        const good = p >= 80;
        gtr.getCell(gc).value = a || null;
        gtr.getCell(gc).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
        gtr.getCell(gc + 1).value = sel || null;
        gtr.getCell(gc + 1).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
        gtr.getCell(gc + 2).value = rem || null;
        gtr.getCell(gc + 2).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
          font: { bold: true, size: 10, color: { argb: "FFB91C1C" } },
        });
        gtr.getCell(gc + 3).value = a ? p : null;
        gtr.getCell(gc + 3).style = {
          numFmt: a ? pctFmt : '"-"',
          font: {
            bold: true,
            size: 10,
            color: {
              argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B",
            },
          },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG },
          },
          alignment: { horizontal: "center", vertical: "middle" },
          border: bdr,
        };
      } else {
        gtr.getCell(gc).value = sumField(`${s}_all`) || null;
        gtr.getCell(gc).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
      }
      gc += stride;
    });
    if (hasFilter) {
      const a = sumField("total_all");
      const sel = sumField("total_selected");
      const rem = Math.max(0, a - sel);
      const p = pctOf(sel, a);
      const good = p >= 80;
      gtr.getCell(gc).value = a || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 1).value = sel || null;
      gtr.getCell(gc + 1).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 2).value = rem || null;
      gtr.getCell(gc + 2).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FFB91C1C" } },
      });
      gtr.getCell(gc + 3).value = a ? p : null;
      gtr.getCell(gc + 3).style = {
        numFmt: a ? pctFmt : '"-"',
        font: {
          bold: true,
          size: 10,
          color: { argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B" },
        },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG },
        },
        alignment: { horizontal: "center", vertical: "middle" },
        border: bdr,
      };
    } else {
      gtr.getCell(gc).value = sumField("total_all") || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Coverage_Report_Transposed_${fromMonthStr}_${toMonthStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    if (viewOrientation === "byChannel") {
      await exportTransposedToExcel();
      return;
    }
    const channels = visibleChannels;
    // Pull the data rows out of the rendered dataSource — they already carry
    // per-row totals recomputed against the visible-channel subset.
    const results = dataSource.filter((r) => !r.isGrandTotal);
    if (!results.length || !channels.length) {
      message.warning("No data to export");
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Wazalytics";
    const ws = wb.addWorksheet("Coverage Report", {
      views: [{ state: "frozen", xSplit: 2, ySplit: 2 }],
    });

    const NAV = "002060";
    const NAV2 = "1E3A5F";
    const LGRAY = "F1F5F9";
    const AGOLD = "FEF3C7";
    const PCT_GOOD = "D1FAE5";
    const PCT_BAD = "FEE2E2";
    const PCT_GOOD_TXT = "FF15803D";
    const PCT_BAD_TXT = "FFB91C1C";
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
    const subHeaders = hasFilter
      ? ["All", "Selected", "Remaining", "(%)"]
      : ["Customers"];
    const stride = subHeaders.length;

    // Row 1: channel group headers
    const r1 = ws.getRow(1);
    r1.height = 22;
    ws.mergeCells(1, 1, 2, 1);
    ws.mergeCells(1, 2, 2, 2);
    r1.getCell(1).value = "#";
    r1.getCell(1).style = hdr(NAV);
    r1.getCell(2).value = "Branch";
    r1.getCell(2).style = hdr(NAV);

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
    const r2 = ws.getRow(2);
    r2.height = 18;
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
      const dr = ws.addRow({});
      dr.height = 17;
      const isEven = idx % 2 === 0;
      const bg = isEven ? WHITE : `FF${LGRAY}`;

      const cellStyle = (extra = {}) => ({
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
        alignment: { vertical: "middle" },
        border: bdr,
        ...extra,
      });

      dr.getCell(1).value = idx + 1;
      dr.getCell(1).style = cellStyle({
        alignment: { horizontal: "center", vertical: "middle" },
        numFmt,
      });
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
          font: {
            size: 10,
            bold: true,
            color: { argb: good ? PCT_GOOD_TXT : PCT_BAD_TXT },
          },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${good ? PCT_GOOD : PCT_BAD}` },
          },
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
          const rem = row[`${s}_remaining`];
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
          dr.getCell(c + 2).value = rem || null;
          dr.getCell(c + 2).style = {
            numFmt,
            font: { size: 10, bold: true, color: { argb: "FFB91C1C" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
            alignment: { horizontal: "right", vertical: "middle" },
            border: bdr,
          };
          dr.getCell(c + 3).value = a ? p : null;
          dr.getCell(c + 3).style = {
            ...pctStyle(p, a),
            numFmt: a ? '0.0"%"' : '"-"',
          };
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
        const rem = row.total_remaining;
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
        dr.getCell(c + 2).value = rem || null;
        dr.getCell(c + 2).style = {
          numFmt,
          font: { size: 10, bold: true, color: { argb: "FFB91C1C" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
          alignment: { horizontal: "right", vertical: "middle" },
          border: bdr,
        };
        dr.getCell(c + 3).value = a ? p : null;
        dr.getCell(c + 3).style = pctStyle(p, a);
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
    const gtr = ws.addRow({});
    gtr.height = 18;

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
        const rem = Math.max(0, a - sel);
        const p = pctOf(sel, a);
        const good = p >= 80;
        gtr.getCell(gc).value = a || null;
        gtr.getCell(gc).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
        gtr.getCell(gc + 1).value = sel || null;
        gtr.getCell(gc + 1).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
        gtr.getCell(gc + 2).value = rem || null;
        gtr.getCell(gc + 2).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
          font: { bold: true, size: 10, color: { argb: "FFB91C1C" } },
        });
        gtr.getCell(gc + 3).value = a ? p : null;
        gtr.getCell(gc + 3).style = {
          numFmt: a ? pctFmt : '"-"',
          font: {
            bold: true,
            size: 10,
            color: {
              argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B",
            },
          },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG },
          },
          alignment: { horizontal: "center", vertical: "middle" },
          border: bdr,
        };
      } else {
        gtr.getCell(gc).value = sumField(`${s}_all`) || null;
        gtr.getCell(gc).style = gtStyle({
          numFmt,
          alignment: { horizontal: "right", vertical: "middle" },
        });
      }
      gc += stride;
    });
    if (hasFilter) {
      const a = sumField("total_all");
      const sel = sumField("total_selected");
      const rem = Math.max(0, a - sel);
      const p = pctOf(sel, a);
      const good = p >= 80;
      gtr.getCell(gc).value = a || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 1).value = sel || null;
      gtr.getCell(gc + 1).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
      gtr.getCell(gc + 2).value = rem || null;
      gtr.getCell(gc + 2).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FFB91C1C" } },
      });
      gtr.getCell(gc + 3).value = a ? p : null;
      gtr.getCell(gc + 3).style = {
        numFmt: a ? pctFmt : '"-"',
        font: {
          bold: true,
          size: 10,
          color: { argb: a ? (good ? PCT_GOOD_TXT : PCT_BAD_TXT) : "FF64748B" },
        },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: a ? `FF${good ? PCT_GOOD : PCT_BAD}` : GT_BG },
        },
        alignment: { horizontal: "center", vertical: "middle" },
        border: bdr,
      };
    } else {
      gtr.getCell(gc).value = sumField("total_all") || null;
      gtr.getCell(gc).style = gtStyle({
        numFmt,
        alignment: { horizontal: "right", vertical: "middle" },
        font: { bold: true, size: 10, color: { argb: "FF002060" } },
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Coverage_Report_${fromMonthStr}_${toMonthStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            color: "#64748B",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          From – To:
        </span>
        <MonthRangePicker
          value={[fromMonth, toMonth]}
          onChange={([from, to]) => {
            setFromMonth(from);
            setToMonth(to);
          }}
        />

        <Divider type="vertical" style={{ height: 24 }} />

        <span
          style={{
            color: "#64748B",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          Branch:
        </span>
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
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() =>
                    setSelectedBranches(branches.map((b) => b.code))
                  }
                >
                  Select All
                </Button>
                <Divider type="vertical" />
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => setSelectedBranches([])}
                >
                  Unselect All
                </Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />

        <span
          style={{
            color: "#64748B",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          Channel:
        </span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="All channels"
          value={selectedChannels}
          onChange={setSelectedChannels}
          maxTagCount="responsive"
          disabled={!orderedChannels.length}
          options={orderedChannels.map((c) => ({ value: c, label: c }))}
          dropdownRender={(menu) => (
            <>
              <div style={{ padding: "4px 8px", display: "flex", gap: 8 }}>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => setSelectedChannels(orderedChannels)}
                >
                  Select All
                </Button>
                <Divider type="vertical" />
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => setSelectedChannels([])}
                >
                  Unselect All
                </Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />

        <Divider type="vertical" style={{ height: 24 }} />

        <span
          style={{
            color: "#64748B",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          View:
        </span>
        <Segmented
          value={viewOrientation}
          onChange={(v) => {
            orientationLockedByUser.current = true;
            setViewOrientation(v);
          }}
          options={[
            { label: "Branch × Channel", value: "byBranch" },
            { label: "Channel × Branch", value: "byChannel" },
          ]}
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
          dataSource={
            viewOrientation === "byChannel" ? transposedDataSource : dataSource
          }
          columns={
            viewOrientation === "byChannel" ? transposedColumns : columns
          }
          pagination={{ pageSize: 25, showSizeChanger: false, size: "small" }}
          scroll={{ x: "max-content", y: "55vh" }}
          locale={{
            emptyText: "Select a month and branches to view the report",
          }}
          rowClassName={(r) => (r.isGrandTotal ? "report-grand-total-row" : "")}
          summary={() => {
            const isTx = viewOrientation === "byChannel";
            const gt = isTx ? transposedGrandTotals : grandTotals;
            if (!gt) return null;
            const groupKeys = isTx
              ? branchColsFromRows.map((b) => b.branch)
              : visibleChannels;
            let i = 0;
            const cell = (content, opts = {}) => (
              <Table.Summary.Cell
                key={i}
                index={i++}
                align={opts.align || "right"}
                colSpan={opts.colSpan}
              >
                {content}
              </Table.Summary.Cell>
            );
            const cells = [];
            cells.push(cell("", { align: "center" }));
            cells.push(cell(<b>GRAND TOTAL</b>, { align: "left" }));
            groupKeys.forEach((name) => {
              const s = slug(name);
              if (hasFilter) {
                cells.push(cell(<span style={{ color: "#64748B" }}>{fmtNum(gt[`${s}_all`])}</span>));
                cells.push(cell(<b style={{ color: "var(--color-accent)" }}>{fmtNum(gt[`${s}_selected`])}</b>));
                cells.push(cell(<b style={{ color: "#B91C1C" }}>{fmtNum(gt[`${s}_remaining`])}</b>));
                cells.push(cell(<PctCell v={gt[`${s}_pct`]} allCount={gt[`${s}_all`]} />, { align: "center" }));
              } else {
                cells.push(cell(<b style={{ color: "var(--color-accent)" }}>{fmtNum(gt[`${s}_all`])}</b>));
              }
            });
            if (hasFilter) {
              cells.push(cell(<b>{fmtNum(gt.total_all)}</b>));
              cells.push(cell(<b style={{ color: "var(--color-primary)" }}>{fmtNum(gt.total_selected)}</b>));
              cells.push(cell(<b style={{ color: "#B91C1C" }}>{fmtNum(gt.total_remaining)}</b>));
              cells.push(cell(<PctCell v={gt.total_pct} allCount={gt.total_all} />, { align: "center" }));
            } else {
              cells.push(cell(<b style={{ color: "var(--color-primary)" }}>{fmtNum(gt.total_all)}</b>));
            }
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="report-grand-total-row">{cells}</Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      )}

      <ChannelCoverageCustomersModal
        state={drillState}
        onClose={closeDrill}
        unitType={unitType}
        valueType={valueType}
        isValueMode={isValueMode}
        selectedProductCode={productCodes[0] || null}
      />
    </div>
  );
};

export default ChannelCoverage;
