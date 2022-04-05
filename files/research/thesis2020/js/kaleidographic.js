var Color = net.brehaut.Color;
var myDoughnut;
var myBar;
var myDatasets = [];
var barValues_pos = [];
var barValues_neg = [];
var settings;
var spinner;

//slider setup
var myTimer;
var intervalDefault = 50;
var interval = intervalDefault;
var colorStatus = [];
var lockedValues = {};

//var myBackgroundColorStrings = palette('mpn65', settings.blockSize).map(x=>'#' + x);
//console.log(myBackgroundColorStrings)

function getBlockSize() {
	return settings.blockSize;
}
function setupConnections(chart1) {
    var handle = $("#custom-handle");
    handle.text(interval);

    $("#slider").slider({
        create: function () {
            handle.text($(this).slider("value"));
        },
        slide: function (event, ui) {
            handle.text(ui.value);
            interval = ui.value;
            setLoopInterval();
        }
    });

    $("#slider").slider("value", interval);

    $("button").click(function (event) {
        event.preventDefault();
    });

    $('.previousButton').click(function () {
        updateDataSet(settings.currentID - 1);
    });

    $('.nextButton').click(function () {
        updateDataSet(settings.currentID + 1);
    });

    $('.playButton').click(function () {
        $('.playButton').removeClass('w3-white');
         $('.playButton').addClass('w3-blue');
       var value = 25000 / (interval);
        clearInterval(myTimer);
		//console.log(value)
        myTimer = setInterval(function () {
            updateDataSet(settings.currentID + 1)
        }, value);
    });

    $('.stopButton').click(function () {
        $('.playButton').removeClass('w3-blue');
        $('.playButton').addClass('w3-white');
        clearInterval(myTimer);
    });
        
    $('#spinner').keypress(function (e) {
     var key = e.which;
     if(key == 13)  // the enter key code
      {
        value = spinner.spinner( "value" ) - 1
        updateDataSet(value);
      }
    });  
	
    $('.resetButton').click(function () {
        $('.playButton').removeClass('w3-blue');
        $('.playButton').addClass('w3-white');
        var value = 25000 / (interval);
        clearInterval(myTimer);
		interval = intervalDefault;
		$("#slider").slider("value", interval);
		myBar.data.datasets = [];
        updateDataSet(0);
    });

    document.getElementById(chart1).onclick = function(e){
        var activePoints = myDoughnut.getElementAtEvent(e);

        if(activePoints.length > 0) {
			var selectedDatasetID = activePoints[0]._datasetIndex;
			var selectedElementID = activePoints[0]._index;
			 var key = e.which;
			 if (e.shiftKey) {
				myDoughnut.data.datasets.forEach(function(dataset, index) {
                    toggleSlice(dataset, index, selectedElementID)				
                });
		     }
			 else if (e.ctrlKey) {
				var dataset = myDoughnut.data.datasets[selectedDatasetID];
                dataset.data.forEach(function(slice, index) {
                    toggleSlice(dataset, selectedDatasetID, index)				
                })
			 }
			 else if (e.altKey) {
                toggleLock(myDoughnut.data.datasets, selectedDatasetID, selectedElementID)				
			 }
			 else {
				var dataset = myDoughnut.data.datasets[selectedDatasetID];
				//console.log(myDoughnut.data.datasets)
                toggleSlice(dataset, selectedDatasetID, selectedElementID)				
		   }
           myDoughnut.update();
       }
   };

   
}

function createVisualizations(chart1, chart2) {
	if (myDoughnut) {
		myDoughnut.destroy();
	}
	if (myBar) {
		myBar.destroy();
	}


	
    var ctx1 = document.getElementById(chart1).getContext('2d');
	ctx1.canvas.padding = 100;
	
    myDoughnut = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [],
        },
        options: {
			cutoutPercentage: settings.centerSize,
			layout: {
				padding: 50,
			},
            tooltips: {
                enabled: false,
            },
            legend: {
                display: false,
            },
            maintainAspectRatio: false,
			events: [],
			<!-- animation: { -->
				<!-- animateRotate: false, -->
			<!-- } -->
        }
    });	
	
	
    var ctx2 = document.getElementById(chart2).getContext('2d');
    myBar = new Chart(ctx2, {
        type: 'bar',
            data: {
                labels: [],
                datasets: [],
        },
        options: {
			layout: {
				padding: 20,
			},
            plugins: {
                datalabels: {
                    display: false,
                },
            },
            tooltips: {
                enabled: false,
            },
            legend: {
                display: false,
            },
            labels: {
                display: false,
            },
            scales: {
                xAxes: [{
                    stacked: true,
					ticks: {
						autoSkip: settings.kAggregatorSkipX,
						fontFamily: settings.fontName,
					},
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero:true,
						autoSkip: settings.kAggregatorSkipY,
                    },
                    stacked: true,
                }]
            },
        }
    });	
}

function getFileData(external_file = false, external_settings = false){
	var dfd = $.Deferred();	
	//console.log(external_file);
	if (external_file != false) {
		//console.log('use external file');
		settings = external_settings;
		//console.log(settings.titleLabel);
		//console.log(external_file)
		dfd.resolve(external_file);
	}
	else {
		$.ajax({
		  dataType: "json",
		  url: 'settings.json',
			success: function (settings_data){
				settings = settings_data
			  $.ajax({
				url: settings.baseURL,
				success: function (csvString){
					dfd.resolve(csvString);
				}
			  });
			}
		});
	}	
    return dfd;
}

function adjustMinMaxValues() {
	//console.log(settings.data)
	for (i=0;i<settings.data[0].length; i+=1) {
		var col_pos_value = 0;
		var col_neg_value = 0;
		for (j=0;j<settings.data.length; j+=1) {
			if (settings.data[j][i] >= 0) {
				col_pos_value += (settings.data[j][i] / 100);
			}
			else {
				col_neg_value += (settings.data[j][i] / 100);
			}
		}
		if (col_pos_value >= settings.max_value) {
			settings.max_value = col_pos_value
		}
		if (col_neg_value <= settings.min_value) {
			settings.min_value = col_neg_value
		}
	}
	//console.log(settings.max_value)
}

function loadDataset(external_file = false, external_settings = false) {
	$.when(getFileData(external_file, external_settings)).then(function(csvString) {
		//console.log(settings.centerSize);
		spinner.spinner( "value", settings.currentID　+ 1);
		//console.log(settings);
		createVisualizations('chart1', 'chart2');  
		
		//get rawdata
		var parsedData = Papa.parse(csvString, {header: false, skipEmptyLines: true, dynamicTyping: true});

		//get blockSize
		var blockElements = {};
		parsedData.data[0].slice(1).map(x=>x.split(/:/)[1]).forEach(function(element) {
		  blockElements[element] = 1;
		});
		settings.blockSize = Object.keys(blockElements).length;

		//create barlabels
		settings.barLabels = []
		parsedData.data[0].slice(1).map(x=>x).forEach(function(element) {
            var header_values = element.split(/:/)
            if (header_values[1]) {
                settings.barLabels.push(header_values[0] + ':' + header_values[1]);
            }
            else {
                settings.barLabels.push('NONE');
            }
		});

        //create pielabels
		settings.pieLabels = []
		parsedData.data[0].slice(1,settings.blockSize+1).map(x=>x).forEach(function(element) {
            var header_values = element.split(/:/)
            if (header_values[1]) {
                settings.pieLabels.push(header_values[1]);
            }
            else {
                settings.pieLabels.push('NONE');
            }
		});
        //console.log(settings.pieLabels)

        //create colors
		// console.log(settings.theme[0])
		settings.colors = []
        var backupColors = palette(settings.theme[0], settings.blockSize).map(x=>'#' + x);
		var i = -1
		parsedData.data[0].slice(1,settings.blockSize+1).map(x=>x).forEach(function(element) {
            i += 1
			var header_values = element.split(/:/)
            if (header_values[2]) {
                settings.colors.push(header_values[2]);
            }
            else {
                settings.colors.push(backupColors[i]);
            }
		});
        //console.log(settings.colors)

		//create legend
		settings.legend = []
        //console.log(settings.blockSize)
        //console.log(settings.legend)
		for (i=1;i<parsedData.data[0].length; i+=settings.blockSize) {
            var header_values = parsedData.data[0][i].split(/:/)
			//console.log(header_values[0])
            settings.legend.push(header_values[0]);
		}
        // console.log(settings.legend)
		
		//create idLabels
		settings.idLabels = parsedData.data.map(x=>x[0]).splice(1); //to remove the header
		//console.log(settings.idLabels);
		
		//create main data (without id column)
		var cleanedData = parsedData.data.map(x=>x.splice(1));
				
		barValues_pos = cleanedData[0].map(x=>0);
		barValues_neg = cleanedData[0].map(x=>0);
		
        //console.log(colorStatus)
        //set status
		for (i=0; i<cleanedData[0].length; i+=settings.blockSize) {
			colorStatus.push(cleanedData[0].slice(0,settings.blockSize).map(x=>1))
		}
        //console.log(colorStatus)

		//remove header row
		cleanedData.shift();
		
		//assign to settings
		settings.data = cleanedData;
		
		//find maximum size of data (no longer used)
		settings.max_value = 0;
		settings.min_value = 0;
		//console.log(settings.data)
		for (i=0;i<settings.data[0].length; i+=1) {
			var col_pos_value = 0;
			var col_neg_value = 0;
			for (j=0;j<settings.data.length; j+=1) {
				if (settings.data[j][i] >= 0) {
					col_pos_value += (settings.data[j][i] / 100);
				}
				else {
					col_neg_value += (settings.data[j][i] / 100);
				}
			}
			if (col_pos_value >= settings.max_value) {
				settings.max_value = col_pos_value
			}
			if (col_neg_value <= settings.min_value) {
				settings.min_value = col_neg_value
			}
		}
		//console.log(settings.max_value)
		
		//adjust page
		$( ".title" ).text(settings.titleLabel);
		$("#title").css( {"font-size": settings.titleFontSize, "font-family": settings.fontName} );
		$("#storyID").css( {"font-size": settings.centerLabelFontSize, "font-family": settings.fontName});
		$("#kLegend").css( {"font-size": settings.labelFontSize, "font-family": settings.fontName});
		$(".controllers").css( {"font-size": settings.labelFontSize, "font-family": settings.fontName});
		$('#storyID').text(settings.idLabels[settings.currentID]);
		$('#kLegend').html('outer values &#8660; inner values<br />' + settings.legend.join(':'));

		// adjustMinMaxValues if necessary	
		if (settings.kAggregatorDynamicY != true) {
			adjustMinMaxValues();
			myBar.config.options.scales.yAxes[0].ticks.max = Math.ceil(settings.max_value);
		}

		
		// console.log(settings.showChart)
		// console.log(settings.showLegend)
		// console.log(settings.showAggregator)
		
		if (settings.showChart === false) {
			$("#kChart").hide();
		}
		else {
			$('#kChart').show();
		}

		if (settings.showLegend === false) {
			$("#kLegend").hide();
		}
		else {
			$('#kLegend').show();
		}

		// if (settings.aggregatorShow === false) {
			// $('#chart2').hide();
		// }
		// else {
			// $('#chart2').show();
		// }
		
		if (settings.showAggregator === false) {
			$("#kAggregator").hide();
		}
		else {
			$('#kAggregator').show();
		}
				
		//trim palette options
		if (typeof trimPaletteOptions !== 'undefined') {
			trimPaletteOptions(settings.blockSize)
		}
		
		//show charts
		$("#kChartContainer").height(100)
		showData();
	}).then(function(){
		newSize = document.body.scrollHeight * (settings.canvasSize/100);
		// console.log(document.body.scrollHeight, settings.canvasSize, newSize)
		$('.canvasContainer').height(newSize);
	});
}

function getSettings(){
  var dfd = $.Deferred();
  $.ajax({
	cache: false,
    url: 'settings.json',
    success: function (string){
		console.log(string);
		dfd.resolve(string);
    }
  });
  return dfd;
}


function getNewBackgroundColor(circleCount, index, value, checkStatus) {
	var color;
	if (checkStatus) {
		if (colorStatus[circleCount][index] === 0) {
			color =  settings.disableColor
		}
		else {
			if (value < 0) {
				color =  Color('#000');
			}
			else if (value === 0) {
				if (settings.theme[1]==='dark') {
					color =  Color('#000');
				}
				else {
					color =  Color('#FFF');
				}
			}
			else {
				color =  Color(settings.colors[index]);
			}
			if (value != 0) {
				color.alpha = Math.abs(value)/100;
			}
			
		}
	}
	else {
		if (value < 0) {
			color =  Color('#000');
		}
		else {
			color =  Color(settings.colors[index]);
		}
		if (value != 0) {
			color.alpha = Math.abs(value)/100;
		}
	}
	//console.log(color)
	return color;
}

function setLoopInterval() {
	interval = $("#slider").slider("value")
	if (interval == 0) {
		interval = 1;
	}
	//non linear scaling
	if (interval > 50) {
		interval = interval + interval;
	}
	clearInterval(myTimer);
    var value = 25000 / (interval);
	myTimer = setInterval(function () {
		updateDataSet(settings.currentID + 1)
	}, value);
}

function createDatasets() {
	var rowData = settings.data[settings.currentID];
	var currentDatasets = [];
	var datasetID = -1;
	for (i=0,j=rowData.length; i<j; i+=settings.blockSize) {
		var circleArray = rowData.slice(i,i+settings.blockSize)
		<!-- var backgroundColors = Object.assign(myBackgroundColor); -->
		datasetID += 1;
		if (datasetID === 0) {
			var display = true;
		}
		else {
			var display = false;
		}
		
		//console.log(circleArray)
		currentDatasets.push(
			{
				values: circleArray,
				data: circleArray.map(x=>1),
				datalabels: {
					display: false,
				},
				backgroundColor: circleArray.map((value, index) => {
					var color = getNewBackgroundColor(datasetID, index, value, true);
					return color;
				}),
				borderColor: circleArray.map((value, index) => {
					var color = "grey"
					return color;
				}),
				borderWidth: circleArray.map(x=>settings.borderSize),
				outlabels: {
						lineColor: function() {
							return circleArray.map((value, index) => {
								var color = getNewBackgroundColor(datasetID, index, 100, false);
								return color;
						})},
						<!-- backgroundColor: function() { -->
							<!-- return circleArray.map((value, index) => { -->
								<!-- var color = getNewBackgroundColor(datasetID, index, 100, false); -->
								<!-- return color; -->
						<!-- })}, -->
						text: '%l',
						color: 'grey',
						borderColor: 'white',
						backgroundColor: 'white',
						stretch: 45,
						font: {
							size: settings.labelFontSize,
							family: settings.fontName,
							//maxSize: 100,
							//resizable: false
							//minSize: 12,
							//maxSize: 18
						},
						stretch: 30,
						padding: 4,
						display: display
				},
			}
		);
	}

	return currentDatasets;
}

function adjustBarValues(currentID, newID) {
	//console.log('>', currentID, newID)
	if (currentID <= newID) {
		//console.log('forward')
		for (i=(currentID+1);i<=newID;i++) {
			var tempDatasets = convertToDataset(JSON.parse(JSON.stringify(settings.data[i])));
			var lockValue = checkLockedValues(tempDatasets)
			if (lockValue === false) {
				continue;
			}
			else {
				//console.log('true')
			}
			barValues_pos = barValues_pos.map((value,index)=> {
				if (settings.data[i][index] < 0) {
					var newValue = value;
				} else {
					var newValue = value + (settings.data[i][index]/100);
				}
				return newValue			
			});

			barValues_neg = barValues_neg.map((value,index)=> {
				if (settings.data[i][index] >= 0) {
					var newValue = value;
				} else {
					var newValue = value + (settings.data[i][index]/100);
				}
				return newValue
			});
			}
	}
	else {
		//console.log('backward');
		for (i=currentID;i>newID;i--) {
			var tempDatasets = convertToDataset(settings.data[i]);
			var lockValue = checkLockedValues(tempDatasets)
			if (lockValue === false) {
				continue;
			}
			barValues_pos = barValues_pos.map((value,index)=> {
				if (settings.data[i][index] < 0) {
					var newValue = value;
				} else {
					var newValue = value - (settings.data[i][index]/100);
				}
				return newValue;
			});

			barValues_neg = barValues_neg.map((value,index)=> {
				if (settings.data[i][index] >= 0) {
					var newValue = value;
				} else {
					var newValue = value - (settings.data[i][index]/100);
				}
				return newValue
			});
		}
	}

	settings.currentID = newID;
	var colors = [];
	for (i=0,j=barValues_pos.length; i<j; i+=settings.blockSize) {
		for (k=0;k<settings.blockSize;k++) {
			colors.push(settings.colors[k])
		}
	}
	//console.log(colors)
	var barStackedDataset_pos = {
            data: arrangeValues(barValues_pos),
			backgroundColor: arrangeValues(colors),
	}
	var barStackedDataset_neg = {
            data: arrangeValues(barValues_neg),
			backgroundColor: '#000',
	}
	return [barStackedDataset_pos, barStackedDataset_neg];   
}


function showData() {
	var currentDatasets = createDatasets()
	myDoughnut.data.labels = settings.pieLabels;
	myDoughnut.data.datasets = currentDatasets;
	myDoughnut.update();
	
	// myBar.config.options.scales.yAxes[0].ticks.min = Math.ceil(settings.min_value);
	// myBar.config.options.scales.yAxes[0].ticks.max = Math.ceil(settings.max_value);
	
	// if (settings.min_value < -100) {
		// myBar.config.options.scales.yAxes[0].ticks.min = Math.ceil(settings.min_value / 100) * 100 - 100;
	// }
	// else if (settings.min_value < -10) {
		// myBar.config.options.scales.yAxes[0].ticks.min = Math.ceil(settings.min_value / 10) * 10 - 10;
	// }	
	// else {
		// myBar.config.options.scales.yAxes[0].ticks.min =  Math.ceil(settings.min_value) - 1;
	// }
	
	
	// if (settings.max_value > 100) {
		// myBar.config.options.scales.yAxes[0].ticks.max = Math.ceil(settings.max_value / 100) * 100;
	// }
	// else if (settings.max_value > 10) {
		// myBar.config.options.scales.yAxes[0].ticks.max = Math.ceil(settings.max_value / 10) * 10;
	// }
	// else {
		// myBar.config.options.scales.yAxes[0].ticks.max = settings.max_value;
	// }
	
	//set bar values
	//console.log(settings.currentID)
	var updatedDatasets = adjustBarValues(-1,settings.currentID)
	//console.log(updatedDatasets)
    myBar.data.labels = arrangeValues(settings.barLabels);
    myBar.data.datasets = updatedDatasets;
	myBar.update(0)

	//update chart settings
	// myBar.options.scales.xAxes[0].ticks.autoSkip = true;
	// myBar.options.scales.yAxes[0].ticks.autoSkip = true;
	// myBar.update(0)

}
function convertToDataset(row) {
	var tempDatasets = [];
	var count = -1;
	for (myi=0,myj=row.length; myi<myj; myi+=settings.blockSize) {
		count += 1;
		tempDatasets[count] = {"values": []};
		for (myk=0;myk<settings.blockSize;myk++) {
			tempDatasets[count].values.push(row[myi+myk]);
		}
	}
	return tempDatasets;
}

function arrangeValues(values) {
	var newValues = []
	for (k=0;k<settings.blockSize;k++) {
		for (i=0,j=values.length; i<j; i+=settings.blockSize) {
			newValues.push(values[i+k])
		}
	}
	return newValues
}


function updateDataSet(newID) {
	//set bar chart
	//console.log(lockedValues);
	var playType;
	if (newID === settings.currentID + 1) {
		playType = 'next';
	}
	else if (newID === settings.currentID - 1) {
		playType = 'previous';
	}
	
    if (newID < 0) {
		settings.currentID = 0
        newID = settings.data.length - 1;
		barValues_pos = barValues_pos.map(x=>0);
		barValues_neg = barValues_neg.map(x=>0);
    }
    else if (newID > (settings.data.length - 1)) {
		settings.currentID = -1
        newID = 0;
		barValues_pos = barValues_pos.map(x=>0)
		barValues_neg = barValues_neg.map(x=>0)
    }
	var updatedDatasets = adjustBarValues(settings.currentID, newID)
    myBar.data.datasets = updatedDatasets;
	myBar.update(0)
	
	//set doughnut
	var currentDatasets = createDatasets()
    myDoughnut.data.datasets.forEach(function(object, index) {
        object.data = currentDatasets[index].data
        object.values = currentDatasets[index].values
        object.backgroundColor = currentDatasets[index].backgroundColor
        object.borderColor = currentDatasets[index].borderColor
        object.outlabels = currentDatasets[index].outlabels
    });
	myDoughnut.update(25000/interval);

	var lockThis = checkLockedValues(currentDatasets)
	//console.log(lockThis)
	if (lockThis === true) {
		toggleBorderColor(currentDatasets);
	}
	else {
		if (playType === 'next') {
			updateDataSet(settings.currentID + 1);
			
		}
		else if (playType === 'previous') {
			updateDataSet(settings.currentID - 1);
			
		}
	}


	//console.log(settings.currentID);
    spinner.spinner( "value", settings.currentID + 1)
	//$('#storyID').text((settings.currentID + 1));
	$('#storyID').text(settings.idLabels[settings.currentID]);

}

function getAngle(context) {
    var dataset = context.dataset;
    var model = dataset._meta[Object.keys(dataset._meta)[0]].data[context.dataIndex]._model;
    var a = (model.startAngle + model.endAngle) * 90 / Math.PI;
    a += 90;
    //console.log(dataset.data[context.dataIndex] + " " + a + "degrees");
    if (a <= 90) {
    }
    else if (a <= 180) {
        a = a + 180;
    } else if (a < 270) {
        a = a - 180;
    } else if (a <= 360) {}

    return a;

}

function toggleSlice(dataset, selectedDatasetID, selectedElementID) {
	//console.log('D', selectedDatasetID, 'E', selectedElementID);
	var value = dataset.values[selectedElementID];
	//console.log(selectedElementID, value);
	if (colorStatus[selectedDatasetID][selectedElementID] === 1) {
		colorStatus[selectedDatasetID][selectedElementID] = 0
	}
	else {
		colorStatus[selectedDatasetID][selectedElementID] = 1
	}	
	dataset.backgroundColor[selectedElementID] = getNewBackgroundColor(selectedDatasetID, selectedElementID, value, true);
}

function toggleLock(datasets, selectedDatasetID, selectedElementID) {
	dataset = datasets[selectedDatasetID]
	key = JSON.stringify([selectedDatasetID,selectedElementID]);
	if (key in lockedValues) {
		dataset.borderColor[selectedElementID] = Color('grey');
		dataset.borderWidth[selectedElementID] = settings.borderSize;
		delete lockedValues[key]
	}
	else {
		lockedValues[key] = dataset.values[selectedElementID];
		toggleBorderColor(datasets, lockedValues)
	}	
    myDoughnut.update();
}

function toggleBorderColor(datasets) {
	//console.log('here');
	//console.log(lockedValues);
	for (var key in lockedValues) {
		var object = JSON.parse(key);
		var selectedDatasetID = object[0]
		var selectedElementID = object[1]
		//console.log(selectedDatasetID, selectedElementID)
		datasets[selectedDatasetID].borderColor[selectedElementID] = Color('red');
		datasets[selectedDatasetID].borderWidth[selectedElementID] = settings.borderSize + 2;
		//console.log(datasets)
        myDoughnut.update();
	}
}

function checkLockedValues(datasets) {
	var lockThis = true;
	for (var key in lockedValues) {
		var object = JSON.parse(key);
		var selectedDatasetID = object[0]
		var selectedElementID = object[1]
		if (datasets[selectedDatasetID].values[selectedElementID] != lockedValues[key]) {
			//console.log(selectedDatasetID, selectedElementID, datasets[selectedDatasetID].values[selectedElementID]);
			lockThis = false;
		}
	}
	return(lockThis)
}

