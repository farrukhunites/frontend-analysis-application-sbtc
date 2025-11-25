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

const DailySTT = () => {
  const [loading, setLoading] = useState(false);
  const { selectedMonth } = useDateFilter();
  const { selectedProduct } = useContext(ProductContext);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(
    selectedProduct ? [selectedProduct] : []
  );
  const [dailySTTReport, setDailySTTReport] = useState([]);
  const [msgApi, contextHolder] = message.useMessage();

  const getProductColumns = (product) => {
    const slug =
      product?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
    return {
      title: product?.name || "Unknown",
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
          dataIndex: `${slug}_prev`,
          render: (v) => v?.toLocaleString(),
        },
        {
          title: "Growth %",
          render: (_, record) => {
            const g =
              ((record[`${slug}_sales`] - record[`${slug}_prev`]) /
                (record[`${slug}_prev`] || 1)) *
              100;
            return (
              <span style={{ color: g < 0 ? "red" : "green" }}>
                {g?.toFixed(1)}%
              </span>
            );
          },
        },
      ],
    };
  };

  useEffect(() => {
    const fetchProductOptions = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts();
        let products = res?.results || [];

        const hasIndomie = products.some((p) =>
          p?.name?.toLowerCase()?.includes("indomie")
        );
        if (hasIndomie) {
          const specialIndomie = [
            { code: "9999901", name: "INDOMIE PILLOW (All)" },
            { code: "9999902", name: "INDOMIE CUP (All)" },
          ];
          specialIndomie.forEach((p) => {
            if (!products.some((prod) => prod?.code === p?.code)) {
              products.push(p);
            }
          });
        }

        setProductOptions(products);
        if (!selectedProducts.length && products.length > 0) {
          setSelectedProducts([products[0]]);
        }
      } catch (error) {
        msgApi.error("Error fetching products: " + error?.message);
      }
      setLoading(false);
    };

    const fetchDailySTTReport = async () => {
      setLoading(true);
      try {
        const codes = selectedProducts?.map((p) => p?.code)?.join(",");
        const res = await getDailySTT(selectedMonth, codes);
        const apiData = res?.products?.[0]?.branches || [];
        setDailySTTReport(apiData);
      } catch (error) {
        msgApi.error("Error fetching daily STT report: " + error?.message);
      }
      setLoading(false);
    };

    fetchProductOptions();
    fetchDailySTTReport();
  }, [selectedMonth, selectedProducts]);

  const columns = useMemo(() => {
    const dynamicCols = selectedProducts?.map(getProductColumns) || [];
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
          title: "Last Yr",
          dataIndex: "total_prev",
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
      { title: "Branch", dataIndex: "branch", fixed: "left", width: 150 },
      ...dynamicCols,
      totalCol,
    ];
  }, [selectedProducts]);

  console.log(dailySTTReport);

  const processedData = useMemo(() => {
    if (!dailySTTReport?.length) return [];

    // group by region
    const regionGroups = {};
    dailySTTReport.forEach((branch) => {
      const region =
        branch_region_map[branch?.branch_name?.toUpperCase()] || "UNKNOWN";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(branch);
    });

    const result = [];

    Object.entries(regionGroups).forEach(([region, rows]) => {
      // Add branch rows
      rows.forEach((r, i) => {
        const row = {
          key: `${r?.branch_code}`,
          branch: r?.branch_name || "Unknown",
        };
        selectedProducts?.forEach((p) => {
          const slug =
            p?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
          row[`${slug}_sales`] = r?.net_sales_ctn || 0;
          row[`${slug}_target`] = r?.target_ctn || 0;
          row[`${slug}_prev`] = r?.prev_net_sales_ctn || 0;
        });
        // Total columns
        row.total_sales = selectedProducts?.reduce(
          (s, p) =>
            s +
            (row[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_sales`] || 0),
          0
        );
        row.total_target = selectedProducts?.reduce(
          (s, p) =>
            s +
            (row[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_target`] ||
              0),
          0
        );
        row.total_prev = selectedProducts?.reduce(
          (s, p) =>
            s +
            (row[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_prev`] || 0),
          0
        );
        row.total_growth =
          ((row.total_sales - row.total_prev) / (row.total_prev || 1)) * 100;
        result.push(row);
      });

      // Add SUBTOTAL row
      const subtotal = {
        key: `${region}-subtotal`,
        branch: `SUB TOTAL (${region})`,
      };
      selectedProducts?.forEach((p) => {
        const slug = p?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
        subtotal[`${slug}_sales`] = rows.reduce(
          (s, r) => s + (r?.net_sales_ctn || 0),
          0
        );
        subtotal[`${slug}_target`] = rows.reduce(
          (s, r) => s + (r?.target_ctn || 0),
          0
        );
        subtotal[`${slug}_prev`] = rows.reduce(
          (s, r) => s + (r?.prev_net_sales_ctn || 0),
          0
        );
      });
      subtotal.total_sales = selectedProducts?.reduce(
        (s, p) =>
          s +
          (subtotal[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_sales`] ||
            0),
        0
      );
      subtotal.total_target = selectedProducts?.reduce(
        (s, p) =>
          s +
          (subtotal[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_target`] ||
            0),
        0
      );
      subtotal.total_prev = selectedProducts?.reduce(
        (s, p) =>
          s +
          (subtotal[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_prev`] ||
            0),
        0
      );
      subtotal.total_growth =
        ((subtotal.total_sales - subtotal.total_prev) /
          (subtotal.total_prev || 1)) *
        100;
      result.push(subtotal);
    });

    // GRAND TOTAL
    const grand = { key: "grand-total", branch: "GRAND TOTAL" };
    selectedProducts?.forEach((p) => {
      const slug = p?.name?.toLowerCase()?.replace(/\s+/g, "_") || "unknown";
      grand[`${slug}_sales`] = dailySTTReport.reduce(
        (s, r) => s + (r?.net_sales_ctn || 0),
        0
      );
      grand[`${slug}_target`] = dailySTTReport.reduce(
        (s, r) => s + (r?.target_ctn || 0),
        0
      );
      grand[`${slug}_prev`] = dailySTTReport.reduce(
        (s, r) => s + (r?.prev_net_sales_ctn || 0),
        0
      );
    });
    grand.total_sales = selectedProducts?.reduce(
      (s, p) =>
        s +
        (grand[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_sales`] || 0),
      0
    );
    grand.total_target = selectedProducts?.reduce(
      (s, p) =>
        s +
        (grand[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_target`] || 0),
      0
    );
    grand.total_prev = selectedProducts?.reduce(
      (s, p) =>
        s +
        (grand[`${p?.name?.toLowerCase()?.replace(/\s+/g, "_")}_prev`] || 0),
      0
    );
    grand.total_growth =
      ((grand.total_sales - grand.total_prev) / (grand.total_prev || 1)) * 100;

    result.push(grand);

    return result;
  }, [dailySTTReport, selectedProducts]);

  return (
    <>
      {contextHolder}
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <strong>Show Products: </strong>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            showSearch
            placeholder="Select products"
            value={selectedProducts?.map((p) => p?.code)} // keep selected codes
            onChange={(codes) => {
              const selected = productOptions?.filter((p) =>
                codes.includes(p?.code)
              );
              setSelectedProducts(selected);
            }}
            options={productOptions?.map((p) => ({
              value: p?.code,
              label: p?.name || "Unknown",
            }))}
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        <Table
          bordered
          size="small"
          dataSource={processedData}
          columns={columns}
          pagination={false}
          rowClassName={(record) => {
            if (record.branch?.includes("SUB TOTAL")) return "subtotal-row";
            if (record.branch?.includes("GRAND TOTAL")) return "grandtotal-row";
            return "";
          }}
          scroll={{ x: "max-content", y: "55vh" }}
          loading={loading}
        />
      </div>
    </>
  );
};

export default DailySTT;
