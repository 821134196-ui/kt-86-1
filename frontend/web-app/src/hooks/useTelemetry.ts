import { useEffect, useState, useCallback } from 'react';
import { getTelemetryHistory, getLatestTelemetry } from '@/api/telemetry';
import { useWebSocket } from './useWebSocket';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { TelemetryData, TelemetryAggregate } from '@/types';

export const useTelemetry = (deviceId?: string) => {
  const [latestData, setLatestData] = useState<TelemetryData[]>([]);
  const [historyData, setHistoryData] = useState<TelemetryAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const updateDeviceState = useDeviceStore((s) => s.updateDeviceState);

  const handleMessage = useCallback(
    (data: any) => {
      if (!deviceId) return;
      if (data.type === 'telemetry' && data.deviceId === deviceId) {
        setLatestData((prev) => {
          const existing = prev.filter((d) => d.key !== data.key);
          return [...existing, { ...data, id: `${data.deviceId}-${data.key}-${Date.now()}` }];
        });
        updateDeviceState(deviceId, { [data.key]: data.value });
      }
    },
    [deviceId, updateDeviceState]
  );

  useWebSocket({ onMessage: handleMessage });

  const fetchLatest = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const data = await getLatestTelemetry(deviceId);
      setLatestData(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchHistory = useCallback(
    async (key: string, params: { startTime: string; endTime: string; interval?: string }) => {
      if (!deviceId) return;
      setLoading(true);
      try {
        const data = await getTelemetryHistory(deviceId, key, params);
        setHistoryData(data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    },
    [deviceId]
  );

  useEffect(() => {
    if (deviceId) {
      fetchLatest();
    }
  }, [deviceId, fetchLatest]);

  return {
    latestData,
    historyData,
    loading,
    fetchLatest,
    fetchHistory,
  };
};
