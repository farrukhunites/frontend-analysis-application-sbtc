import { useState } from "react";
import { Modal, Table, Button } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import "./style.css";

const GraphLayout = ({
  children,
  title,
  labels = [],
  series = [],
  extraCols = [],
  showTable = true,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleOpenModal = () => setIsModalVisible(true);
  const handleCloseModal = () => setIsModalVisible(false);

  const tableColumns = [
    {
      title: "Label",
      dataIndex: "label",
      key: "label",
      sorter: (a, b) => a.label.localeCompare(b.label), // alphabetical sort
    },
    ...series.map((s) => ({
      title: s.name,
      dataIndex: s.name,
      key: s.name,
      sorter: (a, b) => (a[s.name] ?? 0) - (b[s.name] ?? 0), // numeric sort
      render: (value) =>
        typeof value === "number"
          ? value.toLocaleString("en-US") // adds thousand separators
          : value,
    })),
    ...extraCols.map((col) => ({
      title: col.name,
      dataIndex: col.name,
      key: col.name,
      sorter: (a, b) => (a[col.name] ?? 0) - (b[col.name] ?? 0), // numeric sort
      render: (value) =>
        typeof value === "number"
          ? value.toLocaleString("en-US") // adds thousand separators
          : value,
    })),
  ];

  const tableData = labels.map((label, idx) => {
    const row = { key: idx, label };
    series.forEach((s) => {
      row[s.name] = s?.data?.[idx] ?? null;
    });
    extraCols.forEach((col) => {
      row[col.name] = col?.data?.[idx] ?? null;
    });
    return row;
  });

  return (
    <div className="graph-layout">
      <div
        className="graph-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="graph-title">{title}</div>
        {showTable && (
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            onClick={handleOpenModal}
          />
        )}
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
