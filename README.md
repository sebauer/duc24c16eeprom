# Ducati 24C16 / I2K Dash Tool
This tool is used to read and process data from Ducati dashboards equipped with a 24C16 EEPROM and I2K immobilizer chip. It enables you to display and adjust the odometer reading including checksum calculation, recover immo bypass codes and access the key codes of the programmed keys.

Use at your own risk.

## How to use
The tool itself runs completely client-side in a browser. No compilation, no nothing. Just download or clone the repository and open the index.html in a browser.

It's also hosted on GitHub pages, if you do not wish to download anything: https://sebauer.github.io/duc24c16eeprom/

It expects a 2048 byte EEPROM dump (.bin) read from the 24C16 EEPROM chip of the Magneti Marelli (and maybe other) Ducati dashboards. A CH341a EEPROM programmer with an SOIC8 clip on works fine to read the EEPROM.