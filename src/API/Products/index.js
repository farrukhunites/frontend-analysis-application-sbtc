import axios from "axios";

// Function to fetch all products
const getAllProducts = async () => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}products/`;

  try {
    const response = await axios.get(API_URL);
    console.log("Response came: ", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getAllProducts };
