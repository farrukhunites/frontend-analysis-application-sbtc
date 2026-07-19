import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

const buildParams = ({ method, year, unitType, valueType, branchCodes, productCodes, channels, whatifPct }) => ({
  method:            method || undefined,
  year:              year   || undefined,
  unit_type:         unitType,
  value_type:        valueType,
  "branch_codes[]":  branchCodes?.length  ? branchCodes  : undefined,
  "product_codes[]": productCodes?.length ? productCodes : undefined,
  "channels[]":      channels?.length     ? channels     : undefined,
  whatif_pct:        whatifPct ?? undefined,
});

export const getYEForecast = (opts) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}forecast/ye-projection/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: buildParams(opts),
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getYEForecastByBranch = (opts) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}forecast/ye-projection/by-branch/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: buildParams(opts),
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));
