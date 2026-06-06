// Wrap a column sorter so the grand-total row always lands at the bottom,
// regardless of sort direction. AntD passes sortOrder as the third arg and
// flips the comparator result for descend, so we mirror our pin sign on it.
const isGT = (r) => r?.isGrandTotal || r?.isTotal;

export const pinGrandTotal = (cmp) => (a, b, sortOrder) => {
  if (isGT(a)) return sortOrder === "descend" ? -1 : 1;
  if (isGT(b)) return sortOrder === "descend" ? 1 : -1;
  return cmp(a, b);
};

export const openCustomerAnalysis = ({ customerCode, branchCode, channel, productCode }) => {
  if (!customerCode) return;
  const params = new URLSearchParams();
  params.set("customer_code", customerCode);
  if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
  if (channel)     params.set("channel_code", channel);
  if (productCode) params.set("product_code", productCode);
  window.open(`/customer-analysis?${params.toString()}`, "_blank", "noopener");
};

export const openSalesmanAnalysis = ({ salesmanCode, branchCode, productCode }) => {
  if (!salesmanCode) return;
  const params = new URLSearchParams();
  params.set("salesman_code", salesmanCode);
  if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
  if (productCode) params.set("product_code", productCode);
  window.open(`/salesman-analysis?${params.toString()}`, "_blank", "noopener");
};
