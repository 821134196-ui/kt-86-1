import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { getTimestamp, randomBoolean, withProbability } from '../utils';

export class SwitchDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      power: randomBoolean()
    };
  }

  protected generateTelemetry(): TelemetryData {
    if (withProbability(0.1)) {
      this.state.power = !this.state.power;
    }

    return {
      timestamp: getTimestamp(),
      power: this.state.power
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'on':
        this.state.power = true;
        return { success: true, message: 'Switch turned on' };
      case 'off':
        this.state.power = false;
        return { success: true, message: 'Switch turned off' };
      case 'toggle':
        this.state.power = !this.state.power;
        return { success: true, message: `Switch toggled to ${this.state.power ? 'on' : 'off'}` };
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
