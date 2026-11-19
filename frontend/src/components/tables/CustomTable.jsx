import React from 'react';
import { Table } from 'antd';

/**
 * Props:
 *  - columns: Array of column definitions
 *  - data: Array of data objects
 *  - loading: boolean
 *  - rowKey: string (default 'id')
 *  - onRowClick: function (optional)
 */
const CustomTable = ({ columns, data, loading, rowKey = 'id', onRowClick }) => {
  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      onRow={record => ({
        onClick: () => {
          if (onRowClick) onRowClick(record);
        },
      })}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default CustomTable;
