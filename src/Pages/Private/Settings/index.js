import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { changePassword } from "../../../API/Auth";

const Settings = () => {
  const [loading, setLoading] = useState(false);

  // useMessage hook
  const [msgAPI, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    setLoading(true);
    const res = await changePassword(values);

    if (Math.floor(res?.status / 100) === 2) {
      msgAPI.success("Password updated successfully!");
    } else {
      msgAPI.error(res?.data?.error || "Failed to update password");
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      {contextHolder} {/* must include this for useMessage */}
      <h2>Change Password</h2>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="old_password"
          label="Current Password"
          rules={[{ required: true, message: "Please enter current password" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="new_password"
          label="New Password"
          rules={[{ required: true, message: "Please enter new password" }]}
        >
          <Input.Password />
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
          <Input.Password />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          style={{ backgroundColor: "#1b364d" }}
        >
          Change Password
        </Button>
      </Form>
    </div>
  );
};

export default Settings;
