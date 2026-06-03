import { Modal, Skeleton, Empty, Table, Tag } from "antd";
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
  const { open, loading, data, customerName, customerCode, year, month, isKa } = state;

  const period = month ? `${MONTHS[month]} ${year}` : `${year}`;
  const unitLabel = (unitType || "ctn").toUpperCase();

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
        <div>
          <div style={{ fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.cust_cd}</div>
        </div>
      ) },
    { title: `Paid (${unitLabel})`, dataIndex: "paid_total", align: "right", width: 120,
      render: (v) => <b>{fmtNum(v)}</b> },
    { title: `Free (${unitLabel})`, dataIndex: "free_total", align: "right", width: 120,
      render: (v) => v > 0
        ? <b style={{ color: "#10B981" }}>{fmtNum(v)}</b>
        : <span style={{ color: "#94A3B8" }}>-</span> },
    { title: "Items", dataIndex: "items", align: "center", width: 80,
      render: (items) => items?.length || 0 },
  ];

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
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <StatChip label="Invoices" value={data.invoice_count} />
            <StatChip label={`Total Paid (${unitLabel})`} value={fmtNum(data.total_paid)} accent="#3B82F6" />
            <StatChip label={`Total Free (${unitLabel})`} value={fmtNum(data.total_free)} accent="#10B981" />
            {isKa && <Tag color="purple" style={{ alignSelf: "center" }}>KA group ({customerCode})</Tag>}
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
