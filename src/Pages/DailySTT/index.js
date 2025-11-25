import React, { useContext, useEffect, useMemo, useState } from "react";
import { Table, Select, message } from "antd";
import "./style.css";
import { getAllProducts } from "../../API/Products";
import { ProductContext } from "../../Contexts/ProductContext";
import { useDateFilter } from "../../Contexts/DateFilterContext";
import { getDailySTT } from "../../API/Daily STT Report";

const branch_region_map = {
  "SBTC BISHA": "SOUTHERN",
  "SBTC KHAMIS MUSHAIT": "SOUTHERN",
  "SBTC NAJRAN": "SOUTHERN",
  "SBTC QONFUDA": "SOUTHERN",
  "SBTC DAWADMI": "NORTH & CENTRAL",
  "SBTC GASIEM": "NORTH & CENTRAL",
  "SBTC HAIL": "NORTH & CENTRAL",
  "SBTC SKAKA": "NORTH & CENTRAL",
  "SBTC TABUK": "NORTH & CENTRAL",
  "SBTC HAFR BATIN": "EASTERN",
  "SBTC HUFUF": "EASTERN",
  "SBTC JUBAIL": "EASTERN",
  "SBTC KHOBAR": "EASTERN",
  "SBTC MADINAH": "WESTERN",
  "SBTC MAKKAH": "WESTERN",
  "SBTC TAIF": "WESTERN",
  "SBTC YANBU": "WESTERN",
  "SBTC KHARJ": "RIYADH & KHARJ",
  "SBTC RIYADH": "RIYADH & KHARJ",
  "SBTC JEDDAH": "JEDDAH",
  "SBTC JIZAN": "JIZAN",
};

const branchesData = [
  { branch: "SBTC JEDDAH", region: "JEDDAH" },
  { branch: "SBTC JIZAN", region: "JIZAN" },
  { branch: "SBTC RIYADH", region: "RIYADH & KHARJ" },
  { branch: "SBTC KHARJ", region: "RIYADH & KHARJ" },
  { branch: "SBTC MAKKAH", region: "WESTERN" },
  { branch: "SBTC MADINAH", region: "WESTERN" },
  { branch: "SBTC TAIF", region: "WESTERN" },
  { branch: "SBTC YANBU", region: "WESTERN" },
  { branch: "SBTC BISHA", region: "SOUTHERN" },
  { branch: "SBTC KHAMIS MUSHAIT", region: "SOUTHERN" },
  { branch: "SBTC NAJRAN", region: "SOUTHERN" },
  { branch: "SBTC QONFUDA", region: "SOUTHERN" },
  { branch: "SBTC DAWADMI", region: "NORTH & CENTRAL" },
  { branch: "SBTC GASIEM", region: "NORTH & CENTRAL" },
  { branch: "SBTC HAIL", region: "NORTH & CENTRAL" },
  { branch: "SBTC SKAKA", region: "NORTH & CENTRAL" },
  { branch: "SBTC TABUK", region: "NORTH & CENTRAL" },
  { branch: "SBTC HAFR BATIN", region: "EASTERN" },
  { branch: "SBTC HUFUF", region: "EASTERN" },
  { branch: "SBTC JUBAIL", region: "EASTERN" },
  { branch: "SBTC KHOBAR", region: "EASTERN" },
];

// Generate product columns
const getProductColumns = (product) => {
  const slug = product.toLowerCase().replace(/\s+/g, "_");
  return {
    title: product,
    children: [
      {
        title: "Sales",
        dataIndex: `${slug}_sales`,
        render: (v) => v?.toLocaleString(),
      },
      {
        title: "Target",
        dataIndex: `${slug}_target`,
        render: (v) => v?.toLocaleString(),
      },
      {
        title: "Last Yr",
        dataIndex: `${slug}_jun24`,
        render: (v) => v?.toLocaleString(),
      },

      {
        title: "Growth %",
        render: (_, record) => {
          const g =
            ((record[`${slug}_jun25`] - record[`${slug}_jun24`]) /
              (record[`${slug}_jun24`] || 1)) *
            100;
          return (
            <span style={{ color: g < 0 ? "red" : "green" }}>
              {g.toFixed(1)}%
            </span>
          );
        },
      },
    ],
  };
};

const DailySTT = () => {
  const [loading, setLoading] = useState(false);
  const { selectedMonth } = useDateFilter();
  const [dailySTTReport, setDailySTTReport] = useState({});
  const { selectedProduct } = useContext(ProductContext);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([
    selectedProduct?.code,
  ]);
  const [msgApi, contextHolder] = message.useMessage();

  console.log("Selected Month: ", selectedMonth);

  // Random data generation
  const baseData = branchesData.map((b, i) => {
    const row = { key: i + 1, branch: b.branch };
    productOptions.forEach((p) => {
      const slug = p?.toLowerCase().replace(/\s+/g, "_");
      row[`${slug}_target`] = Math.round(Math.random() * 5000);
      row[`${slug}_sales`] = Math.round(Math.random() * 5000);
      row[`${slug}_jun24`] = Math.round(Math.random() * 5000);
      row[`${slug}_jun25`] = Math.round(Math.random() * 5000);
    });
    return row;
  });

  console.log(dailySTTReport);

  useEffect(() => {
    const fetchDailySTTReport = async () => {
      setLoading(true);
      try {
        const res = await getDailySTT(
          selectedMonth,
          selectedProducts.join(", ")
        );
        if (res?.results) {
          setDailySTTReport(res.results);
        } else {
          message.error(
            "Failed to fetch daily stt report: " +
              (res?.message || "Unknown error")
          );
        }
      } catch (error) {
        message.error("Error fetching daily stt report: " + error?.message);
      }
      setLoading(false);
    };

    const fetchProductOptions = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts();
        if (res) {
          let products = res.results || [];

          const hasIndomie = products.some((p) =>
            p?.name?.toLowerCase().includes("indomie")
          );

          // if yes, add the 2 special Indomie products
          if (hasIndomie) {
            const specialIndomie = [
              { code: "9999901", name: "INDOMIE PILLOW (All)" },
              { code: "9999902", name: "INDOMIE CUP (All)" },
            ];

            // ensure we don’t duplicate if somehow already exists
            specialIndomie.forEach((p) => {
              if (!products.some((prod) => prod.code === p.code)) {
                products.push(p);
              }
            });
          }

          await setProductOptions(products);
          if (products.length > 0) setSelectedProducts(products[0]);
        } else {
          msgApi.error(
            "Failed to fetch products: " + (res.message || "Unknown error")
          );
        }
      } catch (error) {
        msgApi.error("Error fetching products: " + error.message);
      }
      setLoading(false);
    };

    fetchProductOptions();
    fetchDailySTTReport();
  }, []);

  const columns = useMemo(() => {
    const dynamicCols = selectedProducts.map(getProductColumns);
    const totalCol = {
      title: "TOTAL (Selected Products)",
      children: [
        {
          title: "Sales",
          dataIndex: "total_sales",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Target",
          dataIndex: "total_target",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Jun-24",
          dataIndex: "total_jun24",
          render: (v) => v?.toLocaleString(),
        },

        {
          title: "Growth %",
          dataIndex: "total_growth",
          render: (v) => (
            <span style={{ color: v < 0 ? "red" : "green" }}>
              {v?.toFixed(1)}%
            </span>
          ),
        },
      ],
    };
    return [
      {
        title: "Branch",
        dataIndex: "branch",
        fixed: "left",
        width: 150,
        className: "header-cell",
      },
      ...dynamicCols,
      totalCol,
    ];
  }, [selectedProducts]);

  const processedData = useMemo(() => {
    const regionGroups = {};
    baseData.forEach((r) => {
      const region = branch_region_map[r.branch.toUpperCase()] || "UNKNOWN";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(r);
    });

    const result = [];
    const subtotalRows = [];

    Object.entries(regionGroups).forEach(([region, rows]) => {
      // Branch rows with total calculation
      rows.forEach((r) => {
        const totals = { ...r };
        let t_target = 0,
          t_sales = 0,
          t_jun24 = 0,
          t_jun25 = 0;

        selectedProducts.forEach((p) => {
          const slug = p?.toLowerCase().replace(/\s+/g, "_");
          t_target += r[`${slug}_target`] || 0;
          t_sales += r[`${slug}_sales`] || 0;
          t_jun24 += r[`${slug}_jun24`] || 0;
          t_jun25 += r[`${slug}_jun25`] || 0;
        });

        totals.total_target = t_target;
        totals.total_sales = t_sales;
        totals.total_jun24 = t_jun24;
        totals.total_jun25 = t_jun25;
        totals.total_growth = ((t_jun25 - t_jun24) / (t_jun24 || 1)) * 100;

        result.push(totals);
      });

      // Region subtotal
      const subtotal = {
        key: `${region}-subtotal`,
        branch: `SUB TOTAL (${region})`,
      };
      let sub_total_target = 0,
        sub_total_sales = 0,
        sub_total_jun24 = 0,
        sub_total_jun25 = 0;

      selectedProducts.forEach((p) => {
        const slug = p?.toLowerCase().replace(/\s+/g, "_");
        ["target", "sales", "jun24", "jun25"].forEach((f) => {
          const col = `${slug}_${f}`;
          subtotal[col] = rows.reduce((s, r) => s + (r[col] || 0), 0);
        });
        sub_total_target += rows.reduce(
          (s, r) => s + (r[`${slug}_target`] || 0),
          0
        );
        sub_total_sales += rows.reduce(
          (s, r) => s + (r[`${slug}_sales`] || 0),
          0
        );
        sub_total_jun24 += rows.reduce(
          (s, r) => s + (r[`${slug}_jun24`] || 0),
          0
        );
        sub_total_jun25 += rows.reduce(
          (s, r) => s + (r[`${slug}_jun25`] || 0),
          0
        );
      });

      subtotal.total_target = sub_total_target;
      subtotal.total_sales = sub_total_sales;
      subtotal.total_jun24 = sub_total_jun24;
      subtotal.total_jun25 = sub_total_jun25;
      subtotal.total_growth =
        ((sub_total_jun25 - sub_total_jun24) / (sub_total_jun24 || 1)) * 100;

      subtotalRows.push(subtotal);
      result.push(subtotal);
    });

    // Grand total
    // Grand total row
    const grand = { key: "grand-total", branch: "GRAND TOTAL" };

    // For each product, sum the values across all branches
    selectedProducts.forEach((p) => {
      const slug = p?.toLowerCase().replace(/\s+/g, "_");
      ["target", "sales", "jun24", "jun25"].forEach((f) => {
        const col = `${slug}_${f}`;
        grand[col] = baseData.reduce((sum, r) => sum + (r[col] || 0), 0);
      });
      // Growth % per product
      const jun24 = grand[`${slug}_jun24`] || 0;
      const jun25 = grand[`${slug}_jun25`] || 0;
      grand[`${slug}_growth`] = ((jun25 - jun24) / (jun24 || 1)) * 100;
    });

    // Total column (sum of selected products)
    grand.total_target = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p?.toLowerCase().replace(/\s+/g, "_")}_target`] || 0),
      0
    );
    grand.total_sales = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p?.toLowerCase().replace(/\s+/g, "_")}_sales`] || 0),
      0
    );
    grand.total_jun24 = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p?.toLowerCase().replace(/\s+/g, "_")}_jun24`] || 0),
      0
    );
    grand.total_jun25 = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p?.toLowerCase().replace(/\s+/g, "_")}_jun25`] || 0),
      0
    );
    grand.total_growth =
      ((grand.total_jun25 - grand.total_jun24) / (grand.total_jun24 || 1)) *
      100;

    result.push(grand);

    return result;
  }, [selectedProducts]);

  return (
    <>
      {contextHolder}
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <strong>Show Products: </strong>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            value={selectedProducts}
            onChange={setSelectedProducts}
            options={productOptions.map((p) => ({ value: p, label: p }))}
          />
        </div>

        <Table
          bordered
          size="small"
          dataSource={processedData}
          columns={columns}
          pagination={false}
          rowClassName={(record) => {
            if (record.branch.includes("SUB TOTAL")) return "subtotal-row";
            if (record.branch.includes("GRAND TOTAL")) return "grandtotal-row";
            return "";
          }}
          scroll={{ x: "max-content", y: "55vh" }}
        />
      </div>
    </>
  );
};

export default DailySTT;
