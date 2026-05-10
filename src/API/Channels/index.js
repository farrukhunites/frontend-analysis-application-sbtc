import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";
import { cached } from "../../Utils/apiCache";

const _fetchChannels = () =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}channels/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    .then((r) => r.data)
    .catch((err) => ({ success: false, error: err.response?.data || err.message }));

const getAllChannels = () => cached("channels", _fetchChannels);

export { getAllChannels };
