import React, { useContext, useEffect, useState } from "react";
import { Alert, Form, Input, Button, notification } from "antd";
import "./style.css";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../App";
import { login } from "../../../API/Auth";
import { encryptText } from "../../../Utils/Encryption";
import updateUserStates from "../../../Utils/UpdateUserState";

const Login = () => {
  const { setUserData, setUserToken } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const navigate = useNavigate();

  // Surface a friendlier reason when the app forcibly signed the user out.
  // The flag is set in App.js when a token refresh returns the backend's
  // "session_replaced" code (see core/authentication.py).
  useEffect(() => {
    try {
      const notice = localStorage.getItem("auth_notice");
      if (notice === "session_replaced") {
        setAuthNotice(
          "Your account was signed in on another device. This session has ended."
        );
        localStorage.removeItem("auth_notice");
      }
    } catch {}
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    const { username, password } = values;
    const loginData = await login({ username, password });
    if (loginData?.status === 200) {
      console.log(loginData);
      localStorage.clear();
      localStorage.setItem(
        encryptText("token"),
        encryptText(
          JSON.stringify({
            access: loginData?.data?.access,
            refresh: loginData?.data?.refresh,
          })
        )
      );
      localStorage.setItem(
        encryptText("user"),
        encryptText(
          JSON.stringify({
            role: loginData?.data?.role,
            name: loginData?.data?.name,
            position: loginData?.data?.position,
            employee_code: loginData?.data?.employee_code,
            allowed_branches: loginData?.data?.allowed_branches,
            allowed_products: loginData?.data?.allowed_products,
            allowed_channels: loginData?.data?.allowed_channels,
            denied_pages:     loginData?.data?.denied_pages   || [],
            denied_reports:   loginData?.data?.denied_reports || [],
          })
        )
      );
      updateUserStates(setUserData, setUserToken);
      navigate("/");
    } else {
      notification.error({
        message: "Invalid login details",
        description: "Kindly provide correct email and password",
      });
    }
    setLoading(false);
  };

  const logoIcon = (
    <svg width="52" height="52" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loginLogoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill="url(#loginLogoGrad)" />
      <rect x="7"  y="22" width="5" height="9" rx="1.5" fill="rgba(255,255,255,0.45)" />
      <rect x="15" y="16" width="5" height="15" rx="1.5" fill="rgba(255,255,255,0.7)" />
      <rect x="23" y="9"  width="5" height="22" rx="1.5" fill="#FFFFFF" />
      <polyline points="9.5,21 17.5,14.5 25.5,8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5"  cy="21"   r="1.8" fill="#FFFFFF" />
      <circle cx="17.5" cy="14.5" r="1.8" fill="#FFFFFF" />
      <circle cx="25.5" cy="8"    r="1.8" fill="#FFFFFF" />
    </svg>
  );

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">
          {logoIcon}
          <div className="logo-text">Wazalytics</div>
          <div className="logo-subtitle">Sales Analysis Platform</div>
        </div>
        <div className="title">
          <p>Welcome back</p>
        </div>
        {authNotice && (
          <Alert
            type="warning"
            showIcon
            closable
            message={authNotice}
            style={{ marginBottom: 16 }}
            onClose={() => setAuthNotice(null)}
          />
        )}
        <Form
          name="login"
          className="login-form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-btn"
              loading={loading}
            >
              Log In
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
