import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const createServiceClient = (baseURL: string, serviceName: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((request) => {
    logger.debug(`${serviceName} request`, {
      method: request.method,
      url: request.url,
    });
    return request;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error(`${serviceName} request failed`, {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

export const deviceService = createServiceClient(config.deviceServiceUrl, 'DeviceService');
export const telemetryService = createServiceClient(config.telemetryServiceUrl, 'TelemetryService');
export const gatewayService = createServiceClient(config.gatewayServiceUrl, 'GatewayService');
export const alertService = createServiceClient(config.alertServiceUrl, 'AlertService');
