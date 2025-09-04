# Ducati 24C16 / I2K Dash Tool
This tool is used to read and process data from Ducati dashboards equipped with a 24C16 EEPROM and I2K immobilizer chip. It enables you to display and adjust the odometer reading including checksum calculation, recover immo bypass codes and access the key codes of the programmed keys.

Use at your own risk.

## How to use
This tool expects a 2048 byte EEPROM dump read from the 24C16 EEPROM chip of the Magneti Marelli (and maybe other) Ducati dashboards. A CH341a EEPROM programmer with an SOIC8 clip on works fine to read the EEPROM.