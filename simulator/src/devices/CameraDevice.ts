import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { getTimestamp, randomBoolean, randomInRange, withProbability } from '../utils';

export class CameraDevice extends BaseDevice {
  protected initState(): void {
    this.state = {
      streaming: false,
      recording: randomBoolean(),
      motionDetected: false,
      storageUsed: randomInRange(20, 80)
    };
  }

  protected generateTelemetry(): TelemetryData {
    if (withProbability(0.15)) {
      this.state.motionDetected = !this.state.motionDetected;
    }

    this.randomWalk('storageUsed', 0, 100, 0.5);
    this.clampStateValue('storageUsed', 0, 100);

    return {
      timestamp: getTimestamp(),
      streaming: this.state.streaming,
      recording: this.state.recording,
      motionDetected: this.state.motionDetected,
      storageUsed: Math.round(this.state.storageUsed * 10) / 10
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'start_stream':
        this.state.streaming = true;
        return { success: true, message: 'Stream started' };
      case 'stop_stream':
        this.state.streaming = false;
        return { success: true, message: 'Stream stopped' };
      case 'take_snapshot':
        return { success: true, message: 'Snapshot captured' };
      case 'start_recording':
        this.state.recording = true;
        return { success: true, message: 'Recording started' };
      case 'stop_recording':
        this.state.recording = false;
        return { success: true, message: 'Recording stopped' };
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
