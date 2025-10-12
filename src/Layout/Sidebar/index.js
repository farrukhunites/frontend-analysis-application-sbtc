import {
  DashboardFilled,
  DashboardOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
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
            icon: <VideoCameraOutlined />,
            label: "Branch Analysis",
          },
          {
            key: "3",
            icon: <UploadOutlined />,
            label: "Customer Analysis",
          },
          {
            key: "4",
            icon: <UploadOutlined />,
            label: "Channel Analysis",
          },
        ]}
      />
    </Sider>
  );
};

export default Sidebar;
