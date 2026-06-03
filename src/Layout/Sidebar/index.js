import {
  AimOutlined,
  SettingOutlined,
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Layout, Tooltip } from "antd";
import "./style.css";
import { useNavigate, useLocation } from "react-router-dom";
import { handleLogout } from "../../Utils/UpdateUserState";
import { useContext } from "react";
import { UserContext } from "../../App";

const { Sider } = Layout;

const menuItems = [
  { key: "1", icon: <DashboardOutlined />,      label: "Dashboard",           path: "/" },
  { key: "3", icon: <UserOutlined />,           label: "Customer Analysis",   path: "/customer-analysis" },
  { key: "4", icon: <TeamOutlined />,           label: "Salesman Analysis",   path: "/salesman-analysis" },
  { key: "5", icon: <FileTextOutlined />,        label: "Reports",             path: "/reports" },
  { key: "7", icon: <UsergroupAddOutlined />,   label: "Potential Customers", path: "/potential-customers" },
];

const bottomItems = [
  { key: "9", icon: <SettingOutlined />, label: "Settings", path: "/settings" },
];

const logoIcon = (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#logoGrad)" />
    <rect x="7"  y="22" width="5" height="9"  rx="1.5" fill="rgba(255,255,255,0.45)" />
    <rect x="15" y="16" width="5" height="15" rx="1.5" fill="rgba(255,255,255,0.7)" />
    <rect x="23" y="9"  width="5" height="22" rx="1.5" fill="#FFFFFF" />
    <polyline points="9.5,21 17.5,14.5 25.5,8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9.5"  cy="21"   r="1.8" fill="#FFFFFF" />
    <circle cx="17.5" cy="14.5" r="1.8" fill="#FFFFFF" />
    <circle cx="25.5" cy="8"    r="1.8" fill="#FFFFFF" />
  </svg>
);

const NavItem = ({ item, isActive, collapsed, onClick }) => {
  const content = (
    <div className={`nav-item ${isActive ? "nav-item--active" : ""}`} onClick={onClick}>
      {isActive && <span className="nav-item__accent" />}
      <span className="nav-item__icon">{item.icon}</span>
      {!collapsed && <span className="nav-item__label">{item.label}</span>}
    </div>
  );

  // Show tooltip with label when sidebar is collapsed
  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        {content}
      </Tooltip>
    );
  }
  return content;
};

const Sidebar = ({ collapsed }) => {
  const { setUserData, setUserToken } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const allItems = [...menuItems, ...bottomItems];
  const activePath = location.pathname;

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
      style={{ height: "100vh", position: "sticky", top: 0 }}
    >
      {/* Logo */}
      <div className="sidebar__logo">
        {collapsed ? (
          <div className="logo-icon-only">{logoIcon}</div>
        ) : (
          <div className="logo-full">
            {logoIcon}
            <div className="logo-text-block">
              <span className="logo-text">SBTC</span>
              <span className="logo-subtext">Sales Analysis</span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="sidebar__divider" />

      {/* Main nav */}
      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={activePath === item.path}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Bottom: settings + logout */}
      <div className="sidebar__bottom">
        <div className="sidebar__divider" />
        {bottomItems.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={activePath === item.path}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
        ))}

        <Tooltip title={collapsed ? "Logout" : ""} placement="right">
          <div className="nav-item nav-item--logout" onClick={onLogout}>
            <span className="nav-item__icon">
              <LogoutOutlined />
            </span>
            {!collapsed && <span className="nav-item__label">Logout</span>}
          </div>
        </Tooltip>
      </div>
    </Sider>
  );
};

export default Sidebar;
