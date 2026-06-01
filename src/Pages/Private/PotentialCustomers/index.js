import { Table, message, Skeleton, Input, Button, Space } from "antd";
import { useDateFilter } from "../../../Contexts/DateFilterContext";
import { ProductContext } from "../../../Contexts/ProductContext";
import { UnitValueContext } from "../../../Contexts/UnitValueContext";
import { useContext, useEffect, useRef, useState } from "react";
import { getPotentialCustomers } from "../../../API/Potential Customers";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const branchOptions = [
  "SBTC JEDDAH",
  "SBTC MAKKAH",
  "SBTC MADINAH",
  "SBTC TAIF",
  "SBTC YANBU",
  "SBTC TABUK",
  "SBTC SKAKA",
  "SBTC GASIEM",
  "SBTC RIYADH",
  "SBTC KHARJ",
  "SBTC DAWADMI",
  "SBTC HAIL",
  "SBTC KHOBAR",
  "SBTC JUBAIL",
  "SBTC HUFUF",
  "SBTC HAFR BATIN",
  "SBTC KHAMIS MUSHAIT",
  "SBTC JIZAN",
  "SBTC NAJRAN",
  "SBTC QONFUDA",
  "SBTC BISHA",
];

const channelOptions = [
  "BRN",
  "CFC",
  "CSM",
  "DSC",
  "HRC",
  "KA",
  "MM",
  "RTA",
  "RTI",
  "WS",
];

const PotentialCustomers = () => {
  const { selectedMonth } = useDateFilter();
  const { selectedProduct } = useContext(ProductContext);
  const { unitType, valueType } = useContext(UnitValueContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [potentialCustomers, setPotentialCustomers] = useState([]);

  // -------------------------
  // Fetch API Data
  // -------------------------
  useEffect(() => {
    const fetchPotentialCustomers = async () => {
      setLoading(true);

      try {
        const res = await getPotentialCustomers(
          selectedMonth,
          selectedProduct?.code,
          unitType,
          valueType,
        );
        if (res) {
          setPotentialCustomers(res);
        }
      } catch (error) {
        message.error(
          "Error fetching potential Customer data: " + error?.message,
        );
      }
      setLoading(false);
    };

    if (selectedMonth && selectedProduct?.code) {
      fetchPotentialCustomers();
    }
  }, [selectedMonth, selectedProduct, unitType, valueType]);

  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };
  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText(selectedKeys[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Filter
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange(open) {
        if (open) {
          setTimeout(() => {
            var _a;
            return (_a = searchInput.current) === null || _a === void 0
              ? void 0
              : _a.select();
          }, 100);
        }
      },
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  // -------------------------
  // Table Columns
  // -------------------------
  const columns = [
    {
      title: "Code",
      dataIndex: "customer_code",
      key: "customer_code",
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
      ...getColumnSearchProps("customer_name"),
      render: (text, record) => (
        <span
          style={{ color: "var(--color-accent)", cursor: "pointer", fontWeight: 500 }}
          onClick={() => {
            const params = new URLSearchParams({
              customer_code: record.customer_code,
              branch_code:   record.branch_code,
              channel_code:  record.otlcd,
              ...(selectedProduct?.code && { product_code: selectedProduct.code }),
            });
            window.open(`/customer-analysis?${params.toString()}`, "_blank");
          }}
        >
          {searchedColumn === "customer_name" ? (
            <Highlighter
              highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
              searchWords={[searchText]}
              autoEscape
              textToHighlight={text ? text.toString() : ""}
            />
          ) : (
            text
          )}
        </span>
      ),
    },
    Object.assign(
      { title: "Salesman", dataIndex: "salesman_name", key: "salesman_name" },
      getColumnSearchProps("salesman_name"),
    ),
    {
      title: "Salesman Num",
      dataIndex: "salesman_mobile",
      key: "salesman_mobile",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      filters: branchOptions.map((branch) => ({ text: branch, value: branch })),
      onFilter: (value, record) => record.branch === value,
    },
    {
      title: "Channel",
      dataIndex: "otlcd",
      key: "otlcd",
      filters: channelOptions.map((channel) => ({
        text: channel,
        value: channel,
      })),
      onFilter: (value, record) => record?.otlcd === value,
    },
    {
      title: "Dry Months",
      dataIndex: "dry_months",
      key: "dry_months",
      sorter: (a, b) => a.dry_months - b.dry_months,
    },
    {
      title: "Avg Sales",
      dataIndex: "avg_sales_13_months",
      key: "avg_sales_13_months",
      sorter: (a, b) => a.avg_sales_13_months - b.avg_sales_13_months,
      render: (value) =>
        value !== undefined && value !== null
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : 0,
    },
    {
      title: "MTD Sales",
      dataIndex: "mtd_sales",
      key: "mtd_sales",
      sorter: (a, b) => a.mtd_sales - b.mtd_sales,
      render: (value) =>
        value !== undefined && value !== null
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : 0,
    },
    {
      title: "Potential",
      dataIndex: "potential",
      key: "potential",
      sorter: (a, b) => a.potential - b.potential,
      render: (value) =>
        value !== undefined && value !== null
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : 0,
    },
  ];

  const exportToExcel = async () => {
    if (!potentialCustomers.length) {
      message.warning("No data to export");
      return;
    }

    // Dynamic import keeps xlsx (~400 KB) out of the initial bundle
    const XLSX = await import("xlsx");

    const wsData = potentialCustomers.map((item) => ({
      "Customer Code": item.customer_code,
      "Customer Name": item.customer_name,
      "Salesman Code": item.salesman_code,
      Salesman: item.salesman_name,
      "Salesman Num": item.salesman_mobile,
      "Branch Code": item.branch_code,
      Branch: item.branch,
      Channel: item.otlcd,
      "Dry Months": item.dry_months,
      "Avg Sales": item.avg_sales_13_months,
      "MTD Sales": item.mtd_sales,
      Potential: item.potential,
    }));

    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Potential Customers");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Potential_Customers_${selectedMonth}_${selectedProduct?.name}.xlsx`);
  };

  return (
    <div>
      {loading ? (
        <div>
          <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 16 }} />
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            <Button
              type="primary"
              onClick={exportToExcel}
            >
              Export to Excel
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={potentialCustomers}
            rowKey={(record) => record.customer_code}
            scroll={{ x: "max-content" }}
          />
        </>
      )}
    </div>
  );
};

export default PotentialCustomers;
