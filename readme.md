# #uberdata trip script

Note: This code is provided for reference purposes only.  

Really quick and dirty script that pulls your trip data from Uber and saves it as geoJSON.  Based on [https://github.com/joshhunt/uber](https://github.com/joshhunt/uber)

Differences from the source linked above:

- No more coffeescript
- Outputs to valid geoJSON FeatureCollection
- Some bug fixes that had to do with some changes to the Uber page
- Some bug fixes to skip cancelled trips or other trips that don't have good data

## Install
```sh
# Clone the source code
$ git clone https://github.com/chriswhong/uber-trip-script.git && cd ./uber-trip-script

# Install NPM dependencies
$ npm install
```

Create `config.json` with the following keys:

```json
{
    "username": "your@email.com",
    "password": "yourSecurePassword",
    "tripPages": 3
}
```

`username` and `password` are pretty self explanatory, `tripPages` is the max number of trips pages you have at [https://riders.uber.com/trips](https://riders.uber.com/trips)

## Usage
```sh
$ node app.js
Requesting login page...
Logging in as your@email.com
Cool, logged in.
Getting pages [ 1, 2, 3, 4 ]
Fetching https://riders.uber.com/trips?page=1
Fetching https://riders.uber.com/trips?page=2
Fetching https://riders.uber.com/trips?page=3
Fetching https://riders.uber.com/trips?page=4
Fetched all pages, got 4 results
```

Lots of progress logs are shown, at the end it will generate `uberData.geojson`.

## Mapping
Copy and paste your `.geojson` data into a service like [geojson.io](http://geojson.io/) or [geojsonlint.com](http://geojsonlint.com).

![geojsonlint screenshot](http://i.imgur.com/YTlzooi.png)
