var fs = require('fs');
var path = require('path');
var url = require('url');
var _ = require('underscore');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var request = request.defaults({
  jar: true
});

var config = require('./config.json');

var CONCURRENCY = 3;
var LOGIN_URL = 'https://login.uber.com/login';
var CAR_MAP = {
  'uberx': 'UberX',
  'suv': 'UberSUV',
  'black': 'UberBlack',
  'uberblack': 'UberBlack',
  'taxi': 'Taxi'
};


var writeToFile = function(filename, data) {
  filename = path.join('tmp', filename);
  return fs.writeFile(filename, data, function() {});
};

console.log('Requesting login page...');

request(LOGIN_URL, function(err, res, body) {
  var $ = cheerio.load(body);
  var csrf = $('[name=_csrf_token]').val();

  return login(config.username, config.password, csrf);
});

var login = function(user, pass, csrf) {
  var form = {
    'email': user,
    'password': pass,
    '_csrf_token': csrf,
    'redirect_to': 'riders',
    'redirect_url': 'https://riders.uber.com/trips',
    'request_source': 'www.uber.com'
  };

  console.log('Logging in as ' + user);

  return request.post(LOGIN_URL, {
    form: form
  }, function(err, res, body) {
    if (err) {
      throw err;
    }

    var redirectUrl = 'https://riders.uber.com/trips';
    return request(redirectUrl, function(err) {
      if (err) {
        throw err;
      }

      return startParsing();
    });
  });
};

var requestTripList = function(page, cb) {
  var listUrl = "https://riders.uber.com/trips?page=" + page;
  var options = {
    url: listUrl,
    headers: {
      'x-ajax-replace': true
    }
  };

  console.log('Fetching', listUrl);

  return request(options, function(err, res, body) {
    writeToFile("list-" + page + ".html", body);
    return cb(err, body);
  });
};

var startParsing = function() {
  console.log('Cool, logged in.');
  
  var pagesToGet = [];
  for (var i = 1; i < config.tripPages + 1; i++) {
    pagesToGet.push(i);
  }

  console.log('Getting pages', pagesToGet);
  
  return async.mapLimit(pagesToGet, CONCURRENCY, requestTripList, function(err, result) {
    if (err) {
      throw err;
    }
    
    console.log("Fetched all pages, got " + result.length + " results");
    
    var combined = result.join(' ');
    
    writeToFile('lists-combined.html', combined);
    var $ = cheerio.load(combined);
    
    var trips = $('.trip-expand__origin');
    var tripIds = trips.map(function(i, trip) {
      return $(trip).attr('data-target').slice(6);
    }).toArray();
    
    console.log(tripIds); // array of all trip IDs
    
    return async.map(tripIds, downloadTrip, function(err, results) {
      if (err) {
        throw err;
      }

      console.log('Finished downloading all trips');

      // parse results and remove those that were errors
      for (var i = results.length; i--;) {
        if (results[i] == "error") {
          results.splice(i, 1);
        }
      }

      var featureCollection = {
        type: "FeatureCollection",
        features: results
      };

      // return writeToFile('uberRideStats.json', JSON.stringify(featureCollection));
      return fs.writeFile('uberData.geojson', JSON.stringify(featureCollection));
    });
  });
};

var downloadTrip = function(tripId, cb) {
  var tripUrl = "https://riders.uber.com/trips/" + tripId;
  
  console.log("Downloading trip " + tripId);
  
  return request(tripUrl, function(err, res, body) {
    if (err) {
      throw err;
    }

    writeToFile("trip-" + tripId + ".html", body);
    return parseStats(tripId, body, cb);
  });
};

var parseStats = function(tripId, html, cb) {
  var $ = cheerio.load(html);
  var stats = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString"
    }
  };

  var imgSrc = $('.img--full.img--flush').attr('src');
  if (!imgSrc) {
    return cb(null, "error");
  }

  var urlParts = url.parse(imgSrc, true);
  if (!urlParts.query.path) {
    return cb(null, "error");
  }

  var rawJourney = urlParts.query.path.split('|').slice(2);

  stats.geometry.coordinates = _.map(rawJourney, function(pair) {
    var split = pair.split(',');
    split.reverse(); //x,y instead of y,x provided (lat,lon)
    split[0] = parseFloat(split[0]);
    split[1] = parseFloat(split[1]);
    return split;
  });
  stats.properties.fareCharged = $('.fare-breakdown tr:last-child td:last-child').text();
  stats.properties.fareTotal = $('.fare-breakdown tr.separated--top.weight--semibold td:last-child').text();

  $('.fare-breakdown tr').each(function(i, ele) {
    var elements = $(ele).find('td');
    var text1 = $(elements[1]).text();
    var text2 = $(elements[2]).text();
    var text3 = $(elements[3]).text();

    var key, label, value;
    if (text1 && text2) {
      label = text1.toLowerCase();
      value = text2;
    } else if (text2 && text3) {
      label = text2.toLowerCase();
      value = text3;
    } else if (text1 && text3) {
      label = text1.toLowerCase();
      value = text3;
    }

    switch (label) {
      case 'base fare':
        key = 'fareBase';
        break;
      case 'distance':
        key = 'fareDistance';
        break;
      case 'time':
        key = 'fareTime';
        break;
      case 'subtotal':
        key = 'fareSubtotal';
        break;
      case 'uber credit':
        key = 'fareUberCredit';
    }

    if (label.indexOf('charged') > -1) {
      key = 'charged';
    }

    return stats.properties[key || label] = value;
  });

  var tripAttributes = $('.trip-details__breakdown .soft--top .flexbox__item');
  tripAttributes.each(function(i, ele) {
    var element = $(ele);

    var key;
    var label = element.find('div').text().toLowerCase();
    var value = element.find('h5').text();

    switch (label) {
      case 'car':
        key = 'car';
        value = CAR_MAP[value] || value;
        break;
      case 'miles':
        key = 'distance';
        break;
      case 'trip time':
        key = 'duration';
    }
    return stats.properties[key] = value;
  });

  var $rating = $('.rating-complete');
  if ($rating) {
    stats.properties.rating = $rating.find('.star--active').length;
  }
  stats.properties.endTime = $('.trip-address:last-child p').text();
  stats.properties.startTime = $('.trip-address:first-child p').text();
  stats.properties.endAddress = $('.trip-address:last-child h6').text();
  stats.properties.startAddress = $('.trip-address:first-child h6').text();
  stats.properties.date = $('.page-lead div').text();
  stats.properties.driverName = $('.trip-details__review .grid__item:first-child td:last-child').text().replace('You rode with ', '');

  // writeToFile("stats-" + tripId + ".json", JSON.stringify(stats));

  return cb(null, stats);
};