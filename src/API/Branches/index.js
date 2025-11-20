import axios from "axios";

// Function to fetch all branches
const getAllBranches = async () => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}branches/`;

  try {
    const response = await axios.get(API_URL);
    return response?.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getAllBranches };
