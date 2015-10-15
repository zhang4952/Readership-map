// rm.js - Readership Map Prototype

// Google authorization parameters
var CLIENT_ID = "898001239502-trev8m96god6nlsiherb9q8g0qj5ktcj.apps.googleusercontent.com";
var SCOPES = "https://www.googleapis.com/auth/analytics.readonly";

//// Authorization and profile selection ////

function authorize(event) {
  // Use "immediate" to avoid authorization pop-up.
  // Should not use "immediate" when Authorize button clicked.
  var useImmediate = event ? false : true;
  var authParams = {
    client_id: CLIENT_ID,
    immediate: useImmediate,
    scope: SCOPES
  };
  gapi.auth.authorize(authParams, handleAuthorization);
}

function handleAuthorization(response) {
  var authButton = document.getElementById("auth-button");
  if (response.error) {
    authButton.hidden = false;
  } else {
    authButton.hidden = true;
    gapi.client.load("analytics", "v3", getAccounts);
  }
}

function getAccounts() {
  var request = gapi.client.analytics.management.accounts.list();
  request.execute(showAccounts);
}

function showAccounts(results) {
  var accountSelect = document.getElementById("account-select");
  clearSelect(accountSelect);
  if (results && !results.error && results.items.length > 0) {
    var accounts = results.items;
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
    document.getElementById("property-select").hidden = true;
    document.getElementById("profile-select").hidden = true;
    document.getElementById("go-button").hidden = true;
    clearMap();
  }
}

function handleAccountChange() {
  getProperties(selectedAccount());
}

function getProperties(accountId) {
  var params = {
    "accountId": accountId
  };
  var request = gapi.client.analytics.management.webproperties.list(params);
  request.execute(showProperties);
}

function showProperties(results) {
  var propertySelect = document.getElementById("property-select");
  clearSelect(propertySelect);
  if (results && !results.error && results.items.length > 0) {
    var properties = results.items;
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
    document.getElementById("profile-select").hidden = true;
    document.getElementById("go-button").hidden = true;
    clearMap();
  }
}

function handlePropertyChange() {
  getProfiles(selectedAccount(), selectedProperty());
}

function getProfiles(accountId, propertyId) {
  var params = {
    "accountId": accountId,
    "webPropertyId": propertyId
  };
  var request = gapi.client.analytics.management.profiles.list(params);
  request.execute(showProfiles);
}

function showProfiles(results) {
  var profileSelect = document.getElementById("profile-select");
  clearSelect(profileSelect);
  if (results && !results.error && results.items.length > 0) {
    var profiles = results.items;
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
    document.getElementById("go-button").hidden = true;
    clearMap();
  }
}

function handleProfileChange() {
  var goButton = document.getElementById("go-button");
  goButton.hidden = false;
}

//// Main appication ////

// Timing variables (Date objects)
var queryStart, queryEnd;
var virtualTime, lastDisplayTime;

// Timing parameters (minutes)
var queryDelay = 5;
var queryInterval = 15;
var displayInterval = 1;

// Interval timers
var queryTimer, displayTimer, displayOneTimer;

// Data and display stacks
var dataStack, displayStack;

// Global variables for the map
var map;
var markers = [];

function go() {
  console.log("going...");
  clearMap();
  dataStack = [];
  displayStack = [];
  queryStart = new Date();
  queryStart.setMinutes(queryStart.getMinutes() -
                        queryDelay -
                        queryInterval);
  queryEnd = new Date(queryStart);
  virtualTime = new Date(queryStart);
  lastDisplayTime = new Date();
  queryTimer = setInterval(query, 60000 * queryInterval);
  displayTimer = setInterval(display, 60000 * displayInterval);
  displayOneTimer = null;
  document.getElementById("stop-button").hidden = false;
  logVariables();
  query();
}

function stop() {
  console.log("stopping...");
  clearTimeout(queryTimer);
  clearTimeout(displayTimer);
  clearTimeout(displayOneTimer);
  logVariables();
}

function query() {
  console.log("querying...");
  queryStart = queryEnd;
  queryEnd = new Date();
  queryEnd.setMinutes(queryEnd.getMinutes() - queryDelay);
  var params = {
    "ids": "ga:" + selectedProfile(),
    "start-date": "today",
    "end-date": "today",
    "metrics": "ga:pageviews",
    "dimensions": "ga:hour,ga:minute,ga:latitude,ga:longitude,ga:city",
    "sort": "-ga:hour,-ga:minute"
  };
  var query = gapi.client.analytics.data.ga.get(params);
  logVariables();
  query.execute(handleQueryResponse);
}

function handleQueryResponse(response) {
  console.log("handling response...");
  if (response && !response.error) {
    var formattedJson = JSON.stringify(response.result, null, 2);
    console.log(formattedJson);
    var rawRows = response.result.rows;
    for (var i = 0; i < rawRows.length; i++) {
      if (rowIsInQueryInterval(rawRows[i])) {
        dataStack.push([timeFromRow(rawRows[i]), dataFromRow(rawRows[i])]);
      }
    }

    virtualTime = new Date(queryStart);
    lastDisplayTime = new Date();
    logVariables();
    display();
  } else {
    if (!response) {
      console.log("Data query response null");
    } else if (response.error) {
      console.log("Data query error: " + response.error.message);
    }
    dataTextArea.value = "Query failed";
    clearMap();
  }
}

function display() {
  console.log("displaying...");
  var currentTime = new Date();
  virtualTime.setMinutes(virtualTime.getMinutes() +
    Math.round((currentTime - lastDisplayTime) / 60000));
  while (displayStack.length > 0) {
    displayOne();
  }
  var toDisplay = [];
  while (dataStack.length > 0 &&
         dataStack[dataStack.length - 1][0] <= virtualTime) {
    toDisplay.push(dataStack.pop());
  }
  while (toDisplay.length > 0) {
    displayStack.push(toDisplay.pop());
  }
  if (displayStack.length > 0) {
    if (displayStack.length > 1) {
      displayOneTimer = setInterval(displayOne,
        displayInterval * 60000 / displayStack.length);
    }
    displayOne();
  }
  lastDisplayTime = currentTime;
  logVariables();
}

function displayOne() {
  console.log("displaying one...");
  if (displayStack.length > 0) {
    markOnMap(displayStack.pop());
  }
  if (displayStack.length <= 0) {
    clearTimeout(displayOneTimer);
  }
  logVariables();
}

function markOnMap(datum) {
  if (datum && datum.length == 2) {
    var params = {
        position: {
            lat: datum[1].lat,
            lng: datum[1].lng
          },
        title: datum[1].city,
        animation: google.maps.Animation.DROP
      };
    var marker = new google.maps.Marker(params);
    marker.setMap(map);
    markers.push(marker)
  }
}

function rowIsInQueryInterval(row) {
  var time = timeFromRow(row);
  return (time >= queryStart && time < queryEnd);
}

function timeFromRow(row) {
  if (row && row.length >= 2) {
    var hour = parseInt(row[0]);
    var minute = parseInt(row[1]);
    var time = new Date(queryStart);
    time.setHours(hour);
    time.setMinutes(minute);
    return time;
  } else {
    console.log("timeFromRow(): invalid argument " + row);
  }
}

function dataFromRow(row) {
  if (row && row.length >= 5) {
    return {
        lat: parseFloat(row[2]),
        lng: parseFloat(row[3]),
        city: row[4]
      };
  }
}

function logVariables() {
  console.log("    virtualTime: " + virtualTime);
  console.log("     queryStart: " + queryStart);
  console.log("       queryEnd: " + queryEnd);
  console.log("lastDisplayTime: " + lastDisplayTime);
  console.log("      dataStack: (bottom-to-top)");
  if (dataStack.length >=2) {
    logStackRow(dataStack, 0);
    logStackRow(dataStack, 1);
  }
  if (dataStack.length > 2 && dataStack.length <= 5) {
    for (i = 2; i < dataStack.length; i++) {
      logStackRow(dataStack, i);
    }
  }
  if (dataStack.length > 5) {
    console.log("                 ...");
    logStackRow(dataStack, dataStack.length - 2);
    logStackRow(dataStack, dataStack.length - 1);
  }
  console.log("   displayStack: (bottom-to-top)");
  for (var i = 0; i < displayStack.length; i++) {
    logStackRow(displayStack, i);
  }
}

function logStackRow(stack, i) {
  console.log("                 " + 
              stack[i][0] + " - " +
              stack[i][1].city);
}

function clearSelect(select) {
  while (select.options.length > 0) {
    select.remove(0);
  }
}

function selectedAccount() {
  var accountSelect = document.getElementById("account-select");
  return accountSelect.options[accountSelect.selectedIndex].value;
}  

function selectedProperty() {
  var propertySelect = document.getElementById("property-select");
  return propertySelect.options[propertySelect.selectedIndex].value;
}

function selectedProfile() {
  var profileSelect = document.getElementById("profile-select");
  return profileSelect.options[profileSelect.selectedIndex].value;
}

function initMap() {
  var params = {
    center: {lat: 34.43, lng: -47.48},
    zoom: 2
  };
  map = new google.maps.Map(document.getElementById("map"), params);
}

function clearMap() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
    markers[i] = null;
  }
  markers = []
}
