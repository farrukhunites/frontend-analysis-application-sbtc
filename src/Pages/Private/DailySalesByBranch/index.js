import { Table } from "antd";
import moment from "moment";

const DailySalesByBranch = () => {
  // Example dates (last 7 days) — replace with API data
  const dates = Array.from({ length: 7 })
    .map((_, i) => moment().subtract(i, "days").format("DD-MM"))
    .reverse();

  // Table Columns
  const dateColumns = dates.map((date) => ({
    title: date,
    dataIndex: date,
    key: date,
    align: "center",
    render: (value) => <b>{value}</b>,
  }));

  const columns = [
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      fixed: "left",
      width: 150,
      render: (text) => <b>{text}</b>,
    },
    ...dateColumns,
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (v) => <b style={{ color: "#1677ff" }}>{v}</b>,
    },
    {
      title: "Target",
      dataIndex: "target",
      key: "target",
      align: "right",
    },
    {
      title: "Achievement %",
      dataIndex: "achievement",
      key: "achievement",
      align: "right",
      render: (v) => <b style={{ color: v >= 100 ? "green" : "red" }}>{v}%</b>,
    },
    {
      title: "Daily Ach %",
      dataIndex: "dailyAch",
      key: "dailyAch",
      align: "right",
      render: (v) => `${v}%`,
    },
  ];

  // Sample Data (Replace with API response)
  const dataSource = [
    {
      key: "1",
      branch: "Jeddah",
      "23-12": 1200,
      "24-12": 1600,
      "25-12": 900,
      "26-12": 1800,
      "27-12": 2000,
      "28-12": 1950,
      "29-12": 2100,
      total: 12550,
      target: 15000,
      achievement: 83.6,
      dailyAch: 89,
    },
    {
      key: "2",
      branch: "Makkah",
      "23-12": 900,
      "24-12": 870,
      "25-12": 1100,
      "26-12": 950,
      "27-12": 1200,
      "28-12": 1400,
      "29-12": 1450,
      total: 7870,
      target: 9000,
      achievement: 87.4,
      dailyAch: 78,
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: 20 }}>Daily Sales by Branch</h2>

      <Table
        columns={columns}
        dataSource={dataSource}
        bordered
        size="middle"
        scroll={{ x: "max-content" }}
        pagination={false}
        style={{ background: "#fff", borderRadius: 8 }}
      />
    </div>
  );
};

export default DailySalesByBranch;
