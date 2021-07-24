import { expect } from 'chai';
import { Comment, Submission } from 'snoowrap';
import { SnooStream } from '../src';

/**
 * A mock of Snoowrap.
 * @param drift The number of seconds Reddit is behind system time by.
 */
function SnoowrapMock(drift = 0) {
  const posts: Partial<Submission | Comment>[] = [];
  return {
    userAgent: 'SnoowrapMock',
    get posts() {
      return posts;
    },
    addPost(body: string, created_utc = timeInSecs() - drift) {
      this.posts.push({ selftext: body, body, created_utc });
    },
    getNew() {
      return Promise.resolve(this.posts);
    },
    getNewComments() {
      return Promise.resolve(this.posts);
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
        snooWrap.addPost('old', timeInSecs(Date.now() - (i * 1000)));
        snooWrap.addPost('new', timeInSecs(Date.now() + (i * 1000)));
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
        snooWrap.addPost(`${i}`);
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

      snooWrap.addPost('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: Comment[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream('all', { regex });
      commentStream.on('comment', d => postsMatched.push(d));

      snooWrap.addPost('asdf asdf sadf abc asdf');
      snooWrap.addPost('qwqwe asdf ewqiopadf');

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
        snooWrap.addPost('old', timeInSecs(Date.now() - (i * 1000)));
        snooWrap.addPost('new', timeInSecs(Date.now() + (i * 1000)));
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
        snooWrap.addPost(`${i}`);
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

      snooWrap.addPost('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: Submission[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream('all', { regex });
      submissionStream.on('submission', d => postsMatched.push(d));

      snooWrap.addPost('asdf asdf sadf abc asdf');
      snooWrap.addPost('qwqwe asdf ewqiopadf');

      setTimeout(() => {
        expect(postsMatched.every(p => !!p.selftext.match(regex))).to.be.true;
        done();
      }, 100);
    });
  });
});
