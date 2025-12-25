import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

// Function to fetch all branches
const getAllChannels = async () => {
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}channels/`;

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response?.data;
  } catch (error) {
    console.error("Error fetching channels:", error);
    return {
      success: false,
      error: error.response?.data || error.message || "Unknown error",
    };
  }
};

export { getAllChannels };
