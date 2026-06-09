import { useState } from "react";

import { Layout, theme } from "antd";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const { Content } = Layout;

const AppLayout = ({ userType, contents }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!collapsed && <Sidebar collapsed={false} onNavigate={navigate} />}
      <Layout>
        <Navbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: "var(--color-bg-layout)",
            borderRadius: borderRadiusLG,
          }}
        >
          {contents}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
