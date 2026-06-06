import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

export const getSalesmanAchievement = ({ month, unitType, valueType, branchCodes, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-achievement/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelCustomerYoY = ({ channel, branchCode, productCodes, unitType, valueType }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-customer-yoy/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        channel,
        branch_code:   branchCode,
        product_codes: productCodes,
        unit_type:     unitType,
        value_type:    valueType,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getCustomerInvoiceBreakdown = ({
  customerCode, isKa, channel, branchCode, productCodes, year, month, unitType, valueType,
}) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/customer-invoice-breakdown/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        customer_code: customerCode,
        is_ka:         isKa ? "true" : "false",
        channel,
        branch_code:   branchCode,
        product_codes: productCodes,
        year,
        month:         month || undefined,
        unit_type:     unitType,
        value_type:    valueType,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelAchievement = ({ productCodes, branchCode, month, unitType, valueType, lookbackMonths }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-achievement/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        product_codes:   productCodes,
        branch_code:     branchCode,
        month,
        unit_type:       unitType,
        value_type:      valueType,
        lookback_months: lookbackMonths,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelCustomerMonthBreakdown = ({
  channel, branchCode, month, productCodes, unitType, valueType,
}) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-customer-month-breakdown/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        channel,
        branch_code:   branchCode,
        month,
        product_codes: productCodes,
        unit_type:     unitType,
        value_type:    valueType,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelCoverageCustomers = ({ month, branchCode, channel, productCodes, unitType, valueType, mode }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-coverage-customers/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        branch_code:       branchCode,
        channel:           channel || undefined,
        unit_type:         unitType,
        value_type:        valueType,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
        mode:              mode || undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelCoverage = ({ month, unitType, valueType, branchCodes, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-coverage/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanCustomerBreakdown = ({ salesmanCd, month, productCodes, unitType, valueType, branchCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-customer-breakdown/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        salesman_cd:      salesmanCd,
        month,
        product_codes:    productCodes || undefined,
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));
