import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { getTimestamp, randomBoolean, randomInRange, withProbability } from '../utils';

export class MotionSensorDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      motionDetected: false,
      battery: randomInRange(70, 100),
      sensitivity: randomInRange(50, 100)
    };
  }

  protected generateTelemetry(): TelemetryData {
    if (withProbability(0.3)) {
      this.state.motionDetected = !this.state.motionDetected;
    }

    this.randomWalk('battery', 0, 100, 0.08);
    this.clampStateValue('battery', 0, 100);

    return {
      timestamp: getTimestamp(),
      motionDetected: this.state.motionDetected,
      battery: Math.round(this.state.battery * 10) / 10,
      sensitivity: Math.round(this.state.sensitivity)
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'detect_motion':
        this.state.motionDetected = true;
        setTimeout(() => {
          this.state.motionDetected = false;
        }, 5000);
        return { success: true, message: 'Motion detection triggered' };
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
