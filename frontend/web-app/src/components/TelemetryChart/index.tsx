import React, { useMemo } from 'react';
import { Line, Column, Area } from '@ant-design/charts';
import { Card, Empty } from 'antd';
import dayjs from 'dayjs';
import type { TelemetryAggregate } from '@/types';

interface TelemetryChartProps {
  data: TelemetryAggregate[];
  title?: string;
  type?: 'line' | 'column' | 'area';
  color?: string;
  unit?: string;
}

const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  title,
  type = 'line',
  color = '#1677ff',
  unit = '',
}) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      time: dayjs(item.timestamp).format('MM-DD HH:mm'),
      value: item.avg ?? item.max ?? 0,
      ...item,
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card title={title}>
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const commonConfig = {
    data: chartData,
    xField: 'time',
    yField: 'value',
    smooth: true,
    color,
    point: {
      size: 3,
      shape: 'circle',
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: title || '数值',
        value: `${datum.value}${unit}`,
      }),
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'column':
        return <Column {...commonConfig} columnStyle={{ fill: color, fillOpacity: 0.8 }} />;
      case 'area':
        return <Area {...commonConfig} />;
      case 'line':
      default:
        return <Line {...commonConfig} />;
    }
  };

  return (
    <Card title={title}>
      <div style={{ height: 300 }}>{renderChart()}</div>
    </Card>
  );
};

export default TelemetryChart;
