// Mock data 
var testDataArray = [{
	serverID: "7092680a-c499-4613-9064-c969a068c721",
	server: {
		serverName: "WAS80DMGR01_dmgr" ,
		data: {
			"jvm": {
				"maxMemory": "268435456",
				"maxHeapDumpsOnDisk": "10",
				"heapSize": "118620160",
				"freeMemory": "3686760"
			},
			"webContainerPerf": {},
			"threadPoolConfig": {
				"ORB.thread.pool": {
					"maximumSize": "50",
					"minimumSize": "10"
				},
				"ProcessDiscovery": {
					"maximumSize": "2",
					"minimumSize": "1"
				},
				"WMQJCAResourceAdapter": {
					"maximumSize": "50",
					"minimumSize": "10"
				},
				"HAManager.thread.pool": {
					"maximumSize": "2",
					"minimumSize": "2"
				},
				"TCPChannel.DCS": {
					"maximumSize": "20",
					"minimumSize": "20"
				},
				"SoapConnectorThreadPool": {
					"maximumSize": "5",
					"minimumSize": "3"
				},
				"AriesThreadPool": {
					"maximumSize": "5",
					"minimumSize": "1"
				},
				"WebContainer": {
					"maximumSize": "50",
					"minimumSize": "50"
				},
				"SIBFAPThreadPool": {
					"maximumSize": "50",
					"minimumSize": "4"
				}
			},
			"info": {
				"version": "8.0.0.7",
				"j2eeType": "JVM",
				"platform": "proxy",
				"mbeanIdentifier": "JVM",
				"process": "dmgr",
				"type": "JVM",
				"name": "JVM",
				"node": "WAS80DMGR01",
				"spec": "1.0",
				"J2EEServer": "dmgr",
				"cell": "WAS80CELL01"
			}
		}
	}
}, {
	serverID: "7092680a-c499-4613-9064-c969a068c720",
	server: {
		serverName: "WIN-GOLTCS75DEONode01_server1",
		data: {
			"jvm": {
				"maxMemory": "268435456",
				"maxHeapDumpsOnDisk": "10",
				"heapSize": "233832448",
				"freeMemory": "66577024"
			},
			"webContainerPerf": {
				"PercentUsed": "2",
				"ConcurrentHungThreadCount": "0",
				"ActiveCount": "1",
				"PoolSize": "4",
				"PercentMaxed": "0"
			},
			"threadPoolConfig": {
				"ORB.thread.pool": {
					"maximumSize": "50",
					"minimumSize": "10"
				},
				"Default": {
					"maximumSize": "20",
					"minimumSize": "20"
				},
				"MessageListenerThreadPool": {
					"maximumSize": "50",
					"minimumSize": "10"
				},
				"server.startup": {
					"maximumSize": "3",
					"minimumSize": "1"
				},
				"WMQJCAResourceAdapter": {
					"maximumSize": "50",
					"minimumSize": "10"
				},
				"HAManager.thread.pool": {
					"maximumSize": "2",
					"minimumSize": "2"
				},
				"SIBFAPInboundThreadPool": {
					"maximumSize": "50",
					"minimumSize": "4"
				},
				"SoapConnectorThreadPool": {
					"maximumSize": "5",
					"minimumSize": "3"
				},
				"TCPChannel.DCS": {
					"maximumSize": "20",
					"minimumSize": "20"
				},
				"AriesThreadPool": {
					"maximumSize": "5",
					"minimumSize": "1"
				},
				"WebContainer": {
					"maximumSize": "50",
					"minimumSize": "50"
				},
				"SIBFAPThreadPool": {
					"maximumSize": "50",
					"minimumSize": "4"
				}
			},
			"info": {
				"version": "8.5.5.7",
				"j2eeType": "JVM",
				"platform": "proxy",
				"mbeanIdentifier": "JVM",
				"process": "server1",
				"type": "JVM",
				"name": "JVM",
				"node": "WIN-GOLTCS75DEONode01",
				"spec": "1.0",
				"J2EEServer": "server1",
				"cell": "WIN-GOLTCS75DEONode01Cell"
			}
		}
	}
}];


// The logic
$(function() {
	setTimeout(function(){ //timeout to fake XHR request :)
		console.log(testDataArray);
		var test = _.template($('#serverInfoTemplate').html());
		var outputHTML = test(testDataArray);
		console.log(outputHTML);
		$('#main').html(outputHTML);	
	}, 500)
});