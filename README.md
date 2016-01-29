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

There is one optional configuration variable, `EXCLUDED_URIS`,
which can be set with a ';'-delimited list of regular expressions
(see [Ruby documentation](http://ruby-doc.org/core-2.2.0/Regexp.html))
to match the URIs to be excluded.

```
EXCLUDED_URIS: 'search;browse;stats'
```

## Usage

* `/data/recent[.json]` returns readership data for today
* `/map/main` displays the map with live readership data
