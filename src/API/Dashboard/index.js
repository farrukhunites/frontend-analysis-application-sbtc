import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Calls the live DashboardCreationAPIView (aggregate-backed, real-time).
// The `analysis_type` arg is kept for call-site compatibility but unused.
const getDashboardData = async (
  _analysis_type,
  month,
  product_code,
  unit_type,
  value_type,
  branch_code = null
) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}dashboard/`;

  // product_code can be "" (All Products sentinel); only reject when undefined/null.
  if (!month || product_code == null || !unit_type || !value_type) {
    return {
      success: false,
      error:
        "Missing one or more required parameters: month, product_code, unit_type, value_type",
    };
  }

  try {
    const params = { month, product_code, unit_type, value_type };
    if (branch_code) params.branch_code = branch_code;
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params,
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
