import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { getTimestamp, randomBoolean, randomInRange, withProbability } from '../utils';

export class LockDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      locked: true,
      battery: randomInRange(60, 100)
    };
  }

  protected generateTelemetry(): TelemetryData {
    if (withProbability(0.05)) {
      this.state.locked = !this.state.locked;
    }

    this.randomWalk('battery', 0, 100, 0.1);
    this.clampStateValue('battery', 0, 100);

    return {
      timestamp: getTimestamp(),
      locked: this.state.locked,
      battery: Math.round(this.state.battery * 10) / 10
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'lock':
        this.state.locked = true;
        return { success: true, message: 'Door locked' };
      case 'unlock':
        this.state.locked = false;
        return { success: true, message: 'Door unlocked' };
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
