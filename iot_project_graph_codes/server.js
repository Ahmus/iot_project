const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const EventHubReader = require('./scripts/event-hub-reader.js');
const eventHubsCompatibleEndpoint = "sb://ihsuproddbres014dednamespace.servicebus.windows.net/";
const eventHubsCompatiblePath = "iothub-ehub-tuni-iot-p-8367644-2ae41b491c";
const iotHubSasKey = "7f2/fIKGh73LekYjZqnx1qT0NZtkhVYItP2EJOHK1sQ=";
const connectionString = `Endpoint=${eventHubsCompatibleEndpoint};EntityPath=${eventHubsCompatiblePath};SharedAccessKeyName=service;SharedAccessKey=${iotHubSasKey}`;

if (!connectionString) {
  console.error(`Missing connectionString`);
  return;
}
console.log(`Using IoT Hub connection string [${connectionString}]`);

const eventHubConsumerGroup = "$Default";
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

const eventHubReader = new EventHubReader(connectionString, eventHubConsumerGroup);

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
