// rm.js - Readership Map Prototype

//////// Main appication ////////

// Use simulated or live data?
// (stores last selected mode)
var mode = null;

// Timing variables (Date objects)
var dataStartTime, dataEndTime;
var virtualTime, lastDisplayTime;

// Timing parameters (ms)
var queryDelay = 600000;
var queryInterval = 600000;
var displayInterval = 60000;

// Interval timers
var queryTimer, displayTimer, displayOneTimer;

// Query parameters
dimsKey = "ga:hour,ga:minute,ga:city,ga:pagePath";
dimsAdd = "ga:country,ga:region,ga:latitude";
dimsAdd2 = "ga:longitude,ga:pageTitle,ga:hostName";
dimsSort = "-ga:hour,-ga:minute,-ga:city,-ga:pagePath";

// Data and display stacks
var dataStack, displayStack;

// Global variables for the map
var map;
var markers = [];
var infoWindows = [];
var openWindow = null;


// Initialize
$(function() {
  $("select").hide();
  $("button").hide();
});


// Start the application
function start() {
  console.log("starting...");

  // Initialize
  clearMap();
  dataStack = [];
  displayStack = [];
  if (mode == "simulated") {
    dataStartTime = new Date(2015, 10, 18, 11, 0, 0, 0);
  } else {
    dataStartTime = new Date();
    dataStartTime.setMilliseconds(dataStartTime.getMilliseconds() -
                                  queryDelay -
                                  queryInterval);
  }
  dataEndTime = new Date(dataStartTime.getTime());
  virtualTime = new Date(dataStartTime.getTime());
  lastDisplayTime = new Date();
  queryTimer = setInterval(query, queryInterval);
  displayTimer = setInterval(display, displayInterval);
  displayOneTimer = null;

  $("select").hide();
  $("#start-button").hide();
  $("#stop-button").show();

  logState();

  // Make initial query
  query();
}


// Stop the application
function stop() {
  console.log("stopping...");

  clearTimeout(queryTimer);
  clearTimeout(displayTimer);
  clearTimeout(displayOneTimer);

  if (mode == "live") {
    $("#account-select").show();
    $("#property-select").show();
    $("#profile-select").show();
  }
  $("#mode-select").show();
  $("#start-button").show();
  $("#stop-button").hide();

  logState();
}


// Query for data
function query() {
  console.log("querying...");

  dataStartTime = dataEndTime;
  if (mode == "simulated") {
    dataEndTime = new Date(dataStartTime.getTime());
    dataEndTime.setMilliseconds(dataEndTime.getMilliseconds() +
                                queryInterval);
  } else {
    dataEndTime = new Date();
    dataEndTime.setMilliseconds(dataEndTime.getMilliseconds() -
                                queryDelay);
  }
  if (mode == "simulated") {
    console.log("(using simulated data)");
    $.get("data.json", function(data) {
      handleQueryResponse(JSON.parse(data));
      });
  } else {
    var params = {
      "ids": "ga:" + $("#profile-select").val(),
      "start-date": "today",
      "end-date": "today",
      "metrics": "ga:pageviews",
      "dimensions": dimsKey + "," + dimsAdd,
      "sort": dimsSort
    };
    var query = gapi.client.analytics.data.ga.get(params);
    query.execute(handleQueryResponse);
  }
}


// Handle query response
function handleQueryResponse(response) {
  console.log("handling query response...");

  if (response && !response.error && response.result &&
      response.result.rows && response.result.rows.length > 0) {
    // Log the full response
    var formattedJson = JSON.stringify(response.result, null, 2);
    console.log("first query response:");
    console.log(formattedJson);
    console.log("");

    // Extract data in the desired time interval
    var responseRows = response.result.rows;
    partialData = []
    for (var i = 0; i < responseRows.length; i++) {
      if (rowShouldBeDisplayed(responseRows[i])) {
        partialData.push(dataFromFirstRow(responseRows[i]));
      }
    }
    query2();
  } else {
    if (!response) {
      console.log("Data query response null");
    } else if (response.error) {
      console.log("Data query error: " + response.error.message);
    } else if (!response.result) {
      console.log("Data query response has no result field");
    } else {
      console.log("Data query returned zero rows");
    }
    alert("Failed to get data");
  }
}


// Query for additional data
function query2() {
  console.log("querying for additional data...");

  if (mode == "simulated") {
    console.log("(using simulated data)");
    $.get("data2.json", function(data) {
      handleQuery2Response(JSON.parse(data));
      });
  } else {
    var params = {
      "ids": "ga:" + $("#profile-select").val(),
      "start-date": "today",
      "end-date": "today",
      "metrics": "ga:pageviews",
      "dimensions": dimsKey + "," + dimsAdd2,
      "sort": dimsSort
    };
    var query = gapi.client.analytics.data.ga.get(params);
    query.execute(handleQuery2Response);
  }
}


// Callback for second data query
function handleQuery2Response(response) {
  console.log("handling additional data...");

  if (response && !response.error && response.result &&
      response.result.rows && response.result.rows.length > 0) {
    // Log the full response
    var formattedJson = JSON.stringify(response.result, null, 2);
    console.log("query response:");
    console.log(formattedJson);
    console.log("");

    // Extract data in the desired time interval
    var responseRows = response.result.rows;
    var tempData = []
    for (var i = 0; i < responseRows.length; i++) {
      if (rowShouldBeDisplayed(responseRows[i])) {
        tempData.push(dataFromSecondRow(responseRows[i]));
      }
    }
    while (partialData.length > tempData.length) {
      partialData.shift();
    }
    while (tempData.length > partialData.length) {
      tempData.shift();
    }
    for (var i = 0; i < partialData.length; i++) {
      dataStack.push(mergeData(partialData[i], tempData[i]));
    }

    // Update times
    virtualTime = new Date(dataStartTime.getTime());
    lastDisplayTime = new Date();

    logState();

    // Force display so that on application start, there's not
    // a delay before first display
    display();
  } else {
    if (!response) {
      console.log("Data query response null");
    } else if (response.error) {
      console.log("Data query error: " + response.error.message);
    } else if (!response.result) {
      console.log("Data query response has no result field");
    } else {
      console.log("Data query returned zero rows");
    }
    alert("Failed to get data");
  }
}


// Display data with times now in the virtual past
function display() {
  console.log("displaying...");

  // Update virtual time
  var currentTime = new Date();
  virtualTime.setMilliseconds(virtualTime.getMilliseconds() +
                              Math.round(currentTime - lastDisplayTime));

  // Flush the display stack
  while (displayStack.length > 0) {
    displayOne();
  }

  // Put data onto intermediate stack, then onto display stack,
  // so that the correct order is maintained
  var toDisplay = [];
  while (dataStack.length > 0 &&
         dataStack[dataStack.length - 1].time <= virtualTime) {
    toDisplay.push(dataStack.pop());
  }
  while (toDisplay.length > 0) {
    displayStack.push(toDisplay.pop());
  }

  if (displayStack.length > 0) {
    // Set up to display multiple data separately, spaced
    // evenly over the display interval
    if (displayStack.length > 1) {
      displayOneTimer = setInterval(displayOne,
        displayInterval / displayStack.length);
    }
    displayOne();
  }

  // Update time
  lastDisplayTime = currentTime;

  logState();
}


// Display a single datum
function displayOne() {
  console.log("displaying one...");

  if (displayStack.length > 0) {
    markOnMap(displayStack.pop());
  }

  // Clear timer if stack now empty
  if (displayStack.length <= 0) {
    clearTimeout(displayOneTimer);
  }

  logState();
}


// Mark a datum on the map
function markOnMap(datum) {
  if (datum) {
    var params = {
        position: {
            lat: datum.lat,
            lng: datum.lng
          },
        icon: "marker.png",
        animation: google.maps.Animation.DROP
      };
    var marker = new google.maps.Marker(params);
    var infoContent = "";
    if (datum.title) {
      if (datum.uri) {
        infoContent += "<a href=\"http://" + datum.uri + "\" " +
        "style=\"color:black;text-decoration:none;font-weight:bold\" " +
        "target=\"_blank\">";
      }
      infoContent += datum.title;
      if (datum.uri) {
        infoContent += "</a>";
      }
      infoContent += "<br>";
    } else {
      infoContent += "(No title)<br>";
    }
    infoContent += datum.author ? datum.author + " " : "";
    infoContent += datum.date ? "(" + datum.date + ")" : "";
    infoContent += datum.city ? "<hr>Reader in " + datum.city : "";
    infoContent += datum.region ? ", " + datum.region : "";
    infoContent += datum.country ? ", " + datum.country : "";
    var infoWindow = new google.maps.InfoWindow(
      {
        content: infoContent,
        maxWidth: 300
      });
    infoWindow.addListener("closeclick", function() {
        if (openWindow == infoWindow) {
          openWindow = null;
        }
      });
    marker.addListener("click", function() {
        if (openWindow && openWindow != infoWindow) {
          openWindow.close();
        }
        infoWindow.open(map, marker);
        openWindow = infoWindow;
      });
    marker.setMap(map);

    // Store reference to map objects so that they can
    // be removed later
    markers.push(marker);
    infoWindows.push(infoWindow);
  }
}


// Should the data row be displayed?
function rowShouldBeDisplayed(row) {
  if (row[2] == "(not set)") {
    return false;
  }
  var time = timeFromRow(row);
  if (time < dataStartTime || time >= dataEndTime) {
    return false;
  }
  return true;
}


// Return a Date object representing the data row's time
function timeFromRow(row) {
  if (row && row.length >= 2) {
    var hour = parseInt(row[0]);
    var minute = parseInt(row[1]);
    
    // Base the time off the start of our data interval
    var time = new Date(dataStartTime.getTime());
    time.setHours(hour);
    time.setMinutes(minute);

    return time;
  } else {
    console.log("timeFromRow: invalid argument " + row);
  }
}


// Return object containing data from a row from the first query
function dataFromFirstRow(row) {
  return {
      time: timeFromRow(row),
      city: row[2],
      path: row[3],
      country: row[4],
      region: row[5],
      lat: parseFloat(row[6]),
      pageviews: parseInt(row[7])
    };
}


// Return object containing data from a row from the second query
function dataFromSecondRow(row) {
  return {
      time: timeFromRow(row),
      city: row[2],
      path: row[3],
      lng: parseFloat(row[4]),
      title: row[5],
      uri: row[6] + row[3],
      pageviews: parseInt(row[7])
    };
}


// Merge two sets of partial data rows
function mergeData(firstPart, secondPart) {
  return {
    time: firstPart.time,
    country: firstPart.country,
    region: firstPart.region,
    city: firstPart.city,
    lat: firstPart.lat,
    lng: secondPart.lng,
    title: secondPart.title,
    uri: secondPart.uri,
    pageviews: secondPart.pageviews
  };
}


// Log the application state
function logState() {
  console.log("  dataStartTime: " + dataStartTime);
  console.log("    dataEndTime: " + dataEndTime);
  console.log("    virtualTime: " + virtualTime);
  console.log("lastDisplayTime: " + lastDisplayTime);
  console.log("      dataStack: (bottom-to-top)");
  logStack(dataStack);
  console.log("   displayStack: (bottom-to-top)");
  logStack(displayStack);
  console.log("");
}


// Log a data stack (array)
function logStack(stack) {
  if (stack.length >= 1) {
    logStackRow(stack, 0);
  }
  if (stack.length >= 2 && stack.length <= 4) {
    for (i = 1; i < stack.length; i++) {
      logStackRow(stack, i);
    }
  }
  if (stack.length >= 5) {
    console.log("                 ...");
    logStackRow(stack, stack.length - 2);
    logStackRow(stack, stack.length - 1);
  }
}


// Log one element of a stack
function logStackRow(stack, i) {
  console.log("                 " + 
              stack[i].time + " - " +
              stack[i].city);
}


// Initialize the Google map
function initMap() {
  var params = {
    center: {lat: 20, lng: 0},
    zoom: 1,
    minZoom: 1,
    mapTypeControl: false,
    streetViewControl: false,
    styles: [
      {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "administrative.locality",
        "elementType": "labels",
        "stylers": [
          { "visibility": "on" }
        ]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
          { "color": "#808080" },
          { "visibility": "on" }
        ]
      },
      {
        "featureType": "landscape",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "road",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "transit",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "poi",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "water",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      }
    ]
  };
  map = new google.maps.Map(document.getElementById("map"), params);
}


// Clear all markers and info windows from the map
function clearMap() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
    markers[i] = null;
  }
  markers = [];
  for (var i = 0; i < infoWindows.length; i++) {
    infoWindows[i].close();
  }
  infoWindows = [];
  openWindow = null;
}


//////// Authorization and profile selection ////////

// Google authorization parameters
var CLIENT_ID = "898001239502-trev8m96god6nlsiherb9q8g0qj5ktcj.apps.googleusercontent.com";
var SCOPES = "https://www.googleapis.com/auth/analytics.readonly";


function clientReady() {
  $("#mode-select").show();
  $("#mode-select").val("simulated");
  handleModeChange();
}


function handleModeChange() {
  if ($("#mode-select").val() != mode) {
    mode = $("#mode-select").val();
    $("select").not("#mode-select").hide();
    $("button").hide();
    if (mode == "simulated") {
      $("#start-button").show();
    } else {
      authorize(true);
    }
  }
}


// Call to authorize access to Google Analytics data
function authorize(useImmediate) {
  var authParams = {
    client_id: CLIENT_ID,
    immediate: useImmediate,
    scope: SCOPES
  };
  gapi.auth.authorize(authParams, handleAuthorization);
}


// Callback for authorization
function handleAuthorization(response) {
  if (response.error) {
    $("#auth-button").show();
  } else {
    $("#auth-button").hide();
    gapi.client.load("analytics", "v3", getAccounts);
  }
}


// Called as soon as Analytics API loads
function getAccounts() {
  var request = gapi.client.analytics.management.accounts.list();
  request.execute(showAccounts);
}


// Put user accounts into a select element
// and get properties for the default selection
function showAccounts(results) {
  $("#account-select").find("option").remove();
  if (results && !results.error &&
      results.items && results.items.length > 0) {
    var accounts = results.items;
    accounts.sort(compareNames);
    for (var i = 0; i < accounts.length; i++) {
      $("#account-select").append(
        '<option value="' + accounts[i].id + '">' +
        accounts[i].name + '</option>');
    }
    $("#account-select").show();
    handleAccountChange();
  } else {
    if (!results) {
      console.log("Accounts query results null");
    } else if (results.error) {
      console.log("Accounts query error: " + error.message);
    } else if (results.items.length <= 0) {
      console.log("No accounts for this user");
    }
    alert("Failed to get accounts");
  }
}


// Account selection has changed
function handleAccountChange() {
  getProperties($("#account-select").val());
}


// Get properties for given account
function getProperties(accountId) {
  var params = {
    "accountId": accountId
  };
  var request = gapi.client.analytics.management.webproperties.list(params);
  request.execute(showProperties);
}


// Put user properties into a select element and
// get profiles for the default selection
function showProperties(results) {
  $("#property-select").find("option").remove();
  if (results && !results.error &&
      results.items && results.items.length > 0) {
    var properties = results.items;
    properties.sort(compareNames);
    for (var i = 0; i < properties.length; i++) {
      $("#property-select").append(
        '<option value="' + properties[i].id + '">' +
        properties[i].name + '</option>');
    }
    $("#property-select").show();
    handlePropertyChange();
  }
  else {
    if (!results) {
      console.log("Properties query results null");
    } else if (results.error) {
      console.log("Properties query error: " + error.message);
    } else if (results.items.length <= 0) {
      console.log("No properties for this account");
    }
    alert("Failed to get properties");
  }
}


// Selected property has changed
function handlePropertyChange() {
  getProfiles($("#account-select").val(), $("#property-select").val());
}


// Get profiles for given account and property
function getProfiles(accountId, propertyId) {
  var params = {
    "accountId": accountId,
    "webPropertyId": propertyId
  };
  var request = gapi.client.analytics.management.profiles.list(params);
  request.execute(showProfiles);
}


// Put user profiles in a select element and
// un-hide the Start button
function showProfiles(results) {
  $("#profile-select").find("option").remove();
  if (results && !results.error &&
      results.items && results.items.length > 0) {
    var profiles = results.items;
    profiles.sort(compareNames);
    for (var i = 0; i < profiles.length; i++) {
      $("#profile-select").append(
        '<option value="' + profiles[i].id + '">' +
        profiles[i].name + '</option>');
    }
    $("#profile-select").show();
    handleProfileChange();
  } else {
    if (!results) {
      console.log("Profiles query results null");
    } else if (results.error) {
      console.log("Profiles query error: " + error.message);
    } else if (results.items.length <= 0) {
      console.log("No profiles for this account");
    }
    alert("Failed to get profiles");
  }
}


// Selected profile has changed
function handleProfileChange() {
  $("#start-button").show();
}


// Compare based on object's name
function compareNames(a, b) {
  if (a.name > b.name)
    return 1;
  else if (a.name < b.name)
    return -1;
  else
    return 0;
}
