import axios from "axios";
import { getToken } from "../../Utils/UpdateUserState";

export const getSalesTargetOverview = ({
  month, fromMonth, toMonth, unitType, valueType,
  branchCodes, productCodes, channels,
  selectedBranchCodes, selectedProductCodes, lyMode,
}) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/sales-target-overview/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        ...(fromMonth && toMonth
          ? { from_month: fromMonth, to_month: toMonth }
          : { month }),
        unit_type:         unitType,
        value_type:        valueType,
        "branch_codes[]":  branchCodes,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
        "channels[]":      channels?.length ? channels : undefined,
        "selected_branch_codes[]":  selectedBranchCodes?.length ? selectedBranchCodes : undefined,
        "selected_product_codes[]": selectedProductCodes?.length ? selectedProductCodes : undefined,
        ly_mode:           lyMode || undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanAchievement = ({ month, fromMonth, toMonth, unitType, valueType, branchCodes, productCodes, comparison }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-achievement/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        // Range overrides single month when both bounds are provided.
        ...(fromMonth && toMonth
          ? { from_month: fromMonth, to_month: toMonth }
          : { month }),
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
        ...(comparison && { comparison: "true" }),
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

export const getChannelCoverageCustomers = ({ month, fromMonth, toMonth, branchCode, channel, channels, productCodes, unitType, valueType, mode, useAllowedProducts }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-coverage-customers/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month:       fromMonth && toMonth ? undefined : month,
        from_month:  fromMonth || undefined,
        to_month:    toMonth   || undefined,
        branch_code:       branchCode,
        channel:           channel || undefined,
        "channels[]":      channels?.length ? channels : undefined,
        unit_type:         unitType,
        value_type:        valueType,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
        mode:              mode || undefined,
        // Signals "product filter is on but Navbar is All Products" — backend
        // scopes to the user's allowed_products.
        use_allowed_products: useAllowedProducts ? 1 : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getChannelCoverage = ({ month, fromMonth, toMonth, unitType, valueType, branchCodes, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/channel-coverage/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month:       fromMonth && toMonth ? undefined : month,
        from_month:  fromMonth || undefined,
        to_month:    toMonth   || undefined,
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const exportRawSalesCsv = ({ startDate, endDate, branchCodes, productCodes, onDownloadProgress }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/raw-sales/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      responseType: "blob",
      onDownloadProgress,
      params: {
        start_date:        startDate,
        end_date:          endDate,
        export:            "csv",
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => ({ blob: r.data }))
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getRawSales = ({ startDate, endDate, branchCodes, productCodes, page, pageSize }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/raw-sales/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        start_date:        startDate,
        end_date:          endDate,
        page:              page || 1,
        page_size:         pageSize || 100,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getTargetFeasibility = ({ month, unitType, branchCodes, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/target-feasibility/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        unit_type:         unitType,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getTargetFeasibilitySalesmen = ({ month, branchCode, unitType, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/target-feasibility/salesmen/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        branch_code:       branchCode,
        unit_type:         unitType,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getTargetFeasibilityCustomers = ({ month, branchCode, salesmanCode, unitType, productCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/target-feasibility/customers/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        month,
        branch_code:       branchCode,
        salesman_code:     salesmanCode,
        unit_type:         unitType,
        "product_codes[]": productCodes?.length ? productCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanActivity = ({ mode, date, startDate, endDate, fromMonth, toMonth, branchCodes, salesmanCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-activity/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        mode:       mode || undefined,
        date:       date || undefined,
        start_date: startDate || undefined,
        end_date:   endDate   || undefined,
        from_month: fromMonth || undefined,
        to_month:   toMonth   || undefined,
        "branch_codes[]":   branchCodes?.length   ? branchCodes   : undefined,
        "salesman_codes[]": salesmanCodes?.length ? salesmanCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanActivityCustomers = ({ date, salesmanCd, branchCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-activity/customers/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        date,
        salesman_cd:       salesmanCd,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanActivityPeriodCustomers = ({ salesmanCd, fromMonth, toMonth, branchCodes, metric }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-activity/period-customers/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        salesman_cd:       salesmanCd,
        from_month:        fromMonth,
        to_month:          toMonth,
        metric,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));

export const getSalesmanCustomerBreakdown = ({ salesmanCd, month, fromMonth, toMonth, productCodes, unitType, valueType, branchCodes }) =>
  axios
    .get(`${process.env.REACT_APP_BACKEND_URL}reports/salesman-customer-breakdown/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        salesman_cd:      salesmanCd,
        ...(fromMonth && toMonth
          ? { from_month: fromMonth, to_month: toMonth }
          : { month }),
        product_codes:    productCodes || undefined,
        unit_type:        unitType,
        value_type:       valueType,
        "branch_codes[]":  branchCodes?.length ? branchCodes : undefined,
      },
    })
    .then((r) => r.data)
    .catch((err) => ({ error: err.response?.data || err.message }));
