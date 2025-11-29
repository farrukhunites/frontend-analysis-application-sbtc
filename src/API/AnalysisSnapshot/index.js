import axios from "axios";

// Function to fetch dashboard snapshot based on required parameters
const getDashboardData = async ({
  analysis_type,
  month,
  product_code,
  unit_type,
  value_type,
}) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}snapshots/`;

  // Validate that all required params are provided
  if (!analysis_type || !month || !product_code || !unit_type || !value_type) {
    return {
      success: false,
      error:
        "Missing one or more required parameters: analysis_type, month, product_code, unit_type, value_type",
    };
  }

  try {
    const response = await axios.get(API_URL, {
      params: {
        analysis_type,
        month,
        product_code,
        unit_type,
        value_type,
      },
    });

    return response?.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getDashboardData };
