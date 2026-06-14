import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Function to fetch all branches
const getCustomersByBranchByCHannel = async (code, channel_name) => {
  const params = new URLSearchParams({ branch_id: code });
  if (channel_name) params.append("channel_name", channel_name);
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}customers/by-branch/?${params.toString()}`;

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response?.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

const getCustomerInsight = async ({
  customer_code,
  branch_code,
  sales_type = "net",
  unit = "pcs",
  product_code,
}) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}customer-insight/by-code-branch/?customer_code=${customer_code}&branch_code=${branch_code}&sales_type=${sales_type}&unit=${unit}&product_code=${product_code}`;

  try {
    const response = await axios.get(API_URL);
    return response?.data;
  } catch (error) {
    console.error("Error fetching customer insight:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getCustomersByBranchByCHannel, getCustomerInsight };
