import {
  AimOutlined,
  SlidersOutlined,
  LineChartOutlined,
  CalendarOutlined,
  StopOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { message, Radio, Select, Table } from "antd";
import "./style.css";
import { useEffect, useState } from "react";
import LineChart from "../../Components/Charts/LineChart";
import RiyalIcon from "../../Utils/RiyalIcon";
import AreaChart from "../../Components/Charts/AreaChart";
import { getAllBranches } from "../../API/Branches";

const { Option } = Select;

const CustomerAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState();
  const [unitType, setUnitType] = useState("ctn");
  const [priceType, setPriceType] = useState("net");
  const [selectedCustomer, setSelectedCustomer] = useState({
    code: 1234,
    name: "Customer A",
  });

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res = await getAllBranches();
        if (res?.results) {
          setBranches(res.results); // keep objects
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

    fetchBranches();
  }, []);

  const customers = [
    { code: 1234, name: "Customer A" },
    { code: 6598, name: "Customer B" },
    { code: 7821, name: "Customer C" },
  ];

  // Customer info based on selection
  const customer = {
    name: selectedCustomer.name,
    code: selectedCustomer.code,
    branch: selectedBranch?.name,
    channel: "WS",
    totalSales: 12500000,
    ytdSales: 4500000,
    mtdSales: 800000,
    dryMonths: 2,
    salesman: "Osama Mohamed",
    contribution: 30,
    pendingAmount: 54763,
    pendingMonths: 5,
  };

  const tabs = [
    { title: "Customer Name", value: customer.name, icon: <UserOutlined /> },
    { title: "Customer Code", value: customer.code, icon: <UserOutlined /> },
    { title: "Branch", value: customer.branch, icon: <AimOutlined /> },
    { title: "Channel", value: customer.channel, icon: <SlidersOutlined /> },
    {
      title: "Total Sales",
      value: customer.totalSales.toLocaleString() + " pcs",
      icon: <DollarOutlined />,
    },
    {
      title: "Sales YTD",
      value: customer.ytdSales.toLocaleString() + " pcs",
      icon: <LineChartOutlined />,
    },
    {
      title: "Sales MTD",
      value: customer.mtdSales.toLocaleString() + " pcs",
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
      value: customer?.pendingAmount ? (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <RiyalIcon /> {customer?.pendingAmount?.toLocaleString()}
        </span>
      ) : (
        <span>
          <RiyalIcon /> 0
        </span>
      ),
      icon: <DollarOutlined />,
    },
    {
      title: "Pending Since",
      value: customer?.pendingMonths
        ? `${customer?.pendingMonths} months`
        : "No pending",
      icon: <CalendarOutlined />,
    },
  ];

  const salesOrders = [];

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
            onChange={(code) => {
              const branch = branches.find((b) => b.code === code);
              setSelectedBranch(branch);
            }}
            style={{ flex: 1, width: "100%" }}
            placeholder="Select Branch"
            optionFilterProp="children" // this tells AntD to filter using the displayed text
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

          {/* Customer Select */}
          <Select
            value={selectedCustomer?.code}
            onChange={(code) =>
              setSelectedCustomer(customers.find((c) => c.code === code))
            }
            style={{ flex: 1, width: "100%" }}
            placeholder="Select Customer"
            disabled={!selectedBranch?.code} // disabled when branch not selected
          >
            {customers.map((c) => (
              <Option key={c.code} value={c.code}>
                {c.name}
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
              labels={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
              ]}
              colourTheme={["#28a745"]}
              units={["pcs", "pcs"]}
              series={[
                {
                  name: "Actual Sales",
                  data: [
                    80000001, 83234567, 85432123, 87654321, 89012345, 81234567,
                    83456789, 85791335, 87913579, 21000001,
                  ],
                },
              ]}
            />
          </div>
        </div>

        {/* Yearly Comparison Line Chart */}
        <div className="row" style={{ marginTop: 20 }}>
          <div className="graph">
            <LineChart
              graphTitle="Customer Sales Comparison (2023–2025)"
              labels={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
              ]}
              colourTheme={["#007bff", "#ff69b4", "#ffa500"]}
              units={["pcs"]}
              series={[
                {
                  name: "2023 Sales",
                  data: [
                    7289456, 7456123, 7623987, 7487654, 6998765, 7421567,
                    7356789, 7589432, 7498234, 7721987,
                  ],
                },
                {
                  name: "2024 Sales",
                  data: [
                    7123456, 7256789, 7198345, 7548765, 7798234, 8034987,
                    7956123, 8221345, 8149876, 8398765,
                  ],
                },
                {
                  name: "2025 Sales",
                  data: [
                    6543210, 6789456, 6623987, 7034567, 7356211, 7698543,
                    7598123, 7814567, 7732456, 7921345,
                  ],
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
          />
        </div>
      </div>
    </>
  );
};

export default CustomerAnalysis;
