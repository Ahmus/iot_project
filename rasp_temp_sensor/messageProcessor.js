'use strict';
var MLX90614 = require('mlx90614');

function MessageProcessor(option) {
  this.sensor = new MLX90614();
  this.deviceId = option.deviceId;
  this.inited = true;
}

var callback = function (err, data) {
  if (err) return console.error(err);
  console.log(data);
};

function testSensor() {
   this.sensor = new MLX90614();
   this.sensor.readObject(callback);
   this.sensor.readAmbient(callback);
}

MessageProcessor.prototype.getMessage = function (messageId, cb) {
  if (!this.inited) { return; }
  this.sensor.readObject((err, object_temp) => {
    if (err) {
      console.log('FAILED:\n\t' + err.message);
      return;
    }

   this.sensor.readAmbient((err, ambient_temp) => {
    if (err) {
      console.log('FAILED:\n\t' + err.message);
      return;
    }

    cb(JSON.stringify({
      messageId: messageId,
      deviceId: this.deviceId,
      object_temperature: object_temp,
      ambient_temperature: ambient_temp
    }));
   });
  });
}

module.exports = MessageProcessor;
module.exports.testSensor = testSensor;
