const express = require('express');
const router = express.Router();
const constants = require('../constants');

const JiraClient = require('jira-connector');

const jira = new JiraClient({
  host: constants.host,
  basic_auth: {
    username: constants.username,
    password: constants.pwd
  }
});

function countIssues() {
  return new Promise((resolve, reject) => {
    jira.search.search({ jql: `project=${constants.project}`, maxResults: 0, fields: [] },
      function (error, issue) {
        if (error) {
          reject(error);
        }
        resolve(issue.total);
      });
  });
}

function getIssuelinksRelatedOrBlock(issue) {
  return issue.fields.issuelinks.filter(link => {
    return link.type.name === 'Related' || link.type.name === 'Block';
  });
}

function getExisedIssuelinks(listIssue, listIssuelinks) {
  const exisedIssuelinks = [];
  listIssuelinks.forEach((link) => {
    if (link.inwardIssue) {
      const linkedIssueIdx = listIssue.findIndex((iss) => iss.id === link.inwardIssue.id);
      if (linkedIssueIdx > -1) {
        exisedIssuelinks.push(link);
      }
    }
    if (link.outwardIssue) {
      const linkedIssueIdx = listIssue.findIndex((iss) => iss.id === link.outwardIssue.id);
      if (linkedIssueIdx > -1) {
        exisedIssuelinks.push(link);
      }
    }
  });

  return exisedIssuelinks;
}

function removeIssueWithEmptyLinks(listIssue) {
  return listIssue.filter((issue) => {
    return issue.fields.issuelinks.length > 0;
  });
}

router.post('/', function (req, res, next) {
  countIssues()
    .then(maxResults => {
      const searchObject = {
        issuetype: req.body.issuetype,
      };
      
      jira.search.search({ jql: `project=${constants.project} and issuetype in (${searchObject.issuetype})`, maxResults, fields: constants.fields },
        function (error, resp) {
          if (error) {
            console.error('search', error);
          }

          const listNewIssue = resp.issues.map((issue) => {
            const tmpIssuelinks = getIssuelinksRelatedOrBlock(issue);
            const exisedIssuelinks = getExisedIssuelinks(resp.issues, tmpIssuelinks);
            const newFields = Object.assign({}, issue.fields, { issuelinks: exisedIssuelinks });
            const newIssue = Object.assign({}, issue, { fields: newFields });

            return newIssue;
          });

          const issues = removeIssueWithEmptyLinks(listNewIssue);

          res.send({ issues });
        });
    })
    .catch(err => {
      console.error('countIssues', err);
    })
});

module.exports = router;
