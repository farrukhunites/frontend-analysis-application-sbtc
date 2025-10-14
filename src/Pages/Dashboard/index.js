import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  AimOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import "./style.css";

const Dashboard = () => {
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
      icon: <DollarOutlined />,
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
      icon: <BarChartOutlined />,
      change: 5.6,
      positive: true,
      subtitle: "vs last period",
    },
    {
      title: "Year to Date",
      value: (842167496).toLocaleString() + " pcs",
      icon: <BarChartOutlined />,
      change: 5.6,
      positive: false,
      subtitle: "vs last period",
    },
  ];

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
    </div>
  );
};

export default Dashboard;
