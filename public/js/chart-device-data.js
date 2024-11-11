$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.humidityData = new Array(this.maxLen);
      this.pressureData = new Array(this.maxLen);
      this.packetCountData = new Array(this.maxLen).fill(0);
      this.packetCount = 0;
    }

    addData(time, temperature, humidity, pressure) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);
      this.pressureData.push(pressure || null);
      this.packetCount += 1;
      this.packetCountData.push(this.packetCount);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
        this.pressureData.shift();
        this.packetCountData.shift();
      }
    }
  }

  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    findDevice(deviceId) {
      return this.devices.find(device => device.deviceId === deviceId);
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  function createChart(ctx, label, yAxisLabel, color) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          pointBorderColor: color,
          pointHoverBackgroundColor: color,
        }],
      },
      options: {
        scales: {
          y: {
            title: { display: true, text: yAxisLabel },
            beginAtZero: true,
          },
          x: {
            title: { display: true, text: 'Time' },
          },
        },
      },
    });
  }

  const temperatureChart = createChart(
    document.getElementById('temperatureChart').getContext('2d'),
    'Temperature (ºC)',
    'Temperature (ºC)',
    'rgba(255, 99, 132, 1)'
  );

  const humidityChart = createChart(
    document.getElementById('humidityChart').getContext('2d'),
    'Humidity (%)',
    'Humidity (%)',
    'rgba(54, 162, 235, 1)'
  );

  const pressureChart = createChart(
    document.getElementById('pressureChart').getContext('2d'),
    'Pressure (Pa)',
    'Pressure (Pa)',
    'rgba(75, 192, 192, 1)'
  );

  const packetCountChart = createChart(
    document.getElementById('packetCountChart').getContext('2d'),
    'Packet Count',
    'Packet Count',
    'rgba(153, 102, 255, 1)'
  );

  function updateChartData(device) {
    temperatureChart.data.labels = device.timeData;
    temperatureChart.data.datasets[0].data = device.temperatureData;
    temperatureChart.update();

    humidityChart.data.labels = device.timeData;
    humidityChart.data.datasets[0].data = device.humidityData;
    humidityChart.update();

    pressureChart.data.labels = device.timeData;
    pressureChart.data.datasets[0].data = device.pressureData;
    pressureChart.update();

    packetCountChart.data.labels = device.timeData;
    packetCountChart.data.datasets[0].data = device.packetCountData;
    packetCountChart.update();
  }

  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity && !messageData.IotData.pressure)) {
        return;
      }

      let device = trackedDevices.findDevice(messageData.DeviceId);

      if (!device) {
        device = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(device);
        device.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity, messageData.IotData.pressure);

        // Add device to the UI list if this is a new device
        const node = document.createElement('option');
        node.textContent = messageData.DeviceId;
        listOfDevices.appendChild(node);

        // Auto-select the first device
        if (trackedDevices.getDevicesCount() === 1) {
          listOfDevices.selectedIndex = 0;
        }
      } else {
        device.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity, messageData.IotData.pressure);
      }

      updateChartData(device);
    } catch (err) {
      console.error(err);
    }
  };
});
