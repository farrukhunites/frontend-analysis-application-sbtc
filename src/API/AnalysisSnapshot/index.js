import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Calls the live DashboardCreationAPIView (aggregate-backed, real-time).
// The `analysis_type` arg is kept for call-site compatibility but unused.
const getDashboardData = async (
  _analysis_type,
  month,
  product_code,
  unit_type,
  value_type
) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}dashboard/`;

  if (!month || !product_code || !unit_type || !value_type) {
    return {
      success: false,
      error:
        "Missing one or more required parameters: month, product_code, unit_type, value_type",
    };
  }

  try {
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: { month, product_code, unit_type, value_type },
    });
    // Component reads `res.result`; live view returns the dict directly,
    // so wrap it to keep the existing call site unchanged.
    return { result: response?.data };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getDashboardData };
