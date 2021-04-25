/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.ambientTemperatureData = new Array(this.maxLen);
      this.objectTemperatureData = new Array(this.maxLen);
    }

    addData(time, ambientTemperature, objectTemperature) {
      this.timeData.push(time);
      this.ambientTemperatureData.push(ambientTemperature);
      this.objectTemperatureData.push(objectTemperature || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.ambientTemperatureData.shift();
        this.objectTemperatureData.shift();
      }
    }
  }

  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    findDevice() {
      for (let i = 0; i < this.devices.length; ++i) {
          return this.devices[i];
      }

      return undefined;
    }
  }

  const trackedDevices = new TrackedDevices();

  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Ambient Temperature',
        yAxisID: 'temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Object Temperature',
        yAxisID: 'temperature',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
      }]
    }
  };

  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  let needsAutoSelect = true;
  function OnSelectionChange() {
    const device = trackedDevices.findDevice();
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.ambientTemperatureData;
    chartData.datasets[1].data = device.objectTemperatureData;
    myLineChart.update();
  }

  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      if (!messageData.MessageDate || (!messageData.IotData.ambient_temperature && !messageData.IotData.object_temperature)) {
        return;
      }

      const existingDeviceData = trackedDevices.findDevice();

      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.ambient_temperature, messageData.IotData.object_temperature);
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.ambient_temperature, messageData.IotData.object_temperature);

        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);

        if (needsAutoSelect) {
          needsAutoSelect = false;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});
