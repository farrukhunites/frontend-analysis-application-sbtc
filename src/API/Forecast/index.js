import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

export const getYEForecast = ({
  method,
  year,
  unitType,
  valueType,
  branchCodes,
  productCodes,
  channels,
  whatifPct,
}) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}forecast/ye-projection/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        method:            method || undefined,
        year:              year   || undefined,
        unit_type:         unitType,
        value_type:        valueType,
        "branch_codes[]":  branchCodes?.length  ? branchCodes  : undefined,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
        "channels[]":      channels?.length     ? channels     : undefined,
        whatif_pct:        whatifPct ?? undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));
