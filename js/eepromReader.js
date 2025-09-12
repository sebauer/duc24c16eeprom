import { Utils } from './utils.js';

export class EEPROMReader {
  constructor(buffer) {
    this.dataView = new DataView(buffer);
  }

  readKeyCode(offset) {
    return Array.from({ length: 10 }, (_, i) =>
      this.dataView.getUint8(offset + i).toString(16).padStart(2, '0').toUpperCase()
    ).join(' ');
  }

  readImmoCode(offset) {
    return Array.from({ length: 5 }, (_, i) => this.dataView.getUint8(offset + i)).join('');
  }

  readOdometer(offset) {
    return this.dataView.getInt32(offset, true) / 10;
  }

  readOdometerChecksum(offset) {
    return Utils.readableChecksum(this.dataView.getUint8(offset));
  }

  createModifiedDump(newOdometerValue, offsets, checksumBytes) {
    const normalizedValue = newOdometerValue * 10;
    const newChecksum = Utils.calculateOdometerChecksum(
      newOdometerValue,
      checksumBytes.byte1,
      checksumBytes.byte2
    );

    // Update odometer values and checksums
    this.dataView.setUint32(offsets.mileage, normalizedValue, true);
    this.dataView.setUint32(offsets.mileage2, normalizedValue, true);
    this.dataView.setUint8(offsets.mileageChecksum, newChecksum);
    this.dataView.setUint8(offsets.mileage2Checksum, newChecksum);

    return this.dataView.buffer;
  }
}