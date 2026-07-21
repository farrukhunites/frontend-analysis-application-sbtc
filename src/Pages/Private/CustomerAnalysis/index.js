import {
  AimOutlined,
  SlidersOutlined,
  LineChartOutlined,
  CalendarOutlined,
  StopOutlined,
  UserOutlined,
  DollarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Collapse, Empty, message, Modal, Segmented, Select, Skeleton, Table, Tag } from "antd";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import LineChart from "../../../Components/Charts/LineChart";
import BarChart from "../../../Components/Charts/BarChart";
import AreaChart from "../../../Components/Charts/AreaChart";
import DonutChart from "../../../Components/Charts/DonutChart";
import RiyalIcon from "../../../Utils/RiyalIcon";
import { getAllBranches } from "../../../API/Branches";
import {
  getCustomerInsight,
  getCustomersByBranchByCHannel,
  getCustomerReturnBreakdown,
} from "../../../API/Customer";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllChannels } from "../../../API/Channels";
import { getAllProducts } from "../../../API/Products";
import { CHART_COLORS } from "../../../Components/Charts/chartConfig";

const { Option } = Select;

const CustomerAnalysis = () => {
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  const chartUnit = isValueMode ? "SAR" : unitType;

  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState();
  const [selectedChannel, setSelectedChannel] = useState();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [channels, setChannels] = useState([]);
  const [rankModal, setRankModal] = useState({ open: false, scope: null });
  const [returnModal, setReturnModal] = useState({ open: false, scope: "all", loading: false, results: [], totalQty: 0 });
  const [locationModal, setLocationModal] = useState(false);
  const [paymentHealthModal, setPaymentHealthModal] = useState(false);

  const [searchParams] = useSearchParams();
  const locationState = useLocation().state;
  const preselect = locationState || (
    searchParams.get("customer_code") ? {
      customer_code: searchParams.get("customer_code"),
      branch_code:   searchParams.get("branch_code"),
      channel_code:  searchParams.get("channel_code"),
      product_code:  searchParams.get("product_code"),
    } : null
  );
  const hasAutoSelected = useRef(false);

  // Auto-select branch from navigation state (e.g. from Potential Customers click)
  useEffect(() => {
    if (!hasAutoSelected.current && preselect?.branch_code && branches.length > 0 && !selectedBranch) {
      const branch = branches.find((b) => b.code === preselect.branch_code);
      if (branch) setSelectedBranch(branch);
    }
  }, [branches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select channel — otlcd may match channel.name rather than channel.code
  useEffect(() => {
    if (!hasAutoSelected.current && preselect?.channel_code && channels.length > 0 && !selectedChannel) {
      const channel =
        channels.find((c) => c.code === preselect.channel_code) ||
        channels.find((c) => c.name === preselect.channel_code);
      if (channel) setSelectedChannel(channel);
    }
  }, [channels]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select customer once the customer list is populated
  useEffect(() => {
    if (!hasAutoSelected.current && preselect?.customer_code && customers.length > 0 && !selectedCustomer) {
      hasAutoSelected.current = true;
      handleCustomerChange(preselect.customer_code);
    }
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select product from URL param (new-tab navigation)
  useEffect(() => {
    if (!preselect?.product_code) return;
    getAllProducts().then((res) => {
      const products = res?.results || [];
      const match = products.find((p) => p.code === preselect.product_code);
      if (match) setSelectedProduct(match);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch branches + channels once on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res = await getAllBranches();
        if (res?.results) setBranches(res.results);
        else message.error("Failed to fetch branches: " + (res?.message || "Unknown error"));
      } catch (error) {
        message.error("Error fetching branches: " + error?.message);
      }
      setLoading(false);
    };

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const res = await getAllChannels();
        if (res?.results) setChannels(res.results);
        else message.error("Failed to fetch channels: " + (res?.message || "Unknown error"));
      } catch (error) {
        message.error("Error fetching channels: " + error?.message);
      }
      setLoading(false);
    };

    fetchBranches();
    fetchChannels();
  }, []);

  // Fetch customer insight whenever selection or unit/value type changes
  useEffect(() => {
    if (!selectedCustomer || !selectedBranch || !selectedProduct || !valueType || !effectiveUnitType) return;

    const fetchCustomerInsight = async () => {
      setLoading(true);
      try {
        const res = await getCustomerInsight({
          customer_code: selectedCustomer.code,
          branch_code: selectedBranch.code,
          sales_type: valueType,
          unit: effectiveUnitType,
          product_code: selectedProduct.code,
        });
        if (res?.success === false) {
          message.warning("No data found for this customer");
          setCustomerData(null);
        } else {
          setCustomerData(res);
        }
      } catch {
        message.error("Failed to fetch customer insight");
        setCustomerData(null);
      }
      setLoading(false);
    };

    fetchCustomerInsight();
  }, [selectedCustomer, selectedBranch, valueType, effectiveUnitType, selectedProduct]);

  // Fetch customer list when branch is selected (optionally filtered by channel)
  useEffect(() => {
    if (!selectedBranch) {
      setCustomers([]);
      setSelectedCustomer(null);
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await getCustomersByBranchByCHannel(selectedBranch?.code, selectedChannel?.name);
        if (res?.length > 0) {
          setCustomers(res);
        } else {
          setCustomers([]);
          message.warning(
            selectedChannel
              ? "No customers found for this branch + channel"
              : "No customers found for this branch"
          );
        }
      } catch {
        message.error("Failed to fetch customers");
      }
      setLoading(false);
    };

    fetchCustomers();
  }, [selectedBranch, selectedChannel]);

  const handleBranchChange = (code) => {
    const branch = branches.find((b) => b.code === code);
    setSelectedBranch(branch);
    setSelectedCustomer(null);
    setCustomers([]);
  };

  const handleChannelChange = (code) => {
    const channel = channels.find((c) => c.code === code);
    setSelectedChannel(channel);
    setSelectedCustomer(null);
    setCustomers([]);
  };

  const handleCustomerChange = async (code) => {
    const customer = customers.find((c) => c.code === code) || null;
    setSelectedCustomer(customer);
    if (!customer || !selectedBranch) return;

    setLoading(true);
    try {
      const res = await getCustomerInsight({
        customer_code: customer.code,
        branch_code: selectedBranch.code,
        sales_type: valueType,
        unit: effectiveUnitType,
        product_code: selectedProduct?.code,
      });
      if (res?.success === false) {
        message.warning("No data found for this customer");
        setCustomerData(null);
      } else {
        setCustomerData(res);
      }
    } catch {
      message.error("Failed to fetch customer insight");
      setCustomerData(null);
    }
    setLoading(false);
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const customer = {
    name: customerData?.customer_name || "-",
    code: customerData?.customer_code || "-",
    branch: customerData?.branch || selectedBranch?.name || "-",
    channel: customerData?.channel || "-",
    totalSales: customerData?.total_sales_forever || 0,
    ytdSales: customerData?.sales_ytd || 0,
    mtdSales: customerData?.sales_mtd || 0,
    dryMonths: customerData?.dry_months ?? 0,
    salesman:            customerData?.salesman || "-",
    salesmanCd:          customerData?.salesman_cd || null,
    branchContributionMtd:  customerData?.branch_contribution_mtd_percent ?? null,
    branchContributionYtd:  customerData?.branch_contribution_ytd_percent ?? null,
    channelContributionMtd: customerData?.channel_contribution_mtd_percent ?? null,
    channelContributionYtd: customerData?.channel_contribution_ytd_percent ?? null,
    paymentPending:           customerData?.payment_pending ?? 0,
    paymentPendingOverdue:    customerData?.payment_pending_overdue ?? 0,
    paymentPendingNotYetDue:  customerData?.payment_pending_not_yet_due ?? 0,
    lastPaymentDate:  customerData?.last_payment_date || null,
    assignedSalesman:    customerData?.assigned_salesman || "-",
    assignedSalesmanCd:  customerData?.assigned_salesman_cd || null,
    branchCode:          customerData?.branch_code || selectedBranch?.code || null,
    latitude:            customerData?.latitude ?? null,
    longitude:           customerData?.longitude ?? null,
  };

  const openSalesmanAnalysis = (salesmanCode) => {
    if (!salesmanCode) return;
    const params = new URLSearchParams();
    params.set("salesman_code", salesmanCode);
    if (customer.branchCode) params.set("branch_code", customer.branchCode);
    if (selectedProduct?.code) params.set("product_code", selectedProduct.code);
    window.open(`/salesman-analysis?${params.toString()}`, "_blank", "noopener");
  };

  const salesmanCell = (name, code) => {
    if (!code || name === "-") return name;
    return (
      <span
        className="report-clickable-name"
        onClick={() => openSalesmanAnalysis(code)}
        title="Open Salesman Analysis in new tab"
        style={{ display: "inline-block" }}
      >
        {name}
      </span>
    );
  };

  const ranking = customerData?.ranking || {};
  const cadence = customerData?.purchase_cadence || {};
  const orderQuality = customerData?.order_quality || {};
  const paymentHealth = customerData?.payment_health || null;
  const phScore = paymentHealth?.score ?? null;
  const phMax = paymentHealth?.max_score ?? 6;
  const phSalesUnidentified = paymentHealth?.sales_category === "Unidentified";
  const phRatio = phScore == null || !phMax ? null : phScore / phMax;
  const phColor =
    phRatio == null ? "#94A3B8"
    : phRatio >= 0.75 ? "#16A34A"
    : phRatio >= 0.5  ? "#F59E0B"
    : phRatio >= 0.25 ? "#EA580C"
    :                   "#DC2626";
  const skuMix = customerData?.sku_mix || [];
  const schemeHistory = customerData?.scheme_history || [];

  const tabs = [
    { title: "Customer Name",        value: customer.name,                                           icon: <UserOutlined /> },
    { title: "Customer Code",        value: customer.code,                                           icon: <UserOutlined /> },
    { title: "Branch",               value: customer.branch,                                         icon: <AimOutlined /> },
    { title: "Channel",              value: customer.channel,                                        icon: <SlidersOutlined /> },
    { title: "Total Sales (2023+)",  value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{customer.totalSales.toLocaleString()}{!isValueMode && " " + unitType}</span>,  icon: <DollarOutlined /> },
    { title: "Sales YTD",            value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{customer.ytdSales.toLocaleString()}{!isValueMode && " " + unitType}</span>,    icon: <LineChartOutlined /> },
    { title: "Sales MTD",            value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{isValueMode && <RiyalIcon width={14} height={14} />}{customer.mtdSales.toLocaleString()}{!isValueMode && " " + unitType}</span>,    icon: <CalendarOutlined /> },
    { title: "Dry Months",           value: customer.dryMonths,                                     icon: <StopOutlined /> },
    { title: "Salesman (Last Sale)",  value: salesmanCell(customer.salesman, customer.salesmanCd),          icon: <UserOutlined />,
      onClick: customer.salesmanCd ? () => openSalesmanAnalysis(customer.salesmanCd) : undefined,
      tooltip: customer.salesmanCd ? "Open Salesman Analysis in new tab" : undefined },
    { title: "Assigned Salesman",    value: salesmanCell(customer.assignedSalesman, customer.assignedSalesmanCd), icon: <UserOutlined />,
      onClick: customer.assignedSalesmanCd ? () => openSalesmanAnalysis(customer.assignedSalesmanCd) : undefined,
      tooltip: customer.assignedSalesmanCd ? "Open Salesman Analysis in new tab" : undefined },
    {
      title: "Branch Contribution",
      value: <ContributionValue mtd={customer.branchContributionMtd} ytd={customer.branchContributionYtd} />,
      icon: <LineChartOutlined />,
    },
    {
      title: "Channel Contribution",
      value: <ContributionValue mtd={customer.channelContributionMtd} ytd={customer.channelContributionYtd} />,
      icon: <SlidersOutlined />,
    },
    {
      title: "Total Due",
      value: (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <RiyalIcon /> {customer.paymentPending?.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
            Overdue <b style={{ color: "#DC2626" }}>{customer.paymentPendingOverdue?.toLocaleString()}</b>
            {"  ·  "}
            Not yet due <b style={{ color: "#0F766E" }}>{customer.paymentPendingNotYetDue?.toLocaleString()}</b>
          </span>
        </div>
      ),
      icon: <DollarOutlined />,
    },
    {
      title: "Payment Health",
      value: phScore != null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, color: phColor, fontWeight: 700 }}>
            {phScore}
            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>/ {phMax}</span>
          </span>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
            {phSalesUnidentified ? (
              <>Risk only <b style={{ color: "#0F172A" }}>{paymentHealth.risk_category}</b></>
            ) : (
              <>
                Sales <b style={{ color: "#0F172A" }}>{paymentHealth.sales_category}</b>
                {"  ·  "}
                Risk <b style={{ color: "#0F172A" }}>{paymentHealth.risk_category}</b>
              </>
            )}
          </span>
        </div>
      ) : "—",
      icon: <SafetyCertificateOutlined />,
      onClick: paymentHealth ? () => setPaymentHealthModal(true) : undefined,
      tooltip: paymentHealth ? "Click to see the score breakdown" : undefined,
    },
    {
      title: "Last Payment Date",
      value: customer.lastPaymentDate
        ? new Date(customer.lastPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : "-",
      icon: <CalendarOutlined />,
    },
  ];

  const salesOrders = customerData?.invoices || [];

  const salesOrderColumns = [
    { title: "Customer Code",      dataIndex: "cust_cd",       key: "cust_cd" },
    { title: "Customer Name",      dataIndex: "cust_nm",       key: "cust_nm" },
    { title: "Channel",            dataIndex: "otlcd",         key: "otlcd" },
    { title: "Group Code",         dataIndex: "cusgrcd",       key: "cusgrcd" },
    { title: "Group Name",         dataIndex: "cusgrcd_nm",    key: "cusgrcd_nm" },
    { title: "Salesman",           dataIndex: "salesman_nm",   key: "salesman_nm",
      render: (v, r) => v
        ? (r.salesman_cd
            ? <span className="report-clickable-name" onClick={() => openSalesmanAnalysis(r.salesman_cd)} title="Open Salesman Analysis in new tab">{v}</span>
            : v)
        : "-" },
    { title: "Driver",             dataIndex: "driver_nm",     key: "driver_nm" },
    { title: "Order Type",         dataIndex: "tp",            key: "tp" },
    { title: "SO Number",          dataIndex: "so_cd",         key: "so_cd" },
    { title: "SO Date",            dataIndex: "so_dt",         key: "so_dt" },
    { title: "Invoice Number",     dataIndex: "inv_no",        key: "inv_no" },
    { title: "Invoice Date",       dataIndex: "inv_dt",        key: "inv_dt" },
    { title: "Item Code",          dataIndex: "item_cd",       key: "item_cd" },
    { title: "Item Name",          dataIndex: "item_nm",       key: "item_nm" },
    { title: "Qty Ordered",        dataIndex: "qtyorder",      key: "qtyorder" },
    { title: "Qty Converted",      dataIndex: "qtyconv",       key: "qtyconv" },
    { title: "Unit Price",         dataIndex: "unitprice",     key: "unitprice" },
    { title: "Discount",           dataIndex: "amtdisc",       key: "amtdisc" },
    { title: "Total Qty",          dataIndex: "totqty",        key: "totqty" },
    { title: "Product Name",       dataIndex: "prod_nm",       key: "prod_nm" },
    { title: "Brand",              dataIndex: "branded_nm",    key: "branded_nm" },
    { title: "Size",               dataIndex: "size",          key: "size" },
    { title: "Sales Point",        dataIndex: "salespoint_nm", key: "salespoint_nm" },
    { title: "Bin Code",           dataIndex: "bin_cd",        key: "bin_cd" },
  ];

  // Return rate severity colour
  const rateColour = (rate) =>
    rate > 10 ? "#EF4444" : rate > 5 ? "#F59E0B" : "#10B981";
  const returnRateColor    = rateColour(orderQuality.return_rate_percent);
  const returnRateColorYtd = rateColour(orderQuality.return_rate_ytd_percent);

  const openReturnBreakdown = async (scope) => {
    if (!selectedCustomer || !selectedBranch) return;
    setReturnModal({ open: true, scope, loading: true, results: [], totalQty: 0 });
    const res = await getCustomerReturnBreakdown({
      customer_code: selectedCustomer.code,
      branch_code:   selectedBranch.code,
      scope,
      unit_type:     effectiveUnitType,
      product_code:  selectedProduct?.code,
    });
    if (res?.error) {
      message.error("Failed to load return breakdown");
      setReturnModal((p) => ({ ...p, loading: false }));
    } else {
      setReturnModal((p) => ({
        ...p,
        loading: false,
        results: res.results || [],
        totalQty: res.total_qty || 0,
      }));
    }
  };

  return (
    <div className="customer-analysis">

      {/* ── Selectors ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "16px" }}>
        <Select
          loading={loading}
          showSearch
          value={selectedBranch?.code || null}
          onChange={handleBranchChange}
          style={{ flex: 1 }}
          placeholder="Select Branch"
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {branches.map((branch) => (
            <Option key={branch.code} value={branch.code}>{branch.name}</Option>
          ))}
        </Select>

        <Select
          loading={loading}
          showSearch
          value={selectedChannel?.name || null}
          onChange={handleChannelChange}
          allowClear
          style={{ flex: 1 }}
          placeholder="Select Channel (optional)"
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {channels.map((channel) => (
            <Option key={channel.code} value={channel.code}>{channel.name}</Option>
          ))}
        </Select>

        <Select
          disabled={!selectedBranch}
          loading={loading}
          showSearch
          value={selectedCustomer?.code || null}
          onChange={handleCustomerChange}
          style={{ flex: 1 }}
          placeholder="Select Customer"
          optionFilterProp="label"
        >
          {customers.map((c) => (
            <Option key={c.code} value={c.code} label={`${c.code} - ${c.name}`}>
              {`${c.code} - ${c.name}`}
            </Option>
          ))}
        </Select>
      </div>

      {/* ── Info tab cards ────────────────────────────────────────────── */}
      <div className="top-tabs-container">
        {loading && !customerData
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tab-card">
                <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 1, width: "40%" }} />
              </div>
            ))
          : tabs.map((tab, index) => (
              <div
                key={index}
                className={`tab-card ${tab.onClick ? "tab-card--clickable" : ""}`}
                onClick={tab.onClick}
                title={tab.tooltip}
              >
                <div className="tab-header">
                  <div className="tab-icon">{tab.icon}</div>
                  <div className="tab-title">{tab.title}</div>
                </div>
                <div className="tab-value">{tab.value}</div>
              </div>
            ))}
      </div>

      {/* ── Ranking cards ─────────────────────────────────────────────── */}
      {customerData && (
        <div className="ca-section-row">
          <div
            className={`ca-rank-card ${ranking.branch_list?.length ? "ca-rank-card--clickable" : ""}`}
            onClick={() => ranking.branch_list?.length && setRankModal({ open: true, scope: "branch" })}
            title={ranking.branch_list?.length ? "Click to see the full branch ranking" : ""}
          >
            <div className="ca-rank-icon"><TrophyOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Branch Rank (YTD)</div>
              <div className="ca-rank-value">
                {ranking.rank_in_branch
                  ? <><span className="ca-rank-num">#{ranking.rank_in_branch}</span> <span className="ca-rank-total">of {ranking.total_in_branch}</span></>
                  : "—"}
              </div>
            </div>
          </div>

          <div
            className={`ca-rank-card ${ranking.channel_list?.length ? "ca-rank-card--clickable" : ""}`}
            onClick={() => ranking.channel_list?.length && setRankModal({ open: true, scope: "channel" })}
            title={ranking.channel_list?.length ? "Click to see the full channel ranking" : ""}
          >
            <div className="ca-rank-icon ca-rank-icon--channel"><SlidersOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Channel Rank (YTD)</div>
              <div className="ca-rank-value">
                {ranking.rank_in_channel
                  ? <><span className="ca-rank-num">#{ranking.rank_in_channel}</span> <span className="ca-rank-total">of {ranking.total_in_channel}</span></>
                  : "—"}
              </div>
            </div>
          </div>

          {/* ── Purchase Cadence ──────────────────────────────────────── */}
          <div className="ca-rank-card">
            <div className="ca-rank-icon ca-rank-icon--cadence"><ClockCircleOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Last Order ({selectedProduct?.name || "Product"})</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num" style={{ fontSize: 16 }}>
                  {cadence.last_order_date || "—"}
                </span>
                {cadence.days_since_last_order != null && (
                  <span className="ca-rank-total">{cadence.days_since_last_order}d ago</span>
                )}
              </div>
            </div>
          </div>

          <div className="ca-rank-card">
            <div className="ca-rank-icon ca-rank-icon--cadence"><ClockCircleOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Last Order (Any Product)</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num" style={{ fontSize: 16 }}>
                  {cadence.last_order_date_any_product || "—"}
                </span>
                {cadence.days_since_last_order_any_product != null && (
                  <span className="ca-rank-total">{cadence.days_since_last_order_any_product}d ago</span>
                )}
              </div>
            </div>
          </div>

          <div className="ca-rank-card">
            <div className="ca-rank-icon ca-rank-icon--cadence"><SwapOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Avg Order Frequency</div>
              <div className="ca-rank-value">
                {cadence.avg_days_between_orders != null
                  ? <><span className="ca-rank-num">every {cadence.avg_days_between_orders}</span> <span className="ca-rank-total">days</span></>
                  : "—"}
              </div>
            </div>
          </div>

          <div className="ca-rank-card">
            <div className="ca-rank-icon ca-rank-icon--invoice"><FileTextOutlined /></div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Total Invoices</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num">{orderQuality.total_invoice_count?.toLocaleString() || "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Return Rate (All Time) ───────────────────────────────── */}
          <div
            className="ca-rank-card ca-rank-card--clickable"
            onClick={() => openReturnBreakdown("all")}
            title="Click to see returned SKUs and reasons"
          >
            <div className="ca-rank-icon" style={{ background: `${returnRateColor}18`, color: returnRateColor }}>
              <SwapOutlined />
            </div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Return Rate (All Time)</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num" style={{ color: returnRateColor }}>
                  {orderQuality.return_rate_percent != null ? `${orderQuality.return_rate_percent}%` : "—"}
                </span>
                {orderQuality.return_amount > 0 && (
                  <span className="ca-rank-total" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {orderQuality.return_amount?.toLocaleString()}
                    {isValueMode ? <RiyalIcon width={10} height={10} color="currentColor" /> : ` ${unitType}`}
                    {" returned"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Return Rate (YTD) ─────────────────────────────────────── */}
          <div
            className="ca-rank-card ca-rank-card--clickable"
            onClick={() => openReturnBreakdown("ytd")}
            title="Click to see returned SKUs and reasons (YTD)"
          >
            <div className="ca-rank-icon" style={{ background: `${returnRateColorYtd}18`, color: returnRateColorYtd }}>
              <SwapOutlined />
            </div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Return Rate (YTD)</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num" style={{ color: returnRateColorYtd }}>
                  {orderQuality.return_rate_ytd_percent != null ? `${orderQuality.return_rate_ytd_percent}%` : "—"}
                </span>
                {orderQuality.return_amount_ytd > 0 && (
                  <span className="ca-rank-total" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {orderQuality.return_amount_ytd?.toLocaleString()}
                    {isValueMode ? <RiyalIcon width={10} height={10} color="currentColor" /> : ` ${unitType}`}
                    {" returned"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Location (from DSR visit GPS) ─────────────────────────── */}
          <div
            className={`ca-rank-card ${customer.latitude != null && customer.longitude != null ? "ca-rank-card--clickable" : ""}`}
            onClick={() => customer.latitude != null && customer.longitude != null && setLocationModal(true)}
            title={customer.latitude != null && customer.longitude != null ? "Click to see outlet on map" : "No GPS captured yet"}
          >
            <div className="ca-rank-icon" style={{ background: "#0EA5E918", color: "#0EA5E9" }}>
              <EnvironmentOutlined />
            </div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Location</div>
              <div className="ca-rank-value">
                {customer.latitude != null && customer.longitude != null ? (
                  <>
                    <span className="ca-rank-num" style={{ fontSize: 14 }}>
                      {Number(customer.latitude).toFixed(4)}, {Number(customer.longitude).toFixed(4)}
                    </span>
                    <span className="ca-rank-total">click to open map</span>
                  </>
                ) : (
                  <span className="ca-rank-num" style={{ fontSize: 14, color: "#94A3B8" }}>Not captured</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chart skeletons while first load ─────────────────────────── */}
      {loading && !customerData && selectedCustomer && (
        <div className="row">
          {[1, 2].map((i) => (
            <div key={i} className="graph">
              <Skeleton active paragraph={{ rows: 10 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Monthly Sales + SKU Mix ───────────────────────────────────── */}
      <div className="row">
        <div className="graph">
          <AreaChart
            graphTitle="Monthly Sales (Current Year)"
            labels={customerData?.monthly_sales_current_year?.months || []}
            colourTheme={[CHART_COLORS[2]]}
            units={[chartUnit]}
            series={[{ name: "Sales", data: customerData?.monthly_sales_current_year?.sales || [] }]}
          />
        </div>

        {skuMix.length > 0 && (
          <div className="graph">
            <DonutChart
              graphTitle={customerData?.sku_mix_type === "sku" ? "SKU Mix YTD" : "Product Mix YTD"}
              labels={skuMix.map((s) => s.name)}
              colourTheme={CHART_COLORS.slice(0, skuMix.length)}
              series={skuMix.map((s) => s.sales)}
              seriesValues={skuMix.map((s) => s.sales)}
              units={[chartUnit]}
            />
          </div>
        )}
      </div>

      {/* ── YoY Grouped Bar Comparison ───────────────────────────────── */}
      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Year-over-Year Monthly Comparison"
            labels={customerData?.graph?.months || []}
            colourTheme={[CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[3]]}
            units={[chartUnit, chartUnit, chartUnit, chartUnit]}
            series={[
              { name: "2023", data: customerData?.graph?.["2023"] || [] },
              { name: "2024", data: customerData?.graph?.["2024"] || [] },
              { name: "2025", data: customerData?.graph?.["2025"] || [] },
              { name: "2026", data: customerData?.graph?.["2026"] || [] },
            ]}
          />
        </div>
      </div>

      {/* ── Order Quality: Gross vs Net bar ──────────────────────────── */}
      {customerData && orderQuality.total_gross > 0 && (
        <div className="row">
          <div className="graph">
            <BarChart
              graphTitle="Gross vs Net Sales (All Time)"
              labels={["Total Sales"]}
              colourTheme={[CHART_COLORS[0], CHART_COLORS[4]]}
              units={[chartUnit, chartUnit]}
              series={[
                { name: "Gross Sales", data: [orderQuality.total_gross] },
                { name: "Net Sales",   data: [orderQuality.total_net] },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Last 10 Purchase Scheme History ──────────────────────────── */}
      {schemeHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="scheme-history-header">Last 10 Purchases — Scheme Breakdown</div>
          <Collapse
            size="small"
            items={schemeHistory.map((inv) => {
              const schemeItems = inv.items.filter((it) => it.scheme);
              const label = schemeItems.length > 0
                ? schemeItems.map((it) => it.scheme).join(" · ")
                : "No scheme";
              return {
                key: inv.inv_no,
                label: (
                  <div className="scheme-collapse-label">
                    <span className="scheme-inv-date">{inv.inv_dt}</span>
                    <span className="scheme-inv-no">{inv.inv_no}</span>
                    <span className="scheme-inv-tags">
                      {schemeItems.length > 0
                        ? schemeItems.map((it) => (
                            <Tag key={it.item_cd} color="blue" style={{ fontWeight: 600 }}>
                              {it.scheme}
                            </Tag>
                          ))
                        : <span className="scheme-no-scheme">No scheme</span>}
                    </span>
                  </div>
                ),
                children: (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={inv.items}
                    rowKey="item_cd"
                    columns={[
                      { title: "Item Code", dataIndex: "item_cd", key: "item_cd", width: 110 },
                      { title: "Item Name", dataIndex: "item_nm", key: "item_nm" },
                      { title: isValueMode ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>Paid (<RiyalIcon width={10} height={10} color="currentColor" />)</span> : `Paid (${unitType})`, dataIndex: "paid_qty", key: "paid_qty", width: 110, align: "right" },
                      { title: isValueMode ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>Free (<RiyalIcon width={10} height={10} color="currentColor" />)</span> : `Free (${unitType})`, dataIndex: "free_qty", key: "free_qty", width: 110, align: "right",
                        render: (val) => val > 0
                          ? <span style={{ color: "#10B981", fontWeight: 600 }}>{val}</span>
                          : <span style={{ color: "#94A3B8" }}>—</span>
                      },
                      { title: "Scheme", dataIndex: "scheme", key: "scheme", width: 100,
                        render: (val) => val
                          ? <Tag color="blue" style={{ fontWeight: 700 }}>{val}</Tag>
                          : <span style={{ color: "#94A3B8" }}>—</span>
                      },
                    ]}
                  />
                ),
              };
            })}
          />
        </div>
      )}

      {/* ── Current Month Invoices Table ──────────────────────────────── */}
      <div className="sales-orders-table" style={{ marginTop: 20 }}>
        <Table
          columns={salesOrderColumns}
          dataSource={salesOrders}
          bordered
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 100 }}
        />
      </div>

      {/* ── Ranking list modal ────────────────────────────────────────── */}
      <CustomerRankingModal
        state={rankModal}
        onClose={() => setRankModal({ open: false, scope: null })}
        ranking={ranking}
        selectedCode={customer.code}
        unitType={unitType}
        isValueMode={isValueMode}
      />

      {/* ── Return breakdown modal ────────────────────────────────────── */}
      <ReturnBreakdownModal
        state={returnModal}
        onClose={() => setReturnModal((p) => ({ ...p, open: false }))}
        unitType={effectiveUnitType}
        isValueMode={isValueMode}
      />

      {/* ── Customer location modal ───────────────────────────────────── */}
      <CustomerLocationModal
        open={locationModal}
        onClose={() => setLocationModal(false)}
        customer={customer}
      />

      {/* ── Payment Health breakdown modal ────────────────────────────── */}
      <PaymentHealthModal
        open={paymentHealthModal}
        onClose={() => setPaymentHealthModal(false)}
        paymentHealth={paymentHealth}
        customerName={customer.name}
      />
    </div>
  );
};

const CustomerRankingModal = ({ state, onClose, ranking, selectedCode, unitType, isValueMode }) => {
  const isBranch = state.scope === "branch";
  const rows = isBranch ? ranking?.branch_list : ranking?.channel_list;
  const title = isBranch ? "Branch Ranking (YTD)" : "Channel Ranking (YTD)";
  const myRank = isBranch ? ranking?.rank_in_branch : ranking?.rank_in_channel;
  const myTotal = isBranch ? ranking?.total_in_branch : ranking?.total_in_channel;

  const columns = [
    { title: "#", dataIndex: "rank", width: 70, align: "center",
      render: (v, r) => (
        <span style={{ fontWeight: r.customer_code === selectedCode ? 700 : 400 }}>
          {v <= 3 ? <TrophyOutlined style={{ color: v === 1 ? "#F59E0B" : v === 2 ? "#94A3B8" : "#B45309", marginRight: 4 }} /> : null}
          {v}
        </span>
      ) },
    { title: "Customer", dataIndex: "customer_name",
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v || "—"}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.customer_code}</div>
        </div>
      ) },
    { title: "Channel", dataIndex: "channel", width: 110,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span> },
    { title: isValueMode ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>YTD (<RiyalIcon width={10} height={10} color="currentColor" />)</span> : `YTD (${(unitType || "ctn").toUpperCase()})`, dataIndex: "ytd_total", align: "right", width: 150,
      render: (v) => <b>{Number(v || 0).toLocaleString()}</b> },
  ];

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          {myRank && (
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
              Selected customer is ranked <b>#{myRank}</b> of {myTotal}
            </div>
          )}
        </div>
      }
      destroyOnClose
    >
      <Table
        size="small"
        bordered
        rowKey={(r) => r.customer_code}
        columns={columns}
        dataSource={rows || []}
        pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
        rowClassName={(r) => r.customer_code === selectedCode ? "ranking-row-selected" : ""}
        scroll={{ y: "55vh" }}
      />
    </Modal>
  );
};

const PaymentHealthModal = ({ open, onClose, paymentHealth, customerName }) => {
  if (!paymentHealth) {
    return (
      <Modal open={open} onCancel={onClose} footer={null} width={640} title="Payment Health" destroyOnClose>
        <Empty description="No payment health data available" />
      </Modal>
    );
  }

  const {
    score, max_score, sales_type_used, channel,
    overdue_balance, monthly_avg_sales, ytd_sales_value, months_elapsed,
    risk_pct, sales_category, sales_category_score, sales_thresholds,
    risk_category, risk_category_score,
  } = paymentHealth;

  const salesUnidentified = sales_category === "Unidentified";
  const ratio = max_score ? score / max_score : 0;
  const scoreColor =
    ratio >= 0.75 ? "#16A34A"
    : ratio >= 0.5  ? "#F59E0B"
    : ratio >= 0.25 ? "#EA580C"
    :                 "#DC2626";
  const fmtInt = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const salesHint = sales_thresholds
    ? `${channel || ""} channel — A: ≥ ${fmtInt(sales_thresholds.a_min)}  ·  B: ≥ ${fmtInt(sales_thresholds.b_min)}  ·  C: below ${fmtInt(sales_thresholds.b_min)}  (SAR monthly avg)`
    : `${channel || "This channel"} has no configured sales thresholds — sales is not scored, composite is risk-only (max 3).`;

  const catColor = (c) => c === "A" ? "#16A34A" : c === "B" ? "#3B82F6" : c === "C" ? "#F59E0B" : "#DC2626";
  const scoreForCat = (c) => ({ A: 3, B: 2, C: 1, D: -1 })[c] ?? 0;

  const fmtSar = (v) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      <RiyalIcon width={11} height={11} color="currentColor" />
    </span>
  );

  const Row = ({ label, value, hint }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "10px 0", borderBottom: "1px dashed #E2E8F0",
    }}>
      <div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", textAlign: "right" }}>{value}</div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Payment Health Breakdown</div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>{customerName}</div>
        </div>
      }
      destroyOnClose
    >
      {/* Score summary */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: 16, background: `${scoreColor}0D`, borderRadius: 8,
        border: `1px solid ${scoreColor}33`, marginBottom: 16,
      }}>
        <div style={{
          width: 90, height: 90, borderRadius: "50%",
          background: scoreColor, color: "white",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>of {max_score}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>
            {salesUnidentified ? (
              <>Composite score = <b>Risk Category</b> only ({risk_category_score}) — no sales thresholds for channel <b>{channel || "?"}</b></>
            ) : (
              <>Composite score = <b>Sales Category</b> ({sales_category_score}) + <b>Risk Category</b> ({risk_category_score})</>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {salesUnidentified ? (
              <Tag>Sales · Unidentified</Tag>
            ) : (
              <Tag color={catColor(sales_category) === "#16A34A" ? "green" : catColor(sales_category) === "#3B82F6" ? "blue" : catColor(sales_category) === "#F59E0B" ? "orange" : "red"}>
                Sales {sales_category} · +{sales_category_score}
              </Tag>
            )}
            <Tag color={catColor(risk_category) === "#16A34A" ? "green" : catColor(risk_category) === "#3B82F6" ? "blue" : catColor(risk_category) === "#F59E0B" ? "orange" : "red"}>
              Risk {risk_category} · {risk_category_score > 0 ? "+" : ""}{risk_category_score}
            </Tag>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Inputs
        </div>
        <Row
          label="Overdue Balance"
          value={<span style={{ color: overdue_balance > 0 ? "#DC2626" : "#0F172A" }}>{fmtSar(overdue_balance)}</span>}
          hint="Amount past due date (from ERP)"
        />
        <Row
          label="Monthly Avg Sales"
          value={fmtSar(monthly_avg_sales)}
          hint={`YTD ${sales_type_used} sales / ${months_elapsed} month${months_elapsed === 1 ? "" : "s"} · all products`}
        />
        <Row
          label="YTD Total Sales"
          value={fmtSar(ytd_sales_value)}
          hint={`${sales_type_used} value, all allowed products`}
        />
      </div>

      {/* Categorization */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Categorization
        </div>
        <Row
          label="Sales Category"
          value={
            salesUnidentified ? (
              <span>
                <Tag style={{ margin: 0 }}>Unidentified</Tag>
                <span style={{ marginLeft: 8, color: "#64748B" }}>not scored</span>
              </span>
            ) : (
              <span>
                <Tag color={sales_category === "A" ? "green" : sales_category === "B" ? "blue" : "orange"} style={{ margin: 0 }}>
                  {sales_category}
                </Tag>
                <span style={{ marginLeft: 8, color: "#64748B" }}>+{sales_category_score} pts</span>
              </span>
            )
          }
          hint={salesHint}
        />
        <Row
          label="Risk %"
          value={
            <span style={{ color: risk_pct == null ? "#94A3B8" : risk_pct > 70 ? "#DC2626" : risk_pct > 20 ? "#F59E0B" : "#16A34A" }}>
              {risk_pct == null ? "—" : `${risk_pct}%`}
            </span>
          }
          hint="Risk % = (Overdue / Monthly Avg Sales) − 1"
        />
        <Row
          label="Risk Category"
          value={
            <span>
              <Tag color={risk_category === "A" ? "green" : risk_category === "B" ? "blue" : risk_category === "C" ? "orange" : "red"} style={{ margin: 0 }}>
                {risk_category}
              </Tag>
              <span style={{ marginLeft: 8, color: "#64748B" }}>
                {risk_category_score > 0 ? "+" : ""}{risk_category_score} pts
              </span>
            </span>
          }
          hint="A: ≤ 20%  ·  B: ≤ 70%  ·  C: above 70%  (D reserved for no-sales edge cases)"
        />
      </div>

      {/* Legend */}
      <div style={{
        background: "#F8FAFC", padding: 12, borderRadius: 6,
        fontSize: 11, color: "#64748B", lineHeight: 1.6,
      }}>
        <b style={{ color: "#334155" }}>Scoring:</b>{" "}
        A = +{scoreForCat("A")},&nbsp; B = +{scoreForCat("B")},&nbsp; C = +{scoreForCat("C")},&nbsp; D = {scoreForCat("D")}
        <br />
        <b style={{ color: "#334155" }}>Sales type:</b> uses the current navbar selection ({sales_type_used}), across all allowed products.
      </div>
    </Modal>
  );
};

const ContributionValue = ({ mtd, ytd }) => {
  const fmt = (v) => (v != null && v > 0 ? `${v.toFixed(2)}%` : "-");
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span>
        <span style={{ fontWeight: 600 }}>{fmt(mtd)}</span>
        <span style={{ fontSize: 11, color: "#64748B", marginLeft: 4 }}>MTD</span>
      </span>
      <span style={{ color: "#CBD5E1" }}>·</span>
      <span>
        <span style={{ fontWeight: 600 }}>{fmt(ytd)}</span>
        <span style={{ fontSize: 11, color: "#64748B", marginLeft: 4 }}>YTD</span>
      </span>
    </div>
  );
};

const BIN_COLORS = {
  GS:  "green",
  BS:  "red",
  DM:  "volcano",
  FA:  "orange",
  NE:  "gold",
  WZD: "default",
};

const ReturnBreakdownModal = ({ state, onClose, unitType, isValueMode }) => {
  const title = state.scope === "ytd"
    ? "Returned SKUs — Year to Date"
    : "Returned SKUs — All Time";

  // Group rows by bin_cd for the summary strip
  const byBin = {};
  for (const r of state.results || []) {
    const k = r.bin_cd || "—";
    if (!byBin[k]) byBin[k] = { bin_cd: k, bin_label: r.bin_label, qty: 0, count: 0 };
    byBin[k].qty += Number(r.qty || 0);
    byBin[k].count += 1;
  }
  const binSummary = Object.values(byBin).sort((a, b) => b.qty - a.qty);

  const columns = [
    { title: "#", width: 50, align: "center",
      render: (_, __, i) => i + 1 },
    { title: "Item", dataIndex: "item_nm",
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v || "—"}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.item_cd}</div>
        </div>
      ) },
    { title: "Reason", dataIndex: "bin_cd", width: 150,
      render: (v, r) => (
        <Tag color={BIN_COLORS[v] || "default"} style={{ fontWeight: 600 }}>
          {r.bin_label || v || "—"}
        </Tag>
      ) },
    { title: isValueMode
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>Qty (<RiyalIcon width={10} height={10} color="currentColor" />)</span>
        : `Qty (${(unitType || "ctn").toUpperCase()})`,
      dataIndex: "qty", align: "right", width: 130,
      render: (v) => <b>{Number(v || 0).toLocaleString()}</b> },
  ];

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      footer={null}
      width={820}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            Total returned: <b>{Number(state.totalQty || 0).toLocaleString()}</b>{" "}
            {isValueMode ? "SAR" : (unitType || "ctn").toUpperCase()} · {state.results?.length || 0} line(s)
          </div>
        </div>
      }
      destroyOnClose
    >
      {binSummary.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {binSummary.map((b) => (
            <Tag key={b.bin_cd} color={BIN_COLORS[b.bin_cd] || "default"} style={{ fontWeight: 600 }}>
              {b.bin_label || b.bin_cd}: {b.qty.toLocaleString()} ({b.count} sku{b.count === 1 ? "" : "s"})
            </Tag>
          ))}
        </div>
      )}
      <Table
        size="small"
        bordered
        loading={state.loading}
        rowKey={(r) => `${r.item_cd}-${r.bin_cd}`}
        columns={columns}
        dataSource={state.results || []}
        pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
        scroll={{ y: "55vh" }}
      />
    </Modal>
  );
};

// ── Customer location modal ─────────────────────────────────────────────
// Satellite/topo/streets/dark map viewer for a single outlet. Coordinates
// originate from the salesman's DSR visit GPS (Customer.latitude/longitude),
// so they may be missing for outlets that were never visited or where GPS
// wasn't captured. Basemaps mirror the DSR route-map modal — same arcgisonline
// host so corporate proxies that block OSM/Mapbox still work.
const CA_BASEMAPS = {
  satellite: {
    label: "Satellite",
    base:  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, Maxar, Earthstar Geographics",
    overlay: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  streets: {
    label: "Streets",
    base:  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },
  topo: {
    label: "Topo",
    base:  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },
  dark: {
    label: "Dark",
    base:  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    overlay: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  },
};

// Inline-SVG teardrop pin — avoids the default-icon URL breakage under
// webpack that Leaflet has out of the box.
const buildOutletPin = () => {
  const bg = "#EF4444";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="${bg}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="5.5" fill="#fff"/>
    </svg>`.trim();
  return L.divIcon({
    className: "outlet-marker",
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  });
};

const CustomerLocationModal = ({ open, onClose, customer }) => {
  const mapDivRef  = useRef(null);
  const mapObjRef  = useRef(null);
  const baseRef    = useRef(null);
  const overlayRef = useRef(null);
  const [modalReady, setModalReady] = useState(false);
  const [basemap, setBasemap] = useState("satellite");

  const lat = customer?.latitude != null ? Number(customer.latitude) : null;
  const lng = customer?.longitude != null ? Number(customer.longitude) : null;
  const hasCoords = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  // Reset ready flag on close; wait a tick after open so Leaflet reads real
  // dimensions rather than 0×0 mid-animation.
  useEffect(() => {
    if (!open) { setModalReady(false); return; }
    const t = setTimeout(() => setModalReady(true), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Create map + marker once per open. Basemap swaps are handled separately
  // so switching tiles doesn't flash the marker.
  useEffect(() => {
    if (!modalReady || !hasCoords || !mapDivRef.current) return;
    if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }

    // Cap zoom at 18 — arcgisonline imagery has variable coverage past that
    // and shows "Map data not available" tiles in some areas. 18 is safe.
    const map = L.map(mapDivRef.current, { zoomControl: true, maxZoom: 18 })
      .setView([lat, lng], 16);
    mapObjRef.current = map;
    baseRef.current    = null;
    overlayRef.current = null;

    const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    const popup = `
      <div style="font-family:Arial,sans-serif;min-width:200px;">
        <div style="font-size:13px;font-weight:700;color:#0F172A;line-height:1.2;">
          ${(customer.name || "").replace(/</g, "&lt;")}
        </div>
        <div style="font-size:11px;color:#64748B;margin-bottom:6px;">
          ${customer.code || ""}${customer.channel && customer.channel !== "-" ? " · " + customer.channel : ""}
        </div>
        <div style="font-size:12px;color:#334155;">
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
             style="color:#2563EB;text-decoration:none;">
            ${lat.toFixed(5)}, ${lng.toFixed(5)} ↗
          </a>
        </div>
      </div>`;
    L.marker([lat, lng], { icon: buildOutletPin() }).addTo(map).bindPopup(popup).openPopup();

    setTimeout(() => map.invalidateSize(), 50);
  }, [modalReady, hasCoords, lat, lng, customer?.name, customer?.code, customer?.channel]);

  // Swap only the tile layers on basemap change — keeps the marker intact.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map) return;
    if (baseRef.current)    { map.removeLayer(baseRef.current);    baseRef.current = null; }
    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    const spec = CA_BASEMAPS[basemap] || CA_BASEMAPS.satellite;
    baseRef.current = L.tileLayer(spec.base, {
      maxZoom: 18, crossOrigin: true, attribution: spec.attribution,
    }).addTo(map);
    if (spec.overlay) {
      overlayRef.current = L.tileLayer(spec.overlay, {
        maxZoom: 18, crossOrigin: true, pane: "overlayPane",
      }).addTo(map);
    }
  }, [basemap, modalReady, hasCoords]);

  useEffect(() => {
    if (open) return;
    if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    baseRef.current = null;
    overlayRef.current = null;
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingRight: 24 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Outlet Location — {customer?.name || ""}</div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
              {customer?.code || ""}{customer?.channel && customer.channel !== "-" ? ` · ${customer.channel}` : ""}
              {hasCoords && ` · ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
            </div>
          </div>
          {hasCoords && (
            <Segmented
              size="small"
              value={basemap}
              onChange={setBasemap}
              options={Object.entries(CA_BASEMAPS).map(([k, v]) => ({ label: v.label, value: k }))}
            />
          )}
        </div>
      }
      destroyOnClose
    >
      {!hasCoords ? (
        <Empty description="No GPS location captured for this outlet yet" />
      ) : (
        <div style={{ position: "relative" }}>
          <div
            ref={mapDivRef}
            style={{ width: "100%", height: 480, borderRadius: 6, border: "1px solid #E2E8F0", background: "#F1F5F9" }}
          />
        </div>
      )}
    </Modal>
  );
};

export default CustomerAnalysis;
