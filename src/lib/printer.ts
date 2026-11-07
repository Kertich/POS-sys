export async function printReceiptWithBluetooth(): Promise<void> {
  if (!("bluetooth" in navigator)) {
    throw new Error("Bluetooth printing is not supported on this device.");
  }
  throw new Error("Bluetooth thermal printer adapter is not configured yet.");
}
