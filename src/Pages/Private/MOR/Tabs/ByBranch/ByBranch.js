import { Table, Tag } from "antd";
import "./style.css"; // for custom styles

const data = [
  {
    key: 1,
    branch: "SBTC JEDDAH",
    total2024: 56488,
    total2025: 63074,
    growth: 11.66,
    target2025: 72644,
    achievement: 86.83,
  },
  {
    key: 2,
    branch: "SBTC MAKKAH",
    total2024: 11116,
    total2025: 10157,
    growth: -8.63,
    target2025: 12883,
    achievement: 78.84,
  },
  {
    key: 3,
    branch: "SBTC MADINAH",
    total2024: 13109,
    total2025: 12050,
    growth: -8.08,
    target2025: 13588,
    achievement: 88.68,
  },
  {
    key: 4,
    branch: "SBTC TAIF",
    total2024: 6042,
    total2025: 5565,
    growth: -7.9,
    target2025: 6806,
    achievement: 81.77,
  },
  {
    key: 5,
    branch: "SBTC YANBU",
    total2024: 2128,
    total2025: 2018,
    growth: -5.16,
    target2025: 2283,
    achievement: 88.4,
  },
  {
    key: 6,
    branch: "SBTC TABUK",
    total2024: 7347,
    total2025: 7526,
    growth: 2.44,
    target2025: 7172,
    achievement: 104.94,
  },
  {
    key: 7,
    branch: "SBTC SKAKA",
    total2024: 7064,
    total2025: 7843,
    growth: 11.04,
    target2025: 6795,
    achievement: 115.42,
  },
  {
    key: 8,
    branch: "SBTC GASIEM",
    total2024: 15022,
    total2025: 13768,
    growth: -8.35,
    target2025: 16240,
    achievement: 84.78,
  },
  {
    key: 9,
    branch: "SBTC RIYADH",
    total2024: 65007,
    total2025: 64500,
    growth: -0.78,
    target2025: 68264,
    achievement: 94.49,
  },
  {
    key: 10,
    branch: "SBTC KHARJ",
    total2024: 2729,
    total2025: 2989,
    growth: 9.54,
    target2025: 3262,
    achievement: 91.65,
  },
  {
    key: 11,
    branch: "SBTC DAWADMI",
    total2024: 748,
    total2025: 1008,
    growth: 34.71,
    target2025: 1028,
    achievement: 98.01,
  },
  {
    key: 12,
    branch: "SBTC HAIL",
    total2024: 4917,
    total2025: 5244,
    growth: 6.66,
    target2025: 5299,
    achievement: 98.97,
  },
  {
    key: 13,
    branch: "SBTC KHOBAR",
    total2024: 25703,
    total2025: 20761,
    growth: -19.23,
    target2025: 25784,
    achievement: 80.52,
  },
  {
    key: 14,
    branch: "SBTC JUBAIL",
    total2024: 4311,
    total2025: 4164,
    growth: -3.41,
    target2025: 5153,
    achievement: 80.8,
  },
  {
    key: 15,
    branch: "SBTC HUFUF",
    total2024: 4801,
    total2025: 5027,
    growth: 4.72,
    target2025: 6159,
    achievement: 81.62,
  },
  {
    key: 16,
    branch: "SBTC HAFR BATIN",
    total2024: 7554,
    total2025: 7977,
    growth: 5.6,
    target2025: 7948,
    achievement: 100.37,
  },
  {
    key: 17,
    branch: "SBTC KHAMIS MUSHAIT",
    total2024: 23623,
    total2025: 20460,
    growth: -13.39,
    target2025: 24058,
    achievement: 85.05,
  },
  {
    key: 18,
    branch: "SBTC JIZAN",
    total2024: 14505,
    total2025: 14187,
    growth: -2.19,
    target2025: 15007,
    achievement: 94.54,
  },
  {
    key: 19,
    branch: "SBTC NAJRAN",
    total2024: 12313,
    total2025: 12266,
    growth: -0.38,
    target2025: 13656,
    achievement: 89.82,
  },
  {
    key: 20,
    branch: "SBTC QONFUDA",
    total2024: 5308,
    total2025: 4946,
    growth: -6.82,
    target2025: 6035,
    achievement: 81.96,
  },
  {
    key: 21,
    branch: "SBTC BISHA",
    total2024: 2412,
    total2025: 2281,
    growth: -5.41,
    target2025: 2592,
    achievement: 88.01,
  },
  {
    key: 22,
    branch: "TOTAL",
    total2024: 292247,
    total2025: 287814,
    growth: -1.52,
    target2025: 322656,
    achievement: 89.2,
  },
];

const columns = [
  {
    title: "BRANCHES",
    dataIndex: "branch",
    key: "branch",
    fixed: "left",
  },
  {
    title: "TOTAL 2024 (JAN - SEPT)",
    dataIndex: "total2024",
    key: "total2024",
    align: "right",
  },
  {
    title: "TOTAL 2025 (JAN - SEPT)",
    dataIndex: "total2025",
    key: "total2025",
    align: "right",
  },
  {
    title: "GROWTH %",
    dataIndex: "growth",
    key: "growth",
    align: "right",
    render: (value) => (
      <Tag color={value >= 0 ? "green" : "volcano"}>{value}%</Tag>
    ),
  },
  {
    title: "TARGET 2025 (JAN - SEPT)",
    dataIndex: "target2025",
    key: "target2025",
    align: "right",
  },
  {
    title: "ACHIEVEMENT %",
    dataIndex: "achievement",
    key: "achievement",
    align: "right",
    render: (value) => {
      let color = "geekblue";
      if (value >= 100) color = "green";
      else if (value < 80) color = "volcano";
      return <Tag color={color}>{value}%</Tag>;
    },
  },
];

const ByBranch = () => {
  return (
    <div>
      <h3 style={{ marginBottom: "16px", textAlign: "center" }}>
        SALES PERFORMANCE – BY BRANCH
      </h3>

      <Table
        columns={columns}
        dataSource={data}
        bordered
        pagination={false}
        scroll={{ x: "max-content" }}
        rowClassName={(record) =>
          record.branch === "TOTAL" ? "total-row" : ""
        }
        className="modern-table"
      />
    </div>
  );
};

export default ByBranch;
