import { Header } from "antd/es/layout/layout";
import "./style.css";
import { Button, message, Select } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import DateFilter from "../../Components/DateFilter";
import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../../API/Products";

const { Option } = Select;

const Navbar = ({ collapsed, setCollapsed, colorBgContainer }) => {
  const didFetchRef = useRef(false);

  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (didFetchRef.current) return;
    const fetchProductOptions = async () => {
      setLoading(true);
      try {
        const res = await getAllProducts(); // axios call
        if (res) {
          setProductOptions(res?.results);
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
    didFetchRef.current = true;
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
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "18px",
              width: 48,
              height: 48,
              color: "#2662D9",
            }}
          />

          <Select
            loading={loading}
            placeholder="Select a product"
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
