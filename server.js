var express = require('express');
var request = require('request');
var async   = require('async');
var config  = require('config');
var _       = require('lodash');
var app     = express();

var baseUrl = 'https://www.reddit.com';

app.get('/', function(req, res) {
  res.send('Reddit stats API! Available routes: /get_data /subreddit_exists');
});

/**
 * Returns a JSON object representing the search result for each of the provided
 * subreddits.
 * 
 * @param  {string} q  The query string to search for
 * @param  {string} sub1 Subreddit to search with
 * @param  {string} sub2 Subreddit to search with
 * @param  {string} sub3 Subreddit to search with
 * @param  {string} sub4 Subreddit to search with
 *
 * Example response: (if subreddits were cities)
 * {
 *   "toronto": {
 *     "score": 2512,
 *     "number_of_posts": 35,
 *     "number_of_comments": 4035
 *   },
 *   "montreal": {
 *     "score": 2512,
 *     "number_of_posts": 35,
 *     "number_of_comments": 4035
 *   },
 *   "kingston": {
 *     "score": 2512,
 *     "number_of_posts": 35,
 *     "number_of_comments": 4035
 *   }
 * }
 * 
 * @return {[type]}      [description]
 */
app.get('/get_data2', function(req, res) {
  if (!req.query.sub1 && !req.query.sub2 && !req.query.sub3 && !req.query.sub4)
    return res.status(400).send('No subreddits provided');
  if (!req.query.q)
    return res.status(400).send('No q string provided');
  if (!req.query.q.length >= 512)
    return res.status(400).send('q must be smaller than 512 characters');

  var subreddits = [];
  // get our subreddits from the query string
  if (req.query.sub1)
    subreddits.push(req.query.sub1);
  if (req.query.sub2)
    subreddits.push(req.query.sub2);
  if (req.query.sub3)
    subreddits.push(req.query.sub3);
  if (req.query.sub4)
    subreddits.push(req.query.sub4);

  async.map(subreddits, function getData(subreddit, cb) {
    // in parallel, get the number of subscribers and the search query
    async.parallel({
      numSubscribers: function(done) {
        // make request to /r/[subreddit]/about.json
        var url = baseUrl+'/r/'+encodeURIComponent(subreddit)+'/about.json';
        request(url, function(err, response, body) {
          done(null, JSON.parse(body).data.subscribers)
        });
      },
      stats: function(done) {
        // results object to be populated
        var result = {
          number_of_posts: 0,
          score: 0,
          number_of_comments: 0
        };

        var url = baseUrl+'/r/'+encodeURIComponent(subreddit)+'/search.json';
        request({
          url: url,
          useQuerystring:true,
          qs: {
            access_token: config.redditApiKey,
            q: req.query.q,
            limit: 100,
            restrict_sr: true,
            t: 'all',
            sort: 'top'
          }
        }, function(err, response, body) {
          var data = JSON.parse(body).data;
          if (!data.children)
            return res.send({
              message: 'no results'
            });
          _.forEach(data.children, function(obj, key) {
            result.score += obj.data.score;
            result.number_of_comments += obj.data.num_comments;
          });
          // set number of posts to children
          result.number_of_posts = data.children.length;
          done(null, result);
        });
      }
    }, function gotData(err, results) {
      // return back to map cb
      results.stats.numSubscribers = results.numSubscribers;
      cb(null, results.stats);
    })

  }, function returnResponse(err, results) {
    // normalize
    var response = {};
    for (var i = 0; i < subreddits.length; i++){
      response[subreddits[i]] = results[i];
    };
    return res.json(response);
  });
});

/**
 * Returns a JSON object representing statistics in the last month 
 * based on the query in the subreddit. It also represents subreddit statistics
 *
 * THIS IS TO ENSURE BACKWARDS COMPATIBILITY
 * 
 * @param  {string} q  The query string to search for
 * @param  {string} subreddit The subreddit
 *
 * Example response:
 * {
 *   "number_of_posts": "80",
 *   "score": "23014",
 *   "number_of_comments": "9727192"
 * }
 * 
 * @return {[type]}      [description]
 */
app.get('/get_data', function(req, res) {
  if (!req.query.subreddit)
    return res.status(400).send('No subreddit provided in query string');
  if (!req.query.q)
    return res.status(400).send('No q string provided');
  if (!req.query.q.length >= 512)
    return res.status(400).send('q must be smaller than 512 characters');

  // results object to be populated
  var result = {
    number_of_posts: 0,
    score: 0,
    number_of_comments: 0
  };

  var url = baseUrl+'/r/'+encodeURIComponent(req.query.subreddit)+'/search.json';
  request({
    url: url,
    useQuerystring:true,
    qs: {
      access_token: config.redditApiKey,
      q: req.query.q,
      limit: 100,
      restrict_sr: true,
      t: 'all',
      sort: 'top'
    }
  }, function(err, response, body) {
    var data = JSON.parse(body).data;
    if (!data.children)
      return res.send({
        message: 'no results'
      });
    _.forEach(data.children, function(obj, key) {
      result.score += obj.data.score;
      result.number_of_comments += obj.data.num_comments;
    });
    // set number of posts to children
    result.number_of_posts = data.children.length;
    return res.json(result);
  });
});

/**
 * Returns, in plaintext, 'true' or 'false' if the subreddit exists or not
 * 
 * @param  {string} subreddit  The subreddit to check if it exists
 *
 * Example response:
 * true
 * 
 * @return {[type]}      [description]
 */
app.get('/subreddit_exists', function(req, res) {
  // validation
  if (!req.query.subreddit)
    return res.status(400).send('No subreddit provided in query string');
  // make request to /r/[subreddit]/about.json
  var url = baseUrl+'/r/'+encodeURIComponent(req.query.subreddit)+'/about.json';
  request(url, function(err, response, body) {
    // error making request
    if (err) 
      return res.status(500).send('Server error');
    // exists
    if (JSON.parse(body).kind === 't5')
      return res.send('true');
    // doesn't exist
    return res.send('false');
  });
});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Reddit stats server listening at http://%s:%s', host, port);
});