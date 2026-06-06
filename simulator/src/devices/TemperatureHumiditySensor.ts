import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { getTimestamp, randomInRange } from '../utils';

export class TemperatureHumiditySensor extends BaseDevice {
  protected initState(): void {
    this.state = {
      temperature: randomInRange(20, 28),
      humidity: randomInRange(40, 70),
      battery: randomInRange(80, 100)
    };
  }

  protected generateTelemetry(): TelemetryData {
    this.randomWalk('temperature', 15, 35, 0.3);
    this.randomWalk('humidity', 20, 90, 1);
    this.randomWalk('battery', 0, 100, 0.05);

    this.clampStateValue('temperature', 15, 35);
    this.clampStateValue('humidity', 20, 90);
    this.clampStateValue('battery', 0, 100);

    return {
      timestamp: getTimestamp(),
      temperature: Math.round(this.state.temperature * 100) / 100,
      humidity: Math.round(this.state.humidity * 10) / 10,
      battery: Math.round(this.state.battery * 10) / 10
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'read_temperature':
        return { success: true, message: `Current temperature: ${this.state.temperature.toFixed(2)}°C` };
      case 'read_humidity':
        return { success: true, message: `Current humidity: ${this.state.humidity.toFixed(1)}%` };
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
