import { Utils } from './utils.js';
import { EEPROMReader } from './eepromReader.js';

export class UIController {
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
        this.elements.checksumCorrectIcon.classList.add('hide');
        this.elements.checksumMismatchIcon.classList.remove('hide');
      } else {
        this.elements.checksumCorrectIcon.classList.remove('hide');
        this.elements.checksumMismatchIcon.classList.add('hide');
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
    const modal = M.Modal.getInstance(document.getElementById('downloadModal'));
    modal.open();
  }

  handleDownload(event) {
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