// rm.js - Readership Map Prototype

// Google authorization parameters
var CLIENT_ID = "898001239502-trev8m96god6nlsiherb9q8g0qj5ktcj.apps.googleusercontent.com";
var SCOPES = "https://www.googleapis.com/auth/analytics.readonly";

// Global variables for the map
var map;
var markers = [];

//// Main application flow ////

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

function go() {
  getData(selectedProfile());
}

function getData(profileId) {
  var params = {
    "ids": "ga:" + profileId,
    "start-date": "today",
    "end-date": "today",
    "metrics": "ga:pageviews",
    "dimensions": "ga:hour,ga:minute,ga:latitude,ga:longitude,ga:city",
    "sort": "ga:hour,ga:minute"
  };
  var query = gapi.client.analytics.data.ga.get(params);
  query.execute(showData);
}

function showData(response) {
  var dataTextArea = document.getElementById("data-text");
  if (response && !response.error) {
    var formattedJson = JSON.stringify(response.result, null, 2);
    dataTextArea.value = formattedJson;
    markMap(response.result.rows);
  } else {
    if (!response) {
      console.log("Data query response null");
    } else if (response.error) {
      console.log("Data query error: " + error.message);
    }
    dataTextArea.value = "Query failed";
    clearMap();
  }
}

function markMap(rows) {
  clearMap();
  if (rows) {
    for (var i = 0; i < rows.length; i++) {
      var params = {
        position: {
          lat: parseFloat(rows[i][2]),
          lng: parseFloat(rows[i][3])
        },
        title: rows[i][4]
      };
      var marker = new google.maps.Marker(params);
      marker.setMap(map);
      markers.push(marker)
    }
  }
}

//// Data selection helpers ////

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

//// Map initialization & helpers ////

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
