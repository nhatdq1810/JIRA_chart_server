var express = require('express');
var router = express.Router();
var constants = require('../constants');

var JiraClient = require('jira-connector');

var jira = new JiraClient({
  host: constants.host,
  basic_auth: {
    username: constants.username,
    password: constants.pwd
  }
});

router.get('/', function (req, res, next) {
  jira.search.search({jql: 'project=NGINV'}, function (error, issue) {
    console.log(error);
    res.send({ issue });
  });
});

module.exports = router;
