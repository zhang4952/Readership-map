// rm.js - Readership Map Prototype

//////// Main appication ////////

var SIMULATE_DATA = true;

// Timing variables (Date objects)
var dataStartTime, dataEndTime;
var virtualTime, lastDisplayTime;

// Timing parameters (minutes)
var queryDelay = 10;
var queryInterval = 10;
var displayInterval = 1;
var MS_PER_MINUTE = 60000;

// Interval timers
var queryTimer, displayTimer, displayOneTimer;

// Data and display stacks
var dataStack, displayStack;

// Global variables for the map
var map;
var markers = [];
var infoWindows = [];


// Start the application
function start() {
  console.log("starting...");

  // Initialize
  clearMap();
  dataStack = [];
  displayStack = [];
  if (SIMULATE_DATA) {
    dataStartTime = new Date(2015, 9, 14, 11, 0, 0, 0);
  } else {
    dataStartTime = new Date();
    dataStartTime.setMinutes(dataStartTime.getMinutes() -
                             queryDelay -
                             queryInterval);
  }
  dataEndTime = new Date(dataStartTime.getTime());
  virtualTime = new Date(dataStartTime.getTime());
  lastDisplayTime = new Date();
  queryTimer = setInterval(query, MS_PER_MINUTE * queryInterval);
  displayTimer = setInterval(display, MS_PER_MINUTE * displayInterval);
  displayOneTimer = null;

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

  $("#start-button").show();
  $("#stop-button").hide();

  logState();
}


// Query for data
function query() {
  console.log("querying...");

  dataStartTime = dataEndTime;
  if (SIMULATE_DATA) {
    dataEndTime = new Date(dataStartTime.getTime());
    dataEndTime.setMinutes(dataEndTime.getMinutes() + queryInterval);
  } else {
    dataEndTime = new Date();
    dataEndTime.setMinutes(dataEndTime.getMinutes() - queryDelay);
  }
  if (SIMULATE_DATA) {
    console.log("(using simulated data)");
    $.get("data.json", function(data) {
      handleQueryResponse(JSON.parse(data));
      });
  } else {
    var params = {
      "ids": "ga:" + selectedProfile(),
      "start-date": "today",
      "end-date": "today",
      "metrics": "ga:pageviews",
      "dimensions": "ga:hour,ga:minute,ga:latitude,ga:longitude,ga:city",
      "sort": "-ga:hour,-ga:minute"
    };
    var query = gapi.client.analytics.data.ga.get(params);
    query.execute(handleQueryResponse);
  }
}


// Callback for data query
function handleQueryResponse(response) {
  console.log("handling response...");

  if (response && !response.error && response.result &&
      response.result.rows && response.result.rows.length > 0) {
    // Log the full response
    var formattedJson = JSON.stringify(response.result, null, 2);
    console.log("query response:");
    console.log(formattedJson);
    console.log("");

    // Extract data in the desired time interval
    var responseRows = response.result.rows;
    for (var i = 0; i < responseRows.length; i++) {
      if (rowIsValid(responseRows[i]) &&
          rowInDataInterval(responseRows[i])) {
        dataStack.push([timeFromRow(responseRows[i]),
                        dataFromRow(responseRows[i])]);
      }
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
    clearInterval(queryTimer);
    clearInterval(displayTimer);
    clearInterval(displayOneTimer);
    clearMap();
  }
}


// Display data with times now in the virtual past
function display() {
  console.log("displaying...");

  // Update virtual time
  var currentTime = new Date();
  virtualTime.setMinutes(virtualTime.getMinutes() + Math.round(
                         (currentTime - lastDisplayTime) / MS_PER_MINUTE));

  // Flush the display stack
  while (displayStack.length > 0) {
    displayOne();
  }

  // Put data onto intermediate stack, then onto display stack,
  // so that the correct order is maintained
  var toDisplay = [];
  while (dataStack.length > 0 &&
         dataStack[dataStack.length - 1][0] <= virtualTime) {
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
        displayInterval * MS_PER_MINUTE / displayStack.length);
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
  if (datum && datum.length == 2) {
    var params = {
        position: {
            lat: datum[1].lat,
            lng: datum[1].lng
          },
        title: datum[1].city,
        icon: "marker.png",
        animation: google.maps.Animation.DROP
      };
    var marker = new google.maps.Marker(params);
    var infoContent =
      "<strong>An Essay towards solving " +
      "a Problem in the Doctrine of Chances</strong>" +
      "<br><em>Thomas Bayes (1763)</em>" +
      "<hr>Reader in " + datum[1].city;
    var infoWindow = new google.maps.InfoWindow(
      {
        content: infoContent,
        maxWidth: 200
      });
    marker.addListener("click", function() {
      infoWindow.open(map, marker);
      });
    marker.setMap(map);

    // Store reference to marker so that it can
    // be removed later
    markers.push(marker);
    infoWindows.push(infoWindow);
  }
}


// Does the data row have valid values?
function rowIsValid(row) {
  if (row[4] == "(not set)") {
    return false;
  } else {
    return true;
  }
}


// Is the data row in the desired time interval?
function rowInDataInterval(row) {
  var time = timeFromRow(row);
  return (time >= dataStartTime && time < dataEndTime);
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


// Return map object containing the row's data
function dataFromRow(row) {
  if (row && row.length >= 5) {
    return {
        lat: parseFloat(row[2]),
        lng: parseFloat(row[3]),
        city: row[4]
      };
  }
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
              stack[i][0] + " - " +
              stack[i][1].city);
}


// Initialize the Google map
function initMap() {
  var params = {
    center: {lat: 20, lng: 0},
    zoom: 2,
    minZoom: 2
  };
  map = new google.maps.Map(document.getElementById("map"), params);
}


// Clear all markers from the map
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
}


//////// Authorization and profile selection ////////

// Google authorization parameters
var CLIENT_ID = "898001239502-trev8m96god6nlsiherb9q8g0qj5ktcj.apps.googleusercontent.com";
var SCOPES = "https://www.googleapis.com/auth/analytics.readonly";


// Called as soon as Google API Client Library loads
function authorize(event) {
  if (SIMULATE_DATA) {
    $("#account-select").hide();
    $("#property-select").hide();
    $("#profile-select").hide();
    $("#stop-button").hide();
    $("#start-button").show();
  } else {
    // Use "immediate" to avoid authorization pop-up --
    // should not use "immediate" when authorize() called
    // because Authorize button was clicked
    var useImmediate = event ? false : true;
    var authParams = {
      client_id: CLIENT_ID,
      immediate: useImmediate,
      scope: SCOPES
    };
    gapi.auth.authorize(authParams, handleAuthorization);
  }
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
  var accountSelect = document.getElementById("account-select");
  clearSelect(accountSelect);
  if (results && !results.error && results.items.length > 0) {
    var accounts = results.items;
    accounts.sort(compareNames);
    for (var i = 0; i < accounts.length; i++) {
      var acctOption = document.createElement("option");
      acctOption.value = accounts[i].id;
      acctOption.text = accounts[i].name;
      accountSelect.add(acctOption);
    }
    accountSelect.hidden = false;
    handleAccountChange();
  } else {
    if (!results) {
      console.log("Accounts query results null");
    } else if (results.error) {
      console.log("Accounts query error: " + error.message);
    } else if (results.items.length <= 0) {
      console.log("No accounts for this user");
    }
    accountSelect.hidden = true;
    $("#property-select").hide();
    $("#profile-select").hide();
    $("#start-button").hide();
    clearMap();
  }
}


// Account selection has changed
function handleAccountChange() {
  getProperties(selectedAccount());
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
  var propertySelect = document.getElementById("property-select");
  clearSelect(propertySelect);
  if (results && !results.error && results.items.length > 0) {
    var properties = results.items;
    properties.sort(compareNames);
    for (var i = 0; i < properties.length; i++) {
      var propOption = document.createElement("option");
      propOption.value = properties[i].id;
      propOption.text = properties[i].name;
      propertySelect.add(propOption);
    }
    propertySelect.hidden = false;
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
    propertySelect.hidden = true;
    $("#profile-select").hide();
    $("#start-button").hide();
    clearMap();
  }
}


// Selected property has changed
function handlePropertyChange() {
  getProfiles(selectedAccount(), selectedProperty());
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
  var profileSelect = document.getElementById("profile-select");
  clearSelect(profileSelect);
  if (results && !results.error && results.items.length > 0) {
    var profiles = results.items;
    profiles.sort(compareNames);
    for (var i = 0; i < profiles.length; i++) {
      var profOption = document.createElement("option");
      profOption.value = profiles[i].id;
      profOption.text = profiles[i].name;
      profileSelect.add(profOption);
    }
    profileSelect.hidden = false;
    handleProfileChange();
  } else {
    if (!results) {
      console.log("Profiles query results null");
    } else if (results.error) {
      console.log("Profiles query error: " + error.message);
    } else if (results.items.length <= 0) {
      console.log("No profiles for this account");
    }
    profileSelect.hidden = true;
    $("#start-button").hide();
    clearMap();
  }
}


// Selected profile has changed
function handleProfileChange() {
  $("#start-button").hide();
}


// Return the selected Analytics account
function selectedAccount() {
  var accountSelect = document.getElementById("account-select");
  return accountSelect.options[accountSelect.selectedIndex].value;
}  


// Return the selected Analytics Property
function selectedProperty() {
  var propertySelect = document.getElementById("property-select");
  return propertySelect.options[propertySelect.selectedIndex].value;
}


// Return the selected Analytics Profile
function selectedProfile() {
  var profileSelect = document.getElementById("profile-select");
  return profileSelect.options[profileSelect.selectedIndex].value;
}


// Clear a select HTML element
function clearSelect(select) {
  while (select.options.length > 0) {
    select.remove(0);
  }
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
