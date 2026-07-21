import { Modal, Skeleton, Empty, Table, Tag, Button } from "antd";
import { DownloadOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { openCustomerAnalysis, openSalesmanAnalysis, exportRowsToExcel } from "./reportUtils";
import RiyalIcon from "../../../Utils/RiyalIcon";
import "./reports.css";

const fmtNum = (v) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const StatChip = ({ label, value, accent }) => (
  <div style={{ padding: "8px 14px", background: "#F1F5F9", borderRadius: 8, minWidth: 120 }}>
    <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: accent || "#1E293B" }}>{value}</div>
  </div>
);

/**
 * Drill-down modal for the Channel Coverage report. Lists YTD customers for a
 * (branch, channel?) bucket, optionally filtered to the selected product.
 *
 * Props:
 *  - state: { open, loading, data, branchName, channel, hasProductFilter, productName }
 *  - onClose: () => void
 *  - unitType, valueType
 *  - selectedProductCode (string | null) — passed to drill links
 */
const ChannelCoverageCustomersModal = ({ state, onClose, unitType, valueType, isValueMode = false, selectedProductCode }) => {
  const { open, loading, data, branchName, channel, channels, hasProductFilter, productName, mode } = state;
  const isRemaining = mode === "remaining";

  const unitLabel = (unitType || "ctn").toUpperCase();
  const valueLabel = (valueType || "net").toUpperCase();
  const unitLabelEl = isValueMode ? (
    <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
      <RiyalIcon width={11} height={11} color="#64748B" />
    </span>
  ) : (
    unitLabel
  );
  const excelUnitLabel = isValueMode ? "SAR" : unitLabel;

  const showYtd = hasProductFilter && !isRemaining;

  const columns = [
    {
      title: "Customer",
      dataIndex: "customer_name",
      render: (v, r) => (
        <div
          className="report-clickable-name"
          onClick={() => openCustomerAnalysis({
            customerCode: r.customer_code,
            branchCode:   data?.branch_code,
            channel:      r.channel,
            productCode:  selectedProductCode,
          })}
          title="Open Customer Analysis in new tab"
        >
          <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.customer_code}</div>
        </div>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      width: 110,
      render: (v) => v ? <Tag color="blue" style={{ margin: 0 }}>{v}</Tag> : <span style={{ color: "#CBD5E1" }}>-</span>,
    },
    {
      title: "Assigned Salesman",
      dataIndex: "salesman_nm",
      width: 220,
      render: (v, r) => r.salesman_cd ? (
        <div
          className="report-clickable-name"
          onClick={() => openSalesmanAnalysis({
            salesmanCode: r.salesman_cd,
            branchCode:   data?.branch_code,
            productCode:  selectedProductCode,
          })}
          title="Open Salesman Analysis in new tab"
        >
          <div style={{ fontSize: 12 }}>{v || "-"}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.salesman_cd}</div>
        </div>
      ) : <span style={{ color: "#CBD5E1" }}>-</span>,
    },
    {
      title: "Salesman Mobile",
      dataIndex: "salesman_mobile",
      width: 140,
      render: (v) => v
        ? <a href={`tel:${v}`} style={{ fontSize: 12 }}>{v}</a>
        : <span style={{ color: "#CBD5E1" }}>-</span>,
    },
    {
      title: "Coordinates",
      dataIndex: "latitude",
      width: 150,
      render: (_, r) => (r.latitude != null && r.longitude != null) ? (
        <a
          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Google Maps"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
        >
          <EnvironmentOutlined />
          {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
        </a>
      ) : <span style={{ color: "#CBD5E1" }}>-</span>,
    },
    showYtd && {
      title: <span>YTD {valueLabel} ({unitLabelEl})</span>,
      dataIndex: "ytd_value",
      align: "right",
      width: 160,
      defaultSortOrder: "descend",
      sorter: (a, b) => (a.ytd_value || 0) - (b.ytd_value || 0),
      render: (v) => <b style={{ color: "var(--color-accent)" }}>{fmtNum(v)}</b>,
    },
  ].filter(Boolean);

  const productLabel = isRemaining
    ? `Without ${productName || "selected product"}`
    : hasProductFilter
    ? (productName || "Selected product")
    : "All products";

  const channelScope = channel
    ? channel
    : channels?.length
    ? `${channels.length} channels: ${channels.join(", ")}`
    : "All channels";

  const scopeLabel = [
    branchName,
    channelScope,
    productLabel,
  ].filter(Boolean).join(" · ");

  const handleExport = () => {
    const cols = [
      { header: "Customer Code",   key: "customer_code",   width: 16 },
      { header: "Customer Name",   key: "customer_name",   width: 38 },
      { header: "Channel",         key: "channel",         width: 12 },
      { header: "Salesman Code",   key: "salesman_cd",     width: 14 },
      { header: "Salesman Name",   key: "salesman_nm",     width: 26 },
      { header: "Salesman Mobile", key: "salesman_mobile", width: 18 },
      { header: "Latitude",        key: "latitude",        width: 14 },
      { header: "Longitude",       key: "longitude",       width: 14 },
      ...(showYtd
        ? [{
            header: `YTD ${valueLabel} (${excelUnitLabel})`,
            key: "ytd_value", width: 22, type: "number",
          }]
        : []),
    ];
    const slug = (s) => (s || "").replace(/[^\w]+/g, "_").toLowerCase();
    const tag = isRemaining ? "remaining" : "coverage";
    exportRowsToExcel({
      sheetName: isRemaining ? "Remaining Customers" : "Coverage Drill-down",
      fileName:  `${tag}_${slug(branchName)}_${slug(channel) || "all"}`,
      subtitle:  scopeLabel,
      columns:   cols,
      rows:      data?.customers || [],
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {isRemaining ? "Remaining customers" : "Coverage drill-down"}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>{scopeLabel}</div>
        </div>
      }
      destroyOnClose
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !data || !data.customers?.length ? (
        <Empty description="No customers in this bucket" />
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <StatChip label="Customers" value={fmtNum(data.customer_count)} />
            {showYtd && (
              <StatChip
                label={<span>Total YTD {valueLabel} ({unitLabelEl})</span>}
                value={fmtNum(data.total_value)}
                accent="#3B82F6"
              />
            )}
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
            rowKey="customer_code"
            columns={columns}
            dataSource={data.customers}
            pagination={{ pageSize: 25, size: "small", showSizeChanger: false }}
            scroll={{ y: "55vh" }}
          />
        </>
      )}
    </Modal>
  );
};

export default ChannelCoverageCustomersModal;
