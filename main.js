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

  // Initialize Materialize components
  const tooltips = M.Tooltip.init(document.querySelectorAll('.tooltipped'));
  const modals = M.Modal.init(document.querySelectorAll('.modal'));

  class Utils {
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

  class EEPROMReader {
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

  class UIController {
    constructor(elements, offsets) {
      this.elements = elements;
      this.offsets = offsets;
      this.checksumBytes = { byte1: null, byte2: null };
    }

    initialize() {
      // Add event listeners for all relevant elements
      this.elements.fileInput.addEventListener('change', (e) => this.handleFileChange(e));
      this.elements.mileageInput.addEventListener('change', (e) => this.handleMileageChange(e));
      this.elements.downloadButton.addEventListener('click', (e) => this.handleOpenModal(e)); // Open modal
      this.elements.startDownloadButton.addEventListener('click', (e) => this.handleDownload(e)); // Start download
    }

    handleFileChange(event) {
      const file = event.target.files[0];
      if (!file || file.size !== 2048 || !file.name.toLowerCase().endsWith('.bin')) {
        M.toast({ html: 'Invalid file. Please select a valid 24C16 .bin file.', classes: 'red darken-1' });
        this.elements.fileInput.value = '';
        return;
      }

      this.elements.mileageInput.disabled = false;

      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const eeprom = new EEPROMReader(buffer);

        // Read and display data
        this.elements.keyCode1Display.textContent = eeprom.readKeyCode(this.offsets.keyCode1);
        this.elements.keyCode2Display.textContent = eeprom.readKeyCode(this.offsets.keyCode2);
        this.elements.immoBypass1Display.textContent = eeprom.readImmoCode(this.offsets.immoBypass1);
        this.elements.immoBypass2Display.textContent = eeprom.readImmoCode(this.offsets.immoBypass2);

        const mileage = eeprom.readOdometer(this.offsets.mileage);
        const checksum = eeprom.readOdometerChecksum(this.offsets.mileageChecksum);
        this.elements.mileageDisplay.textContent = `${mileage} kms`;
        this.elements.checksumDisplay.textContent = checksum;

        this.checksumBytes.byte1 = eeprom.dataView.getUint8(this.offsets.checksumBytes);
        this.checksumBytes.byte2 = eeprom.dataView.getUint8(this.offsets.checksumBytes + 1);

        const calculatedChecksum = Utils.readableChecksum(
          Utils.calculateOdometerChecksum(mileage, this.checksumBytes.byte1, this.checksumBytes.byte2)
        );

        if (calculatedChecksum !== checksum) {
          this.elements.checksumMismatchIcon.classList.remove('hide');
        } else {
          this.elements.checksumCorrectIcon.classList.remove('hide');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    handleMileageChange(event) {
      const newMileage = event.target.value;
      if (!newMileage) {
        this.elements.newChecksumDisplay.value = '';
        return;
      }

      const newChecksum = Utils.readableChecksum(
        Utils.calculateOdometerChecksum(newMileage, this.checksumBytes.byte1, this.checksumBytes.byte2)
      );
      this.elements.newChecksumDisplay.value = newChecksum;
      this.elements.downloadButton.classList.remove('disabled');
    }

    handleOpenModal(event) {
      console.log('Opening modal');
      const modal = M.Modal.getInstance(document.getElementById('downloadModal'));
      modal.open();
    }

    handleDownload(event) {
      console.log('Download initiated');
      const file = this.elements.fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const eeprom = new EEPROMReader(e.target.result);
        const modifiedBuffer = eeprom.createModifiedDump(
          this.elements.mileageInput.value,
          this.offsets,
          this.checksumBytes
        );
        Utils.downloadFile(modifiedBuffer, 'modified.bin');
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // Initialize the application
  const uiController = new UIController(ELEMENTS, OFFSETS);
  uiController.initialize();
});