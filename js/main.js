import { UIController } from './uiController.js';

document.addEventListener('DOMContentLoaded', () => {
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

  const uiController = new UIController(ELEMENTS, OFFSETS);
  uiController.initialize();
});