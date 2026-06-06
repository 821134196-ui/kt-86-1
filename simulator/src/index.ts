import { deviceManager } from './deviceManager';
import { MQTT_BROKER_URL, DEVICE_SERVICE_URL, SIMULATION_SPEED, SIMULATED_DEVICES } from './config';

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  Smart Home Device Simulator');
  console.log('========================================');
  console.log(`MQTT Broker: ${MQTT_BROKER_URL}`);
  console.log(`Device Service: ${DEVICE_SERVICE_URL}`);
  console.log(`Simulation Speed: ${SIMULATION_SPEED}x`);
  console.log(`Devices to simulate: ${SIMULATED_DEVICES.length}`);
  console.log('----------------------------------------');
  SIMULATED_DEVICES.forEach(d => {
    console.log(`  - ${d.id} (${d.type})`);
  });
  console.log('========================================\n');

  try {
    await deviceManager.start();
  } catch (err: any) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
