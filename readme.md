# #uberdata trip scraper

Really quick and dirty scraper that pulls your trip data from Uber, saves it as JSON and makes a map for you.

If you use this or find it interesting, let me know (I'm [@joshhunt](http://twitter.com/joshhunt) on twitter as well). As always, pull requests are welcome! 

## Setup

Just run `npm install` and probably `npm install -g coffee-script` to install dependancies, then you'll need to create a `config.json` with the following keys:

```
{
    "username": "your@email.com",
    "password": "yourSecurePassword",
    "tripPages": 3
}
```

`Username` and `password` are pretty self explanatory, `tripPages` is the max number of trips pages you have at `https://riders.uber.com/trip`

Then run with `coffee app.coffee`. Lots of progress logs are shown. At the end, it will generate a map.html with all your data (JSON will be embedded in that as a JS object in an inline `<script>` tag).
