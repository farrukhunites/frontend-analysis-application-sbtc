import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

const getSalesmanPerformance = () =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}salesman-performance/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export { getSalesmanPerformance };
