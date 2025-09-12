export class Utils {
  static integerToBytes(integerValue) {
    const buffer = new ArrayBuffer(4);
    const dataView = new DataView(buffer);
    dataView.setInt32(0, integerValue, true);
    return Array.from({ length: 4 }, (_, i) => dataView.getUint8(i));
  }

  static readableChecksum(checksum) {
    return checksum.toString(16).padStart(2, '0').toUpperCase();
  }

  static calculateOdometerChecksum(odometerValue, byte1, byte2) {
    const adjustedValue = odometerValue * 10;
    const byteArray = Utils.integerToBytes(adjustedValue).concat([byte1, byte2, 0x0, 0x0]);
    return byteArray.reduce((sum, byte) => sum + byte + (byte >> 1), 0) & 0xFF;
  }

  static downloadFile(buffer, filename) {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}