import { useEffect, useState } from "react";
import { Select, Skeleton, message } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import Dashboard from "../Dashboard";
import { getAllBranches } from "../../../API/Branches";
import "./style.css";

const shortBranch = (name) =>
  name && name.toUpperCase().startsWith("SBTC ") ? name.slice(5) : name;

const BranchAnalysis = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBranches(true);
      const res = await getAllBranches();
      if (cancelled) return;
      const list = res?.results || [];
      setBranches(list);
      if (list.length && !selectedBranch) setSelectedBranch(list[0].code);
      if (res?.success === false) {
        message.error("Failed to load branches: " + (res?.error || "Unknown error"));
      }
      setLoadingBranches(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="branch-dashboard">
      <div className="branch-dashboard__toolbar">
        <div className="branch-dashboard__title">
          <ShopOutlined />
          <span>Branch Dashboard</span>
        </div>
        <Select
          showSearch
          loading={loadingBranches}
          value={selectedBranch}
          onChange={setSelectedBranch}
          placeholder="Select branch"
          style={{ minWidth: 240 }}
          options={branches.map((b) => ({
            value: b.code,
            label: shortBranch(b.name) || b.code,
          }))}
          filterOption={(input, opt) =>
            (opt?.label || "").toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>

      {selectedBranch ? (
        <Dashboard branchCode={selectedBranch} />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}
    </div>
  );
};

export default BranchAnalysis;
