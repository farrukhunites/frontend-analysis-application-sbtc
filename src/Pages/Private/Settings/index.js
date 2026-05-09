import React, { useContext, useState } from "react";
import { Form, Input, Button, message, Divider } from "antd";
import {
  LockOutlined,
  UserOutlined,
  IdcardOutlined,
  BankOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { changePassword } from "../../../API/Auth";
import { UserContext } from "../../../App";
import "./style.css";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { userData } = useContext(UserContext);
  const [msgAPI, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    setLoading(true);
    const res = await changePassword(values);
    if (Math.floor(res?.status / 100) === 2) {
      msgAPI.success("Password updated successfully!");
      form.resetFields();
    } else {
      msgAPI.error(res?.data?.error || "Failed to update password");
    }
    setLoading(false);
  };

  const initials = userData?.name
    ? userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const allowedBranches = Array.isArray(userData?.allowed_branches)
    ? userData.allowed_branches.join(", ") || "All Branches"
    : userData?.allowed_branches || "All Branches";

  const allowedProducts = Array.isArray(userData?.allowed_products)
    ? userData.allowed_products.join(", ") || "All Products"
    : userData?.allowed_products || "All Products";

  return (
    <div className="settings-page">
      {contextHolder}

      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account preferences</p>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card">
          <div className="card-section-header">
            <div className="section-icon">
              <UserOutlined />
            </div>
            <div>
              <div className="section-title">Profile</div>
              <div className="section-desc">Your account information</div>
            </div>
          </div>
          <Divider style={{ margin: "16px 0" }} />

          <div className="profile-avatar-row">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{userData?.name || "—"}</div>
              <div className="profile-position">
                {userData?.position || "—"}
              </div>
            </div>
          </div>

          <div className="profile-info-list">
            <div className="info-row">
              <IdcardOutlined className="info-icon" />
              <div>
                <div className="info-label">Employee Code</div>
                <div className="info-value">
                  {userData?.employee_code || "—"}
                </div>
              </div>
            </div>
            <div className="info-row">
              <BankOutlined className="info-icon" />
              <div>
                <div className="info-label">Allowed Branches</div>
                <div className="info-value">{allowedBranches}</div>
              </div>
            </div>
            <div className="info-row">
              <AppstoreOutlined className="info-icon" />
              <div>
                <div className="info-label">Allowed Products</div>
                <div className="info-value">{allowedProducts}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="settings-card">
          <div className="card-section-header">
            <div className="section-icon security">
              <LockOutlined />
            </div>
            <div>
              <div className="section-title">Security</div>
              <div className="section-desc">Update your password</div>
            </div>
          </div>
          <Divider style={{ margin: "16px 0" }} />

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="old_password"
              label="Current Password"
              rules={[
                { required: true, message: "Please enter current password" },
              ]}
            >
              <Input.Password size="large" placeholder="Enter current password" />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[
                { required: true, message: "Please enter new password" },
              ]}
            >
              <Input.Password size="large" placeholder="Enter new password" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm Password"
              rules={[
                { required: true, message: "Please confirm new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("new_password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject("Passwords do not match");
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Re-enter new password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ marginTop: 8 }}
            >
              Update Password
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
