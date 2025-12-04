import React, { useContext, useState } from "react";
import { Form, Input, Button, notification } from "antd";
import { MailOutlined, KeyOutlined } from "@ant-design/icons";
import "./style.css";
import logo from "../../../Assets/Images/Logo.png";
import { login } from "../../../API/Auth";
import { encryptText } from "../../../Utils/Encryption";
import updateUserStates from "../../../Utils/UpdateUsersState";
import { UserContext } from "../../../App";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { setUserData, setUserToken, setUserPages } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const { email, password } = values;
    const loginData = await login({ email, password });
    if (loginData?.status === 200) {
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
            id: loginData?.data?.id,
            role: loginData?.data?.role,
            name: loginData?.data?.name,
            email: loginData?.data?.email,
          })
        )
      );
      updateUserStates(setUserData, setUserToken);
      setUserPages(loginData?.data?.pages);
      navigate("/home");
    } else {
      notification.error({
        message: "Invalid login details",
        description: "Kindly provide correct email and password",
      });
    }
    setLoading(false);
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">
          <img src={logo} alt="Company Logo" />
        </div>
        <div className="title">
          <p>Log in</p>
        </div>
        <Form
          name="login"
          className="login-form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" />}
              placeholder="Your email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input
              prefix={<KeyOutlined className="site-form-item-icon" />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
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
