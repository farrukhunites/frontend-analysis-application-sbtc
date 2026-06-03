import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

export const getSalesmenByBranch = async (branchCode) => {
  try {
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}salesmen/by-branch/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params:  { branch_code: branchCode },
    });
    return res?.data;
  } catch (err) {
    return { error: err.response?.data || err.message };
  }
};

export const getSalesmanInsight = async ({
  salesmanCode, branchCode, productCode, month, unitType, valueType,
}) => {
  try {
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}salesman-insight/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        salesman_code: salesmanCode,
        branch_code:   branchCode,
        product_code:  productCode,
        month,
        unit_type:     unitType,
        value_type:    valueType,
      },
    });
    return res?.data;
  } catch (err) {
    return { error: err.response?.data || err.message };
  }
};
