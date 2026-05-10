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
} from "@ant-design/icons";
import { Collapse, message, Select, Skeleton, Table, Tag } from "antd";
import "./style.css";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import LineChart from "../../../Components/Charts/LineChart";
import BarChart from "../../../Components/Charts/BarChart";
import AreaChart from "../../../Components/Charts/AreaChart";
import DonutChart from "../../../Components/Charts/DonutChart";
import RiyalIcon from "../../../Utils/RiyalIcon";
import { getAllBranches } from "../../../API/Branches";
import {
  getCustomerInsight,
  getCustomersByBranchByCHannel,
} from "../../../API/Customer";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { getAllChannels } from "../../../API/Channels";
import { CHART_COLORS } from "../../../Components/Charts/chartConfig";

const { Option } = Select;

const CustomerAnalysis = () => {
  const { selectedProduct } = useContext(ProductContext);
  const { unitType, valueType } = useContext(UnitValueContext);

  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState();
  const [selectedChannel, setSelectedChannel] = useState();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [channels, setChannels] = useState([]);

  const preselect = useLocation().state;
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
    if (!selectedCustomer || !selectedBranch || !selectedProduct || !valueType || !unitType) return;

    const fetchCustomerInsight = async () => {
      setLoading(true);
      try {
        const res = await getCustomerInsight({
          customer_code: selectedCustomer.code,
          branch_code: selectedBranch.code,
          sales_type: valueType,
          unit: unitType,
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
  }, [selectedCustomer, selectedBranch, valueType, unitType, selectedProduct]);

  // Fetch customer list when branch + channel are both selected
  useEffect(() => {
    if (!selectedBranch || !selectedChannel) {
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
          message.warning("No customers found for this branch + channel");
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
        unit: unitType,
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
    salesman: customerData?.salesman || "-",
    contribution: customerData?.contribution_percent || 0,
    pendingAmount: customerData?.pendingAmount || 0,
    pendingMonths: customerData?.pendingMonths || 0,
  };

  const ranking = customerData?.ranking || {};
  const cadence = customerData?.purchase_cadence || {};
  const orderQuality = customerData?.order_quality || {};
  const skuMix = customerData?.sku_mix || [];
  const schemeHistory = customerData?.scheme_history || [];

  const tabs = [
    { title: "Customer Name",        value: customer.name,                                           icon: <UserOutlined /> },
    { title: "Customer Code",        value: customer.code,                                           icon: <UserOutlined /> },
    { title: "Branch",               value: customer.branch,                                         icon: <AimOutlined /> },
    { title: "Channel",              value: customer.channel,                                        icon: <SlidersOutlined /> },
    { title: "Total Sales (2023+)",  value: customer.totalSales.toLocaleString() + " " + unitType,  icon: <DollarOutlined /> },
    { title: "Sales YTD",            value: customer.ytdSales.toLocaleString() + " " + unitType,    icon: <LineChartOutlined /> },
    { title: "Sales MTD",            value: customer.mtdSales.toLocaleString() + " " + unitType,    icon: <CalendarOutlined /> },
    { title: "Dry Months",           value: customer.dryMonths,                                     icon: <StopOutlined /> },
    { title: "Salesman",             value: customer.salesman,                                      icon: <UserOutlined /> },
    { title: "Contribution",         value: customer.contribution ? customer.contribution + " %" : "-", icon: <LineChartOutlined /> },
    {
      title: "Payment Pending",
      value: (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <RiyalIcon /> {customer.pendingAmount?.toLocaleString()}
          <Tag color="orange">Dummy Data</Tag>
        </span>
      ),
      icon: <DollarOutlined />,
    },
    {
      title: "Pending Since",
      value: (
        <span>
          {customer.pendingMonths ? `${customer.pendingMonths} months` : "5th Oct, 2025"}
          <Tag color="orange" style={{ marginLeft: 4 }}>Dummy Data</Tag>
        </span>
      ),
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
    { title: "Salesman",           dataIndex: "salesman_nm",   key: "salesman_nm" },
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
    { title: "Total Qty",          dataIndex: "totqty",        key: "totqty" },
    { title: "Product Name",       dataIndex: "prod_nm",       key: "prod_nm" },
    { title: "Brand",              dataIndex: "branded_nm",    key: "branded_nm" },
    { title: "Size",               dataIndex: "size",          key: "size" },
    { title: "Sales Point",        dataIndex: "salespoint_nm", key: "salespoint_nm" },
    { title: "Bin Code",           dataIndex: "bin_cd",        key: "bin_cd" },
  ];

  // Return rate severity colour
  const returnRateColor =
    orderQuality.return_rate_percent > 10 ? "#EF4444"
    : orderQuality.return_rate_percent > 5  ? "#F59E0B"
    : "#10B981";

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
          style={{ flex: 1 }}
          placeholder="Select Channel"
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
          disabled={!selectedBranch || !selectedChannel}
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
              <div key={index} className="tab-card">
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
          <div className="ca-rank-card">
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

          <div className="ca-rank-card">
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
              <div className="ca-rank-label">Last Order</div>
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

          {/* ── Return Rate ───────────────────────────────────────────── */}
          <div className="ca-rank-card">
            <div className="ca-rank-icon" style={{ background: `${returnRateColor}18`, color: returnRateColor }}>
              <SwapOutlined />
            </div>
            <div className="ca-rank-body">
              <div className="ca-rank-label">Return Rate</div>
              <div className="ca-rank-value">
                <span className="ca-rank-num" style={{ color: returnRateColor }}>
                  {orderQuality.return_rate_percent != null ? `${orderQuality.return_rate_percent}%` : "—"}
                </span>
                {orderQuality.return_amount > 0 && (
                  <span className="ca-rank-total">{orderQuality.return_amount?.toLocaleString()} {unitType} returned</span>
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
            units={[unitType]}
            series={[{ name: "Sales", data: customerData?.monthly_sales_current_year?.sales || [] }]}
          />
        </div>

        {skuMix.length > 0 && (
          <div className="graph">
            <DonutChart
              graphTitle="Product Mix YTD"
              labels={skuMix.map((s) => s.name)}
              colourTheme={CHART_COLORS.slice(0, skuMix.length)}
              series={skuMix.map((s) => s.sales)}
              seriesValues={skuMix.map((s) => s.sales)}
              units={[unitType]}
              showTable={false}
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
            units={[unitType, unitType, unitType, unitType]}
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
              units={[unitType, unitType]}
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
                      { title: `Paid (${unitType})`, dataIndex: "paid_qty", key: "paid_qty", width: 110, align: "right" },
                      { title: `Free (${unitType})`, dataIndex: "free_qty", key: "free_qty", width: 110, align: "right",
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
    </div>
  );
};

export default CustomerAnalysis;
