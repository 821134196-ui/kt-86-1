import { BaseDevice } from './BaseDevice';
import { TelemetryData } from '../types';
import { clamp, getTimestamp, randomBoolean, randomChoice, randomInRange } from '../utils';

export class AirConditionerDevice extends BaseDevice {
  private readonly modes = ['cool', 'heat', 'auto', 'fan', 'dry'];

  protected initState(): void {
    this.state = {
      power: randomBoolean(),
      targetTemperature: randomInRange(22, 28),
      currentTemperature: randomInRange(20, 30),
      mode: randomChoice(this.modes),
      fanSpeed: randomInRange(1, 5)
    };
  }

  protected generateTelemetry(): TelemetryData {
    this.randomWalk('currentTemperature', 15, 35, 0.2);
    this.clampStateValue('currentTemperature', 15, 35);

    if (this.state.power) {
      const target = this.state.targetTemperature;
      const current = this.state.currentTemperature;
      if (Math.abs(target - current) > 0.5) {
        const direction = target > current ? 0.1 : -0.1;
        this.state.currentTemperature = clamp(current + direction, 15, 35);
      }
    }

    return {
      timestamp: getTimestamp(),
      power: this.state.power,
      targetTemperature: Math.round(this.state.targetTemperature * 10) / 10,
      currentTemperature: Math.round(this.state.currentTemperature * 100) / 100,
      mode: this.state.mode,
      fanSpeed: this.state.fanSpeed
    };
  }

  protected executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string } {
    switch (action) {
      case 'on':
        this.state.power = true;
        return { success: true, message: 'AC turned on' };
      case 'off':
        this.state.power = false;
        return { success: true, message: 'AC turned off' };
      case 'set_temperature': {
        const temperature = params?.temperature;
        if (typeof temperature !== 'number') {
          return { success: false, message: 'Temperature parameter is required and must be a number' };
        }
        this.state.targetTemperature = clamp(temperature, 16, 30);
        return { success: true, message: `Target temperature set to ${this.state.targetTemperature}°C` };
      }
      case 'set_mode': {
        const mode = params?.mode;
        if (!mode || !this.modes.includes(mode)) {
          return { success: false, message: `Invalid mode. Valid modes: ${this.modes.join(', ')}` };
        }
        this.state.mode = mode;
        return { success: true, message: `Mode set to ${mode}` };
      }
      case 'set_fan_speed': {
        const speed = params?.speed;
        if (typeof speed !== 'number') {
          return { success: false, message: 'Speed parameter is required and must be a number' };
        }
        this.state.fanSpeed = clamp(speed, 1, 5);
        return { success: true, message: `Fan speed set to ${this.state.fanSpeed}` };
      }
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }
}
