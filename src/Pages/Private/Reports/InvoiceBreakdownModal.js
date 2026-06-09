import { Modal, Skeleton, Empty, Table, Tag, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { exportRowsToExcel } from "./reportUtils";
import "./reports.css";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const StatChip = ({ label, value, accent }) => (
  <div style={{ padding: "8px 14px", background: "#F1F5F9", borderRadius: 8, minWidth: 120 }}>
    <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: accent || "#1E293B" }}>{value}</div>
  </div>
);

/**
 * Invoice-level paid vs free breakdown modal. Re-used by Customer YoY and
 * Channel Achievement drill-downs.
 *
 * Props:
 *  - state: { open, loading, data, customerCode, customerName, year, month, isKa }
 *  - onClose: () => void
 *  - unitType: "ctn" | "pcs"
 */
const InvoiceBreakdownModal = ({ state, onClose, unitType }) => {
  const {
    open, loading, data, customerName, customerCode, year, month, isKa,
    channel, branchCode, productCode,
  } = state;

  const period = month ? `${MONTHS[month]} ${year}` : `${year}`;
  const unitLabel = (unitType || "ctn").toUpperCase();

  const openCustomerAnalysis = (row) => {
    const params = new URLSearchParams();
    params.set("customer_code", row.cust_cd);
    if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
    if (channel)     params.set("channel_code", channel);
    if (productCode) params.set("product_code", productCode);
    window.open(`/customer-analysis?${params.toString()}`, "_blank", "noopener");
  };

  const openSalesmanAnalysis = (row) => {
    if (!row.salesman_cd) return;
    const params = new URLSearchParams();
    params.set("salesman_code", row.salesman_cd);
    if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
    if (productCode) params.set("product_code", productCode);
    window.open(`/salesman-analysis?${params.toString()}`, "_blank", "noopener");
  };

  const itemColumns = [
    { title: "Item", dataIndex: "item_nm", key: "item_nm",
      render: (v, r) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.item_cd} · {r.prod_nm}</div>
        </div>
      ) },
    { title: `Paid (${unitLabel})`, dataIndex: "paid_qty", align: "right", width: 110,
      render: (v) => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span> },
    { title: `Free (${unitLabel})`, dataIndex: "free_qty", align: "right", width: 110,
      render: (v) => v > 0
        ? <span style={{ color: "#10B981", fontWeight: 600 }}>{fmtNum(v)}</span>
        : <span style={{ color: "#94A3B8" }}>-</span> },
    { title: "Scheme", align: "center", width: 100,
      render: (_, r) => r.free_qty > 0
        ? <Tag color="green" style={{ margin: 0 }}>{`${Math.round(r.paid_qty)}+${Math.round(r.free_qty)}`}</Tag>
        : <span style={{ color: "#CBD5E1" }}>-</span> },
  ];

  const invoiceColumns = [
    { title: "Invoice #", dataIndex: "inv_no", key: "inv_no",
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{r.inv_dt}</div>
        </div>
      ) },
    { title: "Customer", dataIndex: "cust_nm", key: "cust_nm",
      render: (v, r) => (
        <div
          className="report-clickable-name"
          onClick={() => openCustomerAnalysis(r)}
          title="Open Customer Analysis in new tab"
        >
          <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.cust_cd}</div>
        </div>
      ) },
    { title: "Salesman", dataIndex: "salesman_nm", key: "salesman_nm", width: 180,
      render: (v, r) => v
        ? (
          <div
            className="report-clickable-name"
            onClick={() => openSalesmanAnalysis(r)}
            title="Open Salesman Analysis in new tab"
          >
            <div style={{ fontSize: 12 }}>{v}</div>
            <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.salesman_cd}</div>
          </div>
        )
        : <span style={{ color: "#CBD5E1" }}>-</span> },
    { title: `Paid (${unitLabel})`, dataIndex: "paid_total", align: "right", width: 120,
      render: (v) => <b>{fmtNum(v)}</b> },
    { title: `Free (${unitLabel})`, dataIndex: "free_total", align: "right", width: 120,
      render: (v) => v > 0
        ? <b style={{ color: "#10B981" }}>{fmtNum(v)}</b>
        : <span style={{ color: "#94A3B8" }}>-</span> },
    { title: "Items", dataIndex: "items", align: "center", width: 80,
      render: (items) => items?.length || 0 },
  ];

  const handleExport = () => {
    // Flatten invoice -> item rows so each line item gets its own row.
    const flat = [];
    (data?.invoices || []).forEach((inv) => {
      const items = inv.items?.length ? inv.items : [{}];
      items.forEach((it) => {
        flat.push({
          inv_no:      inv.inv_no,
          inv_dt:      inv.inv_dt,
          cust_cd:     inv.cust_cd,
          cust_nm:     inv.cust_nm,
          salesman_cd: inv.salesman_cd,
          salesman_nm: inv.salesman_nm,
          item_cd:     it.item_cd || "",
          item_nm:     it.item_nm || "",
          paid_qty:    it.paid_qty || 0,
          free_qty:    it.free_qty || 0,
        });
      });
    });
    const cols = [
      { header: "Invoice #",      key: "inv_no",      width: 14 },
      { header: "Invoice Date",   key: "inv_dt",      width: 14 },
      { header: "Customer Code",  key: "cust_cd",     width: 14 },
      { header: "Customer Name",  key: "cust_nm",     width: 32 },
      { header: "Salesman Code",  key: "salesman_cd", width: 14 },
      { header: "Salesman Name",  key: "salesman_nm", width: 22 },
      { header: "Item Code",      key: "item_cd",     width: 14 },
      { header: "Item Name",      key: "item_nm",     width: 32 },
      { header: `Paid (${unitLabel})`, key: "paid_qty", width: 14, type: "number" },
      { header: `Free (${unitLabel})`, key: "free_qty", width: 14, type: "number" },
    ];
    const slug = (s) => (s || "").replace(/[^\w]+/g, "_").toLowerCase();
    exportRowsToExcel({
      sheetName: "Invoice Breakdown",
      fileName:  `invoices_${slug(customerCode)}_${month ? `${year}${String(month).padStart(2, "0")}` : year}`,
      subtitle:  `${customerName} · ${customerCode} · ${period}`,
      columns:   cols,
      rows:      flat,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{customerName}</div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>
            {customerCode} · {period} · Invoice-level paid vs free
          </div>
        </div>
      }
      destroyOnClose
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !data || !data.invoices?.length ? (
        <Empty description="No invoices in this period" />
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <StatChip label="Invoices" value={data.invoice_count} />
            <StatChip label={`Total Paid (${unitLabel})`} value={fmtNum(data.total_paid)} accent="#3B82F6" />
            <StatChip label={`Total Free (${unitLabel})`} value={fmtNum(data.total_free)} accent="#10B981" />
            {isKa && <Tag color="purple" style={{ alignSelf: "center" }}>KA group ({customerCode})</Tag>}
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              style={{ marginLeft: "auto" }}
            >
              Export to Excel
            </Button>
          </div>
          <Table
            size="small"
            bordered
            rowKey="inv_no"
            columns={invoiceColumns}
            dataSource={data.invoices}
            pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
            scroll={{ y: "55vh" }}
            expandable={{
              expandedRowRender: (record) => (
                <Table
                  className="invoice-item-subtable"
                  size="small"
                  bordered={false}
                  rowKey="item_cd"
                  columns={itemColumns}
                  dataSource={record.items}
                  pagination={false}
                />
              ),
              rowExpandable: (record) => (record.items?.length || 0) > 0,
            }}
          />
        </>
      )}
    </Modal>
  );
};

export default InvoiceBreakdownModal;
