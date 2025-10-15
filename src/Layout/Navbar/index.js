import { Header } from "antd/es/layout/layout";
import "./style.css";
import { Button, Select } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import DateFilter from "../../Components/DateFilter";

const { Option } = Select;

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

const Navbar = ({ collapsed, setCollapsed, colorBgContainer }) => {
  return (
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
          defaultValue="INDOMIE PILLOW"
          style={{
            width: 240,
            fontWeight: 500,
            color: "#2c3e50",
          }}
          dropdownStyle={{
            borderRadius: "8px",
            padding: "4px",
          }}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option?.children?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {productOptions.map((product) => (
            <Option key={product} value={product}>
              {product}
            </Option>
          ))}
        </Select>
      </div>

      {/* Right side: date filter */}
      <div>
        <DateFilter />
      </div>
    </Header>
  );
};

export default Navbar;
