import { Header } from "antd/es/layout/layout";
import "./style.css";
import { message, Radio, Select } from "antd";
import DateFilter from "../../Components/DateFilter";
import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAllProducts } from "../../API/Products";
import { ProductContext } from "../../Contexts/ProductContext";
import { UnitValueContext } from "../../Contexts/UnitValueContext";

const { Option } = Select;

const PAGES_WITHOUT_DATE_FILTER = ["/customer-analysis", "/daily-stt"];

const Navbar = ({ colorBgContainer }) => {
  const { pathname } = useLocation();
  const [productOptions, setProductOptions] = useState([]);
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);
  const { unitType, setUnitType, valueType, setValueType } = useContext(UnitValueContext);
  const [loading, setLoading] = useState(false);

  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchProductOptions = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts(); // axios call
        if (res) {
          let products = res.results || [];

          // check if any product has "INDOMIE" in its name
          const hasIndomie = products.some((p) =>
            p.name.toLowerCase().includes("indomie")
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
          if (products.length > 0) setSelectedProduct(products[0]);
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
  }, []);

  return (
    <>
      {contextHolder}
      <Header
        style={{
          padding: "0 24px",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 0 #E2E8F0, 0 2px 8px rgba(30, 58, 95, 0.06)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          height: 64,
        }}
      >
        {/* Left side: product select */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Product:</span>
          <Select
            loading={loading}
            placeholder="Select a product"
            value={selectedProduct?.name || undefined} // controlled value
            onChange={(value) => {
              // find the full product object
              const prod = productOptions.find((p) => p.name === value);
              setSelectedProduct(prod);
            }}
            style={{
              width: 240,
              fontWeight: 500,
            }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {productOptions.map((product) => (
              <Option key={product.code} value={product.name}>
                {product.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Center: unit & value type toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Unit:</span>
            <Radio.Group size="small" value={unitType} onChange={(e) => setUnitType(e.target.value)}>
              <Radio.Button value="ctn">CTN</Radio.Button>
              <Radio.Button value="pcs">PCS</Radio.Button>
            </Radio.Group>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Type:</span>
            <Radio.Group size="small" value={valueType} onChange={(e) => setValueType(e.target.value)}>
              <Radio.Button value="net">NET</Radio.Button>
              <Radio.Button value="gross">GROSS</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {/* Right side: date filter (hidden on pages that manage their own date) */}
        {!PAGES_WITHOUT_DATE_FILTER.includes(pathname) && (
          <div>
            <DateFilter />
          </div>
        )}
      </Header>
    </>
  );
};

export default Navbar;
