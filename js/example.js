
function getJsonLength(jsonData){ 
    var jsonLength = 0;  
    for(var item in jsonData){  
        jsonLength++;  
    }  
    return jsonLength;  
} 

document.addEventListener('deviceready',	
	function() {
		client = new Paho.MQTT.Client("ec2-18-217-114-173.us-east-2.compute.amazonaws.com", 1883, "BLE-IOT");
		client.connect({onSuccess: onConnect});	 	
	}, 
	false
);

function onConnect(){
	message = "Server Connected!"
	displayConnectStatus(message);
	evothings.scriptsLoaded(initialize);
}


var iotsensor;
var iotsensors = new Array(4)
var currentSensor;
var devices = {};//contains devices' address
var sensor2Device = {};
var scanTime = 10;
var isScanning = false;
var connectOnPressed = false;
var sensorsStateFlag = {"state":"off","record":false};
var payLoadBuffer = [];//buffer of payload
var sensorStat = "";//sensors state

var chart = new SmoothieChart({minValue: 0, maxValue: 40});
var line_x = new TimeSeries();
var line_y = new TimeSeries();
var line_z = new TimeSeries();
var line = [line_x,line_y,line_z]



function initialize() 
{	
	console.log("in initialize func:" + getJsonLength(devices))
	if (getJsonLength(devices) == 0)//刚打开界面时
	{
		console.log("Initialize function called");
		iotsensors[0] = evothings.iotsensor.createInstance(evothings.iotsensor.RAW);//RAW or SFL
		currentSensor = iotsensors[0];
		iotsensors[0].accelerometerCallback(handleAccelerometerData)
					 .temperatureCallback(handleTemperatureData)
					 .gyroscopeCallback(handleGyroscopeData)
					 .magnetometerCallback(handleData)
					 .barometerCallback(handleBarometerData)
					 .humidityCallback(handleData)
					 .errorCallback(errorFun)
  					 .statusCallback(statusFun);
					 //.sflCallback(handleSFLData)
					 //.errorCallback(connectionError);;
		initializeChart();
	}
	else//扫描到其他设备之后的初始化
	{
		for(i=1;i<getJsonLength(devices);i++)
		{
			(function(i){    
				console.log("Initialize function called");
				iotsensors[i] = evothings.iotsensor.createInstance(evothings.iotsensor.RAW);
				currentSensor = iotsensors[i];
				iotsensors[i].accelerometerCallback(handleAccelerometerData)
							 .temperatureCallback(handleTemperatureData)
							 .gyroscopeCallback(handleGyroscopeData)
							 .magnetometerCallback(handleData)
							 .barometerCallback(handleBarometerData)
							 .humidityCallback(handleData)
							 .errorCallback(errorFun)
  							 .statusCallback(statusFun);
							 //.sflCallback(handleSFLData)
							 //.errorCallback(connectionError);;
			})(i);			
		}
		displayConnectStatus("Devices Are Ready!");
		/*devicesInitialized = true;*/
	}	
}

function initializeChart()
{
	chart.streamTo(document.getElementById("chart_canvas"));
	chart.addTimeSeries(line_x, {lineWidth:3, strokeStyle: "rgb(255, 0, 0)"});
	chart.addTimeSeries(line_y, {lineWidth:3, strokeStyle: "rgb(0, 255, 0)"});
	chart.addTimeSeries(line_z, {lineWidth:3, strokeStyle: "rgb(0, 0, 255)"});
}

function initWatcher()
{
	window.accel_xyz = 0;
	window.evo.watcher.watch('acceleroPlot', window, 'accel_xyz', 'plot');
}

onScanButton = function()
{
	isScanning = true;
	devices = {};
	document.getElementById('found-devices').innerHTML = "";
	console.log("scan button!")//my edit
	iotsensors[0].startScanningForDevices(
		function(device)
		{
			// Only show IoT devices based on the advertising name
			if(device.name === evothings.iotsensor.SFL || device.name === evothings.iotsensor.RAW)
			{
				console.log("found device: " + device.name);
				device.timeStamp = Date.now();

				// Insert the device into table of found devices.
				devices[device.address] = device;
			}
		}
	);
	displayConnectStatus("Scanning for Bluetooth devices..");
	//每隔0.5秒显示一次页面
	updateTimer = setInterval(displayDeviceList, 500);
	
	setTimeout(
		function() 
		{
			iotsensors[0].stopScanningForDevices();
			isScanning = false;
			displayConnectStatus('Stopped scanning devices!!');

			if(getJsonLength(devices) > 0)
			{
				displayConnectStatus("Initializing devices!")
				initialize();
			}			

			clearInterval(updateTimer);
		}, 
		(scanTime * 1000)
	); 
}

function connect()
{
	console.log("connecting...")
	iotsensors[0].connectToClosestSensor(
		7500, // Scan for 7500 ms
		function() { console.log("Connected to IoT Sensor"); },
		function(error) { console.log('Disconnect error ' + error); }
	);
}

function accelerometerOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].accelerometerOn();
			})(i);			
		}
		displayConnectStatus("sending data...");
	}
	
	
}
function temperatureOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].temperatureOn();
			})(i);
			
		}
		displayConnectStatus("sending data...");
	}	
}


function gyroscopeOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].gyroscopeOn();
			})(i);
			
		}
		displayConnectStatus("sending data...");
	}	
}

function magnetometerOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].magnetometerOn();
			})(i);
			
		}
		displayConnectStatus("sending data...");
	}	
}

function humidityOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].humidityOn();
			})(i);
			
		}
		displayConnectStatus("sending data...");
	}	
}

function barometerOn()
{
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].barometerOn();
			})(i);			
		}
		displayConnectStatus("sending data...");
	}	
}

function sensor_fusionOn()
{	
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].sflOn();
			})(i);
			
		}
		displayConnectStatus("sending data...");
	}	
}

function sensorOff()
{	
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i].temperatureOff()
							 .accelerometerOff()
							 .gyroscopeOff()
							 .magnetometerOff()
							 .humidityOff()
							 .barometerOff()
							 .sflOff();
			})(i);
			
		}
		/*if(sensorsStateFlag.record)
		{
			sensorsStateFlag.record = false;
			var tempMessage = "sensorOff"
			var message = new Paho.MQTT.Message(tempMessage);
			message.destinationName = "recordFlag";
			client.send(message);
		}*/		
		console.log('Sensor off');
		displayConnectStatus("All sensors off");
		sensorStat = "off";
	}	
}

function sensorOn()
{
	sensorStat = "on";
	if (getJsonLength(devices) == 0)
	{
		console.log("NO SENSORS CONNECTED!")
	}
	else
	{
		sensorsStateFlag.record = true;
		for(i=0;i<getJsonLength(devices);i++)
		{
			(function(i){
				iotsensors[i]//.temperatureOn()
							 .accelerometerOn()
							 .gyroscopeOn();
							 //.magnetometerOn()
							 //.humidityOn()
							 //.barometerOff()
							 //.sflOn();
			})(i);
			
		}
		var tempMessage = "sensorsOn";
		var message = new Paho.MQTT.Message(tempMessage);
		message.destinationName = "recordFlag";
		client.send(message);
		console.log('Sensor off');
		displayConnectStatus("Some sensors on");
	}	
}

function dataBuffer(message)
{
	if(payLoadBuffer.length >= 200 || (payLoadBuffer.length > 0 && sensorStat=="off"))
	{
		console.log(payLoadBuffer.length)
		console.log(message.time);
		var tempMessage = new Paho.MQTT.Message(payLoadBuffer.join("\n") + "\n");
		tempMessage.destinationName = "data";
		client.send(tempMessage);
		payLoadBuffer = [];

		if(sensorStat=="off")//sensor off clicked
		{
			if(sensorsStateFlag.record)
			{
				sensorsStateFlag.record = false;
				var tempMessage = "sensorOff"
				var message = new Paho.MQTT.Message(tempMessage);
				message.destinationName = "recordFlag";
				client.send(message);
			}					
		}
	}
	else
	{
		payLoadBuffer.push(JSON.stringify(message));
	}
	
}

function handleAccelerometerData(data)
{
	//console.log("Accelerometer data: " + JSON.stringify(data));
	var now = Date.now();

	//var tempMessage = {"time":now,"address":data.address,"accelerometer":data.payload};
	var tempMessage = {"time":data.time,"address":data.address,"sensor":data.sensor,"value":data.payload,"unit":data.unit};
	dataBuffer(tempMessage);
	/*var message = new Paho.MQTT.Message(JSON.stringify(tempMessage));
	message.destinationName = "accelerometer";
	client.send(message);*/
}
function handleTemperatureData(data)
{
	console.log("Temperature data: " + JSON.stringify(data));
	var now = Date.now();

	line_x.append(now, data.payload);
	window.accel_xyz = data.payload;

	//var tempMessage = {"time":now,"address":data.address,"temperature":data.payload};
	var tempMessage = {"time":now,"address":data.address,"sensor":data.sensor,"value":data.payload,"unit":data.unit};
	var message = new Paho.MQTT.Message(JSON.stringify(tempMessage));
	message.destinationName = "temperature";
	client.send(message);

}
function handleSFLData(data)
{
	//console.log('Sensor-Fusion data: ' + JSON.stringify(data))
	var now = Date.now();

	var tempMessage = {"time":data.time,"address":data.address,"sensor":data.sensor,"value":data.payload,"unit":data.unit};
	var message = new Paho.MQTT.Message(JSON.stringify(tempMessage));
	message.destinationName = "fusion";
	client.send(message);
}
function handleGyroscopeData(data)
{
	//console.log("handleGyroscopeData!!!")
	//console.log('Gyroscope data: ' + JSON.stringify(data))
	var now = Date.now();

	//var tempMessage = {"time":now,"address":data.address,"gyroscope":data.payload};
	var tempMessage = {"time":data.time,"address":data.address,"sensor":data.sensor,"value":data.payload,"unit":data.unit};
	dataBuffer(tempMessage);
	/*var message = new Paho.MQTT.Message(JSON.stringify(tempMessage));
	message.destinationName = "gyroscope";
	client.send(message);*/
}
function handleBarometerData(data)
{
	console.log('Barometer data: ' + JSON.stringify(data))
	var now = Date.now();

	var tempMessage = {"time":now,"address":data.address,"sensor":data.sensor,"value":data.payload,"unit":data.unit};
	/*var message = new Paho.MQTT.Message(JSON.stringify(tempMessage));
	message.destinationName = "barometer";
	client.send(message);*/
}

/*BLE device disconnect*/
disconnect = function()
{
	devices = {};
	iotsensors[0].disconnectDevice();
	console.log("Disconnected!");
}

/* The displayConnectStatus function displays the connection status on 		*/
/* screen.																	*/
function displayConnectStatus(message)
{
	document.getElementById('scan-status').innerHTML = message;
};

function displayDeviceList()
{
	// Clear device list
	document.getElementById('found-devices').innerHTML = '';

	for(address in devices)
	{
		var device = devices[address];

		// Only show devices that are updated during the last 10 seconds
		if(device.timeStamp + 10000 > Date.now())
		{
			addDeviceToView(device);
		}
	}
}

function connectMultiDevices()
{	
	console.log("start connecting multiple deviece!")
	displayConnectStatus("start connecting multiple deviece!");

	if(getJsonLength(devices) == 0)
	{
		displayConnectStatus("No sensor found!");
		return;
	}
	var count = 0;
	iotsensors[0].stopScanningForDevices();
	if(isScanning == true)
	{
		isScanning = false;
		displayConnectStatus("Initializing devices!")
		initialize();
		displayConnectStatus("initialize 2nd");		
	}

	for(address in devices)
	{
		(function(address){
			console.log(address + ' address and count ' + count);
			if(iotsensors[count].isIoTSensor(devices[address]))
			{
				iotsensors[count].address = address;
				console.log("sensor address : " + iotsensors[count].address)
				iotsensors[count].connectToDevice(
					devices[address],
					function()
					{											
						connected = 'true';
						console.log("All devices are connected! ");
						displayConnectStatus("All devices are connected!");
						/*deviceView = document.getElementById(address);
						if (deviceView != null)
						{
							deviceView.parentNode.removeChild(deviceView); 
						}*/           						
					},
					function(error)
					{
						connectionError(error);		
					}
				);
				count = count + 1;
			}
			else
			{
				displayConnectStatus("Device is not an Dialog IoT Sensor");
			}	
		})(address);
		//count = count + 1;
	}
	/*if(count == getJsonLength(devices))
	{
		displayConnectStatus("All devices are connected!");
	}*/
}

/* When the disconnect button is pressed disconnect from the device and 	*/
/* change the connection status to Disconnected.							*/
onDisconnectButton = function()
{	
	for(i=0;i<getJsonLength(devices);i++)
	{
		(function(i){
			iotsensors[i].disconnectDevice();
		})(i);		
	}	
	devices = {};
	sensor2Device = {};
	displayConnectStatus("Disconnected");
	document.getElementById('found-devices').innerHTML = "";
}

handleData = function(data)
{
	if(typeof(data) == "object")
	{
		console.log("data: " + JSON.stringify(data));
	}
	else
	{
		console.log("data: " + data);
	}	
}


function addDeviceToView(device)
{
	var rssiWidth = 100; // Used when RSSI is zero or greater
	if (device.rssi < -100) { rssiWidth = 0; }
	else if (device.rssi < 0) { rssiWidth = 100 + device.rssi; }

	// Create tag for device data.
	var element = 
		//'<li id='+device.address+'>'
		'<li>'
		+	'<strong>' + device.name + '</strong> <br />'
		// Do not show address on iOS since it can be confused
		// with an iBeacon UUID.
		//+	(evothings.os.isIOS() ? '' : device.address + '<br />')
		+	(device.address + '<br />')
		//+	'<button onclick="app.onConnectButton(\'' + device.address + '\')" class="red">CONNECT</button> <br />'
		+ 	 device.rssi 
		+ 	'<div style="background:rgb(225,0,0);height:20px;width:'
		+ 		rssiWidth + '%;">'
		+ 	'</div>'
		+ '</li>';

	document.getElementById('found-devices').innerHTML += element;
}

/* The setCurrentLocation function keeps track of the current location that	*/
/* is being viewed and change backbutton visibility.															*/
function setCurrentLocation(window_location)
{
	location = window_location;
	if(window_location == "#connected" || window_location == "#")
	{
		document.getElementById("back").style.display = "none";
	} 
	else 
	{
		document.getElementById("back").style.display = "block";
	}
}

function errorFun(error)
{
  console.log('ERROR: ' + error);
}

function statusFun(status)
{
  console.log('STATUS: ' + status);
}