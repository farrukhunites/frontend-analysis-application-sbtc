import {
  AimOutlined,
  SlidersOutlined,
  LineChartOutlined,
  CalendarOutlined,
  StopOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Select, Table, Tag } from "antd";
import "./style.css";
import BarChart from "../../Components/Charts/BarChart";
import { useState } from "react";
import LineChart from "../../Components/Charts/LineChart";
import RiyalIcon from "../../Utils/RiyalIcon";
import AreaChart from "../../Components/Charts/AreaChart";

const { Option } = Select;

const CustomerAnalysis = () => {
  const [selectedBranch, setSelectedBranch] = useState("JEDDAH");
  const [selectedCustomer, setSelectedCustomer] = useState({
    code: 1234,
    name: "Customer A",
  });

  const branches = ["JEDDAH", "MAKKAH", "MADINAH", "TAIF"];
  const customers = [
    { code: 1234, name: "Customer A" },
    { code: 6598, name: "Customer B" },
    { code: 7821, name: "Customer C" },
  ];

  // Customer info based on selection
  const customer = {
    name: selectedCustomer.name,
    code: selectedCustomer.code,
    branch: selectedBranch,
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

  const salesHistory = [
    {
      key: "2023",
      year: 2023,
      total: 4500000,
      color: "#3f51b5",
      months: [
        { month: "Jan", sales: 400000 },
        { month: "Feb", sales: 350000 },
        { month: "Mar", sales: 420000 },
        { month: "Apr", sales: 380000 },
        { month: "May", sales: 450000 },
        { month: "Jun", sales: 470000 },
        { month: "Jul", sales: 400000 },
        { month: "Aug", sales: 420000 },
        { month: "Sep", sales: 410000 },
        { month: "Oct", sales: 430000 },
        { month: "Nov", sales: 450000 },
        { month: "Dec", sales: 470000 },
      ],
    },
    {
      key: "2024",
      year: 2024,
      total: 4800000,
      color: "#28a745",
      months: [
        { month: "Jan", sales: 400000 },
        { month: "Feb", sales: 410000 },
        { month: "Mar", sales: 420000 },
        { month: "Apr", sales: 430000 },
        { month: "May", sales: 440000 },
        { month: "Jun", sales: 450000 },
        { month: "Jul", sales: 460000 },
        { month: "Aug", sales: 470000 },
        { month: "Sep", sales: 480000 },
        { month: "Oct", sales: 490000 },
        { month: "Nov", sales: 500000 },
        { month: "Dec", sales: 510000 },
      ],
    },
    {
      key: "2025",
      year: 2025,
      total: 5000000,
      color: "#ff9800",
      months: [
        { month: "Jan", sales: 410000 },
        { month: "Feb", sales: 420000 },
        { month: "Mar", sales: 430000 },
        { month: "Apr", sales: 440000 },
        { month: "May", sales: 450000 },
        { month: "Jun", sales: 460000 },
        { month: "Jul", sales: 470000 },
        { month: "Aug", sales: 480000 },
        { month: "Sep", sales: 490000 },
        { month: "Oct", sales: 500000 },
        { month: "Nov", sales: 510000 },
        { month: "Dec", sales: 520000 },
      ],
    },
  ];

  const columns = [
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      render: (text, record) => <Tag color={record.color}>{text}</Tag>,
    },
    {
      title: "Total Sales",
      dataIndex: "total",
      key: "total",
      render: (value) => value.toLocaleString() + " pcs",
    },
  ];

  const expandedRowRender = (record) => {
    const monthColumns = [
      { title: "Month", dataIndex: "month", key: "month" },
      {
        title: "Sales",
        dataIndex: "sales",
        key: "sales",
        render: (value) => value.toLocaleString() + " pcs",
      },
    ];

    // Add a total row
    const totalRow = {
      month: "Total",
      sales: record.months.reduce((sum, m) => sum + m.sales, 0),
      key: "total",
    };

    return (
      <Table
        columns={monthColumns}
        dataSource={[...record.months, totalRow]}
        pagination={false}
        rowClassName={(record) => (record.month === "Total" ? "total-row" : "")}
      />
    );
  };

  const salesOrders = [
    {
      key: "1",
      cust_cd: "5096",
      cust_nm: "HYPER PANDA 20012 - AMIR FAWAZ",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0494",
      salesman_nm: "MOHAMMED ABDULMAJEED",
      driver_cd: "0494",
      driver_nm: "MOHAMMED ABDULMAJEED",
      tp_ord: 12,
      tp: "return",
      inv_no: "",
      inv_dt: "2025-10-18",
      so_cd: "RE10110252497",
      so_dt: "2025-10-18",
      totqty: 12,
      qtyorder: 12,
      qtyconv: 1,
      unitprice: 44,
      item_cd: "1001009",
      item_nm: "INST. NDL. VEGETABLE",
      prod_cd: "11100",
      prod_nm: "INDOMIE REGULAR",
      prod_nm3: "INDOMIE REGULAR NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "2",
      cust_cd: "5097",
      cust_nm: "HYPER PANDA 20013 - AHMED ALI",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0495",
      salesman_nm: "ALI HUSSAIN",
      driver_cd: "0495",
      driver_nm: "ALI HUSSAIN",
      tp_ord: 8,
      tp: "normal",
      inv_no: "INV1001",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252500",
      so_dt: "2025-10-18",
      totqty: 8,
      qtyorder: 8,
      qtyconv: 1,
      unitprice: 50,
      item_cd: "1001010",
      item_nm: "INST. NDL. CHICKEN",
      prod_cd: "11101",
      prod_nm: "INDOMIE CHICKEN",
      prod_nm3: "INDOMIE CHICKEN NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "3",
      cust_cd: "5098",
      cust_nm: "HYPER PANDA 20014 - SAID KHALED",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0496",
      salesman_nm: "KHALED SAID",
      driver_cd: "0496",
      driver_nm: "KHALED SAID",
      tp_ord: 15,
      tp: "normal",
      inv_no: "INV1002",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252501",
      so_dt: "2025-10-18",
      totqty: 15,
      qtyorder: 15,
      qtyconv: 1,
      unitprice: 42,
      item_cd: "1001011",
      item_nm: "INST. NDL. SPICY",
      prod_cd: "11102",
      prod_nm: "INDOMIE SPICY",
      prod_nm3: "INDOMIE SPICY NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "4",
      cust_cd: "5099",
      cust_nm: "HYPER PANDA 20015 - MOHAMED AHMED",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0497",
      salesman_nm: "AHMED MOHAMED",
      driver_cd: "0497",
      driver_nm: "AHMED MOHAMED",
      tp_ord: 10,
      tp: "return",
      inv_no: "",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252502",
      so_dt: "2025-10-18",
      totqty: 10,
      qtyorder: 10,
      qtyconv: 1,
      unitprice: 46,
      item_cd: "1001012",
      item_nm: "INST. NDL. TOMATO",
      prod_cd: "11103",
      prod_nm: "INDOMIE TOMATO",
      prod_nm3: "INDOMIE TOMATO NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "5",
      cust_cd: "5100",
      cust_nm: "HYPER PANDA 20016 - ALI HASSAN",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0498",
      salesman_nm: "HASSAN ALI",
      driver_cd: "0498",
      driver_nm: "HASSAN ALI",
      tp_ord: 9,
      tp: "normal",
      inv_no: "INV1003",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252503",
      so_dt: "2025-10-18",
      totqty: 9,
      qtyorder: 9,
      qtyconv: 1,
      unitprice: 48,
      item_cd: "1001013",
      item_nm: "INST. NDL. BEEF",
      prod_cd: "11104",
      prod_nm: "INDOMIE BEEF",
      prod_nm3: "INDOMIE BEEF NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "6",
      cust_cd: "5101",
      cust_nm: "HYPER PANDA 20017 - FATIMA ALI",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0499",
      salesman_nm: "FATIMA ALI",
      driver_cd: "0499",
      driver_nm: "FATIMA ALI",
      tp_ord: 14,
      tp: "normal",
      inv_no: "INV1004",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252504",
      so_dt: "2025-10-18",
      totqty: 14,
      qtyorder: 14,
      qtyconv: 1,
      unitprice: 45,
      item_cd: "1001014",
      item_nm: "INST. NDL. VEG MIX",
      prod_cd: "11105",
      prod_nm: "INDOMIE VEG MIX",
      prod_nm3: "INDOMIE VEG MIX NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
    {
      key: "7",
      cust_cd: "5102",
      cust_nm: "HYPER PANDA 20018 - SAEED AHMED",
      otlcd: "KA",
      cusgrcd: "G01",
      cusgrcd_nm: "PANDA",
      salesman_cd: "0500",
      salesman_nm: "SAEED AHMED",
      driver_cd: "0500",
      driver_nm: "SAEED AHMED",
      tp_ord: 11,
      tp: "return",
      inv_no: "",
      inv_dt: "2025-10-18",
      so_cd: "SO10110252505",
      so_dt: "2025-10-18",
      totqty: 11,
      qtyorder: 11,
      qtyconv: 1,
      unitprice: 49,
      item_cd: "1001015",
      item_nm: "INST. NDL. SPINACH",
      prod_cd: "11106",
      prod_nm: "INDOMIE SPINACH",
      prod_nm3: "INDOMIE SPINACH NON PROMO",
      prod_nmg1: "PILLOW Noodle",
      branded_nm: "INDOMIE",
      size: "40X75G",
      salespointcd: "101",
      salespoint_nm: "SBTC JEDDAH",
      do_dt: "2025-10-18",
      bin_cd: "DM",
    },
  ];

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
    <div className="customer-analysis">
      <div
        className="filters"
        style={{ display: "flex", gap: 16, marginBottom: 20 }}
      >
        <Select
          value={selectedBranch}
          onChange={setSelectedBranch}
          style={{ width: 200 }}
          placeholder="Select Branch"
        >
          {branches.map((b) => (
            <Option key={b} value={b}>
              {b}
            </Option>
          ))}
        </Select>

        <Select
          value={selectedCustomer.code}
          onChange={(code) =>
            setSelectedCustomer(customers.find((c) => c.code === code))
          }
          style={{ width: 250 }}
          placeholder="Select Customer"
        >
          {customers.map((c) => (
            <Option key={c.code} value={c.code}>
              {c.name}
            </Option>
          ))}
        </Select>
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
                  7289456, 7456123, 7623987, 7487654, 6998765, 7421567, 7356789,
                  7589432, 7498234, 7721987,
                ],
              },
              {
                name: "2024 Sales",
                data: [
                  7123456, 7256789, 7198345, 7548765, 7798234, 8034987, 7956123,
                  8221345, 8149876, 8398765,
                ],
              },
              {
                name: "2025 Sales",
                data: [
                  6543210, 6789456, 6623987, 7034567, 7356211, 7698543, 7598123,
                  7814567, 7732456, 7921345,
                ],
              },
            ]}
          />
        </div>
      </div>

      {/* <div className="sales-history-table" style={{ marginTop: 20 }}>
        <Table
          columns={columns}
          dataSource={salesHistory}
          expandable={{ expandedRowRender }}
          pagination={false}
          bordered
        />
      </div> */}

      <div className="sales-orders-table" style={{ marginTop: 20 }}>
        <Table
          columns={salesOrderColumns}
          dataSource={salesOrders}
          bordered
          scroll={{ x: "max-content" }}
        />
      </div>
    </div>
  );
};

export default CustomerAnalysis;
