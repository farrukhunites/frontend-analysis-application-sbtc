import { useRef, useState } from "react";
import { Modal, Table, Button, Input, Space } from "antd";
import { InfoCircleOutlined, SearchOutlined } from "@ant-design/icons";
import "./style.css";
import Highlighter from "react-highlight-words";

const GraphLayout = ({
  children,
  title,
  labels = [],
  series = [],
  extraCols = [],
  showTable = true,
  addOnComponent,
  onClickFunction = null,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  const handleOpenModal = () => setIsModalVisible(true);
  const handleCloseModal = () => setIsModalVisible(false);

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
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
            onClick={() => handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#3B82F6" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex]
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase())
        : "",
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
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

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const tableColumns = [
    {
      title: "Label",
      dataIndex: "label",
      key: "label",
      ...getColumnSearchProps("label"),
      render: (text, record) => (
        <span
          style={{ cursor: "pointer", color: "#1890ff" }}
          onClick={() => {
            onClickFunction?.();
          }}
        >
          {text}
        </span>
      ),
    },
    ...series.map((s) => ({
      title: s.name,
      dataIndex: s.name,
      key: s.name,
      sorter: (a, b) => (a[s.name] ?? 0) - (b[s.name] ?? 0),
      render: (value) =>
        typeof value === "number" ? value.toLocaleString("en-US") : value,
    })),
    ...extraCols.map((col) => ({
      title: col.name,
      dataIndex: col.name,
      key: col.name,
      sorter: (a, b) => (a[col.name] ?? 0) - (b[col.name] ?? 0),
      render: (value) =>
        typeof value === "number" ? value.toLocaleString("en-US") : value,
    })),
  ];

  const tableData = labels.map((label, idx) => {
    const row = { key: idx, label };
    series.forEach((s) => (row[s.name] = s?.data?.[idx] ?? null));
    extraCols.forEach((col) => (row[col.name] = col?.data?.[idx] ?? null));
    return row;
  });

  return (
    <div className="graph-layout">
      <div className="graph-header">
        <div className="graph-title">{title}</div>
        <div className="additional-components">
          {addOnComponent}
          {showTable && (
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={handleOpenModal}
            />
          )}
        </div>
      </div>
      <div className="chart-wrapper">{children}</div>

      <Modal
        title={`${title} - Data Table`}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        <Table
          columns={tableColumns}
          dataSource={tableData}
          pagination={false}
          bordered
        />
      </Modal>
    </div>
  );
};

export default GraphLayout;
