import { useState } from "react";

import { Layout, theme } from "antd";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const { Content } = Layout;

const AppLayout = ({ userType, contents }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  console.log(contents);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onNavigate={navigate} />
      <Layout>
        <Navbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          colorBgContainer={colorBgContainer}
        />
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
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
