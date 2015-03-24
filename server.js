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
 * Returns a JSON object representing statistics in the last month 
 * based on the query in the subreddit. It also represents subreddit statistics
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
      t: 'month',
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
    if (result.number_of_posts === 100)
      result.number_of_posts += '+';
    if (result.score === 100)
      result.score += '+';
    if (result.number_of_comments === 100)
      result.number_of_comments += '+';
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