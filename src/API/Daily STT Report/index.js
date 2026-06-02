import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Function to fetch Daily STT Report
const getDailySTT = async (fromMonth, codes, toMonth = null) => {
  const rangeParam = toMonth && toMonth !== fromMonth
    ? `from_month=${fromMonth}&to_month=${toMonth}`
    : `month=${fromMonth}`;
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}daily-stt/?${rangeParam}&product_codes=${codes}`;

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response?.data;
  } catch (error) {
    console.error("Error fetching Daily STT Report:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

const getDailyBranchSales = async (
  month,
  product_codes,
  unit_type,
  value_type,
  selectedChannels
) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}sales/daily-branch/`;

  // Validate required params
  if (
    !month ||
    !product_codes ||
    !unit_type ||
    !value_type ||
    !selectedChannels
  ) {
    return {
      success: false,
      error:
        "Missing one or more required parameters: month, product_codes, unit_type, value_type",
    };
  }

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      params: {
        month,
        product_codes,
        unit_type,
        value_type,
        otlcd_list: selectedChannels,
      },
    });

    return response?.data;
  } catch (error) {
    console.error("Error fetching daily branch sales:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

const getDailyCustomerBreakdown = async ({ branchCode, date, productCodes, unitType, valueType }) => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}sales/daily-customer-breakdown/`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: {
          branch_code:   branchCode,
          date,
          product_codes: productCodes,
          unit_type:     unitType,
          value_type:    valueType,
        },
      }
    );
    return response?.data;
  } catch (error) {
    return { error: error.response?.data || error.message };
  }
};

export { getDailySTT, getDailyBranchSales, getDailyCustomerBreakdown };
