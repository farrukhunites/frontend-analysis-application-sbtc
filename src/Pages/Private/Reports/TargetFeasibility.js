import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  Table, Select, Skeleton, message, Button, Divider, Modal, Spin, Tag, Alert,
} from "antd";
import dayjs from "dayjs";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import {
  getTargetFeasibility,
  getTargetFeasibilitySalesmen,
  getTargetFeasibilityCustomers,
} from "../../../API/Reports";
import "./reports.css";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtPct = (v) => {
  if (v == null) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
};

// status tag → color
const STATUS_META = {
  Easy:        { color: "green",  hint: "Target ≤ feasible projection" },
  Achievable:  { color: "blue",   hint: "Target within 15% of feasible" },
  Stretch:     { color: "orange", hint: "Target 15–30% above feasible" },
  Unrealistic: { color: "red",    hint: "Target >30% above feasible" },
  "N/A":       { color: "default", hint: "No target or insufficient history" },
};

// signed delta cell — used for both variance and growth%
const DeltaCell = ({ v, suffix = "" }) => {
  if (v == null) return <span style={{ color: "#64748B" }}>-</span>;
  if (v === 0)   return <span style={{ color: "#64748B" }}>0{suffix}</span>;
  const color = v >= 0 ? "#10B981" : "#EF4444";
  const bg    = v >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
  return (
    <span style={{ color, background: bg, padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
      {v > 0 ? "+" : ""}{suffix ? `${v.toFixed(1)}${suffix}` : fmtNum(v)}
    </span>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
const TargetFeasibility = () => {
  const { selectedMonth } = useDateFilter();
  const { unitType, mode } = useContext(UnitValueContext);
  const unitLabel = (unitType || "ctn").toUpperCase();
  const isValueMode = mode === "val";

  const [branches, setBranches]                 = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [products, setProducts]                 = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState({ results: [] });

  // Salesman drill (level 1)
  const [smModal, setSmModal] = useState({
    open: false, loading: false, branchCode: "", branchName: "",
    results: [], totalLysm: 0, totalFeasible: 0, branchGrowthPct: null,
  });

  // Customer drill (level 2)
  const [custModal, setCustModal] = useState({
    open: false, loading: false, branchCode: "", branchName: "",
    salesmanCode: "", salesmanName: "",
    results: [], totalLysm: 0, totalFeasible: 0, branchGrowthPct: null,
  });

  // ── load branches + products ───────────────────────────────────────────────
  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
    });
    getAllProducts().then((res) => {
      let list = res?.results || [];
      const hasIndomie = list.some((p) => p?.name?.toLowerCase().includes("indomie"));
      if (hasIndomie) {
        [
          { code: "9999901", name: "INDOMIE PILLOW (All)" },
          { code: "9999902", name: "INDOMIE CUP (All)" },
        ].forEach((sp) => { if (!list.some((p) => p.code === sp.code)) list = [...list, sp]; });
      }
      setProducts(list);
      setSelectedProducts(list.filter((p) => !["9999901", "9999902"].includes(p.code)).map((p) => p.code));
    });
  }, []);

  // ── fetch summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isValueMode) return;
    if (!selectedMonth || !selectedBranches.length || !selectedProducts.length) return;
    setLoading(true);
    getTargetFeasibility({
      month:        selectedMonth,
      unitType:     unitType || "ctn",
      branchCodes:  selectedBranches,
      productCodes: selectedProducts,
    }).then((res) => {
      if (res?.error) {
        message.error(res.error?.detail || "Failed to load feasibility report");
        setReportData({ results: [] });
      } else {
        setReportData(res || { results: [] });
      }
      setLoading(false);
    });
  }, [selectedMonth, unitType, isValueMode, selectedBranches, selectedProducts]);

  // ── open salesman drill ────────────────────────────────────────────────────
  const openSalesmanDrill = useCallback(async (branchCode, branchName) => {
    setSmModal({
      open: true, loading: true, branchCode, branchName,
      results: [], totalLysm: 0, totalFeasible: 0, branchGrowthPct: null,
    });
    const res = await getTargetFeasibilitySalesmen({
      month:        selectedMonth,
      branchCode,
      unitType:     unitType || "ctn",
      productCodes: selectedProducts,
    });
    if (res?.error) {
      message.error("Failed to load salesman breakdown");
      setSmModal((p) => ({ ...p, loading: false }));
    } else {
      setSmModal((p) => ({
        ...p, loading: false,
        results:         res.results || [],
        totalLysm:       res.total_lysm || 0,
        totalFeasible:   res.total_feasible || 0,
        branchGrowthPct: res.branch_growth_pct,
      }));
    }
  }, [selectedMonth, unitType, selectedProducts]);

  // ── open customer drill ────────────────────────────────────────────────────
  const openCustomerDrill = useCallback(async (salesmanCode, salesmanName) => {
    setCustModal({
      open: true, loading: true,
      branchCode:    smModal.branchCode,
      branchName:    smModal.branchName,
      salesmanCode, salesmanName,
      results: [], totalLysm: 0, totalFeasible: 0, branchGrowthPct: null,
    });
    const res = await getTargetFeasibilityCustomers({
      month:         selectedMonth,
      branchCode:    smModal.branchCode,
      salesmanCode,
      unitType:      unitType || "ctn",
      productCodes:  selectedProducts,
    });
    if (res?.error) {
      message.error("Failed to load customer breakdown");
      setCustModal((p) => ({ ...p, loading: false }));
    } else {
      setCustModal((p) => ({
        ...p, loading: false,
        results:         res.results || [],
        totalLysm:       res.total_lysm || 0,
        totalFeasible:   res.total_feasible || 0,
        branchGrowthPct: res.branch_growth_pct,
      }));
    }
  }, [selectedMonth, unitType, selectedProducts, smModal.branchCode, smModal.branchName]);

  // ── main table columns ─────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      title: "#", width: 44, align: "center", fixed: "left",
      render: (_, __, i) => <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
    },
    {
      title: "Branch", dataIndex: "branch", fixed: "left", width: 200,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.branch_code}</div>
        </div>
      ),
    },
    {
      title: `Actual Target (${unitLabel})`, dataIndex: "actual_target",
      align: "right", width: 140,
      sorter: (a, b) => (a.actual_target || 0) - (b.actual_target || 0),
      render: (v) => <span style={{ color: "#1E293B" }}>{fmtNum(v)}</span>,
    },
    {
      title: `LYSM (${unitLabel})`, dataIndex: "lysm_sales",
      align: "right", width: 120,
      sorter: (a, b) => (a.lysm_sales || 0) - (b.lysm_sales || 0),
      render: (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
    },
    {
      title: "6-Mo Growth", dataIndex: "growth_pct",
      align: "center", width: 110,
      sorter: (a, b) => (a.growth_pct ?? -1e9) - (b.growth_pct ?? -1e9),
      render: (v) => <DeltaCell v={v} suffix="%" />,
    },
    {
      title: `Feasible Target (${unitLabel})`, dataIndex: "feasible",
      align: "right", width: 150,
      sorter: (a, b) => (a.feasible ?? -1) - (b.feasible ?? -1),
      render: (v, r) => v == null
        ? <span style={{ color: "#94A3B8" }}>N/A</span>
        : (
          <b
            onClick={() => openSalesmanDrill(r.branch_code, r.branch)}
            style={{ cursor: "pointer", color: "var(--color-accent)" }}
            title="Open salesman breakdown"
          >{fmtNum(v)}</b>
        ),
    },
    {
      title: `Feasible − Actual (${unitLabel})`, dataIndex: "variance",
      align: "center", width: 160,
      sorter: (a, b) => (a.variance ?? -1e15) - (b.variance ?? -1e15),
      render: (v, r) => r.feasible == null
        ? <span style={{ color: "#94A3B8" }}>-</span>
        : <DeltaCell v={v} />,
    },
    {
      title: "Status", dataIndex: "status",
      align: "center", width: 130,
      filters: Object.keys(STATUS_META).map((s) => ({ text: s, value: s })),
      onFilter: (v, r) => r.status === v,
      render: (v) => {
        const meta = STATUS_META[v] || STATUS_META["N/A"];
        return <Tag color={meta.color} title={meta.hint} style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>{v}</Tag>;
      },
    },
  ], [unitLabel, openSalesmanDrill]);

  const dataSource = useMemo(
    () => (reportData.results || []).map((r, i) => ({ ...r, key: i })),
    [reportData]
  );

  // ── early returns for incompatible modes ───────────────────────────────────
  if (isValueMode) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="info" showIcon
          message="Target Feasibility is available in quantity mode only"
          description="Branch targets are stored in cartons / pieces — there are no value targets to compare against. Switch the unit selector to CTN or PCS to view this report."
        />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Header / context */}
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "#64748B" }}>
          Feasible target = <b>LYSM × (1 + mean trailing 6-month YoY growth)</b>.
          {" "}Click <b style={{ color: "var(--color-accent)" }}>Feasible Target</b> to drill into salesmen, then customers.
        </div>
        {selectedMonth && (
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Period: <b style={{ color: "var(--color-text-primary)" }}>{dayjs(selectedMonth, "YYYYMM").format("MMM YYYY")}</b>
          </div>
        )}
      </div>

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
          locale={{ emptyText: "Select a month with available data to view the report" }}
        />
      )}

      {/* ═════ Salesman Drill Modal ════════════════════════════════════════ */}
      <Modal
        title={
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
              Salesman Feasibility — {smModal.branchName}
            </div>
            {!smModal.loading && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {smModal.results.length} salesm{smModal.results.length === 1 ? "an" : "en"}
                {" · "}Branch growth applied: <b>{fmtPct(smModal.branchGrowthPct)}</b>
                {" · "}LYSM total: <b>{fmtNum(smModal.totalLysm)}</b>
                {" · "}Feasible total: <b style={{ color: "var(--color-primary)" }}>{fmtNum(smModal.totalFeasible)}</b>
                {" "}{unitLabel}
              </div>
            )}
          </div>
        }
        open={smModal.open}
        onCancel={() => setSmModal((p) => ({ ...p, open: false }))}
        footer={null}
        width={720}
        styles={{ body: { padding: "12px 0 0" } }}
      >
        {smModal.loading ? (
          <div style={{ textAlign: "center", padding: 48 }}><Spin size="large" /></div>
        ) : (
          <Table
            size="small"
            bordered
            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
            dataSource={smModal.results.map((r, i) => ({ ...r, key: i }))}
            columns={[
              {
                title: "#", width: 40, align: "center",
                render: (_, __, i) => <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
              },
              {
                title: "Salesman",
                render: (_, r) => (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{r.salesman}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{r.salesman_code}</div>
                  </div>
                ),
              },
              {
                title: `LYSM (${unitLabel})`, dataIndex: "lysm_sales",
                align: "right", width: 120,
                sorter: (a, b) => (a.lysm_sales || 0) - (b.lysm_sales || 0),
                render: (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
              },
              {
                title: (
                  <span title="This salesman's own trailing 6-month YoY growth — shown for context only. The Feasible column uses the BRANCH growth so totals reconcile with the branch row.">
                    Own 6-Mo
                  </span>
                ),
                dataIndex: "own_growth_pct",
                align: "center", width: 110,
                render: (v) => <DeltaCell v={v} suffix="%" />,
              },
              {
                title: `Feasible (${unitLabel})`, dataIndex: "feasible",
                align: "right", width: 140,
                defaultSortOrder: "descend",
                sorter: (a, b) => (a.feasible ?? -1) - (b.feasible ?? -1),
                render: (v, r) => v == null
                  ? <span style={{ color: "#94A3B8" }}>N/A</span>
                  : (
                    <b
                      onClick={() => openCustomerDrill(r.salesman_code, r.salesman)}
                      style={{ cursor: "pointer", color: "var(--color-accent)" }}
                      title="Open customer breakdown"
                    >{fmtNum(v)}</b>
                  ),
              },
            ]}
            summary={() => (
              <Table.Summary.Row className="report-grand-total-row">
                <Table.Summary.Cell index={0} colSpan={2}>
                  <b>TOTAL</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <b>{fmtNum(smModal.totalLysm)}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4} align="right">
                  <b style={{ color: "var(--color-primary)" }}>{fmtNum(smModal.totalFeasible)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Modal>

      {/* ═════ Customer Drill Modal ════════════════════════════════════════ */}
      <Modal
        title={
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
              Customer Breakdown — {custModal.salesmanName}
            </div>
            {!custModal.loading && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {custModal.branchName}
                {" · "}{custModal.results.length} customer{custModal.results.length !== 1 ? "s" : ""}
                {" · "}Branch growth applied: <b>{fmtPct(custModal.branchGrowthPct)}</b>
                {" · "}Feasible total: <b style={{ color: "var(--color-primary)" }}>{fmtNum(custModal.totalFeasible)}</b>
                {" "}{unitLabel}
              </div>
            )}
          </div>
        }
        open={custModal.open}
        onCancel={() => setCustModal((p) => ({ ...p, open: false }))}
        footer={null}
        width={720}
        styles={{ body: { padding: "12px 0 0" } }}
      >
        {custModal.loading ? (
          <div style={{ textAlign: "center", padding: 48 }}><Spin size="large" /></div>
        ) : (
          <Table
            size="small"
            bordered
            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
            dataSource={custModal.results.map((r, i) => ({ ...r, key: i }))}
            locale={{ emptyText: "No LYSM customers for this salesman" }}
            columns={[
              {
                title: "#", width: 40, align: "center",
                render: (_, __, i) => <span style={{ color: "#64748B", fontSize: 11 }}>{i + 1}</span>,
              },
              {
                title: "Customer",
                render: (_, r) => (
                  <div>
                    <div style={{ fontSize: 12 }}>{r.customer}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
                  </div>
                ),
              },
              {
                title: `LYSM (${unitLabel})`, dataIndex: "lysm_sales",
                align: "right", width: 130,
                sorter: (a, b) => (a.lysm_sales || 0) - (b.lysm_sales || 0),
                render: (v) => <span style={{ color: "#64748B" }}>{fmtNum(v)}</span>,
              },
              {
                title: `Feasible (${unitLabel})`, dataIndex: "feasible",
                align: "right", width: 140,
                defaultSortOrder: "descend",
                sorter: (a, b) => (a.feasible ?? -1) - (b.feasible ?? -1),
                render: (v) => v == null
                  ? <span style={{ color: "#94A3B8" }}>N/A</span>
                  : <b style={{ color: "var(--color-primary)" }}>{fmtNum(v)}</b>,
              },
            ]}
            summary={() => (
              <Table.Summary.Row className="report-grand-total-row">
                <Table.Summary.Cell index={0} colSpan={2}>
                  <b>TOTAL</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <b>{fmtNum(custModal.totalLysm)}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <b style={{ color: "var(--color-primary)" }}>{fmtNum(custModal.totalFeasible)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default TargetFeasibility;
