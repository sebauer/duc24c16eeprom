document.addEventListener('DOMContentLoaded', () => {

  // Define Offsets
  const immoBypassOffset1 = 0x100;
  const immoBypassOffset2 = 0x110;

  const keyCode1Offset = 0x120;
  const keyCode2Offset = 0x130;

  const checksumBytesOffset = 0x14;

  const mileageOffset = 0x10;
  const mileageChecksumOffset = 0x19;
  const mileage2Offset = 0x20;
  const mileage2ChecksumOffset = 0x29;

  // Elements
  const fileInput = document.getElementById('eepromFileSelector');
  const mileageInput = document.getElementById('mileageInput');
  const mileageDisplay = document.getElementById('mileageDisplay');
  const checksumDisplay = document.getElementById('checksumDisplay');
  const newChecksumDisplay = document.getElementById('checksumNew');
  const immoBypass1Display = document.getElementById('immoBypass1Display');
  const immoBypass2Display = document.getElementById('immoBypass2Display');
  const keyCode1Display = document.getElementById('keyCode1Display');
  const keyCode2Display = document.getElementById('keyCode2Display');
  const downloadButton = document.getElementById('downloadButton');
  const startDownloadButton = document.getElementById('startDownloadButton');
  const checksumMismatchIcon = document.getElementById('checksumMismatchIcon');
  const checksumCorrectIcon = document.getElementById('checksumCorrectIcon');

  let checksumByte1;
  let checksumByte2;

  let tooltips = M.Tooltip.init(document.querySelectorAll('.tooltipped'));
  let modals = M.Modal.init(document.querySelectorAll('.modal'));

  function integerToBytes(integerValue) {
    const buffer = new ArrayBuffer(4);
    const byteDataView = new DataView(buffer);

    byteDataView.setInt32(0, integerValue, true);

    const byteArray = [];
    for(let i = 0; i < 4; i++) {
      byteArray.push(byteDataView.getUint8(i));
    }
    return byteArray;
  }

  function calculateOdometerChecksum(newOdometerValue, checkByte1, checkByte2) {

    const odometerBuffer = new ArrayBuffer(4);
    const odometerDataView = new DataView(odometerBuffer);
    const adjustedOdometerValue = newOdometerValue*10;

    // Create byte array for everything that goes into the checksum
    odometerDataView.setInt32(0, adjustedOdometerValue, true);

    const byteArray = integerToBytes(adjustedOdometerValue);

    // Add additional bytes part of the checksum calculation
    byteArray.push(checkByte1);
    byteArray.push(checkByte2);
    byteArray.push(0x0);
    byteArray.push(0x0);

    // Byte Shifting
    let byteShiftedSum = 0;
    for(let i = 0; i < byteArray.length; i++) {
      const currentByte = byteArray[i];
      const calculatedValue = currentByte + (currentByte >> 1);
      byteShiftedSum += calculatedValue;
    }

    // Mod
    const checksum = byteShiftedSum & 0xFF;
    return checksum;
  }

  function readableChecksum(checksum){
    return checksum.toString(16).padStart(2, '0').toUpperCase();
  }

  function readKeyCode(dataView, offset) {
    const keyCodeInHex = [];

    for (let i = 0; i < 10; i++) {
        const currentByte = dataView.getUint8(offset + i);
        const hexString = currentByte.toString(16).padStart(2, '0').toUpperCase();
        keyCodeInHex.push(hexString);
      }

      return keyCodeInHex.join(' ');
  }

  function readImmoCode(dataView, offset) {
    const immoBypass = dataView.getUint8(offset) + ''
        + dataView.getUint8(offset+1) + ''
        + dataView.getUint8(offset+2) + ''
        + dataView.getUint8(offset+3) + ''
        + dataView.getUint8(offset+4);
    return immoBypass;
  }

  function readOdometer(dataView) {
    return dataView.getInt32(mileageOffset, true)/10;
  }

  function readOdometerChecksum(dataView) {
    return readableChecksum(dataView.getUint8(mileageChecksumOffset));
  }

  function downloadDump(dataBuffer, filename) {
    const blob = new Blob([dataBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    window.location.href = url;

    window.URL.revokeObjectURL(url);
  }

  function createModifiedDump(newOdometerInput) {
    const normalizedOdometerValue = newOdometerInput*10;
    const file = fileInput.files[0];

    if(!file)
      return;

    if(!file.name.toLowerCase().endsWith('.bin')) {
      M.toast({
        html: 'Please select a .bin file.',
        classes: 'red darken-1'
      });

      fileInput.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      const modifiedBuffer = e.target.result;
      const modifiedDataView = new DataView(modifiedBuffer);


      const newChecksum = calculateOdometerChecksum(newOdometerInput, checksumByte1, checksumByte2);
      // Write odometer values
      modifiedDataView.setUint32(mileageOffset, normalizedOdometerValue, true);
      modifiedDataView.setUint32(mileage2Offset, normalizedOdometerValue, true);
      // Write checksums
      modifiedDataView.setUint8(mileageChecksumOffset, newChecksum);
      modifiedDataView.setUint8(mileage2ChecksumOffset, newChecksum);

      downloadDump(modifiedBuffer, 'modified.bin');
    };

    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    mileageInput.value = '';
    newChecksumDisplay.value = '';
    mileageInput.disabled = true;
    downloadButton.disabled = true;
    checksumMismatchIcon.classList.add('hide');
    checksumCorrectIcon.classList.add('hide');

    // File validations
    if(!file)
      return;

    if(file.size !== 2048) {
      M.toast({
        html: 'Unexpected file size. A 24C16 dump with a size of 2048 Bytes is expected.',
        classes: 'red darken-1'
      });

      fileInput.value = '';
      return;
    }

    if(!file.name.toLowerCase().endsWith('.bin')) {
      M.toast({
        html: 'Please select a .bin file.',
        classes: 'red darken-1'
      });

      fileInput.value = '';
      return;
    }

    mileageInput.disabled = false;

    const reader = new FileReader();

    reader.onload = function(e) {
      const buffer = e.target.result;
      const dataView = new DataView(buffer);

      // Get Readigns
      const keyCode1 = readKeyCode(dataView, keyCode1Offset);
      const keyCode2 = readKeyCode(dataView, keyCode2Offset);

      const mileage = readOdometer(dataView);
      const mileageChecksum = readOdometerChecksum(dataView);

      const immoBypass1 = readImmoCode(dataView, immoBypassOffset1);
      const immoBypass2 = readImmoCode(dataView, immoBypassOffset2);

      checksumByte1 = dataView.getUint8(checksumBytesOffset);
      checksumByte2 = dataView.getUint8(checksumBytesOffset+1);

      // Display Values
      mileageDisplay.textContent = mileage + ' kms';
      checksumDisplay.textContent = mileageChecksum;

      const calculatedChecksum = readableChecksum(calculateOdometerChecksum(mileage, checksumByte1, checksumByte2));
      if(calculatedChecksum !== mileageChecksum) {
        console.log('Checksum mismatch %s %s', calculatedChecksum, mileageChecksum);
        checksumMismatchIcon.classList.remove('hide');
      } else {
        checksumCorrectIcon.classList.remove('hide');
      }

      immoBypass1Display.textContent = immoBypass1;
      immoBypass2Display.textContent = immoBypass2;

      keyCode1Display.innerText = keyCode1;
      keyCode2Display.innerText = keyCode2;

    };

    reader.readAsArrayBuffer(file);

  });

  mileageInput.addEventListener('change', (event) => {
    const newMileageValue = event.target.value;

    if(newMileageValue == '') {
      newChecksumDisplay.value = '';
      return;
    }

    newChecksumDisplay.value = readableChecksum(calculateOdometerChecksum(newMileageValue, checksumByte1, checksumByte2));
    downloadButton.classList.remove('disabled');
  });

  startDownloadButton.addEventListener('click', (event) => {
    createModifiedDump(mileageInput.value);
  });
});