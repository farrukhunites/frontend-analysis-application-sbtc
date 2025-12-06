import React, { useContext, useState } from "react";
import { Form, Input, Button, notification } from "antd";
import "./style.css";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../App";
import { login } from "../../../API/Auth";
import { encryptText } from "../../../Utils/Encryption";
import updateUserStates from "../../../Utils/UpdateUserState";
import logo from "../../../Assets/Logo.png";

const Login = () => {
  const { setUserData, setUserToken } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">
          <img style={{ width: "150px" }} src={logo} alt="Company Logo" />
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
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input type="password" placeholder="Password" />
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
