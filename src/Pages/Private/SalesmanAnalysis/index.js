import {
  AimOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  LineChartOutlined,
  TrophyOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  FileTextOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { message, Modal, Select, Skeleton, Table, Tag, Empty } from "antd";
import "./style.css";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import AreaChart from "../../../Components/Charts/AreaChart";
import BarChart from "../../../Components/Charts/BarChart";
import DonutChart from "../../../Components/Charts/DonutChart";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import {
  getSalesmanInsight, getSalesmenByBranch, getSalesmanInvoices,
  getSalesmanInsightByProduct,
} from "../../../API/Salesman";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { CHART_COLORS } from "../../../Components/Charts/chartConfig";
import RiyalIcon from "../../../Utils/RiyalIcon";

const { Option } = Select;

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (v) => (v == null || !isFinite(v) ? "-" : `${(v * 100).toFixed(1)}%`);
const pctColor = (v, threshold = 0.9) => {
  if (v == null || !isFinite(v)) return "#94A3B8";
  return v >= threshold ? "#10B981" : "#EF4444";
};

const SalesmanAnalysis = () => {
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const chartUnit = isValueMode ? "SAR" : unitType;
  const { selectedMonth } = useDateFilter();

  const [branches, setBranches]               = useState([]);
  const [salesmen, setSalesmen]               = useState([]);
  const [selectedBranch, setSelectedBranch]   = useState(null);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [data, setData]                       = useState(null);
  const [invoices, setInvoices]               = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [rankModal, setRankModal]             = useState({ open: false, scope: null });
  const [activeCustModal, setActiveCustModal] = useState(false);
  const [assignedCustModal, setAssignedCustModal] = useState(false);
  const [paymentPendingModal, setPaymentPendingModal] = useState(false);
  const [byProductModal, setByProductModal] = useState({ open: false, highlight: null });
  const [byProductRows, setByProductRows] = useState(null);
  const [byProductLoading, setByProductLoading] = useState(false);

  // Sales-related cards can be broken down per product from
  // SalesAggregateSalesmanProduct. Only surface the option when the navbar
  // is on the "All Products" sentinel — otherwise there's a single product
  // and the breakdown collapses to one row.
  const allProductsMode = data?.product_code === "";
  const openByProduct = (highlight) => setByProductModal({ open: true, highlight });

  const [searchParams] = useSearchParams();
  const locationState  = useLocation().state;
  const preselect = locationState || (
    searchParams.get("salesman_code") ? {
      salesman_code: searchParams.get("salesman_code"),
      branch_code:   searchParams.get("branch_code"),
      product_code:  searchParams.get("product_code"),
    } : null
  );
  const hasAutoSelected = useRef(false);

  // Initial branches list
  useEffect(() => {
    getAllBranches().then((res) => setBranches(res?.results || []));
  }, []);

  // Auto-select branch from URL → triggers salesman list fetch
  useEffect(() => {
    if (!hasAutoSelected.current && preselect?.branch_code && branches.length > 0 && !selectedBranch) {
      const b = branches.find((br) => br.code === preselect.branch_code);
      if (b) setSelectedBranch(b);
    }
  }, [branches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select product from URL
  useEffect(() => {
    if (!preselect?.product_code) return;
    getAllProducts().then((res) => {
      const list = res?.results || [];
      const match = list.find((p) => p.code === preselect.product_code);
      if (match) setSelectedProduct(match);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Salesmen list whenever branch changes
  useEffect(() => {
    if (!selectedBranch) { setSalesmen([]); setSelectedSalesman(null); return; }
    getSalesmenByBranch(selectedBranch.code).then((res) => {
      const list = res?.results || [];
      setSalesmen(list);
      // Auto-pick salesman from URL once list is loaded
      if (!hasAutoSelected.current && preselect?.salesman_code) {
        const match = list.find((s) => s.code === preselect.salesman_code);
        if (match) {
          hasAutoSelected.current = true;
          setSelectedSalesman(match);
        }
      }
    });
  }, [selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch insight
  useEffect(() => {
    if (!selectedSalesman || !selectedBranch || !selectedProduct) return;
    setLoading(true);
    // Skeletons are gated on `loading && !data`; without clearing here, the
    // stale payload keeps rendering during a refetch and the skeleton never
    // appears when filters change.
    setData(null);
    setInvoices([]);
    getSalesmanInsight({
      salesmanCode: selectedSalesman.code,
      branchCode:   selectedBranch.code,
      productCode:  selectedProduct.code,
      month:        selectedMonth || undefined,
      unitType:     effectiveUnitType,
      valueType,
    }).then((res) => {
      if (res?.error) {
        message.warning("Failed to load salesman insight");
        setData(null);
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [selectedSalesman, selectedBranch, selectedProduct, selectedMonth, effectiveUnitType, valueType]);

  // Clear any cached per-product breakdown when the underlying scope changes,
  // so the modal never shows stale rows from a different salesman/month.
  useEffect(() => {
    setByProductRows(null);
    setByProductModal({ open: false, highlight: null });
  }, [data?.salesman_code, data?.month_yyyymm, data?.unit_type, data?.value_type]);

  // Lazy-fetch the per-product breakdown the first time the modal is opened
  // for a given scope. Only meaningful in All-Products mode.
  useEffect(() => {
    if (!byProductModal.open || byProductRows || !allProductsMode || !data?.salesman_code) return;
    setByProductLoading(true);
    getSalesmanInsightByProduct({
      salesmanCode: data.salesman_code,
      branchCode:   data.branch_code,
      month:        data.month_yyyymm,
      unitType:     effectiveUnitType,
      valueType,
    }).then((res) => {
      setByProductRows(res?.error ? [] : (res?.rows || []));
      setByProductLoading(false);
    });
  }, [byProductModal.open, allProductsMode, data?.salesman_code, data?.branch_code, data?.month_yyyymm, effectiveUnitType, valueType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-fetch the invoice line-items after the main insight lands. Split from
  // the primary payload so the page paints without waiting on what can be a
  // multi-thousand-row dump.
  useEffect(() => {
    if (!data?.salesman_code) { setInvoices([]); return; }
    setInvoicesLoading(true);
    getSalesmanInvoices({
      salesmanCode: data.salesman_code,
      branchCode:   data.branch_code,
      productCode:  data.product_code,
      month:        data.month_yyyymm,
    }).then((res) => {
      setInvoices(res?.error ? [] : (res?.invoices || []));
      setInvoicesLoading(false);
    });
  }, [data?.salesman_code, data?.branch_code, data?.product_code, data?.month_yyyymm]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const ranking = data?.ranking || {};
  const cadence = data?.cadence || {};
  const quality = data?.order_quality || {};

  const returnColor =
    quality.return_rate_percent > 10 ? "#EF4444"
    : quality.return_rate_percent > 5 ? "#F59E0B"
    : "#10B981";

  const tabs = data ? [
    { title: "Salesman",         value: data.salesman_name,                                          icon: <UserOutlined /> },
    { title: "Code",             value: data.salesman_code,                                          icon: <UserOutlined /> },
    { title: "Branch",           value: data.branch_name,                                            icon: <AimOutlined /> },
    { title: "Mobile",           value: data.mobile_no || "-",                                      icon: <PhoneOutlined /> },
    { title: "Channels",         value: data.channels?.length ? data.channels.join(", ") : "-",     icon: <ApartmentOutlined /> },
    { title: "Sales MTD",        value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{fmtNum(data.sales_mtd)}{!isValueMode && ` ${unitType}`}</span>, icon: <CalendarOutlined /> },
    { title: "Sales YTD",        value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{fmtNum(data.sales_ytd)}{!isValueMode && ` ${unitType}`}</span>, icon: <LineChartOutlined /> },
    { title: "Total Sales (2023+)", value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{fmtNum(data.total_sales_forever)}{!isValueMode && ` ${unitType}`}</span>, icon: <DollarOutlined /> },
  ] : [];

  // Build customer-analysis link with full context
  const openCustomerInNewTab = (cust) => {
    const params = new URLSearchParams();
    params.set("customer_code", cust.customer_code);
    if (cust.branch_code || data?.branch_code) params.set("branch_code", cust.branch_code || data?.branch_code);
    if (cust.channel)      params.set("channel_code", cust.channel);
    if (selectedProduct?.code) params.set("product_code", selectedProduct.code);
    window.open(`/customer-analysis?${params.toString()}`, "_blank", "noopener");
  };

  const topCustomerColumns = [
    { title: "#", width: 50, align: "center",
      render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span> },
    { title: "Customer", dataIndex: "customer_name",
      render: (v, r) => (
        <div className="report-clickable-name" title="Open Customer Analysis in new tab"
             onClick={() => openCustomerInNewTab(r)}>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
        </div>
      ) },
    { title: "Channel", dataIndex: "channel", width: 110,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span> },
    { title: isValueMode ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>Sales YTD (<RiyalIcon width={10} height={10} color="currentColor" />)</span> : `Sales YTD (${unitType.toUpperCase()})`, dataIndex: "sales", align: "right", width: 160,
      sorter: (a, b) => (a.sales || 0) - (b.sales || 0),
      defaultSortOrder: "descend",
      render: (v) => <b>{fmtNum(v)}</b> },
  ];

  const invoiceColumns = [
    { title: "Inv Date",   dataIndex: "inv_dt",   width: 110 },
    { title: "Invoice #",  dataIndex: "inv_no",   width: 130 },
    { title: "Customer",   dataIndex: "cust_nm",
      render: (v, r) => (
        <div className="report-clickable-name" title="Open Customer Analysis in new tab"
             onClick={() => openCustomerInNewTab({
               customer_code: r.cust_cd, branch_code: r.salespointcd, channel: r.otlcd,
             })}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.cust_cd}</div>
        </div>
      ) },
    { title: "Channel",    dataIndex: "otlcd",     width: 100 },
    { title: "Item",       dataIndex: "item_nm",   width: 220,
      render: (v, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.item_cd}</div>
        </div>
      ) },
    { title: "Type",       dataIndex: "tp",        width: 110 },
    { title: "Qty",        dataIndex: "qtyconv",   width: 80, align: "right" },
    { title: "Price",      dataIndex: "unitprice", width: 90, align: "right" },
    { title: "Discount",   dataIndex: "amtdisc",   width: 90, align: "right",
      render: (v) => (v ? Number(v).toLocaleString() : 0) },
  ];

  return (
    <div className="salesman-analysis">
      {/* ── Selectors ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16 }}>
        <Select
          showSearch
          value={selectedBranch?.code || null}
          onChange={(code) => {
            setSelectedBranch(branches.find((b) => b.code === code) || null);
            setSelectedSalesman(null);
          }}
          style={{ flex: 1 }}
          placeholder="Select Branch"
          optionFilterProp="children"
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
        >
          {branches.map((b) => (
            <Option key={b.code} value={b.code}>{b.name}</Option>
          ))}
        </Select>

        <Select
          disabled={!selectedBranch}
          showSearch
          value={selectedSalesman?.code || null}
          onChange={(code) => setSelectedSalesman(salesmen.find((s) => s.code === code) || null)}
          style={{ flex: 2 }}
          placeholder={selectedBranch ? "Select Salesman" : "Pick a branch first"}
          optionFilterProp="label"
        >
          {salesmen.map((s) => (
            <Option key={s.code} value={s.code} label={`${s.code} - ${s.name}`}>
              {`${s.code} - ${s.name}`}
            </Option>
          ))}
        </Select>
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!selectedSalesman && !loading && (
        <div style={{ marginTop: 40 }}>
          <Empty description="Select a branch and a salesman to see the analysis" />
        </div>
      )}

      {/* ── Info card row ─────────────────────────────────────────── */}
      {(loading || data) && (
        <div className="top-tabs-container">
          {loading && !data
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tab-card">
                  <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 1, width: "40%" }} />
                </div>
              ))
            : tabs.map((tab, idx) => (
                <div key={idx} className="tab-card">
                  <div className="tab-header">
                    <div className="tab-icon">{tab.icon}</div>
                    <div className="tab-title">{tab.title}</div>
                  </div>
                  <div className="tab-value">{tab.value}</div>
                </div>
              ))}
        </div>
      )}

      {/* ── KPI row: target / achievement ─────────────────────────── */}
      {data && (
        <div className="sa-section-row">
          <div
            className={`sa-rank-card ${allProductsMode ? "sa-rank-card--clickable" : ""}`}
            onClick={() => allProductsMode && openByProduct("month_target")}
            title={allProductsMode ? "Click to see per-product breakdown" : ""}
          >
            <div className="sa-rank-icon"><AimOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                Target ({isValueMode ? <RiyalIcon width={10} height={10} color="currentColor" /> : unitType.toUpperCase()})
              </div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{fmtNum(data.month_target)}</span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${allProductsMode ? "sa-rank-card--clickable" : ""}`}
            onClick={() => allProductsMode && openByProduct("sales_mtd")}
            title={allProductsMode ? "Click to see per-product breakdown" : ""}
          >
            <div className="sa-rank-icon sa-rank-icon--cadence"><LineChartOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">MTD Sales</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{fmtNum(data.sales_mtd)}</span>
                <span className="sa-rank-total" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {isValueMode ? <RiyalIcon width={10} height={10} color="currentColor" /> : unitType.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${allProductsMode ? "sa-rank-card--clickable" : ""}`}
            onClick={() => allProductsMode && openByProduct("achievement_pct")}
            title={allProductsMode ? "Click to see per-product breakdown" : ""}
          >
            <div className="sa-rank-icon" style={{ background: `${pctColor(data.achievement_pct)}18`, color: pctColor(data.achievement_pct) }}>
              <TrophyOutlined />
            </div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Achievement</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num" style={{ color: pctColor(data.achievement_pct) }}>
                  {fmtPct(data.achievement_pct)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${allProductsMode ? "sa-rank-card--clickable" : ""}`}
            onClick={() => allProductsMode && openByProduct("daily_ach_pct")}
            title={allProductsMode ? "Click to see per-product breakdown" : ""}
          >
            <div className="sa-rank-icon" style={{ background: `${pctColor(data.daily_ach_pct)}18`, color: pctColor(data.daily_ach_pct) }}>
              <ThunderboltOutlined />
            </div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Daily Ach (day {data.elapsed_days}/{data.total_days})</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num" style={{ color: pctColor(data.daily_ach_pct) }}>
                  {fmtPct(data.daily_ach_pct)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${(data.active_customers_list?.length || data.inactive_customers_list?.length) ? "sa-rank-card--clickable" : ""}`}
            onClick={() => (data.active_customers_list?.length || data.inactive_customers_list?.length) && setActiveCustModal(true)}
            title={(data.active_customers_list?.length || data.inactive_customers_list?.length) ? "Click to see active and inactive customers" : ""}
          >
            <div className="sa-rank-icon sa-rank-icon--channel"><TeamOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Active Customers (MTD)</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{data.active_customers_mtd || 0}</span>
                <span className="sa-rank-total">of {data.active_customers_ytd} YTD</span>
              </div>
            </div>
          </div>

          <div className="sa-rank-card">
            <div className="sa-rank-icon sa-rank-icon--invoice"><FileTextOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Invoices (MTD)</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{cadence.mtd_invoice_count || 0}</span>
                <span className="sa-rank-total">{cadence.ytd_invoice_count || 0} YTD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ranking + cadence row ─────────────────────────────────── */}
      {data && (
        <div className="sa-section-row">
          <div
            className={`sa-rank-card ${ranking.branch_list?.length ? "sa-rank-card--clickable" : ""}`}
            onClick={() => ranking.branch_list?.length && setRankModal({ open: true, scope: "branch" })}
            title={ranking.branch_list?.length ? "Click to see the full branch ranking" : ""}
          >
            <div className="sa-rank-icon"><TrophyOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Branch Rank (YTD)</div>
              <div className="sa-rank-value">
                {ranking.rank_in_branch
                  ? <><span className="sa-rank-num">#{ranking.rank_in_branch}</span>
                      <span className="sa-rank-total">of {ranking.total_in_branch}</span></>
                  : "—"}
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${ranking.kingdom_list?.length ? "sa-rank-card--clickable" : ""}`}
            onClick={() => ranking.kingdom_list?.length && setRankModal({ open: true, scope: "kingdom" })}
            title={ranking.kingdom_list?.length ? "Click to see the full kingdom ranking" : ""}
          >
            <div className="sa-rank-icon sa-rank-icon--channel"><RiseOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Kingdom Rank (YTD)</div>
              <div className="sa-rank-value">
                {ranking.rank_in_kingdom
                  ? <><span className="sa-rank-num">#{ranking.rank_in_kingdom}</span>
                      <span className="sa-rank-total">of {ranking.total_in_kingdom}</span></>
                  : "—"}
              </div>
            </div>
          </div>

          <div className="sa-rank-card">
            <div className="sa-rank-icon sa-rank-icon--cadence"><ClockCircleOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Last Invoice</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num" style={{ fontSize: 16 }}>
                  {cadence.last_invoice_date || "—"}
                </span>
                {cadence.days_since_last_invoice != null && (
                  <span className="sa-rank-total">{cadence.days_since_last_invoice}d ago</span>
                )}
              </div>
            </div>
          </div>

          <div className="sa-rank-card">
            <div className="sa-rank-icon sa-rank-icon--cadence"><SwapOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Avg Invoices / Day</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{cadence.avg_invoices_per_day ?? "—"}</span>
                <span className="sa-rank-total">{cadence.working_days_ytd || 0} working days</span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${data.assigned_customer_count ? "sa-rank-card--clickable" : ""}`}
            onClick={() => data.assigned_customer_count && setAssignedCustModal(true)}
            title={data.assigned_customer_count ? "Click to see active vs non-active assigned customers" : ""}
          >
            <div className="sa-rank-icon sa-rank-icon--invoice"><TeamOutlined /></div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Assigned Customers</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num">{data.assigned_customer_count}</span>
                {(data.assigned_active_count != null || data.assigned_inactive_count != null) && (
                  <span className="sa-rank-total">
                    {data.assigned_active_count || 0} active · {data.assigned_inactive_count || 0} inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${data.payment_pending_count ? "sa-rank-card--clickable" : ""}`}
            onClick={() => data.payment_pending_count && setPaymentPendingModal(true)}
            title={data.payment_pending_count ? "Click to see the payment-pending breakdown" : ""}
          >
            <div className="sa-rank-icon" style={{ background: "#F59E0B18", color: "#F59E0B" }}>
              <WalletOutlined />
            </div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Payment Pending</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num" style={{ color: "#F59E0B" }}>
                  {fmtNum(data.payment_pending_total)}
                </span>
                <span className="sa-rank-total">
                  {data.payment_pending_count || 0} customer{data.payment_pending_count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`sa-rank-card ${allProductsMode ? "sa-rank-card--clickable" : ""}`}
            onClick={() => allProductsMode && openByProduct("return_rate_percent")}
            title={allProductsMode ? "Click to see per-product breakdown" : ""}
          >
            <div className="sa-rank-icon" style={{ background: `${returnColor}18`, color: returnColor }}>
              <SwapOutlined />
            </div>
            <div className="sa-rank-body">
              <div className="sa-rank-label">Return Rate</div>
              <div className="sa-rank-value">
                <span className="sa-rank-num" style={{ color: returnColor }}>
                  {quality.return_rate_percent != null ? `${quality.return_rate_percent}%` : "—"}
                </span>
                {quality.return_amount > 0 && (
                  <span className="sa-rank-total" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {fmtNum(quality.return_amount)}
                    {isValueMode ? <RiyalIcon width={10} height={10} color="currentColor" /> : ` ${unitType}`}
                    {" returned"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading charts skeleton ──────────────────────────────── */}
      {loading && !data && selectedSalesman && (
        <div className="row">
          {[1, 2].map((i) => (
            <div key={i} className="graph"><Skeleton active paragraph={{ rows: 10 }} /></div>
          ))}
        </div>
      )}

      {/* ── Monthly Sales + Channel Mix ─────────────────────────── */}
      {data && (
        <div className="row">
          <div className="graph">
            <AreaChart
              graphTitle={`Monthly Sales — ${data.year}`}
              labels={data.monthly_sales_current_year?.months || []}
              colourTheme={[CHART_COLORS[0]]}
              units={[chartUnit]}
              series={[{ name: "Sales", data: data.monthly_sales_current_year?.sales || [] }]}
            />
          </div>
          {data.channel_mix?.length > 0 && (
            <div className="graph">
              <DonutChart
                graphTitle="Channel Mix (YTD)"
                labels={data.channel_mix.map((c) => c.channel)}
                colourTheme={CHART_COLORS.slice(0, data.channel_mix.length)}
                series={data.channel_mix.map((c) => c.sales)}
                seriesValues={data.channel_mix.map((c) => c.sales)}
                units={[chartUnit]}
              />
            </div>
          )}
        </div>
      )}

      {/* ── YoY Bar ─────────────────────────────────────────────── */}
      {data && (
        <div className="row">
          <div className="graph">
            <BarChart
              graphTitle="Year-over-Year Monthly Comparison"
              labels={data.graph?.months || []}
              colourTheme={[CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[3]]}
              units={[chartUnit, chartUnit, chartUnit, chartUnit]}
              series={[
                { name: "2023", data: data.graph?.["2023"] || [] },
                { name: "2024", data: data.graph?.["2024"] || [] },
                { name: "2025", data: data.graph?.["2025"] || [] },
                { name: "2026", data: data.graph?.["2026"] || [] },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Top Products + Gross vs Net ─────────────────────────── */}
      {data && (
        <div className="row">
          {data.top_products?.length > 0 && (
            <div className="graph">
              <BarChart
                graphTitle={data.top_type === "sku" ? "Top 10 SKUs (YTD)" : "Top 10 Products (YTD)"}
                labels={data.top_products.map((p) => p.product_name)}
                colourTheme={[CHART_COLORS[2]]}
                units={[chartUnit]}
                series={[{ name: "Sales", data: data.top_products.map((p) => p.sales) }]}
              />
            </div>
          )}
          {quality.total_gross > 0 && (
            <div className="graph">
              <BarChart
                graphTitle="Gross vs Net (All-Time)"
                labels={["Total Sales"]}
                colourTheme={[CHART_COLORS[0], CHART_COLORS[4]]}
                units={[chartUnit, chartUnit]}
                series={[
                  { name: "Gross", data: [quality.total_gross] },
                  { name: "Net",   data: [quality.total_net] },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Top Customers table ─────────────────────────────────── */}
      {data?.top_customers?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="sa-section-title">Top 10 Customers (YTD)</div>
          <Table
            size="small"
            bordered
            rowKey={(r) => `${r.customer_code}-${r.branch_code}`}
            columns={topCustomerColumns}
            dataSource={data.top_customers}
            pagination={false}
          />
        </div>
      )}

      {/* ── Selected-month invoice list (lazy-fetched) ─────────── */}
      {data && (
        <div style={{ marginTop: 20 }}>
          <div className="sa-section-title">
            Invoices — {data.month_yyyymm}
            <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8, fontWeight: 400 }}>
              {invoicesLoading ? "(loading…)" : `(${invoices.length} line items)`}
            </span>
          </div>
          <Table
            size="small"
            bordered
            loading={invoicesLoading}
            rowKey={(_, i) => i}
            columns={invoiceColumns}
            dataSource={invoices}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 50, showSizeChanger: false, size: "small" }}
          />
        </div>
      )}

      {/* ── Ranking list modal ───────────────────────────────────── */}
      <SalesmanRankingModal
        state={rankModal}
        onClose={() => setRankModal({ open: false, scope: null })}
        ranking={ranking}
        selectedCode={selectedSalesman?.code}
        unitType={unitType}
        isValueMode={isValueMode}
      />

      {/* ── Active vs Inactive customers modal ─────────────────── */}
      <ActiveCustomersModal
        open={activeCustModal}
        onClose={() => setActiveCustModal(false)}
        data={data}
        unitType={unitType}
        isValueMode={isValueMode}
        onPickCustomer={openCustomerInNewTab}
      />

      {/* ── Assigned customers modal ───────────────────────────── */}
      <AssignedCustomersModal
        open={assignedCustModal}
        onClose={() => setAssignedCustModal(false)}
        data={data}
        unitType={unitType}
        isValueMode={isValueMode}
        onPickCustomer={openCustomerInNewTab}
      />

      {/* ── Payment pending breakdown modal ───────────────────── */}
      <PaymentPendingModal
        open={paymentPendingModal}
        onClose={() => setPaymentPendingModal(false)}
        data={data}
        onPickCustomer={openCustomerInNewTab}
      />

      {/* ── Per-product KPI breakdown modal (All Products mode) ── */}
      <ByProductModal
        state={byProductModal}
        onClose={() => setByProductModal({ open: false, highlight: null })}
        rows={byProductRows}
        loading={byProductLoading}
        data={data}
        unitType={unitType}
        isValueMode={isValueMode}
      />
    </div>
  );
};

const ByProductModal = ({ state, onClose, rows, loading, data, unitType, isValueMode }) => {
  const highlight = state.highlight;
  const unitLabel = isValueMode
    ? <RiyalIcon width={11} height={11} color="currentColor" />
    : (unitType || "ctn").toUpperCase();

  const numHead = (label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
      {label} ({unitLabel})
    </span>
  );

  const pctCell = (v) => {
    if (v == null || !isFinite(v)) return <span style={{ color: "#94A3B8" }}>—</span>;
    const color = v >= 0.9 ? "#10B981" : "#EF4444";
    return <b style={{ color }}>{`${(v * 100).toFixed(1)}%`}</b>;
  };

  const cellCls = (key) => (highlight === key ? "sa-bp-cell--highlight" : "");

  const columns = [
    { title: "#", width: 44, align: "center",
      render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span> },
    { title: "Product", dataIndex: "product_name",
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.product_code}</div>
        </div>
      ) },
    { title: numHead("Target"), dataIndex: "month_target", align: "right", width: 130,
      onCell: () => ({ className: cellCls("month_target") }),
      sorter: (a, b) => (a.month_target || 0) - (b.month_target || 0),
      render: (v) => fmtNum(v) },
    { title: numHead("MTD"), dataIndex: "sales_mtd", align: "right", width: 130,
      defaultSortOrder: highlight === "sales_mtd" ? "descend" : undefined,
      onCell: () => ({ className: cellCls("sales_mtd") }),
      sorter: (a, b) => (a.sales_mtd || 0) - (b.sales_mtd || 0),
      render: (v) => <b>{fmtNum(v)}</b> },
    { title: "Achievement", dataIndex: "achievement_pct", align: "right", width: 130,
      onCell: () => ({ className: cellCls("achievement_pct") }),
      sorter: (a, b) => (a.achievement_pct || 0) - (b.achievement_pct || 0),
      render: pctCell },
    { title: "Daily Ach", dataIndex: "daily_ach_pct", align: "right", width: 120,
      onCell: () => ({ className: cellCls("daily_ach_pct") }),
      sorter: (a, b) => (a.daily_ach_pct || 0) - (b.daily_ach_pct || 0),
      render: pctCell },
    { title: numHead("YTD"), dataIndex: "sales_ytd", align: "right", width: 140,
      sorter: (a, b) => (a.sales_ytd || 0) - (b.sales_ytd || 0),
      render: (v) => fmtNum(v) },
    { title: "Return %", dataIndex: "return_rate_percent", align: "right", width: 110,
      onCell: () => ({ className: cellCls("return_rate_percent") }),
      sorter: (a, b) => (a.return_rate_percent || 0) - (b.return_rate_percent || 0),
      render: (v) => {
        if (v == null) return <span style={{ color: "#94A3B8" }}>—</span>;
        const color = v > 10 ? "#EF4444" : v > 5 ? "#F59E0B" : "#10B981";
        return <b style={{ color }}>{`${v}%`}</b>;
      } },
  ];

  const list = rows || [];

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      footer={null}
      width={1100}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            KPI Breakdown by Product — {data?.salesman_name || ""}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            {data?.month_yyyymm ? `Month ${data.month_yyyymm} · ` : ""}
            {list.length} product{list.length !== 1 ? "s" : ""} with activity or target
          </div>
        </div>
      }
      destroyOnClose
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : list.length === 0 ? (
        <Empty description="No per-product data for this scope" />
      ) : (
        <Table
          size="small"
          bordered
          rowKey={(r) => r.product_code}
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 15, size: "small", showSizeChanger: false }}
          scroll={{ x: "max-content", y: 460 }}
        />
      )}
    </Modal>
  );
};

const PaymentPendingModal = ({ open, onClose, data, onPickCustomer }) => {
  const list = data?.payment_pending_list || [];
  const total = data?.payment_pending_total || 0;

  const columns = [
    { title: "#", width: 50, align: "center",
      render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span> },
    { title: "Customer", dataIndex: "customer_name",
      sorter: (a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""),
      render: (v, r) => (
        <div
          className="report-clickable-name"
          title="Open Customer Analysis in new tab"
          onClick={() => onPickCustomer(r)}
        >
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
        </div>
      ) },
    { title: "Channel", dataIndex: "channel", width: 100,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span> },
    { title: "Last Payment", dataIndex: "last_payment_date", width: 130,
      render: (v) => v
        ? <span style={{ fontSize: 12 }}>{new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        : <span style={{ color: "#94A3B8" }}>-</span> },
    { title: "Balance", dataIndex: "balance", align: "right", width: 140,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
      render: (v) => <b style={{ color: "#F59E0B" }}>{fmtNum(v)}</b> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Payment Pending — {data?.salesman_name || ""}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            Total <b style={{ color: "#F59E0B" }}>{fmtNum(total)}</b> across {list.length} customer{list.length !== 1 ? "s" : ""}
          </div>
        </div>
      }
      destroyOnClose
    >
      {list.length === 0 ? (
        <Empty description="No pending balances among assigned customers" />
      ) : (
        <Table
          size="small"
          bordered
          rowKey={(r) => r.customer_code}
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 15, size: "small", showSizeChanger: false }}
          scroll={{ y: 420 }}
        />
      )}
    </Modal>
  );
};

const AssignedCustomersModal = ({ open, onClose, data, unitType, isValueMode, onPickCustomer }) => {
  const active   = data?.assigned_active_list   || [];
  const inactive = data?.assigned_inactive_list || [];
  const total    = active.length + inactive.length;

  const ytdTitle = isValueMode
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>YTD Sales (<RiyalIcon width={11} height={11} color="#FFFFFF" />)</span>
    : `YTD Sales (${(unitType || "ctn").toUpperCase()})`;

  const nameCol = {
    title: "Customer", dataIndex: "customer_name",
    sorter: (a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""),
    render: (v, r) => (
      <div
        className="report-clickable-name"
        title="Open Customer Analysis in new tab"
        onClick={() => onPickCustomer(r)}
      >
        <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
        <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
      </div>
    ),
  };
  const channelCol = {
    title: "Channel", dataIndex: "channel", width: 100,
    render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span>,
  };
  const branchCol = {
    title: "Branch", dataIndex: "branch_name", width: 160,
    render: (v) => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: "#94A3B8" }}>-</span>,
  };
  const lastInvCol = {
    title: "Last Invoice", dataIndex: "last_invoice", width: 120,
    render: (v) => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: "#94A3B8" }}>-</span>,
  };
  const idxCol = {
    title: "#", width: 50, align: "center",
    render: (_, __, i) => <span style={{ color: "#94A3B8" }}>{i + 1}</span>,
  };

  const activeCols = [
    idxCol, nameCol, channelCol, branchCol, lastInvCol,
    { title: ytdTitle, dataIndex: "sales_ytd", align: "right", width: 140,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.sales_ytd || 0) - (b.sales_ytd || 0),
      render: (v) => <b style={{ color: "#10B981" }}>{fmtNum(v)}</b> },
  ];
  const inactiveCols = [idxCol, nameCol, channelCol, branchCol];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Assigned Customers — {data?.salesman_name || ""}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            {total} customer{total !== 1 ? "s" : ""} on the RPS route plan · Active = bought from this salesman YTD
          </div>
        </div>
      }
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <div className="sa-section-title" style={{ marginBottom: 8 }}>
          Active ({active.length})
          <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8, fontWeight: 400 }}>
            assigned customers with sales YTD
          </span>
        </div>
        {active.length === 0 ? (
          <Empty description="No assigned customers have bought from this salesman this year" />
        ) : (
          <Table
            size="small"
            bordered
            rowKey={(r) => `aa-${r.customer_code}`}
            columns={activeCols}
            dataSource={active}
            pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
            scroll={{ y: 320 }}
          />
        )}
      </div>

      <div>
        <div className="sa-section-title" style={{ marginBottom: 8 }}>
          Non-Active ({inactive.length})
          <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8, fontWeight: 400 }}>
            assigned but no sale from this salesman YTD
          </span>
        </div>
        {inactive.length === 0 ? (
          <Empty description="Every assigned customer bought this year — full coverage" />
        ) : (
          <Table
            size="small"
            bordered
            rowKey={(r) => `ai-${r.customer_code}`}
            columns={inactiveCols}
            dataSource={inactive}
            pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
            scroll={{ y: 320 }}
          />
        )}
      </div>
    </Modal>
  );
};

const ActiveCustomersModal = ({ open, onClose, data, unitType, isValueMode, onPickCustomer }) => {
  const mtdTitle = isValueMode
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>MTD Sales (<RiyalIcon width={11} height={11} color="#FFFFFF" />)</span>
    : `MTD Sales (${(unitType || "ctn").toUpperCase()})`;
  const ytdTitle = isValueMode
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>YTD Sales (<RiyalIcon width={11} height={11} color="#FFFFFF" />)</span>
    : `YTD Sales (${(unitType || "ctn").toUpperCase()})`;
  const active = data?.active_customers_list || [];
  const inactive = data?.inactive_customers_list || [];

  const nameCol = {
    title: "Customer", dataIndex: "customer_name",
    render: (v, r) => (
      <div
        className="report-clickable-name"
        title="Open Customer Analysis in new tab"
        onClick={() => onPickCustomer(r)}
      >
        <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
        <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
      </div>
    ),
  };
  const channelCol = {
    title: "Channel", dataIndex: "channel", width: 100,
    render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span>,
  };
  const lastInvCol = {
    title: "Last Invoice", dataIndex: "last_invoice", width: 130,
    render: (v) => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: "#94A3B8" }}>-</span>,
  };

  const activeCols = [
    nameCol, channelCol, lastInvCol,
    { title: mtdTitle, dataIndex: "sales_mtd", align: "right", width: 140,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.sales_mtd || 0) - (b.sales_mtd || 0),
      render: (v) => <b style={{ color: "#10B981" }}>{fmtNum(v)}</b> },
  ];
  const inactiveCols = [
    nameCol, channelCol, lastInvCol,
    { title: ytdTitle, dataIndex: "sales_ytd", align: "right", width: 140,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.sales_ytd || 0) - (b.sales_ytd || 0),
      render: (v) => <b style={{ color: "#F59E0B" }}>{fmtNum(v)}</b> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Active vs Inactive Customers — {data?.month_yyyymm || ""}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            Active = bought this month · Inactive = bought YTD but dropped off this month
          </div>
        </div>
      }
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <div className="sa-section-title" style={{ marginBottom: 8 }}>
          Active ({active.length})
          <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8, fontWeight: 400 }}>
            customers with sales in {data?.month_yyyymm || "the selected month"}
          </span>
        </div>
        {active.length === 0 ? (
          <Empty description="No active customers this month" />
        ) : (
          <Table
            size="small"
            bordered
            rowKey={(r) => `a-${r.customer_code}`}
            columns={activeCols}
            dataSource={active}
            pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
            scroll={{ y: 320 }}
          />
        )}
      </div>

      <div>
        <div className="sa-section-title" style={{ marginBottom: 8 }}>
          Inactive ({inactive.length})
          <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8, fontWeight: 400 }}>
            bought YTD but not this month
          </span>
        </div>
        {inactive.length === 0 ? (
          <Empty description="No inactive customers — everyone YTD also bought this month" />
        ) : (
          <Table
            size="small"
            bordered
            rowKey={(r) => `i-${r.customer_code}`}
            columns={inactiveCols}
            dataSource={inactive}
            pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
            scroll={{ y: 320 }}
          />
        )}
      </div>
    </Modal>
  );
};

const SalesmanRankingModal = ({ state, onClose, ranking, selectedCode, unitType, isValueMode }) => {
  const isBranch = state.scope === "branch";
  const rows = isBranch ? ranking?.branch_list : ranking?.kingdom_list;
  const title = isBranch ? "Branch Ranking (YTD)" : "Kingdom Ranking (YTD)";
  const myRank = isBranch ? ranking?.rank_in_branch : ranking?.rank_in_kingdom;
  const myTotal = isBranch ? ranking?.total_in_branch : ranking?.total_in_kingdom;

  const columns = [
    { title: "#", dataIndex: "rank", width: 70, align: "center",
      render: (v, r) => (
        <span style={{ fontWeight: r.salesman_code === selectedCode ? 700 : 400 }}>
          {v <= 3 ? <TrophyOutlined style={{ color: v === 1 ? "#F59E0B" : v === 2 ? "#94A3B8" : "#B45309", marginRight: 4 }} /> : null}
          {v}
        </span>
      ) },
    { title: "Salesman", dataIndex: "salesman_name",
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v || "—"}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.salesman_code}</div>
        </div>
      ) },
    ...(!isBranch ? [{
      title: "Branch", dataIndex: "branch_name", width: 160,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span>,
    }] : []),
    { title: isValueMode
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>YTD (<RiyalIcon width={11} height={11} color="#FFFFFF" />)</span>
        : `YTD (${(unitType || "ctn").toUpperCase()})`,
      dataIndex: "ytd_total", align: "right", width: 150,
      render: (v) => <b>{fmtNum(v)}</b> },
  ];

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      footer={null}
      width={isBranch ? 720 : 820}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          {myRank && (
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
              Selected salesman is ranked <b>#{myRank}</b> of {myTotal}
            </div>
          )}
        </div>
      }
      destroyOnClose
    >
      <Table
        size="small"
        bordered
        rowKey={(r) => r.salesman_code}
        columns={columns}
        dataSource={rows || []}
        pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
        rowClassName={(r) => r.salesman_code === selectedCode ? "ranking-row-selected" : ""}
        scroll={{ y: "55vh" }}
      />
    </Modal>
  );
};

export default SalesmanAnalysis;
