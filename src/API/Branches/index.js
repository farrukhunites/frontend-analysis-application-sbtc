import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";
import { cached } from "../../Utils/apiCache";

const _fetchBranches = () =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}branches/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    .then((r) => r.data)
    .catch((err) => ({ success: false, error: err.response?.data || err.message }));

const getAllBranches = () => cached("branches", _fetchBranches);

export { getAllBranches };
