import { Header } from "antd/es/layout/layout";
import "./style.css";
import { message, Select } from "antd";
import DateFilter from "../../Components/DateFilter";
import { useContext, useEffect, useState } from "react";
import { getAllProducts } from "../../API/Products";
import { ProductContext } from "../../Contexts/ProductContext";

const { Option } = Select;

const Navbar = ({ colorBgContainer }) => {
  const [productOptions, setProductOptions] = useState([]);
  const { selectedProduct, setSelectedProduct } = useContext(ProductContext);
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
              { code: "9999901", name: "INDOMIE PILLOW" },
              { code: "9999902", name: "INDOMIE CUP" },
            ];

            // ensure we don’t duplicate if somehow already exists
            specialIndomie.forEach((p) => {
              if (!products.some((prod) => prod.code === p.code)) {
                products.push(p);
              }
            });
          }

          setProductOptions(products);
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
          background: colorBgContainer || "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* Left side: toggle + select */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
              color: "#2c3e50",
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

        {/* Right side: date filter */}
        <div>
          <DateFilter />
        </div>
      </Header>
    </>
  );
};

export default Navbar;
