import {
  AimOutlined,
  BranchesOutlined,
  DashboardOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Menu, Layout } from "antd";
import "./style.css";
import logo from "../../Assets/Logo.png";
const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <div className="demo-logo-vertical" />
      <div className="logo-container">
        <img style={{ width: "130px" }} src={logo} alt="SBTC Logo" />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={["1"]}
        items={[
          {
            key: "1",
            icon: <DashboardOutlined />,
            label: "Dashboard",
          },
          {
            key: "2",
            icon: <BranchesOutlined />,
            label: "Branch Analysis",
          },
          {
            key: "3",
            icon: <UserOutlined />,
            label: "Customer Analysis",
          },
          {
            key: "4",
            icon: <AimOutlined />,
            label: "Channel Analysis",
          },
        ]}
      />
    </Sider>
  );
};

export default Sidebar;
