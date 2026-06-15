import { useContext, useEffect, useMemo, useState } from "react";
import { Select, Skeleton, Tag, Tooltip, message } from "antd";
import { ShopOutlined, AppstoreOutlined } from "@ant-design/icons";
import Dashboard from "../Dashboard";
import { getAllBranches } from "../../../API/Branches";
import { UserContext } from "../../../App";
import "./style.css";

const shortBranch = (name) =>
  name && name.toUpperCase().startsWith("SBTC ") ? name.slice(5) : name;

const ALL_BRANCHES = "__all__";

const BranchAnalysis = () => {
  const { userData } = useContext(UserContext);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(ALL_BRANCHES);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const allowedChannelNames = useMemo(
    () =>
      Array.isArray(userData?.allowed_channels) ? userData.allowed_channels : [],
    [userData]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBranches(true);
      const res = await getAllBranches();
      if (cancelled) return;
      const list = res?.results || [];
      setBranches(list);
      if (res?.success === false) {
        message.error("Failed to load branches: " + (res?.error || "Unknown error"));
      }
      setLoadingBranches(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const branchCodeForApi = selectedBranch === ALL_BRANCHES ? null : selectedBranch;

  return (
    <div className="branch-dashboard">
      <div className="branch-dashboard__toolbar">
        <div className="branch-dashboard__title">
          <ShopOutlined />
          <span>Dashboard</span>
        </div>
        <div className="branch-dashboard__filters">
          {allowedChannelNames.length > 0 && (
            <Tooltip title="Dashboard totals are scoped to these channels">
              <div className="branch-dashboard__channels">
                <AppstoreOutlined className="branch-dashboard__channels-icon" />
                <span className="branch-dashboard__channels-label">
                  Allowed Channels:
                </span>
                <div className="branch-dashboard__channels-list">
                  {allowedChannelNames.map((name) => (
                    <Tag key={name} className="branch-dashboard__channel-tag">
                      {name}
                    </Tag>
                  ))}
                </div>
              </div>
            </Tooltip>
          )}
          <Select
            showSearch
            loading={loadingBranches}
            value={selectedBranch}
            onChange={setSelectedBranch}
            placeholder="Select branch"
            style={{ minWidth: 220 }}
            options={[
              { value: ALL_BRANCHES, label: "All Branches" },
              ...branches.map((b) => ({
                value: b.code,
                label: shortBranch(b.name) || b.code,
              })),
            ]}
            filterOption={(input, opt) =>
              (opt?.label || "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
      </div>

      {loadingBranches ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Dashboard branchCode={branchCodeForApi} />
      )}
    </div>
  );
};

export default BranchAnalysis;
