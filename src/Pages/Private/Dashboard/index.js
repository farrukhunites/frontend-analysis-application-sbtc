import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  AimOutlined,
  LineChartOutlined,
  SlidersOutlined,
  BoxPlotOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import "./style.css";
import LineChart from "../../../Components/Charts/LineChart";
import AreaChart from "../../../Components/Charts/AreaChart";
import BarChart from "../../../Components/Charts/BarChart";
import DonutChart from "../../../Components/Charts/DonutChart";
import { useContext, useEffect, useState } from "react";
import { message, Select, Skeleton } from "antd";
import { getDashboardData } from "../../../API/Dashboard";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { CHART_COLORS } from "../../../Components/Charts/chartConfig";
import RiyalIcon from "../../../Utils/RiyalIcon";

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
  all_products_sales_target_graph: { products: [], sales: [], target: [] },
};

const Dashboard = ({ branchCode = null }) => {
  const { selectedMonth } = useDateFilter();
  const { selectedProduct } = useContext(ProductContext);
  const { unitType, valueType, effectiveUnitType, mode } = useContext(UnitValueContext);
  const isValueMode = mode === "val";
  // Charts can only render strings in tooltips — use "SAR" in value mode.
  const chartUnit = isValueMode ? "SAR" : unitType;

  // State for dashboard data and filters
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [weeklySalesGraphData, setWeeklySalesGraphData] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [dailySalesLabels, setDailySalesLabels] = useState([]);

  const [customerByChannelData, setCustomerByChannelData] = useState({});
  const [customerByChannelDataAll, setCustomerByChannelDataAll] = useState(null);

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
          effectiveUnitType,
          valueType,
          branchCode
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
    // selectedProduct.code is "" for "All Products" — still a valid selection.
    if (selectedMonth && selectedProduct) {
      fetchDashboard();
    } else {
      setLoading(false);
      setDashboardData(initialDashboardData);
    }
  }, [selectedMonth, selectedProduct, effectiveUnitType, valueType, branchCode]); // Dependencies remain the same

  // --- Customer By Channel Data Processor Effect ---
  useEffect(() => {
    const pivot = (rawData, allChannels) => {
      const processed = {};
      const totals = allChannels.reduce((acc, c) => ({ ...acc, [c]: 0 }), {});
      rawData.forEach((item) => {
        const branchName = item.Branch?.replace("SBTC ", "") || "Unknown";
        processed[branchName] = allChannels.map((c) => item[c] || 0);
        allChannels.forEach((c) => {
          totals[c] += item[c] || 0;
        });
      });
      processed["all"] = allChannels.map((c) => totals[c]);
      return processed;
    };

    const block = dashboardData.customer_count_channel_branch_wise;
    if (block?.data) {
      const channels = block.channels || [];
      const selectedPivot = pivot(block.data, channels);
      setCustomerByChannelData(selectedPivot);
      setCustomerByChannelDataAll(
        block.data_all_products ? pivot(block.data_all_products, channels) : null
      );

      if (!Object.keys(selectedPivot).includes(selectedBranch)) {
        setSelectedBranch("all");
      }
    } else {
      setCustomerByChannelData({});
      setCustomerByChannelDataAll(null);
      setSelectedBranch("all");
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
        <AppstoreOutlined key="5" />,
      ][index] || <LineChartOutlined key={`default-${index}`} />,
      change: tab?.change,
      positive: tab?.positive,
      abs_change: tab?.abs_change,
      abs_change_suffix: tab?.abs_change_suffix,
      subtitle: tab?.subtitle,
      is_value: tab?.is_value,
    })
  );
  // Pad the array to ensure there are always 6 elements to avoid mapping issues in JSX
  while (tabs.length < 6) {
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

  // Extract the channel labels from the fetched data, safely defaulting to empty array
  const channelLabels =
    dashboardData.channel_contribution_graph?.channels || [];
  const channelSeries =
    dashboardData.channel_contribution_graph?.channel_contribution || [];
  const channelSeriesValues =
    dashboardData?.channel_contribution_graph?.channel_sales_values || [];

  const dynamicColorTheme = CHART_COLORS.slice(0, channelLabels.length);

  // --- Helper function to derive dynamic options (use in JSX) ---
  const getBranchOptions = () => {
    const branchKeys = Object.keys(customerByChannelData || {});
    if (branchKeys.length === 0) {
      return [{ label: "All Branches (Loading)", value: "all" }];
    }
    return branchKeys.map((key) => ({
      label: key === "all" ? "All Branches" : key,
      value: key,
    }));
  };

  // State Rendering when API is being hit or hasn't hit yet
  const isLoadingOrNoData =
    loading || !dashboardData.tabs || dashboardData.tabs.length === 0;

  const dailySales = dashboardData?.monthly_daily_graph?.sales || [];

  const cumulativeSales = dailySales.reduce((acc, curr, index) => {
    if (index === 0) {
      acc.push(curr);
    } else {
      acc.push(acc[index - 1] + curr);
    }
    return acc;
  }, []);

  return (
    <>
      {isLoadingOrNoData ? (
        <div className="dashboard">
          <div className="top-tabs-container">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tab-card">
                <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 1, width: "40%" }} />
              </div>
            ))}
          </div>
          <div className="row">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="graph" style={{ flex: 1 }}>
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ))}
          </div>
          <div className="row">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="graph" style={{ flex: 1 }}>
                <Skeleton active paragraph={{ rows: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="top-tabs-container">
            {/* Tabs access is safe due to the mapping/padding above */}
            {tabs.map((tab, index) => (
              <div key={index} className="tab-card">
                <div className="tab-header">
                  <div className="tab-icon">{tab.icon}</div>
                  <div className="tab-title">{tab.title || "N/A"}</div>
                </div>
                <div className="tab-value">
                  {tab.is_value && (
                    <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6, verticalAlign: "-3px" }}>
                      <RiyalIcon width={18} height={18} color="#1E293B" />
                    </span>
                  )}
                  {tab.value || "N/A"}
                </div>
                <div className="tab-footer">
                  <span
                    className={`tab-change ${
                      tab.positive ? "positive" : "negative"
                    }`}
                  >
                    {/* Safely display change, defaulting to 0 */}
                    {tab.positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(tab.change || 0)}%
                    {typeof tab.abs_change === "number" && (
                      <span className="tab-change-abs">
                        {tab.abs_change >= 0 ? "+" : "−"}
                        {tab.is_value && (
                          <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "-2px", margin: "0 2px" }}>
                            <RiyalIcon
                              width={10}
                              height={10}
                              color={tab.positive ? "#10B981" : "#EF4444"}
                            />
                          </span>
                        )}
                        {Math.abs(tab.abs_change).toLocaleString()}
                        {!tab.is_value && (tab.abs_change_suffix || "").toUpperCase()}
                      </span>
                    )}
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
                graphTitle="All Products: Sales vs Target"
                labels={dashboardData.all_products_sales_target_graph?.products || []}
                colourTheme={[CHART_COLORS[3], CHART_COLORS[0]]}
                units={[chartUnit, chartUnit]}
                series={[
                  {
                    name: "Sales",
                    data: dashboardData.all_products_sales_target_graph?.sales || [],
                  },
                  {
                    name: "Target",
                    data: dashboardData.all_products_sales_target_graph?.target || [],
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <BarChart
                graphTitle="Weekly Sales"
                // Safely access properties with optional chaining and nullish coalescing
                labels={dashboardData.weekly_sales_graph?.week || []}
                colourTheme={[CHART_COLORS[0]]}
                units={[chartUnit]}
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
                colourTheme={[CHART_COLORS[0]]}
                units={[chartUnit]}
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
                colourTheme={[CHART_COLORS[4]]}
                units={[chartUnit]}
                series={[
                  {
                    name: "Daily Sales",
                    data: dailySales,
                  },
                ]}
              />
            </div>
          </div>

          <div className="row">
            <div className="graph">
              <LineChart
                graphTitle="Monthly Cumulative Sales By Date"
                labels={dashboardData?.monthly_daily_graph?.day || []}
                colourTheme={[CHART_COLORS[2]]}
                units={[chartUnit]}
                series={[
                  {
                    name: "Cumulative Sales",
                    data: cumulativeSales,
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
                colourTheme={[CHART_COLORS[1]]}
                units={[chartUnit]}
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
              />
            </div>

            <div className="graph">
              <LineChart
                graphTitle="Monthly Sales"
                labels={dashboardData?.monthly_sales_target_graph?.Months || []}
                colourTheme={[CHART_COLORS[0], CHART_COLORS[2]]}
                units={[chartUnit, chartUnit]}
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
                colourTheme={[CHART_COLORS[3], CHART_COLORS[0]]}
                units={[chartUnit, chartUnit]}
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
                graphTitle={`${
                  dashboardData.sku_contribution_graph?.mix_type === "product"
                    ? "Product"
                    : "SKU"
                } Contribution (${chartUnit})`}
                labels={dashboardData.sku_contribution_graph?.labels || []}
                colourTheme={[CHART_COLORS[0]]}
                units={[chartUnit]}
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
                labels={
                  dashboardData.customer_count_channel_branch_wise?.channels ||
                  []
                }
                colourTheme={
                  customerByChannelDataAll
                    ? [CHART_COLORS[0], CHART_COLORS[3]]
                    : [CHART_COLORS[0]]
                }
                units={
                  customerByChannelDataAll
                    ? ["Customers", "Customers"]
                    : ["Customers"]
                }
                series={
                  customerByChannelDataAll
                    ? [
                        {
                          name: "All Customers",
                          data:
                            customerByChannelDataAll[selectedBranch] || [],
                        },
                        {
                          name:
                            selectedProduct?.code
                              ? selectedProduct?.name || "Selected Product"
                              : "Allowed Products",
                          data: customerByChannelData[selectedBranch] || [],
                        },
                      ]
                    : [
                        {
                          name: "Customers",
                          data: customerByChannelData[selectedBranch] || [],
                        },
                      ]
                }
                addOnComponent={
                  <Select
                    value={selectedBranch}
                    placeholder="Select Branch"
                    style={{ width: 200, marginBottom: 10 }}
                    onChange={handleBranchChange}
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
