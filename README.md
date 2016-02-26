# Readership Map

## Setup

Four environment variables must be set:

* `GA_PROFILE_ID` - the Google Analytics profile ID ('ga:XXXXXXXX')
* `GA_UTC_OFFSET` - the offset from UTC for the time zone that is used
                    for the Google Analytics data, e.g. '-08:00' for PST
* `GSA_CLIENT_EMAIL` - the client email for the Google service account
* `GSA_PRIVATE_KEY` - the private key for the Google service account

The `GSA_...` fields can be copied from a Google service account
credentials JSON file downloaded from the Developer Console.
The variables can be set either outside the application or in an
**application.yml** file placed in the **config/** directory.
The file should contain the lines

```
GA_PROFILE_ID: 'ga:XXXXXXXX'
GA_UTC_OFFSET: '(+|-)HH:MM'
GSA_CLIENT_EMAIL: 'user@subdomain.gserviceaccount.com'
GSA_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----...'
```

To run in production mode, the variable `SECRET_KEY_BASE`
also needs to be set with a secret token for the Rails app.

There is one optional configuration variable, `EXCLUDED_URIS`,
which can be set with a ';'-delimited list of regular expressions
(see [Ruby documentation](http://ruby-doc.org/core-2.2.0/Regexp.html))
to match the URIs to be excluded.

```
EXCLUDED_URIS: 'search;browse;stats'
```

## Usage

* `/data/recent[.json]` returns readership data for today
* `/` displays the map with live readership data
