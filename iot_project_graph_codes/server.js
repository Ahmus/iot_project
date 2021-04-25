const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const EventHubReader = require('./scripts/event-hub-reader.js');
const iotHubConnectionString = "HostName=TUNI-IoT-Project.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=7f2/fIKGh73LekYjZqnx1qT0NZtkhVYItP2EJOHK1sQ=";

if (!iotHubConnectionString) {
  console.error(`Missing iotHubConnectionString`);
  return;
}
console.log(`Using IoT Hub connection string [${iotHubConnectionString}]`);

const eventHubConsumerGroup = "consumergrouptest";
console.log(eventHubConsumerGroup);
if (!eventHubConsumerGroup) {
  console.error(`Missing EventHubConsumerGroup`);
  return;
}
console.log(`Using event hub consumer group [${eventHubConsumerGroup}]`);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
  res.redirect('/');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        console.log(`Broadcasting data ${data}`);
        client.send(data);
      } catch (e) {
        console.error(e);
      }
    }
  });
};

server.listen(process.env.PORT || '3000', () => {
  console.log('Listening on %d.', server.address().port);
});

const eventHubReader = new EventHubReader(iotHubConnectionString, eventHubConsumerGroup);

(async () => {
  await eventHubReader.startReadMessage((message, date, deviceId) => {
    try {
      const payload = {
        IotData: message,
        MessageDate: date || Date.now().toISOString(),
        DeviceId: deviceId,
      };

      wss.broadcast(JSON.stringify(payload));
    } catch (err) {
      console.error('Error broadcasting: [%s] from [%s].', err, message);
    }
  });
})().catch();
