document.addEventListener('DOMContentLoaded', () => {
  // Constants
  const OFFSETS = {
    immoBypass1: 0x100,
    immoBypass2: 0x110,
    keyCode1: 0x120,
    keyCode2: 0x130,
    checksumBytes: 0x14,
    mileage: 0x10,
    mileageChecksum: 0x19,
    mileage2: 0x20,
    mileage2Checksum: 0x29,
  };

  // DOM Elements
  const ELEMENTS = {
    fileInput: document.getElementById('eepromFileSelector'),
    mileageInput: document.getElementById('mileageInput'),
    mileageDisplay: document.getElementById('mileageDisplay'),
    checksumDisplay: document.getElementById('checksumDisplay'),
    newChecksumDisplay: document.getElementById('checksumNew'),
    immoBypass1Display: document.getElementById('immoBypass1Display'),
    immoBypass2Display: document.getElementById('immoBypass2Display'),
    keyCode1Display: document.getElementById('keyCode1Display'),
    keyCode2Display: document.getElementById('keyCode2Display'),
    downloadButton: document.getElementById('downloadButton'),
    startDownloadButton: document.getElementById('startDownloadButton'),
    checksumMismatchIcon: document.getElementById('checksumMismatchIcon'),
    checksumCorrectIcon: document.getElementById('checksumCorrectIcon'),
  };

  let checksumBytes = { byte1: null, byte2: null };

  // Initialize Materialize Components
  M.Tooltip.init(document.querySelectorAll('.tooltipped'));
  M.Modal.init(document.querySelectorAll('.modal'));

  // Utility Functions
  const Utils = {
    integerToBytes: (integerValue) => {
      const buffer = new ArrayBuffer(4);
      const dataView = new DataView(buffer);
      dataView.setInt32(0, integerValue, true);

      return Array.from({ length: 4 }, (_, i) => dataView.getUint8(i));
    },

    readableChecksum: (checksum) => checksum.toString(16).padStart(2, '0').toUpperCase(),

    calculateOdometerChecksum: (odometerValue, byte1, byte2) => {
      const adjustedValue = odometerValue * 10;
      const byteArray = Utils.integerToBytes(adjustedValue).concat([byte1, byte2, 0x0, 0x0]);

      const checksum = byteArray.reduce((sum, byte) => sum + byte + (byte >> 1), 0) & 0xFF;
      return checksum;
    },

    downloadFile: (buffer, filename) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  };

  // EEPROM Data Handlers
  const EEPROM = {
    readKeyCode: (dataView, offset) =>
      Array.from({ length: 10 }, (_, i) =>
        dataView.getUint8(offset + i).toString(16).padStart(2, '0').toUpperCase()
      ).join(' '),

    readImmoCode: (dataView, offset) =>
      Array.from({ length: 5 }, (_, i) => dataView.getUint8(offset + i)).join(''),

    readOdometer: (dataView) => dataView.getInt32(OFFSETS.mileage, true) / 10,

    readOdometerChecksum: (dataView) =>
      Utils.readableChecksum(dataView.getUint8(OFFSETS.mileageChecksum)),

    createModifiedDump: (buffer, newOdometerValue) => {
      const dataView = new DataView(buffer);
      const normalizedValue = newOdometerValue * 10;
      const newChecksum = Utils.calculateOdometerChecksum(
        newOdometerValue,
        checksumBytes.byte1,
        checksumBytes.byte2
      );

      // Update odometer values and checksums
      dataView.setUint32(OFFSETS.mileage, normalizedValue, true);
      dataView.setUint32(OFFSETS.mileage2, normalizedValue, true);
      dataView.setUint8(OFFSETS.mileageChecksum, newChecksum);
      dataView.setUint8(OFFSETS.mileage2Checksum, newChecksum);

      Utils.downloadFile(buffer, 'modified.bin');
    },
  };

  // Event Handlers
  const Handlers = {
    onFileChange: (event) => {
      const file = event.target.files[0];
      if (!file || file.size !== 2048 || !file.name.toLowerCase().endsWith('.bin')) {
        M.toast({ html: 'Invalid file. Please select a valid 24C16 .bin file.', classes: 'red darken-1' });
        ELEMENTS.fileInput.value = '';
        return;
      }

      ELEMENTS.mileageInput.disabled = false;

      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const dataView = new DataView(buffer);

        // Read and display data
        ELEMENTS.keyCode1Display.textContent = EEPROM.readKeyCode(dataView, OFFSETS.keyCode1);
        ELEMENTS.keyCode2Display.textContent = EEPROM.readKeyCode(dataView, OFFSETS.keyCode2);
        ELEMENTS.immoBypass1Display.textContent = EEPROM.readImmoCode(dataView, OFFSETS.immoBypass1);
        ELEMENTS.immoBypass2Display.textContent = EEPROM.readImmoCode(dataView, OFFSETS.immoBypass2);

        const mileage = EEPROM.readOdometer(dataView);
        const checksum = EEPROM.readOdometerChecksum(dataView);
        ELEMENTS.mileageDisplay.textContent = `${mileage} kms`;
        ELEMENTS.checksumDisplay.textContent = checksum;

        checksumBytes.byte1 = dataView.getUint8(OFFSETS.checksumBytes);
        checksumBytes.byte2 = dataView.getUint8(OFFSETS.checksumBytes + 1);

        const calculatedChecksum = Utils.readableChecksum(
          Utils.calculateOdometerChecksum(mileage, checksumBytes.byte1, checksumBytes.byte2)
        );

        if (calculatedChecksum !== checksum) {
          ELEMENTS.checksumMismatchIcon.classList.remove('hide');
        } else {
          ELEMENTS.checksumCorrectIcon.classList.remove('hide');
        }
      };
      reader.readAsArrayBuffer(file);
    },

    onMileageChange: (event) => {
      const newMileage = event.target.value;
      if (!newMileage) {
        ELEMENTS.newChecksumDisplay.value = '';
        return;
      }

      const newChecksum = Utils.readableChecksum(
        Utils.calculateOdometerChecksum(newMileage, checksumBytes.byte1, checksumBytes.byte2)
      );
      ELEMENTS.newChecksumDisplay.value = newChecksum;
      ELEMENTS.downloadButton.classList.remove('disabled');
    },

    onDownloadClick: () => {
      const file = ELEMENTS.fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        EEPROM.createModifiedDump(e.target.result, ELEMENTS.mileageInput.value);
      };
      reader.readAsArrayBuffer(file);
    },
  };

  // Attach Event Listeners
  ELEMENTS.fileInput.addEventListener('change', Handlers.onFileChange);
  ELEMENTS.mileageInput.addEventListener('change', Handlers.onMileageChange);
  ELEMENTS.startDownloadButton.addEventListener('click', Handlers.onDownloadClick);
});