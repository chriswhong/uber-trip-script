# #uberdata trip script

Note: This code is provided for reference purposes only.  

Really quick and dirty script that pulls your trip data from Uber and saves it as geoJSON.  Based on [https://github.com/joshhunt/uber](https://github.com/joshhunt/uber)

Differences from the source linked above:
-No more coffeescript
-Outputs to valid geoJSON FeatureCollection
-Some bug fixes that had to do with some changes to the Uber page
-Some bug fixes to skip cancelled trips or other trips that don't have good data

## Setup

Just run `npm install`to install dependancies, then you'll need to create a `config.json` with the following keys:

```
{
    "username": "your@email.com",
    "password": "yourSecurePassword",
    "tripPages": 3
}
```

`Username` and `password` are pretty self explanatory, `tripPages` is the max number of trips pages you have at `https://riders.uber.com/trip`

Then run with `node app.js`. Lots of progress logs are shown. At the end, it will generate `uberData.geojson`.  

When you're done, copy and paste your data into [geojsonlint.com](http://geojsonlint.com) to check it out!  Happy Mapping!

![Imgur](http://i.imgur.com/YTlzooi.png)
