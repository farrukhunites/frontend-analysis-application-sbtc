import {
  AimOutlined,
  SlidersOutlined,
  LineChartOutlined,
  CalendarOutlined,
  StopOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { message, Radio, Select, Table, Tag } from "antd";
import "./style.css";
import { useContext, useEffect, useState } from "react";
import LineChart from "../../Components/Charts/LineChart";
import RiyalIcon from "../../Utils/RiyalIcon";
import AreaChart from "../../Components/Charts/AreaChart";
import { getAllBranches } from "../../API/Branches";
import {
  getCustomerInsight,
  getCustomersByBranchByCHannel,
} from "../../API/Customer";
import { ProductContext } from "../../Contexts/ProductContext";
import { getAllChannels } from "../../API/Channels";

const { Option } = Select;

const CustomerAnalysis = () => {
  const { selectedProduct } = useContext(ProductContext);

  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState();
  const [selectedChannel, setSelectedChannel] = useState();
  const [unitType, setUnitType] = useState("ctn");
  const [priceType, setPriceType] = useState("net");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  const [branches, setBranches] = useState([]);
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res = await getAllBranches();
        if (res?.results) {
          setBranches(res.results);
        } else {
          message.error(
            "Failed to fetch branches: " + (res?.message || "Unknown error")
          );
        }
      } catch (error) {
        message.error("Error fetching branches: " + error?.message);
      }
      setLoading(false);
    };

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const res = await getAllChannels();
        if (res?.results) {
          setChannels(res.results);
        } else {
          message.error(
            "Failed to fetch channels: " + (res?.message || "Unknown error")
          );
        }
      } catch (error) {
        message.error("Error fetching channels: " + error?.message);
      }
      setLoading(false);
    };

    fetchBranches();
    fetchChannels();
  }, []);

  useEffect(() => {
    // Only call API if all required variables are present
    if (
      !selectedCustomer ||
      !selectedBranch ||
      !selectedProduct ||
      !priceType ||
      !unitType
    ) {
      return;
    }

    const fetchCustomerInsight = async () => {
      setLoading(true);
      try {
        const res = await getCustomerInsight({
          customer_code: selectedCustomer.code,
          branch_code: selectedBranch.code,
          sales_type: priceType,
          unit: unitType,
          product_code: selectedProduct.code,
        });

        if (res?.success === false) {
          message.warning("No data found for this customer");
          setCustomerData(null);
        } else {
          setCustomerData(res);
        }
      } catch (err) {
        message.error("Failed to fetch customer insight");
        setCustomerData(null);
      }
      setLoading(false);
    };

    fetchCustomerInsight();
  }, [selectedCustomer, selectedBranch, priceType, unitType, selectedProduct]);

  useEffect(() => {
    // Do nothing unless BOTH branch + channel selected
    if (!selectedBranch || !selectedChannel) {
      setCustomers([]);
      setSelectedCustomer(null);
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await getCustomersByBranchByCHannel(
          selectedBranch?.code,
          selectedChannel?.name
        );

        if (res?.length > 0) {
          setCustomers(res);
        } else {
          setCustomers([]);
          message.warning("No customers found for this branch + channel");
        }
      } catch (error) {
        message.error("Failed to fetch customers");
      }
      setLoading(false);
    };

    fetchCustomers();
  }, [selectedBranch, selectedChannel]);

  // Branch Select handler
  const handleBranchChange = (code) => {
    const branch = branches.find((b) => b.code === code);
    setSelectedBranch(branch);
    setSelectedCustomer(null);
    setCustomers([]);
  };

  // Channel Select handler
  const handleChannelChange = (code) => {
    const channel = channels.find((c) => c.code === code);
    setSelectedChannel(channel);
    setSelectedCustomer(null);
    setCustomers([]);
  };

  // Customer Select handler
  const handleCustomerChange = async (code) => {
    const customer = customers.find((c) => c.code === code) || null;
    setSelectedCustomer(customer);
    if (!customer || !selectedBranch) return;

    setLoading(true);
    try {
      const res = await getCustomerInsight({
        customer_code: customer.code,
        branch_code: selectedBranch.code,
        sales_type: priceType,
        unit: unitType,
        product_code: selectedProduct?.code, // or any dynamic code if needed
      });
      if (res?.success === false) {
        message.warning("No data found for this customer");
        setCustomerData(null);
      } else {
        setCustomerData(res);
      }
    } catch (err) {
      message.error("Failed to fetch customer insight");
      setCustomerData(null);
    }
    setLoading(false);
  };

  // Customer info based on selection
  const customer = {
    name: customerData?.customer_name || "-",
    code: customerData?.customer_code || "-",
    branch: customerData?.branch || selectedBranch?.name || "-",
    channel: customerData?.channel || "WS",
    totalSales: customerData?.total_sales_forever || 0,
    ytdSales: customerData?.sales_ytd || 0,
    mtdSales: customerData?.sales_mtd || 0,
    dryMonths: customerData?.dry_months ?? 0,
    salesman: customerData?.salesman || "-",
    contribution: customerData?.contribution_percent || 0,
    pendingAmount: customerData?.pendingAmount || 0, // keep dummy if API doesn't return
    pendingMonths: customerData?.pendingMonths || 0, // keep dummy if API doesn't return
  };

  const tabs = [
    { title: "Customer Name", value: customer.name, icon: <UserOutlined /> },
    { title: "Customer Code", value: customer.code, icon: <UserOutlined /> },
    { title: "Branch", value: customer.branch, icon: <AimOutlined /> },
    { title: "Channel", value: customer.channel, icon: <SlidersOutlined /> },
    {
      title: "Total Sales (From 2023)",
      value: customer.totalSales.toLocaleString() + " " + unitType,
      icon: <DollarOutlined />,
    },
    {
      title: "Sales YTD",
      value: customer.ytdSales.toLocaleString() + " " + unitType,
      icon: <LineChartOutlined />,
    },
    {
      title: "Sales MTD",
      value: customer.mtdSales.toLocaleString() + " " + unitType,
      icon: <CalendarOutlined />,
    },
    { title: "Dry Months", value: customer.dryMonths, icon: <StopOutlined /> },
    { title: "Salesman", value: customer.salesman, icon: <UserOutlined /> },
    {
      title: "Contribution",
      value: customer?.contribution ? customer?.contribution + " %" : "-",
      icon: <LineChartOutlined />,
    },
    {
      title: "Payment Pending",
      value: (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <RiyalIcon /> {customer?.pendingAmount?.toLocaleString()}{" "}
          <Tag color="orange">Dummy Data</Tag>
        </span>
      ),
      icon: <DollarOutlined />,
    },
    {
      title: "Pending Since",
      value: (
        <span>
          {customer?.pendingMonths
            ? `${customer?.pendingMonths} months`
            : "5th Oct, 2025"}{" "}
          <Tag color="orange">Dummy Data</Tag>
        </span>
      ),
      icon: <CalendarOutlined />,
    },
  ];

  const salesOrders = customerData?.invoices || [];

  const salesOrderColumns = [
    { title: "Customer Code", dataIndex: "cust_cd", key: "cust_cd" },
    { title: "Customer Name", dataIndex: "cust_nm", key: "cust_nm" },
    { title: "Channel", dataIndex: "otlcd", key: "otlcd" },
    { title: "Group Code", dataIndex: "cusgrcd", key: "cusgrcd" },
    { title: "Group Name", dataIndex: "cusgrcd_nm", key: "cusgrcd_nm" },
    { title: "Salesman", dataIndex: "salesman_nm", key: "salesman_nm" },
    { title: "Driver", dataIndex: "driver_nm", key: "driver_nm" },
    { title: "Order Type", dataIndex: "tp", key: "tp" },
    { title: "SO Number", dataIndex: "so_cd", key: "so_cd" },
    { title: "SO Date", dataIndex: "so_dt", key: "so_dt" },
    { title: "Invoice Number", dataIndex: "inv_no", key: "inv_no" },
    { title: "Invoice Date", dataIndex: "inv_dt", key: "inv_dt" },
    { title: "Item Code", dataIndex: "item_cd", key: "item_cd" },
    { title: "Item Name", dataIndex: "item_nm", key: "item_nm" },
    { title: "Quantity Ordered", dataIndex: "qtyorder", key: "qtyorder" },
    { title: "Quantity Converted", dataIndex: "qtyconv", key: "qtyconv" },
    { title: "Unit Price", dataIndex: "unitprice", key: "unitprice" },
    { title: "Total Quantity", dataIndex: "totqty", key: "totqty" },
    { title: "Product Name", dataIndex: "prod_nm", key: "prod_nm" },
    { title: "Brand", dataIndex: "branded_nm", key: "branded_nm" },
    { title: "Size", dataIndex: "size", key: "size" },
    { title: "Sales Point", dataIndex: "salespoint_nm", key: "salespoint_nm" },
    { title: "Bin Code", dataIndex: "bin_cd", key: "bin_cd" },
  ];

  return (
    <>
      <div className="customer-analysis">
        <div style={{ display: "flex", gap: "16px" }}>
          {/* Branch Select */}
          <Select
            loading={loading}
            showSearch
            value={selectedBranch?.code || null}
            onChange={handleBranchChange}
            style={{ flex: 1, width: "100%" }}
            placeholder="Select Branch"
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {branches.map((branch) => (
              <Option key={branch.code} value={branch.code}>
                {branch?.name}
              </Option>
            ))}
          </Select>

          {/* Channel Select */}
          <Select
            loading={loading}
            showSearch
            value={selectedChannel?.name || null}
            onChange={handleChannelChange}
            style={{ flex: 1, width: "100%" }}
            placeholder="Select Channel"
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {channels.map((channel) => (
              <Option key={channel.code} value={channel.code}>
                {channel?.name}
              </Option>
            ))}
          </Select>

          <Select
            disabled={!selectedBranch || !selectedChannel}
            loading={loading}
            showSearch
            value={selectedCustomer?.code || null}
            onChange={handleCustomerChange}
            style={{ flex: 1, width: "100%" }}
            placeholder="Select Customer"
            optionFilterProp="label"
          >
            {customers.map((c) => (
              <Option
                key={c.code}
                value={c.code}
                label={`${c.code} - ${c.name}`}
              >
                {`${c.code} - ${c.name}`}
              </Option>
            ))}
          </Select>
        </div>

        {/* Radio Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
            gap: "32px",
            marginBottom: 24,
          }}
        >
          {/* Unit Type */}
          <div>
            <span style={{ marginRight: 8, fontWeight: 500 }}>Unit:</span>
            <Radio.Group
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
            >
              <Radio value="ctn">CTN</Radio>
              <Radio value="pcs">PCS</Radio>
            </Radio.Group>
          </div>

          {/* Price Type */}
          <div>
            <span style={{ marginRight: 8, fontWeight: 500 }}>Type:</span>
            <Radio.Group
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
            >
              <Radio value="net">NET</Radio>
              <Radio value="gross">GROSS</Radio>
            </Radio.Group>
          </div>
        </div>

        {/* Tabs */}
        <div className="top-tabs-container">
          {tabs.map((tab, index) => (
            <div key={index} className="tab-card">
              <div className="tab-header">
                <div className="tab-icon">{tab.icon}</div>
                <div className="tab-title">{tab.title}</div>
              </div>
              <div className="tab-value">{tab.value}</div>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="graph">
            <AreaChart
              graphTitle="Monthly Sales"
              labels={customerData?.monthly_sales_current_year?.months || []} // fallback
              colourTheme={["#28a745"]}
              units={[unitType, unitType]}
              series={[
                {
                  name: "Actual Sales",
                  data: customerData?.monthly_sales_current_year?.sales || [], // fallback
                },
              ]}
            />
          </div>
        </div>

        {/* Yearly Comparison Line Chart */}
        <div className="row" style={{ marginTop: 20 }}>
          <div className="graph">
            <LineChart
              graphTitle="Customer Sales Comparison (Previous Years)"
              labels={customerData?.graph?.months || []} // fallback
              colourTheme={["#ffa500", "#ff69b4", "#007bff"]}
              units={[unitType]}
              series={[
                {
                  name: "2023 Sales",
                  data: customerData?.graph?.["2023"] || [],
                },
                {
                  name: "2024 Sales",
                  data: customerData?.graph?.["2024"] || [],
                },
                {
                  name: "2025 Sales",
                  data: customerData?.graph?.["2025"] || [],
                },
              ]}
            />
          </div>
        </div>

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
    </>
  );
};

export default CustomerAnalysis;
