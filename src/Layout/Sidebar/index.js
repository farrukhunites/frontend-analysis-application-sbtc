import {
  AimOutlined,
  BranchesOutlined,
  SettingOutlined,
  DashboardOutlined,
  FileTextOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Menu, Layout, Button } from "antd";
import "./style.css";
import logo from "../../Assets/Logo.png";
import { useNavigate, useLocation } from "react-router-dom";
import { handleLogout } from "../../Utils/UpdateUserState";
import { useContext } from "react";
import { UserContext } from "../../App";

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const { setUserData, setUserToken } = useContext(UserContext);
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
    // {
    //   key: "6",
    //   icon: <FileTextOutlined />,
    //   label: "M-O-R",
    //   path: "/mor",
    // },

    {
      key: "7",
      icon: <UsergroupAddOutlined />,
      label: "Potential Customers",
      path: "/potential-customers",
    },
    // {
    //   key: "8",
    //   icon: <AimOutlined />,
    //   label: "Daily Sales",
    //   path: "/daily-sales",
    // },
    {
      key: "9",
      icon: <SettingOutlined />,
      label: "Settings",
      path: "/settings",
    },
  ];

  // Determine which menu item is active based on current URL
  const selectedKey =
    menuItems.find((item) => item.path === location.pathname)?.key || "1";

  const onMenuClick = (e) => {
    const item = menuItems.find((i) => i.key === e.key);
    if (item) navigate(item.path);
  };

  const onLogout = () => {
    handleLogout(setUserData, setUserToken);
    navigate("/login");
  };

  return (
    <Sider
      className="sidebar"
      trigger={null}
      collapsible
      collapsed={collapsed}
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div>
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
      </div>
      {/* Logout button at the bottom */}
      <div style={{ padding: "16px" }}>
        <Button type="primary" danger block onClick={onLogout}>
          {"Logout"}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;
