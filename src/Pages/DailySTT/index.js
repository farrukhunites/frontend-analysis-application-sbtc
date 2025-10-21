import React, { useMemo, useState } from "react";
import { Table, Select } from "antd";
import "./style.css";

const branch_region_map = {
  BISHA: "SOUTHERN",
  "KHAMIS MUSHAIT": "SOUTHERN",
  NAJRAN: "SOUTHERN",
  QONFUDA: "SOUTHERN",
  DAWADMI: "NORTH & CENTRAL",
  GASIEM: "NORTH & CENTRAL",
  HAIL: "NORTH & CENTRAL",
  SKAKA: "NORTH & CENTRAL",
  TABUK: "NORTH & CENTRAL",
  "HAFR BATIN": "EASTERN",
  HUFUF: "EASTERN",
  JUBAIL: "EASTERN",
  KHOBAR: "EASTERN",
  MADINAH: "WESTERN",
  MAKKAH: "WESTERN",
  TAIF: "WESTERN",
  YANBU: "WESTERN",
  KHARJ: "RIYADH & KHARJ",
  RIYADH: "RIYADH & KHARJ",
  JEDDAH: "JEDDAH",
  JIZAN: "JIZAN",
};

const productOptions = [
  "INDOMIE PILLOW",
  "INDOMIE CUP",
  "CHICKEN STOCK",
  "SANTAN",
  "COFFEE INSTANT",
  "CRACKER",
  "INDOFOOD CHILI",
  "INDOFOOD SOY SAUCE",
  "MONOSODIUM GLUTAMAT",
  "MUSHROOM",
  "SIWAK",
  "STEVIANA",
  "THAI RICE",
  "TOYA CHILI SAUCE",
  "TOYA HOT SAUCE",
  "TOYA KETCHUP",
  "TOYA VINEGAR",
  "TUNA INDONESIA",
];

const branchesData = [
  { branch: "JEDDAH", region: "JEDDAH" },
  { branch: "JIZAN", region: "JIZAN" },
  { branch: "RIYADH", region: "RIYADH & KHARJ" },
  { branch: "KHARJ", region: "RIYADH & KHARJ" },
  { branch: "MAKKAH", region: "WESTERN" },
  { branch: "MADINAH", region: "WESTERN" },
  { branch: "TAIF", region: "WESTERN" },
  { branch: "YANBU", region: "WESTERN" },
  { branch: "BISHA", region: "SOUTHERN" },
  { branch: "KHAMIS MUSHAIT", region: "SOUTHERN" },
  { branch: "NAJRAN", region: "SOUTHERN" },
  { branch: "QONFUDA", region: "SOUTHERN" },
  { branch: "DAWADMI", region: "NORTH & CENTRAL" },
  { branch: "GASIEM", region: "NORTH & CENTRAL" },
  { branch: "HAIL", region: "NORTH & CENTRAL" },
  { branch: "SKAKA", region: "NORTH & CENTRAL" },
  { branch: "TABUK", region: "NORTH & CENTRAL" },
  { branch: "HAFR BATIN", region: "EASTERN" },
  { branch: "HUFUF", region: "EASTERN" },
  { branch: "JUBAIL", region: "EASTERN" },
  { branch: "KHOBAR", region: "EASTERN" },
];

// Random data generation
const baseData = branchesData.map((b, i) => {
  const row = { key: i + 1, branch: b.branch };
  productOptions.forEach((p) => {
    const slug = p.toLowerCase().replace(/\s+/g, "_");
    row[`${slug}_target`] = Math.round(Math.random() * 5000);
    row[`${slug}_sales`] = Math.round(Math.random() * 5000);
    row[`${slug}_jun24`] = Math.round(Math.random() * 5000);
    row[`${slug}_jun25`] = Math.round(Math.random() * 5000);
  });
  return row;
});

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
        title: "Jun-24",
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
  const [selectedProducts, setSelectedProducts] = useState([
    "INDOMIE CUP",
    "INDOMIE PILLOW",
  ]);

  const columns = useMemo(() => {
    const dynamicCols = selectedProducts.map(getProductColumns);
    const totalCol = {
      title: "TOTAL (Selected Products)",
      children: [
        {
          title: "Target",
          dataIndex: "total_target",
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Sales",
          dataIndex: "total_sales",
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
          const slug = p.toLowerCase().replace(/\s+/g, "_");
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
        const slug = p.toLowerCase().replace(/\s+/g, "_");
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
      const slug = p.toLowerCase().replace(/\s+/g, "_");
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
        s + (grand[`${p.toLowerCase().replace(/\s+/g, "_")}_target`] || 0),
      0
    );
    grand.total_sales = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p.toLowerCase().replace(/\s+/g, "_")}_sales`] || 0),
      0
    );
    grand.total_jun24 = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p.toLowerCase().replace(/\s+/g, "_")}_jun24`] || 0),
      0
    );
    grand.total_jun25 = selectedProducts.reduce(
      (s, p) =>
        s + (grand[`${p.toLowerCase().replace(/\s+/g, "_")}_jun25`] || 0),
      0
    );
    grand.total_growth =
      ((grand.total_jun25 - grand.total_jun24) / (grand.total_jun24 || 1)) *
      100;

    result.push(grand);

    return result;
  }, [selectedProducts]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <strong>Show Products: </strong>
        <Select
          mode="multiple"
          style={{ width: 600 }}
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
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default DailySTT;
