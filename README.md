# reddit-stats-server
API wrapper for Reddit API to display search query stats within a subreddit. Written in Node.js

This is a very basic wrapper intended to meet the requirements of an assignment at Queen's University. (CISC 320, Winter 2015, Group "Cecropia")

### Prerequisites

* Node.js and NPM

### Installation

* Clone this repository
* `cd` into the project directory
* `node server` will run the server locally and listen on port 3000 (or whatever is configured on the environment)

### Usage

There are 2 routes that produce a response:

* `/subreddit_exists` - Returns whether or not the subreddit exists
    * query-param: `subreddit` - The subreddit to check whether or not it exists
    * response: `exists` - A plaintext boolean value of whether or not the subreddit exists
* `/get_data` returns data based on a subreddit and search query
    * query-param: `subreddit` - The subreddit to search in
    * query-param: `q` - The keyword to search for
    * response: `object` - The "number_of_comments", "number_of_posts" and "score" of the search
