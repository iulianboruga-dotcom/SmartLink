// ============================================================
// senzor_dht22.ino — DHT22 temperature + humidity test (Serial only)
//
// Purpose: verify DHT22 wiring and readings before integrating
// into the main BLE firmware.
//
// Wiring:
//   DHT22 VCC  → 3.3V
//   DHT22 GND  → GND
//   DHT22 DATA → GPIO2  (change DHTPIN below if using a different pin)
//   10kΩ pull-up resistor between DATA and VCC (recommended)
//
// Required library: "DHT sensor library" by Adafruit
//   Install via: Arduino IDE → Tools → Manage Libraries → search "DHT sensor"
//   Also install "Adafruit Unified Sensor" (dependency).
//
// Expected output: temperature 20–40°C, humidity 20–80%
// If you see "Eroare la citirea senzorului": check wiring or pull-up resistor.
//
// NOTE: DHT22 minimum read interval = 2 seconds. Reading faster
// returns stale data or NaN. The delay(2000) at the end enforces this.
// ============================================================

#include "DHT.h"

#define DHTPIN  2      // GPIO connected to DHT22 DATA pin — change if needed
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(2000);  // Allow sensor to stabilize after power-on

  dht.begin();
  Serial.println("DHT22 pornit. Se citesc temperatura si umiditatea...");
}

void loop() {
  float umiditate   = dht.readHumidity();
  float temperatura = dht.readTemperature();

  // isnan() catches failed reads (bad wiring, sensor fault, too fast polling)
  if (isnan(umiditate) || isnan(temperatura)) {
    unsigned long secunde = millis() / 1000;
    unsigned long minute  = secunde / 60;
    secunde = secunde % 60;
    Serial.print("[");
    Serial.print(minute); Serial.print("m ");
    Serial.print(secunde); Serial.print("s");
    Serial.println("] Eroare la citirea senzorului! Verifica firele.");
    delay(2000);
    return;
  }

  Serial.print("Temperatura: "); Serial.print(temperatura); Serial.print(" °C  |  ");
  Serial.print("Umiditate: ");   Serial.print(umiditate);   Serial.println(" %");

  // DHT22 requires minimum 2 seconds between reads
  delay(2000);
}
