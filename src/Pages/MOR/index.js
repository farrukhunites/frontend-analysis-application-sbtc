import { Button, Tabs } from "antd";
import {
  BranchesOutlined,
  CalendarOutlined,
  PartitionOutlined,
  BarChartOutlined,
  BarcodeOutlined,
  EllipsisOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import "./style.css";
import ByBranch from "./Tabs/ByBranch/ByBranch";
import ByMonth from "./Tabs/ByMonth/ByMonth";
import ByYear from "./Tabs/ByYear/ByYear";
import ByChannel from "./Tabs/ByChannel/ByChannel";
import ByChannelYTD from "./Tabs/ByChannelYTD/ByChannelYTD";
import ByItemSKU from "./Tabs/ByItemSKU/ByItemSKU";

const { TabPane } = Tabs;

const MOR = () => {
  return (
    <div className="mor">
      <div className="header">
        <h2>MOR Page</h2> <Button>Export MOR PDF</Button>
      </div>
      <Tabs
        defaultActiveKey="1"
        tabPosition="top"
        type="line"
        tabBarGutter={16}
        moreIcon={<EllipsisOutlined />}
      >
        <TabPane
          tab={
            <span>
              <BranchesOutlined /> By Branch
            </span>
          }
          key="1"
        >
          <ByBranch />
        </TabPane>

        <TabPane
          tab={
            <span>
              <CalendarOutlined /> By Month
            </span>
          }
          key="2"
        >
          <ByMonth />
        </TabPane>

        <TabPane
          tab={
            <span>
              <ScheduleOutlined /> By Year
            </span>
          }
          key="3"
        >
          <ByYear />
        </TabPane>

        <TabPane
          tab={
            <span>
              <PartitionOutlined /> By Channel
            </span>
          }
          key="4"
        >
          <ByChannel />
        </TabPane>

        <TabPane
          tab={
            <span>
              <BarChartOutlined /> By Channel YTD
            </span>
          }
          key="5"
        >
          <ByChannelYTD />
        </TabPane>

        <TabPane
          tab={
            <span>
              <BarcodeOutlined /> By Item SKU
            </span>
          }
          key="6"
        >
          <ByItemSKU />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default MOR;
