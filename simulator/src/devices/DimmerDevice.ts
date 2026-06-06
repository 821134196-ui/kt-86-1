import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { clamp, getTimestamp, randomInRange } from '../utils';

export class DimmerDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      power: true,
      brightness: randomInRange(30, 100)
    };
  }

  protected generateTelemetry(): TelemetryData {
    this.randomWalk('brightness', 0, 100, 5);
    this.clampStateValue('brightness', 0, 100);

    return {
      timestamp: getTimestamp(),
      power: this.state.power,
      brightness: Math.round(this.state.brightness * 10) / 10
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'on':
        this.state.power = true;
        return { success: true, message: 'Dimmer turned on' };
      case 'off':
        this.state.power = false;
        return { success: true, message: 'Dimmer turned off' };
      case 'set_brightness': {
        const brightness = params?.brightness;
        if (typeof brightness !== 'number') {
          return { success: false, message: 'Brightness parameter is required and must be a number' };
        }
        this.state.brightness = clamp(brightness, 0, 100);
        return { success: true, message: `Brightness set to ${this.state.brightness}%` };
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
