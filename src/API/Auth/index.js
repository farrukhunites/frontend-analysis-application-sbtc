import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

const login = async (data) => {
  try {
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}token/`,
      data
    );
    return res;
  } catch (e) {
    console.log(e);
    return e;
  }
};

const refresh = async (refresh) => {
  try {
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}token/refresh/`,
      { refresh },
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );
    return res;
  } catch (e) {
    console.log(e);
    return e;
  }
};

export { login, refresh };
