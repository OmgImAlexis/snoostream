# SnooStream

An event based wrapper for getting new comments and submissions from Snoowrap.

## Features

* Can filter new posts via regex.
* Remove post duplicates returned from Reddit.
* Accounts for drift between system time and Reddit server time.

## Installation

```sh
npm install snoostream
```

## Usage

### How to initialize

```javascript
const { SnooStream } = require('snoostream');

let snooStream = new SnooStream({
  ... // This is all Snoowrap configuration
});
```

OR

```javascript
const { SnooStream } = require('snoostream');
const Snoowrap = require('snoowrap');

let snooWrap = new Snoowrap({
  ... // This is all Snoowrap configuration
});

let snooStream = new SnooStream(snooWrap);
```

### Create a Comment Stream

```javascript
const commentStream = snooStream.commentStream('all');
// Or if you want to match with a specific regex
const commentStream = snooStream.commentStream('all', { regex: /abc/ });

commentStream.on('comment', (comment, match) => {
  ... // comment is returned directly from Snoowrap
  ... // match contains the groups matched by regex
});
```

### Create a Submission Stream

```javascript
const submissionStream = snooStream.submissionStream('all');
// Or if you want to match with a specific regex
const submissionStream = snooStream.submissionStream('all', { regex: /abc/ });

submissionStream.on('submission', (submission, match) => {
  ... // submission is returned directly from Snoowrap
  ... // match contains the groups matched by regex
});
```
