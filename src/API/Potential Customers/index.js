import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Function to fetch dashboard snapshot based on required parameters
const getPotentialCustomers = async (
  month,
  product_code,
  unit_type,
  value_type
) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}potential-customers/`;

  // Validate that all required params are provided
  if (!month || !product_code || !unit_type || !value_type) {
    return {
      success: false,
      error:
        "Missing one or more required parameters: analysis_type, month, product_code, unit_type, value_type",
    };
  }

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      params: {
        month,
        product_code,
        unit_type,
        value_type,
      },
    });

    return response?.data;
  } catch (error) {
    console.error("Error fetching potential customer data:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getPotentialCustomers };
