import { useEffect, useMemo, useRef, useState } from "react";
import { Table, DatePicker, Button, Select, Skeleton, message, Tag, Space, Divider, Modal, Progress } from "antd";
import { DownloadOutlined, ReloadOutlined, FileExcelOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllBranches } from "../../../API/Branches";
import { getAllProducts } from "../../../API/Products";
import { getRawSales, exportRawSalesCsv } from "../../../API/Reports";
import "./reports.css";

const DATE_FMT = "YYYY-MM-DD";

const FIELD_META = {
  inv_dt:        { title: "Inv Date",     width: 100, render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-" },
  inv_no:        { title: "Invoice #",    width: 110 },
  tp:            { title: "Type",         width: 110, render: (v) => v ? <Tag style={{ margin: 0, fontSize: 11 }}>{v}</Tag> : "-" },
  cust_cd:       { title: "Cust Code",    width: 100 },
  cust_nm:       { title: "Customer",     width: 220, ellipsis: true },
  otlcd:         { title: "Channel",      width: 90, render: (v) => v ? <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> : "-" },
  cusgrcd_nm:    { title: "Cust Group",   width: 140, ellipsis: true },
  salesman_cd:   { title: "Sm Code",      width: 90 },
  salesman_nm:   { title: "Salesman",     width: 180, ellipsis: true },
  salespointcd:  { title: "Branch Code",  width: 100 },
  salespoint_nm: { title: "Branch",       width: 160, ellipsis: true },
  prod_cd:       { title: "Prod Code",    width: 100 },
  prod_nm:       { title: "Product",      width: 220, ellipsis: true },
  item_cd:       { title: "Item Code",    width: 110 },
  item_nm:       { title: "Item",         width: 220, ellipsis: true },
  packing:       { title: "Packing",      width: 80,  align: "right" },
  size:          { title: "Size",         width: 80 },
  qtyorder:      { title: "Qty Order",    width: 90,  align: "right", render: (v) => v?.toLocaleString() },
  qtyconv:       { title: "Qty (Ctn)",    width: 90,  align: "right", render: (v) => v?.toLocaleString() },
  totqty:        { title: "Total Qty",    width: 90,  align: "right", render: (v) => v?.toLocaleString() },
  unitprice:     { title: "Unit Price",   width: 100, align: "right", render: (v) => v?.toLocaleString() },
  amtdisc:       { title: "Discount",     width: 100, align: "right", render: (v) => v?.toLocaleString() },
  tp_ord:        { title: "TP Ord",       width: 90,  align: "right", render: (v) => v?.toLocaleString() },
  driver_cd:     { title: "Driver Code",  width: 100 },
  driver_nm:     { title: "Driver",       width: 160, ellipsis: true },
  so_cd:         { title: "SO Code",      width: 110 },
  so_dt:         { title: "SO Date",      width: 100, render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-" },
  do_dt:         { title: "DO Date",      width: 100, render: (v) => v ? dayjs(v).format("DD MMM YYYY") : "-" },
};

const RawData = () => {
  const [branches, setBranches]                 = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [products, setProducts]                 = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [dateRange, setDateRange]               = useState([dayjs().subtract(6, "day"), dayjs()]);

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState({ results: [], count: 0, fields: [] });

  // Export progress state
  const [exportModal, setExportModal] = useState({
    open: false, status: "idle", elapsed: 0, bytes: 0, totalBytes: 0,
  });
  const elapsedTimerRef = useRef(null);

  useEffect(() => {
    getAllBranches().then((res) => {
      const list = res?.results || [];
      setBranches(list);
      setSelectedBranches(list.map((b) => b.code));
    });
    getAllProducts().then((res) => {
      let list = res?.results || [];
      const hasIndomie = list.some((p) => p?.name?.toLowerCase().includes("indomie"));
      if (hasIndomie) {
        [
          { code: "9999901", name: "INDOMIE PILLOW (All)" },
          { code: "9999902", name: "INDOMIE CUP (All)" },
        ].forEach((sp) => { if (!list.some((p) => p.code === sp.code)) list = [...list, sp]; });
      }
      setProducts(list);
      setSelectedProducts(
        list.filter((p) => !["9999901", "9999902"].includes(p.code)).map((p) => p.code)
      );
    });
  }, []);

  const fetchData = (overrides = {}) => {
    const [start, end] = dateRange || [];
    if (!start || !end) { message.warning("Select a date range"); return; }
    if (!selectedBranches.length || !selectedProducts.length) return;

    setLoading(true);
    getRawSales({
      startDate:    start.format(DATE_FMT),
      endDate:      end.format(DATE_FMT),
      branchCodes:  selectedBranches,
      productCodes: selectedProducts,
      page:         overrides.page ?? page,
      pageSize:     overrides.pageSize ?? pageSize,
    }).then((res) => {
      if (res?.error) {
        message.error(typeof res.error === "string" ? res.error : (res.error.detail || "Failed to load raw data"));
        setData({ results: [], count: 0, fields: [] });
      } else {
        setData(res);
      }
      setLoading(false);
    });
  };

  // Refetch on filter change (reset page to 1)
  useEffect(() => {
    if (!branches.length || !products.length) return;
    setPage(1);
    fetchData({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedBranches, selectedProducts, branches.length, products.length]);

  // Refetch on pagination change
  useEffect(() => {
    if (!branches.length || !products.length) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const fields = data.fields?.length ? data.fields : Object.keys(FIELD_META);

  const columns = useMemo(() => {
    return [
      {
        title: "#", width: 50, align: "center", fixed: "left",
        render: (_, __, i) => (
          <span style={{ color: "#94A3B8", fontSize: 11 }}>
            {(page - 1) * pageSize + i + 1}
          </span>
        ),
      },
      ...fields.filter((f) => f !== "id").map((field) => {
        const meta = FIELD_META[field] || { title: field, width: 120 };
        return {
          title:     meta.title,
          dataIndex: field,
          key:       field,
          width:     meta.width,
          align:     meta.align,
          ellipsis:  meta.ellipsis,
          render:    meta.render || ((v) => v ?? <span style={{ color: "#CBD5E1" }}>-</span>),
        };
      }),
    ];
  }, [fields, page, pageSize]);

  const exportToCsv = async () => {
    const [start, end] = dateRange || [];
    if (!start || !end) { message.warning("Select a date range first"); return; }
    if (!data.count)    { message.warning("Nothing to export"); return; }

    const startedAt = Date.now();
    setExportModal({ open: true, status: "downloading", elapsed: 0, bytes: 0, totalBytes: 0 });

    // Tick elapsed time every 100ms so user sees movement even before any bytes arrive
    elapsedTimerRef.current = setInterval(() => {
      setExportModal((p) => p.status === "downloading"
        ? { ...p, elapsed: (Date.now() - startedAt) / 1000 }
        : p);
    }, 100);

    try {
      const res = await exportRawSalesCsv({
        startDate:    start.format(DATE_FMT),
        endDate:      end.format(DATE_FMT),
        branchCodes:  selectedBranches,
        productCodes: selectedProducts,
        onDownloadProgress: (evt) => {
          setExportModal((p) => ({
            ...p,
            bytes:      evt.loaded || 0,
            totalBytes: evt.total  || 0,
          }));
        },
      });
      clearInterval(elapsedTimerRef.current);

      if (res?.error) {
        setExportModal({ open: true, status: "error", elapsed: (Date.now() - startedAt) / 1000, bytes: 0, totalBytes: 0 });
        message.error("Export failed");
        return;
      }

      const url = URL.createObjectURL(res.blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `Raw_Sales_${start.format(DATE_FMT)}_to_${end.format(DATE_FMT)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setExportModal((p) => ({ ...p, status: "done", elapsed: (Date.now() - startedAt) / 1000, bytes: res.blob.size }));
      // Auto-close 1.5s after success
      setTimeout(() => setExportModal((p) => p.status === "done" ? { ...p, open: false } : p), 1500);
    } catch (e) {
      clearInterval(elapsedTimerRef.current);
      setExportModal({ open: true, status: "error", elapsed: (Date.now() - startedAt) / 1000, bytes: 0, totalBytes: 0 });
      message.error("Export failed: " + e.message);
    }
  };

  // Cleanup the elapsed-timer on unmount
  useEffect(() => () => clearInterval(elapsedTimerRef.current), []);

  const fmtBytes = (n) => {
    if (!n) return "0 B";
    if (n < 1024)         return `${n} B`;
    if (n < 1024 * 1024)  return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Space>
          <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>From – To:</span>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v)}
            format="DD MMM YYYY"
            allowClear={false}
            presets={[
              { label: "Today",       value: [dayjs(),                  dayjs()] },
              { label: "Last 7 days", value: [dayjs().subtract(6, "d"), dayjs()] },
              { label: "Last 30 days",value: [dayjs().subtract(29, "d"),dayjs()] },
              { label: "This month",  value: [dayjs().startOf("month"), dayjs()] },
              { label: "Last month",  value: [dayjs().subtract(1,"month").startOf("month"),
                                              dayjs().subtract(1,"month").endOf("month")] },
            ]}
          />
        </Space>

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Branch:</span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="All branches"
          value={selectedBranches}
          onChange={setSelectedBranches}
          maxTagCount="responsive"
          options={branches.map((b) => ({ value: b.code, label: b.name }))}
          dropdownRender={(menu) => (
            <>
              <div style={{ padding: "4px 8px", display: "flex", gap: 8 }}>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedBranches(branches.map((b) => b.code))}>Select All</Button>
                <Divider type="vertical" />
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedBranches([])}>Unselect All</Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />

        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Product:</span>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="All products"
          value={selectedProducts}
          onChange={setSelectedProducts}
          maxTagCount="responsive"
          options={products.map((p) => ({ value: p.code, label: p.name }))}
          dropdownRender={(menu) => (
            <>
              <div style={{ padding: "4px 8px", display: "flex", gap: 8 }}>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedProducts(products.map((p) => p.code))}>Select All</Button>
                <Divider type="vertical" />
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setSelectedProducts([])}>Unselect All</Button>
              </div>
              <Divider style={{ margin: "4px 0" }} />
              {menu}
            </>
          )}
        />

        <Button icon={<ReloadOutlined />} onClick={() => fetchData()} disabled={loading}>
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={exportModal.open && exportModal.status === "downloading"}
          disabled={loading || !data.count}
          onClick={exportToCsv}
        >
          Export to CSV
        </Button>
      </div>

      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>
        {loading
          ? "Loading..."
          : <>Showing <b>{data.results.length}</b> of <b>{data.count.toLocaleString()}</b> raw transactions
             {data.start_date && data.end_date ? <> from <b>{dayjs(data.start_date).format("DD MMM YYYY")}</b> to <b>{dayjs(data.end_date).format("DD MMM YYYY")}</b></> : null}
            </>
        }
      </div>

      {loading && !data.results.length ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Table
          bordered
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data.results}
          columns={columns}
          pagination={{
            current:         page,
            pageSize,
            total:           data.count,
            showSizeChanger: true,
            pageSizeOptions: [50, 100, 200, 500],
            size:            "small",
            onChange:        (p, ps) => { setPage(p); setPageSize(ps); },
            showTotal:       (t) => `${t.toLocaleString()} rows`,
          }}
          scroll={{ x: "max-content", y: "55vh" }}
          locale={{ emptyText: "No transactions in this range" }}
        />
      )}

      {/* Export progress modal */}
      <Modal
        open={exportModal.open}
        footer={null}
        closable={exportModal.status !== "downloading"}
        maskClosable={false}
        keyboard={exportModal.status !== "downloading"}
        onCancel={() => setExportModal((p) => ({ ...p, open: false }))}
        width={420}
        centered
        title={
          <Space>
            {exportModal.status === "done"
              ? <CheckCircleOutlined style={{ color: "#10B981" }} />
              : <FileExcelOutlined  style={{ color: "var(--color-accent)" }} />}
            <span>
              {exportModal.status === "done"     ? "Export complete"
                : exportModal.status === "error" ? "Export failed"
                : "Preparing CSV…"}
            </span>
          </Space>
        }
      >
        <div style={{ padding: "8px 0 4px" }}>
          {exportModal.status === "downloading" && (
            <Progress
              percent={exportModal.totalBytes
                ? Math.round((exportModal.bytes / exportModal.totalBytes) * 100)
                : Math.min(95, Math.round(exportModal.elapsed * 7))}
              status="active"
              strokeColor={{ from: "#3B82F6", to: "#6366F1" }}
              showInfo={!!exportModal.totalBytes}
            />
          )}
          {exportModal.status === "done" && (
            <Progress percent={100} status="success" />
          )}
          {exportModal.status === "error" && (
            <Progress percent={100} status="exception" />
          )}

          <div style={{ marginTop: 12, fontSize: 13, color: "#475569", display: "flex", justifyContent: "space-between" }}>
            <span>
              Rows: <b>{data.count.toLocaleString()}</b>
            </span>
            <span>
              Downloaded: <b>{fmtBytes(exportModal.bytes)}</b>
              {exportModal.totalBytes ? <> / {fmtBytes(exportModal.totalBytes)}</> : null}
            </span>
            <span>
              Elapsed: <b>{exportModal.elapsed.toFixed(1)}s</b>
            </span>
          </div>

          {exportModal.status === "downloading" && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
              Generating CSV from {data.count.toLocaleString()} transactions — this usually takes a few seconds.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RawData;
