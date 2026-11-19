import React from 'react';
import { Spin } from 'antd';

export default function Loader({ size = 'large', style }) {
  return <Spin size={size} style={{ display: 'block', margin: '40px auto', ...style }} />;
}
