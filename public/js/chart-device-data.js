$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // Color mapping based on DeviceId
  const deviceColors = {
    "10": "red",
    "52": "blue"
  };

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 30; // Limit the number of data points to 20 for recent data
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
            autoSkip: true, // Ensure labels don't overlap
            maxRotation: 90, // Rotate the labels for better visibility
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
            autoSkip: true,
            maxRotation: 90,
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
            autoSkip: true,
            maxRotation: 90,
          },
        },
      },
    },
  });

  // Function to update the chart data for a given device
  function updateChartData(device) {
    const color = deviceColors[device.deviceId]; // Get color based on DeviceId

    // For temperature chart
    let existingTemperatureDataset = temperatureChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingTemperatureDataset) {
      existingTemperatureDataset.data = device.temperatureData;
    } else {
      temperatureChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.temperatureData,
        fill: false,
        borderColor: color, // Use specific color for device
        backgroundColor: color,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
      });
    }

    // For humidity chart
    let existingHumidityDataset = humidityChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingHumidityDataset) {
      existingHumidityDataset.data = device.humidityData;
    } else {
      humidityChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.humidityData,
        fill: false,
        borderColor: color,
        backgroundColor: color,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
      });
    }

    // For pressure chart
    let existingPressureDataset = pressureChart.data.datasets.find(dataset => dataset.label === `Device ${device.deviceId}`);
    if (existingPressureDataset) {
      existingPressureDataset.data = device.pressureData;
    } else {
      pressureChart.data.datasets.push({
        label: `Device ${device.deviceId}`,
        data: device.pressureData,
        fill: false,
        borderColor: color,
        backgroundColor: color,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
      });
    }

    // Update time labels (X-axis) for all devices
    temperatureChart.data.labels = device.timeData;
    humidityChart.data.labels = device.timeData;
    pressureChart.data.labels = device.timeData;

    // Re-render the charts with updated data
    temperatureChart.update();
    humidityChart.update();
    pressureChart.update();
  }

  // Handle incoming WebSocket messages
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      // Skip the message if DeviceId is not "10" or "52", or if the message data is invalid
      if (!["10", "52"].includes(messageData.DeviceId) || !messageData.MessageDate || !messageData.IotData.temperature) {
        return; // Ignore data from devices other than 10 and 52, or invalid/incomplete data
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
