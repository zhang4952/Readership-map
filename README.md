# Readership Map

## Setup

Two environment variables must be set:

* `GOOGLE_APPLICATION_CREDENTIALS` - the path to the JSON credentials
  file for the Google service account
* `GA_PROFILE_ID` - the Google Analytics profile ID ('ga:XXXXXXXX')

These can be set either outside the application or in an
**application.yml** file placed in the **config/** directory.
The file should contain the lines

```
GOOGLE_APPLICATION_CREDENTIALS: '/path/to/json'
GA_PROFILE_ID: 'ga:XXXXXXXX'
```

There is one optional configuration variable, `EXCLUDED_PAGE_PATHS`,
which can be set with a ';'-delimited list of Google Analytics
`ga:pagePath` values to exclude from the results, i.e.

```
EXCLUDED_PAGE_PATHS: '/path/to/exclude/1;/path/to/exclude/2;/etc'
```

## Usage

* `/data/pageviews[.json]` returns pageview data for today
* `/map/main` displays the map with live pageview data
