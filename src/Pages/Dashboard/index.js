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
import { useContext, useEffect, useState } from "react";
import { message, Radio, Select, Spin } from "antd";
import { getDashboardData } from "../../API/AnalysisSnapshot";
import { useDateFilter } from "../../Contexts/DateFilterContext";
import { ProductContext } from "../../Contexts/ProductContext";

// Define a safe initial structure for dashboardData
const initialDashboardData = {
  tabs: [],
  daily_week_graph: {},
  weekly_sales_graph: { week: [], sales: [] },
  weekly_ytd_graph: { Week: [], Sales: [] },
  channel_contribution_graph: { channels: [], channel_contribution: [] },
  branch_sales_target_graph: { branches: [], sales: [], target: [] },
  sku_contribution_graph: { labels: [], Sales: [] },
  customer_count_channel_branch_wise: { data: [], channels: [] },
  monthly_sales_target_graph: {
    Months: [],
    "Actual Sales": [],
    "Target Sales": [],
  },
};

const Dashboard = () => {
  const { selectedMonth } = useDateFilter();
  const { selectedProduct } = useContext(ProductContext);

  // State for dashboard data and filters
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [loading, setLoading] = useState(false);
  const [valueType, setValueType] = useState("net"); // 'net' or 'gross'
  const [unitType, setUnitType] = useState("ctn"); // 'pcs' or 'ctn'
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [weeklySalesGraphData, setWeeklySalesGraphData] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [dailySalesLabels, setDailySalesLabels] = useState([]);

  const [customerByChannelData, setCustomerByChannelData] = useState({});

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);

      const endpoint = "dashboard_monthly_snapshot";
      const productCode = selectedProduct?.code;

      try {
        const res = await getDashboardData(
          endpoint,
          selectedMonth,
          productCode,
          unitType,
          valueType
        );
        if (res?.result) {
          const newDashboardData = {
            ...initialDashboardData,
            ...res.result,
          };
          setDashboardData(newDashboardData);

          if (newDashboardData.daily_week_graph) {
            const graphData = newDashboardData.daily_week_graph;

            const processedSalesData = Object.keys(graphData).reduce(
              (acc, weekKey) => {
                acc[weekKey] = graphData[weekKey]?.sales || [];
                return acc;
              },
              {}
            );

            setWeeklySalesGraphData(processedSalesData);
            const keys = Object.keys(graphData);
            const firstWeek = keys[keys.length - 1];
            if (firstWeek) {
              setSelectedWeek(firstWeek);
              setDailySalesLabels(graphData[firstWeek]?.days || []);
            }
          }
        } else {
          setDashboardData(initialDashboardData);
          message.error(
            "Failed to fetch dashboard data: " +
              (res?.message || "Unknown error")
          );
        }
      } catch (error) {
        setDashboardData(initialDashboardData);
        message.error("Error fetching dashboard data: " + error?.message);
      }
      setLoading(false);
    };
    if (selectedMonth && selectedProduct?.code) {
      fetchDashboard();
    } else {
      setLoading(false);
      setDashboardData(initialDashboardData);
    }
  }, [selectedMonth, selectedProduct, unitType, valueType]); // Dependencies remain the same

  // --- Customer By Channel Data Processor Effect ---
  useEffect(() => {
    if (dashboardData.customer_count_channel_branch_wise?.data) {
      const { data: rawData, channels: allChannels } =
        dashboardData.customer_count_channel_branch_wise;

      const processedData = {};
      const allTotals = allChannels.reduce((acc, channel) => {
        acc[channel] = 0;
        return acc;
      }, {});

      rawData.forEach((item) => {
        const branchName = item.Branch?.replace("SBTC ", "") || "Unknown"; // Safely access and replace
        const branchDataArray = allChannels.map(
          (channel) => item[channel] || 0
        );
        processedData[branchName] = branchDataArray;

        allChannels.forEach((channel) => {
          allTotals[channel] += item[channel] || 0;
        });
      });

      processedData["all"] = allChannels.map((channel) => allTotals[channel]);

      // FIX: setCustomerByChannelData is now defined
      setCustomerByChannelData(processedData);

      // Safety check: ensure selectedBranch is valid or default to 'all'
      if (!Object.keys(processedData).includes(selectedBranch)) {
        setSelectedBranch("all");
      }
    } else {
      // FIX: setCustomerByChannelData is now defined
      setCustomerByChannelData({});
      setSelectedBranch("all"); // Reset if source data is missing
    }
  }, [dashboardData, selectedBranch]);

  // --- Handlers ---
  const handleBranchChange = (value) => {
    setSelectedBranch(value);
  };

  const handleWeekChange = (value) => {
    setSelectedWeek(value);

    if (
      dashboardData.daily_week_graph &&
      dashboardData.daily_week_graph[value]
    ) {
      setDailySalesLabels(dashboardData.daily_week_graph[value]?.days || []);
    } else {
      setDailySalesLabels([]);
    }
  };

  const renderRadioButtons = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
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
          value={valueType}
          onChange={(e) => setValueType(e.target.value)}
        >
          <Radio value="net">NET</Radio>
          <Radio value="gross">GROSS</Radio>
        </Radio.Group>
      </div>
    </div>
  );

  // Safely derive tabs data, using initialDashboardData.tabs default
  const tabs = (dashboardData.tabs || initialDashboardData.tabs).map(
    (tab, index) => ({
      title: tab?.title,
      value: tab?.value,
      // Fallback icons for safety if tab data is sparse
      icon: [
        <LineChartOutlined key="0" />,
        <SlidersOutlined key="1" />,
        <AimOutlined key="2" />,
        <BoxPlotOutlined key="3" />,
        <LineChartOutlined key="4" />,
      ][index] || <LineChartOutlined key={`default-${index}`} />,
      change: tab?.change,
      positive: tab?.positive,
      subtitle: tab?.subtitle,
    })
  );
  // Pad the array to ensure there are always 5 elements to avoid mapping issues in JSX
  while (tabs.length < 5) {
    tabs.push({
      title: "Loading...",
      value: "...",
      icon: [
        <LineChartOutlined key="0" />,
        <SlidersOutlined key="1" />,
        <AimOutlined key="2" />,
        <BoxPlotOutlined key="3" />,
        <LineChartOutlined key="4" />,
      ][tabs.length] || <LineChartOutlined key={`default-${tabs.length}`} />,
      change: 0,
      positive: true,
      subtitle: "Fetching Data",
    });
  }

  // Define a large palette of distinct, bright colors
  const BRIGHT_COLORS = [
    "#FF6384", // Red
    "#36A2EB", // Blue
    "#FFCE56", // Yellow
    "#4BC0C0", // Cyan
    "#9966FF", // Purple
    "#FF9F40", // Orange
    "#00CD99", // Sea Green
    "#E60049", // Deep Pink
    "#0BB4FF", // Sky Blue
    "#50E991", // Mint Green
    "#EE82EE", // Violet
    "#FFA500", // Gold Orange
    // Add more colors if you expect more than 11 channels
  ];

  // Extract the channel labels from the fetched data, safely defaulting to empty array
  const channelLabels =
    dashboardData.channel_contribution_graph?.channels || [];
  const channelSeries =
    dashboardData.channel_contribution_graph?.channel_contribution || [];
  const channelSeriesValues =
    dashboardData?.channel_contribution_graph?.channel_sales_values || [];

  const dynamicColorTheme = BRIGHT_COLORS.slice(0, channelLabels.length);

  // --- Helper function to derive dynamic options (use in JSX) ---
  const getBranchOptions = () => {
    // Ensure customerByChannelData is not empty before deriving keys
    // FIX: customerByChannelData is now defined
    const branchKeys = Object.keys(customerByChannelData || {});

    // If no keys are present, return a default 'All Branches' option
    if (branchKeys.length === 0) {
      return [{ label: "All Branches (Loading)", value: "all" }];
    }

    // Create the options array
    return branchKeys.map((key) => {
      let label = key;
      if (key === "all") {
        label = "All Branches";
      }
      return { label: label, value: key };
    });
  };

  // State Rendering when API is being hit or hasn't hit yet
  const isLoadingOrNoData =
    loading || !dashboardData.tabs || dashboardData.tabs.length === 0;

  return (
    <>
      {isLoadingOrNoData ? (
        <div
          className="loader-container"
          style={{ textAlign: "center", padding: "50px" }}
        >
          <Spin size="large" />
          <h2>Loading Dashboard Data...</h2>
          <p>Please wait while the data is being fetched.</p>
        </div>
      ) : (
        <div className="dashboard">
          {renderRadioButtons()}
          <div className="top-tabs-container">
            {/* Tabs access is safe due to the mapping/padding above */}
            {tabs.map((tab, index) => (
              <div key={index} className="tab-card">
                <div className="tab-header">
                  <div className="tab-icon">{tab.icon}</div>
                  <div className="tab-title">{tab.title || "N/A"}</div>
                </div>
                <div className="tab-value">{tab.value || "N/A"}</div>
                <div className="tab-footer">
                  <span
                    className={`tab-change ${
                      tab.positive ? "positive" : "negative"
                    }`}
                  >
                    {/* Safely display change, defaulting to 0 */}
                    {tab.positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(tab.change || 0)}%
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
                // Safely access properties with optional chaining and nullish coalescing
                labels={dashboardData.weekly_sales_graph?.week || []}
                colourTheme={["#3f51b5"]}
                units={[unitType]}
                series={[
                  {
                    name: selectedProduct?.name || "Sales",
                    data: dashboardData.weekly_sales_graph?.sales || [],
                  },
                ]}
              />
            </div>

            <div className="graph">
              <LineChart
                graphTitle="Daily Sales Trend"
                labels={dailySalesLabels}
                colourTheme={["#007BFF"]}
                units={[unitType]}
                series={[
                  {
                    name: `${selectedProduct?.name || "Product"} Sales`,
                    // Safely access array element, defaulting to empty array
                    data: weeklySalesGraphData[selectedWeek] || [],
                  },
                ]}
                addOnComponent={
                  <Select
                    value={selectedWeek}
                    placeholder="Select Week"
                    style={{ marginBottom: "10px", width: "100%" }}
                    onChange={handleWeekChange}
                    // Options generated from processed week keys, defaulting to empty array
                    options={Object.keys(weeklySalesGraphData).map((week) => ({
                      label: week,
                      value: week,
                    }))}
                  />
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <LineChart
                graphTitle="Monthly Sales By Date"
                labels={dashboardData?.monthly_daily_graph?.day || []}
                colourTheme={["red"]}
                units={[unitType]}
                series={[
                  {
                    name: "Weekly Sales",
                    data: dashboardData?.monthly_daily_graph?.sales || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <LineChart
                graphTitle="Weekly Sales YTD"
                labels={dashboardData.weekly_ytd_graph?.Week || []}
                colourTheme={["#ff69b4"]}
                units={[unitType]}
                series={[
                  {
                    name: "Weekly Sales",
                    data: dashboardData.weekly_ytd_graph?.Sales || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <DonutChart
                graphTitle="Channel Sales Contribution"
                labels={channelLabels}
                colourTheme={dynamicColorTheme}
                units={["%"]}
                series={channelSeries}
                seriesValues={channelSeriesValues}
                showTable={false}
              />
            </div>

            <div className="graph">
              <LineChart
                graphTitle="Monthly Sales"
                labels={dashboardData?.monthly_sales_target_graph?.Months || []}
                colourTheme={["#3f51b5", "#28a745"]}
                units={[unitType, unitType]}
                series={[
                  {
                    name: "Actual Sales", // Also safe guard the data arrays
                    data:
                      dashboardData?.monthly_sales_target_graph?.[
                        "Actual Sales"
                      ] || [],
                  },
                  {
                    name: "Target Sales", // Also safe guard the data arrays
                    data:
                      dashboardData?.monthly_sales_target_graph?.[
                        "Target Sales"
                      ] || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <BarChart
                graphTitle="Branch-wise Sales vs Target"
                labels={dashboardData.branch_sales_target_graph?.branches || []}
                colourTheme={["#ffc107", "#17a2b8"]}
                units={["pcs", "pcs"]}
                series={[
                  {
                    name: "Sales",
                    data: dashboardData.branch_sales_target_graph?.sales || [],
                  },
                  {
                    name: "Target",
                    data: dashboardData.branch_sales_target_graph?.target || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <AreaChart
                graphTitle={`Category Contribution (${unitType})`}
                labels={dashboardData.sku_contribution_graph?.labels || []}
                colourTheme={["#dc3545"]}
                units={[unitType]}
                series={[
                  {
                    name: "Sales",
                    data: dashboardData.sku_contribution_graph?.Sales || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <BarChart
                graphTitle="Number of Customers by Channel (YTD)"
                // Safely access channel labels
                labels={
                  dashboardData.customer_count_channel_branch_wise?.channels ||
                  []
                }
                colourTheme={["#3f51b5"]}
                units={["Customers"]}
                series={[
                  {
                    name: "Customers",
                    // data is pulled from the processed state based on the selectedBranch
                    // FIX: customerByChannelData is now defined
                    data: customerByChannelData[selectedBranch] || [],
                  },
                ]}
                addOnComponent={
                  <Select
                    value={selectedBranch}
                    placeholder="Select Branch"
                    style={{ width: 200, marginBottom: 10 }}
                    onChange={handleBranchChange}
                    // Options are dynamically generated from the processed data keys
                    options={getBranchOptions()}
                  />
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
