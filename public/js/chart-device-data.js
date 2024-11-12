$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 20; // Fixed number of data points (20)
      this.timeData = [];
      this.temperatureData = [];
      this.humidityData = [];
      this.pressureData = [];
    }

    // Add data for temperature, humidity, and pressure for this device
    addData(time, temperature, humidity, pressure) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity);
      this.pressureData.push(pressure);

      // Limit the number of data points to maxLen (20)
      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();  // Remove the oldest time data
        this.temperatureData.shift();  // Remove the oldest temperature data
        this.humidityData.shift();  // Remove the oldest humidity data
        this.pressureData.shift();  // Remove the oldest pressure data
      }
    }
  }

  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device by its id
    findDevice(deviceId) {
      return this.devices.find(device => device.deviceId === deviceId);
    }

    // Add a new device to the tracked list
    addDevice(device) {
      this.devices.push(device);
    }

    // Get number of devices being tracked
    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Initialize chart for temperature
  const temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [], // Time labels will go here
      datasets: [], // Datasets for each device will go here
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: 'Temperature (ºC)' },
          beginAtZero: true,
        },
        x: {
          title: { display: true, text: 'Time' },
          ticks: {
            maxTicksLimit: 20, // Always show 20 ticks
            autoSkip: true, // Skip ticks if needed
            maxRotation: 90, // Rotate the labels if needed
            minRotation: 45, // Minimum rotation for readability
          },
        },
      },
    },
  });

  // Initialize chart for humidity
  const humidityChart = new Chart(document.getElementById('humidityChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [], // Time labels will go here
      datasets: [], // Datasets for each device will go here
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: 'Humidity (%)' },
          beginAtZero: true,
        },
        x: {
          title: { display: true, text: 'Time' },
          ticks: {
            maxTicksLimit: 20,
            autoSkip: true,
            maxRotation: 90,
            minRotation: 45,
          },
        },
      },
    },
  });

  // Initialize chart for pressure
  const pressureChart = new Chart(document.getElementById('pressureChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [], // Time labels will go here
      datasets: [], // Datasets for each device will go here
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: 'Pressure (Pa)' },
          beginAtZero: true,
        },
        x: {
          title: { display: true, text: 'Time' },
          ticks: {
            maxTicksLimit: 20,
            autoSkip: true,
            maxRotation: 90,
            minRotation: 45,
          },
        },
      },
    },
  });

  // Function to update the chart data for a given device
  function updateChartData(device) {
    // For temperature chart (green)
    let existingTemperatureDataset = temperatureChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingTemperatureDataset) {
      existingTemperatureDataset.data = device.temperatureData;
    } else {
      temperatureChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.temperatureData,
        fill: false,
        borderColor: 'green',
        backgroundColor: 'green',
        pointBorderColor: 'green',
        pointHoverBackgroundColor: 'green',
      });
    }

    // For humidity chart (blue)
    let existingHumidityDataset = humidityChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingHumidityDataset) {
      existingHumidityDataset.data = device.humidityData;
    } else {
      humidityChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.humidityData,
        fill: false,
        borderColor: 'blue',
        backgroundColor: 'blue',
        pointBorderColor: 'blue',
        pointHoverBackgroundColor: 'blue',
      });
    }

    // For pressure chart (red)
    let existingPressureDataset = pressureChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingPressureDataset) {
      existingPressureDataset.data = device.pressureData;
    } else {
      pressureChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.pressureData,
        fill: false,
        borderColor: 'red',
        backgroundColor: 'red',
        pointBorderColor: 'red',
        pointHoverBackgroundColor: 'red',
      });
    }

    // Update time labels (X-axis) for all devices
    temperatureChart.data.labels = device.timeData;
    humidityChart.data.labels = device.timeData;
    pressureChart.data.labels = device.timeData;

    // Ensure only the latest 20 values are shown on the X-axis
    if (device.timeData.length > 20) {
      temperatureChart.data.labels = device.timeData.slice(-20);
      humidityChart.data.labels = device.timeData.slice(-20);
      pressureChart.data.labels = device.timeData.slice(-20);
    }

    // Re-render the charts with updated data
    temperatureChart.update();
    humidityChart.update();
    pressureChart.update();
  }

  // Handle incoming WebSocket messages
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      if (!messageData.MessageDate || !messageData.IotData.temperature) {
        return; // Ignore invalid or incomplete data
      }

      // Check if the device exists in the tracked devices list
      let device = trackedDevices.findDevice(messageData.DeviceId);

      if (!device) {
        // If device doesn't exist, create a new device and add it to the tracked list
        device = new DeviceData(messageData.DeviceId);
        trackedDevices.addDevice(device);
      }

      // Add new data (temperature, humidity, pressure, and time) to the device
      device.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity, messageData.IotData.pressure);

      // Update the chart data for this device
      updateChartData(device);

    } catch (err) {
      console.error(err);
    }
  };
});
