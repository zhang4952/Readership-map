# Readership Map

## Setup

Three environment variables must be set:

* `GA_PROFILE_ID` - the Google Analytics profile ID ('ga:XXXXXXXX')
* `GSA_CLIENT_EMAIL` - the client email for the Google service account
* `GSA_PRIVATE_KEY` - the private key for the Google service account

The `GSA_...` fields can be copied from a Google service account
credentials JSON file downloaded from the Developer Console.
The variables can be set either outside the application or in an
**application.yml** file placed in the **/config** directory.
The file should contain the lines

```
GA_PROFILE_ID: 'ga:XXXXXXXX'
GSA_CLIENT_EMAIL: 'user@subdomain.gserviceaccount.com'
GSA_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----...'
```

To run in production mode, the variable `SECRET_KEY_BASE`
also needs to be set with a secret token for the Rails app.

There are several optional configuration variables:

* `GA_UTC_OFFSET` - the offset from UTC for the time zone that is used
                    for the Google Analytics data, e.g. '-08:00' for PST
                    ('-07:00' during daylight savings!)
* `GA_FILTERS` - filters to be applied to the path part of URIs when
                 querying Google Analytics (see the [documentation](https://developers.google.com/analytics/devguides/reporting/core/v3/reference#filters))
* `RM_QUERY_INTERVAL` - minutes between queries by the map for new data
* `RM_QUERY_DELAY` - minutes of additional delay in the map's display of data
* `RM_DISPLAY_INTERVAL` - minutes between the display of the map's "live" data
* `RM_MAX_TITLE_LENGTH` - maximum number of characters for item titles displayed
                          in the map's pop-up info window (longer titles are
                          truncated)
* `RM_INITIAL_HISTORY` - minutes of data preceding the "live" data with which
                         to initialize the map on startup
* `RM_HEADER_TEXT` - text to display in the map's header
* `RM_FOOTER_TEXT` - text to display in the map's footer
* `RM_LAST_UPDATED` - the date of last update (in text form, any format)

## Usage

* `/data/recent[.json][?minutes=n]` returns the last `n` minutes of readership
  data (60 minutes if `minutes` is not specified)
* `/` displays the map with live readership data
