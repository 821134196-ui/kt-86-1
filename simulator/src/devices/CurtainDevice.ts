import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { clamp, getTimestamp, randomInRange } from '../utils';

export class CurtainDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      position: randomInRange(0, 100),
      moving: false
    };
  }

  protected generateTelemetry(): TelemetryData {
    this.randomWalk('position', 0, 100, 3);
    this.clampStateValue('position', 0, 100);

    return {
      timestamp: getTimestamp(),
      position: Math.round(this.state.position),
      moving: this.state.moving
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'open':
        this.state.moving = true;
        setTimeout(() => {
          this.state.position = 100;
          this.state.moving = false;
        }, 2000);
        return { success: true, message: 'Curtain opening' };
      case 'close':
        this.state.moving = true;
        setTimeout(() => {
          this.state.position = 0;
          this.state.moving = false;
        }, 2000);
        return { success: true, message: 'Curtain closing' };
      case 'set_position': {
        const position = params?.position;
        if (typeof position !== 'number') {
          return { success: false, message: 'Position parameter is required and must be a number' };
        }
        this.state.moving = true;
        setTimeout(() => {
          this.state.position = clamp(position, 0, 100);
          this.state.moving = false;
        }, 2000);
        return { success: true, message: `Curtain moving to ${position}%` };
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
