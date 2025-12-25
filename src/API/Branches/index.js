import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Function to fetch all branches
const getAllBranches = async () => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}branches/`;

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response?.data;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getAllBranches };
