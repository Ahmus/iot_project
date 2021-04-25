'use strict';
const fs = require('fs');
const path = require('path');
const Client = require('azure-iot-device').Client;
const ConnectionString = require('azure-iot-device').ConnectionString;
const Message = require('azure-iot-device').Message;
const MqttProtocol = require('azure-iot-device-mqtt').Mqtt;
const MessageProcessor = require('./messageProcessor.js');

var messageId = new Date().getTime();
var client, config, messageProcessor;

function sendMessage() {
  messageId = new Date().getTime();

  messageProcessor.getMessage(messageId, (content) => {
    var message = new Message(content.toString('utf-8'));
    message.contentEncoding = 'utf-8';
    message.contentType = 'application/json';

    console.log('Sending message: ' + content);

    client.sendEvent(message, (err) => {
      if (err) {
        console.error('Failed to send message to Azure IoT Hub:\n\t' + err.message);
      } else {
        console.log('Message sent to Azure IoT Hub');
      }

      setTimeout(sendMessage, config.interval);
    });
  });
}

function onStart(request, response) {
  console.log('Trying to start(' + request.payload || '' + ')');

  response.send(200, 'Successully started', function (err) {
    if (err) {
      console.error('Failed to start:\n\t' + err.message);
    }
  });
}

function onStop(request, response) {
  console.log('Trying to stop(' + request.payload || '' + ')');

  response.send(200, 'Successully stopped', function (err) {
    if (err) {
      console.error('Failed to stop:\n\t' + err.message);
    }
  });
}

function receiveMessageCallback(msg) {
  var message = msg.getData().toString('utf-8');

  client.complete(msg, () => {
    console.log('Received message:\n\t' + message);
  });
}

function initClient(connectionStringParam, credentialPath) {
  var connectionString = ConnectionString.parse(connectionStringParam);
  var deviceId = connectionString.DeviceId;

  console.log('Using MQTT transport protocol');
  client = Client.fromConnectionString(connectionStringParam, MqttProtocol);

  return client;
}

(function (connectionString) {
  try {
    config = require('./config.json');
  } catch (err) {
    console.error('Failed to load config.json:\n\t' + err.message);
    return;
  }

  messageProcessor = new MessageProcessor(config);

  connectionString = connectionString || process.env['AzureIoTHubDeviceConnectionString'];
  client = initClient(connectionString, config);

  client.open((err) => {
    if (err) {
      console.error('Connect error:\n\t' + err.message);
      return;
    }

    client.onDeviceMethod('start', onStart);
    client.onDeviceMethod('stop', onStop);
    client.on('message', receiveMessageCallback);
    setInterval(() => {
      client.getTwin((err) => {
        if (err) {
          console.error('FAILED:\n\t' + err.message);
          return;
        }
        config.interval = config.interval;
      });
    }, config.interval);
    sendMessage();
  });
})(process.argv[2]);
