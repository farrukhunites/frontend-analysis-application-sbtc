import { useState, useEffect, useMemo, useContext } from "react";
import { Table, Radio, message, Spin, Tabs, Select } from "antd";
import { ProductContext } from "../../../Contexts/ProductContext";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { getAllProducts } from "../../../API/Products";
import { getDailyBranchSales } from "../../../API/Daily STT Report";
import "./style.css";

const { Option } = Select;

const DailySalesByBranch = () => {
  const { selectedMonth } = useDateFilter();
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);

  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [dayColumns, setDayColumns] = useState([]);
  const [unitType, setUnitType] = useState("ctn");
  const [valueType, setValueType] = useState("net");
  const [channels, setChannels] = useState([
    "BRN",
    "RTI",
    "WS",
    "PHA",
    "CFC",
    "CSM",
    "DSC",
    "ECM",
    "HRC",
    "KA",
    "MM",
    "RTA",
  ]);
  const [selectedChannels, setSelectedChannels] = useState(channels);

  // ------------------------------
  // Fetch products
  // ------------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts();
        const products = res?.results || [];

        const hasIndomie = products.some((p) =>
          p?.name?.toLowerCase()?.includes("indomie"),
        );
        if (hasIndomie) {
          const specialIndomie = [
            { code: "9999901", name: "INDOMIE PILLOW (All)" },
            { code: "9999902", name: "INDOMIE CUP (All)" },
          ];
          specialIndomie.forEach((p) => {
            if (!products.some((prod) => prod?.code === p?.code))
              products.push(p);
          });
        }

        setProductOptions(products);
        if (!selectedProduct && products.length > 0)
          setSelectedProduct(products[0]);
      } catch (err) {
        message.error("Error fetching products: " + err.message);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedProduct, setSelectedProduct]);

  // ------------------------------
  // Fetch sales data
  // ------------------------------
  useEffect(() => {
    const fetchSales = async () => {
      if (!selectedProduct) return;
      setLoading(true);
      try {
        const res = await getDailyBranchSales(
          selectedMonth,
          selectedProduct.code,
          unitType,
          valueType,
          selectedChannels,
        );

        const results = res?.results || [];

        // Extract day columns (assuming keys like "01-12", "02-12" etc.)
        const dayKeys = [];
        if (results.length > 0) {
          Object.keys(results[0]).forEach((key) => {
            // Only include keys that are day names
            if (
              [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].includes(key)
            ) {
              dayKeys.push(key);
            }
          });
        }

        console.log(dayKeys);

        // Map day keys to readable short names
        const mappedDays = dayKeys.map((key) => ({
          key,
          title: key,
        }));

        setDayColumns(mappedDays);
        setSalesData(results);
      } catch (err) {
        message.error("Error fetching daily sales: " + err.message);
      }
      setLoading(false);
    };

    fetchSales();
  }, [selectedProduct, unitType, valueType, selectedMonth, selectedChannels]);

  // ------------------------------
  // Columns for Table
  // ------------------------------
  const columns = useMemo(() => {
    const dayCols = dayColumns.map((d) => ({
      title: d.title,
      dataIndex: d.key,
      key: d.key,
      align: "right",
      sorter: (a, b) =>
        a.isTotal ? 1 : b.isTotal ? -1 : (a[d.key] || 0) - (b[d.key] || 0),
      render: (v) => renderNumber(v, "#000", false),
    }));

    const renderNumber = (v, color = "#000", bold = true) => {
      if (v === 0 || v === null || v === undefined) return "-";
      return bold ? (
        <b style={{ color }}>{v.toLocaleString()}</b>
      ) : (
        <span style={{ color }}>{v.toLocaleString()}</span>
      );
    };

    const numericCols = [
      {
        title: "MTD",
        dataIndex: "total",
        key: "total",
        align: "right",
        sorter: (a, b) =>
          a.isTotal ? 1 : b.isTotal ? -1 : (a.total || 0) - (b.total || 0),
        render: (v) => renderNumber(v, "#3B82F6"),
      },
      {
        title: "Remaining",
        dataIndex: "remaining",
        key: "remaining",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.remaining || 0) - (b.remaining || 0),
        render: (v) => renderNumber(v, "#F59E0B"),
      },
      {
        title: "Target",
        dataIndex: "target",
        key: "target",
        align: "right",
        sorter: (a, b) =>
          a.isTotal ? 1 : b.isTotal ? -1 : (a.target || 0) - (b.target || 0),
        render: (v) => renderNumber(v, "#000000ff"),
      },
      {
        title: "Achievement %",
        dataIndex: "achievement",
        key: "achievement",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.achievement || 0) - (b.achievement || 0),
        render: (v) =>
          v === 0 ? (
            "-"
          ) : (
            <b style={{ color: v >= 100 ? "green" : "red" }}>
              {v?.toFixed(2)}%
            </b>
          ),
      },
      {
        title: "Daily Ach %",
        dataIndex: "dailyAch",
        key: "dailyAch",
        align: "right",
        sorter: (a, b) =>
          a.isTotal
            ? 1
            : b.isTotal
              ? -1
              : (a.dailyAch || 0) - (b.dailyAch || 0),
        render: (v) =>
          v === 0 ? (
            "-"
          ) : (
            <b style={{ color: v >= 100 ? "green" : "red" }}>
              {v?.toFixed(2)}%
            </b>
          ),
      },
    ];

    return [
      {
        title: "Branch",
        dataIndex: "branch",
        key: "branch",
        fixed: "left",
        width: 130,
        render: (v) => (
          <b style={{ color: "#000000ff" }}>{v?.toLocaleString()}</b>
        ),
      },
      ...dayCols,
      ...numericCols,
    ];
  }, [dayColumns]);

  // ------------------------------
  // Append Grand Total Row
  // ------------------------------
  const dataWithTotal = useMemo(() => {
    if (!salesData.length) return [];

    const totalRow = {
      branch: "GRAND TOTAL",
      key: "grand-total",
      isTotal: true,
    };

    // Sum each day
    dayColumns.forEach((d) => {
      totalRow[d.key] = salesData.reduce((sum, r) => sum + (r[d.key] || 0), 0);
    });

    totalRow.total = salesData.reduce((sum, r) => sum + (r.total || 0), 0);
    totalRow.target = salesData.reduce((sum, r) => sum + (r.target || 0), 0);
    totalRow.remaining = totalRow.target - totalRow.total;
    totalRow.achievement = totalRow.target
      ? (totalRow.total / totalRow.target) * 100
      : 0;
    totalRow.dailyAch = totalRow.target
      ? (totalRow[dayColumns[dayColumns.length - 1].key] /
          (totalRow.target / salesData.length)) *
        100
      : 0;

    return [...salesData.map((r, idx) => ({ key: idx, ...r })), totalRow];
  }, [salesData, dayColumns]);

  const productTabs = productOptions.map((p) => ({
    label: p.name,
    key: p.code,
  }));

  const handleChannelChange = (values) => {
    if (values.includes("ALL")) {
      setSelectedChannels(channels); // select all
    } else if (values.includes("NONE")) {
      setSelectedChannels([]); // unselect all
    } else {
      setSelectedChannels(values);
    }
  };

  return (
    <div className="daily-sales-report" style={{ padding: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <h2>Daily Sales by Branch</h2>
        {/* Channel Select */}
        <Select
          mode="multiple"
          loading={loading}
          value={selectedChannels}
          onChange={handleChannelChange}
          style={{ flex: 1, maxWidth: "500px" }}
          placeholder="Select Channels"
        >
          <Option key="ALL" value="ALL">
            Select All
          </Option>
          <Option key="NONE" value="NONE">
            Unselect All
          </Option>
          {channels.map((channel) => (
            <Option key={channel} value={channel}>
              {channel}
            </Option>
          ))}
        </Select>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
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
      </div>

      {loading && <Spin size="large" style={{ marginBottom: 20 }} />}

      <Tabs
        activeKey={selectedProduct?.code}
        onChange={(key) => {
          const prod = productOptions.find((p) => p.code === key);
          if (prod) setSelectedProduct(prod);
        }}
        style={{ marginBottom: 20 }}
      >
        {productTabs.map((tab) => (
          <Tabs.TabPane tab={tab.label} key={tab.key} />
        ))}
      </Tabs>

      <Table
        columns={columns}
        dataSource={dataWithTotal}
        bordered
        size="middle"
        scroll={{ x: "max-content", y: "60vh" }}
        pagination={false}
        rowClassName={(record) => (record.isTotal ? "grand-total-row" : "")}
        style={{ background: "#fff", borderRadius: 8 }}
      />
    </div>
  );
};

export default DailySalesByBranch;
