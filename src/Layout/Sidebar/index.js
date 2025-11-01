import {
  AimOutlined,
  BranchesOutlined,
  DashboardOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Menu, Layout } from "antd";
import "./style.css";
import logo from "../../Assets/Logo.png";
import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: "1",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      path: "/",
    },
    // {
    //   key: "2",
    //   icon: <BranchesOutlined />,
    //   label: "Branch Analysis",
    //   path: "/branch-analysis",
    // },
    {
      key: "3",
      icon: <UserOutlined />,
      label: "Customer Analysis",
      path: "/customer-analysis",
    },
    // {
    //   key: "4",
    //   icon: <UserOutlined />,
    //   label: "Channel Analysis",
    //   path: "/channel-analysis",
    // },
    {
      key: "5",
      icon: <AimOutlined />,
      label: "Daily STT",
      path: "/daily-stt",
    },
    {
      key: "6",
      icon: <FileTextOutlined />,
      label: "M-O-R",
      path: "/mor",
    },
  ];

  // Determine which menu item is active based on current URL
  const selectedKey =
    menuItems.find((item) => item.path === location.pathname)?.key || "1";

  const onMenuClick = (e) => {
    const item = menuItems.find((i) => i.key === e.key);
    if (item) navigate(item.path);
  };

  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <div className="logo-container">
        <img style={{ width: "130px" }} src={logo} alt="SBTC Logo" />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={onMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
