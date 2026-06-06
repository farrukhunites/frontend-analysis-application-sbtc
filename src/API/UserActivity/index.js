import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

export const getUserActivity = ({ days, user, path, page, pageSize } = {}) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}user-activity/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        days,
        user:      user || undefined,
        path:      path || undefined,
        page,
        page_size: pageSize,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));
