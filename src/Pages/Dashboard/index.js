import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  AimOutlined,
  LineChartOutlined,
  SlidersOutlined,
  BoxPlotOutlined,
} from "@ant-design/icons";
import "./style.css";
import LineChart from "../../Components/Charts/LineChart";
import AreaChart from "../../Components/Charts/AreaChart";
import BarChart from "../../Components/Charts/BarChart";
import DonutChart from "../../Components/Charts/DonutChart";
import { useState } from "react";
import { Select } from "antd";
import { Option } from "antd/es/mentions";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const tabs = [
    {
      title: "Month to Date",
      value: (19325468).toLocaleString() + " pcs",
      icon: <LineChartOutlined />,
      change: 8.4,
      positive: true,
      subtitle: "vs last period",
    },
    {
      title: "Yesterday Sales",
      value: (2456841).toLocaleString() + " pcs",
      icon: <SlidersOutlined />,
      change: 4.1,
      positive: true,
      subtitle: "Day-over-day",
    },
    {
      title: "Target Achieved %",
      value: "73%",
      icon: <AimOutlined />,
      change: -3.2,
      positive: false,
      subtitle: "vs last period",
    },

    {
      title: "Target (This Month)",
      value: (90000000).toLocaleString() + " pcs",
      icon: <BoxPlotOutlined />,
      change: 5.6,
      positive: true,
      subtitle: "vs last period",
    },
    {
      title: "Year to Date",
      value: (842167496).toLocaleString() + " pcs",
      icon: <LineChartOutlined />,
      change: 5.6,
      positive: false,
      subtitle: "vs last period",
    },
  ];

  const weeklyData = {
    "Week 1": [100000, 120000, 90000, 110000, 95000, 105000],
    "Week 2": [150000, 160000, 140000, 155000, 148000, 152000],
    "Week 3": [180000, 190000, 175000, 185000, 182000, 188000],
    "Week 4": [170000, 165000, 172000, 168000, 160000, 175000],
    "Week 5": [200000, 210000, 205000, 215000, 208000, 212000],
  };

  const customerByChannelData = {
    JEDDAH: [120, 98, 150, 110, 75, 90, 60, 45, 80],
    MAKKAH: [100, 90, 120, 95, 70, 85, 50, 40, 75],
    MADINAH: [80, 70, 100, 85, 60, 65, 45, 30, 50],
    // ...add all branches
    all: [500, 450, 600, 400, 300, 350, 200, 150, 300], // for "All Branches"
  };

  const [selectedBranch, setSelectedBranch] = useState("all");

  const handleBranchChange = (value) => {
    setSelectedBranch(value);
  };

  const [selectedWeek, setSelectedWeek] = useState("Week 1");

  const handleWeekChange = (value) => {
    setSelectedWeek(value);
  };

  const weekLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];

  const branches = ["All", "JEDDAH", "MAKKAH", "MADINAH", "RIYADH"];
  const channels = ["All", "WS", "DSC", "KA", "HRC", "MM", "RTA", "RTI"];

  // Mock series data: {branch: {channel: [orders per customer]}}
  const ordersData = {
    All: {
      All: {
        labels: ["Cust A", "Cust B", "Cust C", "Cust D"],
        data: [5, 3, 8, 2],
      },
      WS: { labels: ["Cust E", "Cust F"], data: [2, 1] },
      DSC: { labels: ["Cust G", "Cust H", "Cust I"], data: [1, 2, 3] },
    },
    JEDDAH: {
      All: { labels: ["Ali", "Ahmed", "Sara", "Omar"], data: [4, 2, 7, 3] },
      WS: { labels: ["Ali", "Sara"], data: [3, 1] },
      DSC: { labels: ["Ahmed", "Omar"], data: [1, 1] },
    },
    MAKKAH: {
      All: { labels: ["Hassan", "Mona", "Yousef", "Rana"], data: [6, 3, 9, 4] },
      WS: { labels: ["Hassan", "Mona"], data: [4, 2] },
      DSC: { labels: ["Yousef", "Rana"], data: [2, 1] },
    },
  };

  const [selectedChannel, setSelectedChannel] = useState("All");

  const handleChannelChange = (value) => setSelectedChannel(value);

  const selectDiv = (
    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
      <Select
        value={selectedBranch}
        placeholder="Select Branch"
        style={{ width: 150 }}
        onChange={handleBranchChange}
        options={branches.map((b) => ({ label: b, value: b }))}
      />
      <Select
        value={selectedChannel}
        placeholder="Select Channel"
        style={{ width: 150 }}
        onChange={handleChannelChange}
        options={channels.map((c) => ({ label: c, value: c }))}
      />
    </div>
  );

  const handleNavigateCustomer = () => {
    navigate("/customer-analysis");
  };

  return (
    <div className="dashboard">
      <div className="top-tabs-container">
        {tabs.map((tab, index) => (
          <div key={index} className="tab-card">
            <div className="tab-header">
              <div className="tab-icon">{tab.icon}</div>
              <div className="tab-title">{tab.title}</div>
            </div>
            <div className="tab-value">{tab.value}</div>
            <div className="tab-footer">
              <span
                className={`tab-change ${
                  tab.positive ? "positive" : "negative"
                }`}
              >
                {tab.positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(tab.change)}%
              </span>
              {tab.subtitle && (
                <span className="tab-subtext">{tab.subtitle}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Weekly Sales"
            labels={["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]}
            colourTheme={["#3f51b5"]}
            units={["pcs"]}
            series={[
              {
                name: "Indomie Sales",
                data: [1000001, 1523457, 1987653, 1765431, 2012345],
              },
            ]}
          />
        </div>

        <div className="graph">
          <BarChart
            graphTitle="Daily Sales Trend"
            labels={weekLabels}
            colourTheme={["#007BFF"]}
            units={["pcs"]}
            series={[
              {
                name: "Indomie Sales",
                data: weeklyData[selectedWeek],
              },
            ]}
            addOnComponent={
              <Select
                defaultValue={selectedWeek}
                style={{ marginBottom: "10px", width: "100%" }}
                onChange={handleWeekChange}
              >
                {Object.keys(weeklyData).map((week) => (
                  <Option key={week} value={week}>
                    {week}
                  </Option>
                ))}
              </Select>
            }
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <LineChart
            graphTitle="Weekly Sales YTD"
            labels={Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`)}
            colourTheme={["#ff69b4"]}
            units={["pcs"]}
            series={[
              {
                name: "Weekly Sales",
                data: [
                  18654.32, 17543.18, 19231.77, 20543.66, 18219.41, 21022.85,
                  17234.99, 19876.52, 18340.17, 22567.89, 19213.67, 17865.12,
                  20110.49, 22341.73, 18897.01, 17445.66, 21433.27, 20755.92,
                  18114.38, 22002.57, 16549.26, 21688.73, 19578.61, 20442.94,
                  22901.33, 17689.15, 20844.56, 18231.77, 19402.63, 18944.2,
                  19987.36, 21873.49, 17200.15, 22500.81, 18456.37, 20122.75,
                  20790.12, 17803.33, 22310.64, 19345.28, 21554.92, 16777.84,
                  20988.46, 19410.59, 20145.92, 17984.37, 22654.81, 18430.59,
                  21102.43, 19021.67, 17602.88, 22218.74,
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <DonutChart
            graphTitle="Channel Sales Contribution"
            labels={["WS", "RTA", "DSC", "KA", "HRC"]}
            colourTheme={[
              "#3f51b5",
              "#28a745",
              "#ff9800",
              "#ffc107",
              "#dc3545",
            ]}
            units={["%"]}
            series={[60, 10, 9, 15, 6]}
            showTable={false}
          />
        </div>

        <div className="graph">
          <LineChart
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
            colourTheme={["#3f51b5", "#28a745"]}
            units={["pcs", "pcs"]}
            series={[
              {
                name: "Actual Sales",
                data: [
                  80000001, 83234567, 85432123, 87654321, 89012345, 81234567,
                  83456789, 85791335, 87913579, 21000001,
                ],
              },
              {
                name: "Target Sales",
                data: [
                  85000000, 86200000, 88400000, 89600000, 91000000, 92200000,
                  94400000, 95700000, 97500000, 95000000,
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Branch-wise Sales vs Target"
            labels={[
              "JEDDAH",
              "MAKKAH",
              "MADINAH",
              "TAIF",
              "YANBU",
              "TABUK",
              "SKAKA",
              "GASIEM",
              "RIYADH",
              "KHARJ",
              "DAWADMI",
              "HAIL",
              "KHOBAR",
              "JUBAIL",
              "HUFUF",
              "HAFR BATIN",
              "KHAMIS MUSHAIT",
              "JIZAN",
              "NAJRAN",
              "QONFUDA",
              "BISHA",
            ]}
            colourTheme={["#ffc107", "#17a2b8"]}
            units={["pcs", "pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  12000000, 9500000, 11000000, 8700000, 14500000, 10200000,
                  9800000, 12500000, 21000000, 13200000, 14100000, 11800000,
                  15500000, 16200000, 13600000, 14800000, 11900000, 12300000,
                  10700000, 9900000, 10100000,
                ],
              },
              {
                name: "Target",
                data: [
                  15000000, 12000000, 14000000, 10000000, 16000000, 11000000,
                  10500000, 13000000, 20000000, 14000000, 15000000, 12500000,
                  16500000, 17000000, 14500000, 15500000, 13000000, 13500000,
                  11500000, 10500000, 12000000,
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Top 10 Customers Sales (WS)"
            labels={[
              "Customer A",
              "Customer B",
              "Customer C",
              "Customer D",
              "Customer E",
              "Customer F",
              "Customer G",
              "Customer H",
              "Customer I",
              "Customer J",
            ]}
            colourTheme={["#ffc107"]} // single yellow/orange color
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  1500000, 1200000, 1800000, 900000, 1100000, 1350000, 1450000,
                  1250000, 1600000, 1400000,
                ],
              },
            ]}
          />
        </div>

        {/* DSC Channel */}
        <div className="graph">
          <BarChart
            graphTitle="Top 10 Customers Sales (DSC)"
            labels={[
              "Customer A",
              "Customer B",
              "Customer C",
              "Customer D",
              "Customer E",
              "Customer F",
              "Customer G",
              "Customer H",
              "Customer I",
              "Customer J",
            ]}
            colourTheme={["#28a745"]} // Green
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  1500000, 1350000, 1700000, 1100000, 1200000, 1400000, 1550000,
                  1300000, 1600000, 1450000,
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Top 10 Customers Sales (KA)"
            labels={[
              "Customer A",
              "Customer B",
              "Customer C",
              "Customer D",
              "Customer E",
              "Customer F",
              "Customer G",
              "Customer H",
              "Customer I",
              "Customer J",
            ]}
            colourTheme={["#ff9800"]} // Orange
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  1300000, 1200000, 1400000, 900000, 1050000, 1250000, 1350000,
                  1150000, 1450000, 1250000,
                ],
              },
            ]}
          />
        </div>

        <div className="graph">
          <BarChart
            graphTitle="Top 10 Customers Sales (RTA, RTI, MM)"
            labels={[
              "Customer A",
              "Customer B",
              "Customer C",
              "Customer D",
              "Customer E",
              "Customer F",
              "Customer G",
              "Customer H",
              "Customer I",
              "Customer J",
            ]}
            colourTheme={["#3f51b5"]}
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  1400000, 1250000, 1600000, 950000, 1150000, 1300000, 1450000,
                  1200000, 1550000, 1350000,
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Top 10 Customers Sales (HRC)"
            labels={[
              "Customer A",
              "Customer B",
              "Customer C",
              "Customer D",
              "Customer E",
              "Customer F",
              "Customer G",
              "Customer H",
              "Customer I",
              "Customer J",
            ]}
            colourTheme={["#dc3545"]} // Red
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [
                  1200000, 1100000, 1350000, 850000, 950000, 1200000, 1300000,
                  1050000, 1400000, 1150000,
                ],
              },
            ]}
          />
        </div>

        <div className="graph">
          <AreaChart
            graphTitle="Category Contribution (pcs)"
            labels={["CUP JUMBO", "CUP", "REGULAR", "JUMBO", "IMPORT", "SQN"]}
            colourTheme={["#dc3545"]}
            units={["pcs"]}
            series={[
              {
                name: "Sales",
                data: [805001, 912345, 1002345, 875001, 1105433, 950777],
              },
            ]}
          />
        </div>
      </div>

      <div className="row">
        <div className="graph">
          <BarChart
            graphTitle="Number of Customers by Channel (YTD)"
            labels={[
              "BRN",
              "DSC",
              "ECM",
              "HRC",
              "KA",
              "MM",
              "RTA",
              "RTI",
              "WS",
            ]}
            colourTheme={["#3f51b5"]}
            units={["Customers"]}
            series={[
              {
                name: "Customers",
                data: customerByChannelData[selectedBranch] || [],
              },
            ]}
            addOnComponent={
              <Select
                value={selectedBranch}
                placeholder="Select Branch"
                style={{ width: 200, marginBottom: 10 }}
                onChange={handleBranchChange}
                options={[
                  { label: "All Branches", value: "all" },
                  { label: "JEDDAH", value: "JEDDAH" },
                  { label: "MAKKAH", value: "MAKKAH" },
                  { label: "MADINAH", value: "MADINAH" },
                  { label: "TAIF", value: "TAIF" },
                  { label: "YANBU", value: "YANBU" },
                  { label: "TABUK", value: "TABUK" },
                  { label: "SKAKA", value: "SKAKA" },
                  { label: "GASIEM", value: "GASIEM" },
                  { label: "RIYADH", value: "RIYADH" },
                  { label: "KHARJ", value: "KHARJ" },
                  { label: "DAWADMI", value: "DAWADMI" },
                  { label: "HAIL", value: "HAIL" },
                  { label: "KHOBAR", value: "KHOBAR" },
                  { label: "JUBAIL", value: "JUBAIL" },
                  { label: "HUFUF", value: "HUFUF" },
                  { label: "HAFR BATIN", value: "HAFR BATIN" },
                  { label: "KHAMIS MUSHAIT", value: "KHAMIS MUSHAIT" },
                  { label: "JIZAN", value: "JIZAN" },
                  { label: "NAJRAN", value: "NAJRAN" },
                  { label: "QONFUDA", value: "QONFUDA" },
                  { label: "BISHA", value: "BISHA" },
                ]}
              />
            }
          />
        </div>

        <div className="graph">
          <BarChart
            graphTitle="Orders per Customer"
            labels={
              ordersData[selectedBranch]?.[selectedChannel]?.labels ||
              ordersData["All"]["All"].labels
            }
            colourTheme={["#28a745"]}
            units={["Orders"]}
            series={[
              {
                name: "Order Count",
                data:
                  ordersData[selectedBranch]?.[selectedChannel]?.data ||
                  ordersData["All"]["All"].data,
              },
            ]}
            addOnComponent={selectDiv}
            onClickFunction={handleNavigateCustomer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
