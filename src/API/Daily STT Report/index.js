import axios from "axios";

// Function to fetch Daily STT Report
const getDailySTT = async (month, codes) => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}daily-stt/?month=${month}&product_codes=${codes}`;

  try {
    const response = await axios.get(API_URL);
    return response?.data;
  } catch (error) {
    console.error("Error fetching Daily STT Report:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getDailySTT };
