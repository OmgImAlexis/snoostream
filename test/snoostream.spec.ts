import { expect } from 'chai';
import { Comment, Submission } from 'snoowrap';
import { SnooStream } from '../src';

/**
 * A mock of Snoowrap.
 * @param drift The number of seconds Reddit is behind system time by.
 */
function SnoowrapMock(drift = 0) {
  const submissions: Partial<Submission>[] = [];
  const comments: Partial<Comment>[] = [];
  return {
    userAgent: 'SnoowrapMock',
    addSubmission(selftext: string, created_utc = timeInSecs() - drift) {
      submissions.push({ selftext, created_utc });
    },
    addComment(body: string, created_utc = timeInSecs() - drift) {
      comments.push({ body, created_utc });
    },
    getNew() {
      return Promise.resolve(submissions);
    },
    getNewComments() {
      return Promise.resolve(comments);
    }
  };
}

function timeInSecs(time = Date.now()) {
  return Math.floor(time / 1000);
}

describe('SnooStream', function () {
  describe('commentStream', function () {
    it('only emits new comments', function (done) {
      const postsMatched: Comment[] = [];
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream();
      commentStream.on('comment', d => postsMatched.push(d));

      for (let i = 1; i <= 5; ++i) {
        snooWrap.addComment('old', timeInSecs(Date.now() - (i * 1000)));
        snooWrap.addComment('new', timeInSecs(Date.now() + (i * 1000)));
      }

      setTimeout(() => {
        expect(postsMatched.every(p => p.body !== 'old')).to.be.true;
        done();
      }, 100);
    });
    it('does not emit duplicates', function (done) {
      const postsMatched: Comment[] = [];
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream('all', { rate: 10 });
      commentStream.on('comment', d => postsMatched.push(d));

      for (let i = 0; i < 5; ++i) {
        snooWrap.addComment(`${i}`);
      }

      setTimeout(() => {
        const dupCheck: number[] = [];
        dupCheck[postsMatched.length - 1] = 0;
        dupCheck.fill(0);

        for (let i = 0; i < postsMatched.length; ++i) {
          dupCheck[parseInt(postsMatched[i].body, 10)]++;
        }
        expect(dupCheck.every(count => count === 1)).to.be.true;
        done();
      }, 100);
    });
    it('can account for drift', function (done) {
      const drift = 1;
      const snooWrap = SnoowrapMock(drift);
      const commentStream = new SnooStream(snooWrap, drift).commentStream('all', { rate: 10 });
      commentStream.on('comment', () => done());
      snooWrap.addComment('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: Comment[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream('all', { regex });
      commentStream.on('comment', d => postsMatched.push(d));

      snooWrap.addComment('asdf asdf sadf abc asdf');
      snooWrap.addComment('qwqwe asdf ewqiopadf');

      setTimeout(() => {
        expect(postsMatched.every(p => !!p.body.match(regex))).to.be.true;
        done();
      }, 100);
    });
  });

  describe('submissionStream', function () {
    it('only emits new submissions', function (done) {
      const postsMatched: Submission[] = [];
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream();
      submissionStream.on('submission', d => postsMatched.push(d));

      for (let i = 1; i <= 5; ++i) {
        snooWrap.addSubmission('old', timeInSecs(Date.now() - (i * 1000)));
        snooWrap.addSubmission('new', timeInSecs(Date.now() + (i * 1000)));
      }

      setTimeout(() => {
        expect(postsMatched.every(p => p.selftext !== 'old')).to.be.true;
        done();
      }, 100);
    });
    it('does not emit duplicates', function (done) {
      const postsMatched: Submission[] = [];
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream('all', { rate: 10 });
      submissionStream.on('submission', d => postsMatched.push(d));

      for (let i = 0; i < 5; ++i) {
        snooWrap.addSubmission(`${i}`);
      }

      setTimeout(() => {
        const dupCheck: number[] = [];
        dupCheck[postsMatched.length - 1] = 0;
        dupCheck.fill(0);

        for (let i = 0; i < postsMatched.length; ++i) {
          dupCheck[parseInt(postsMatched[i].selftext, 10)]++;
        }
        expect(dupCheck.every(count => count === 1)).to.be.true;
        done();
      }, 100);
    });
    it('can account for drift', function (done) {
      const drift = 1;
      const snooWrap = SnoowrapMock(drift);
      const submissionStream = new SnooStream(snooWrap, drift).submissionStream('all', { rate: 10 });
      submissionStream.on('submission', () => done());

      snooWrap.addSubmission('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: Submission[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream('all', { regex });
      submissionStream.on('submission', d => postsMatched.push(d));

      snooWrap.addSubmission('asdf asdf sadf abc asdf');
      snooWrap.addSubmission('qwqwe asdf ewqiopadf');

      setTimeout(() => {
        expect(postsMatched.every(p => !!p.selftext.match(regex))).to.be.true;
        done();
      }, 100);
    });
  });
});
