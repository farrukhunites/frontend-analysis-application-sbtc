import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";
import { cached } from "../../Utils/apiCache";

const _fetchProducts = () =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}products/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    .then((r) => r.data)
    .catch((err) => ({ success: false, error: err.response?.data || err.message }));

const getAllProducts = () => cached("products", _fetchProducts);

export { getAllProducts };
