import { expect } from 'chai';
import { Submission } from 'snoowrap';
import { SnooStream } from '../src';

/**
 * A mock Snoowrap replacement. Works due to ducktyping
 * @param {Number} [drift=0] the number of seconds reddit is behind system time by
 */
function SnoowrapMock (drift = 0) {
  const posts: any[] = [];
  return {
    userAgent: 'SnoowrapMock',
    get posts() {
      return posts;
    },
    addPost (body: any, created_utc = timeInSecs() - drift) {
      this.posts.push({ body, created_utc });
    },
    getNew () {
      return Promise.resolve(this.posts);
    },
    getNewComments () {
      return Promise.resolve(this.posts);
    }
  };
}

function timeInSecs (time = Date.now()) {
  return Math.floor(time / 1000);
}

describe('SnooStream', function () {
  describe('commentStream', function () {
    it('only emits new comments', function (done) {
      const postsMatched: any[] = [];
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
      const postsMatched: any[] = [];
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream('', { rate: 10 });
      commentStream.on('comment', d => postsMatched.push(d));

      for (let i = 0; i < 5; ++i) {
        snooWrap.addPost('' + i);
      }

      setTimeout(() => {
        const dupCheck = [];
        dupCheck[postsMatched.length - 1] = '';
        dupCheck.fill('');

        for (let i = 0; i < postsMatched.length; ++i) {
          (dupCheck[postsMatched[i].body] as unknown as number)++;
        }
        expect(dupCheck.every((count: any) => count === 1)).to.be.true;
        done();
      }, 100);
    });
    it('can account for drift', function (done) {
      const drift = 1;
      const snooWrap = SnoowrapMock(drift);
      const commentStream = new SnooStream(snooWrap, drift).commentStream('', { rate: 10 });
      commentStream.on('comment', () => done());

      snooWrap.addPost('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: any[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const commentStream = new SnooStream(snooWrap).commentStream('', { regex });
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
    it('only emits new submssions', function (done) {
      const postsMatched: any[] = [];
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream();
      submissionStream.on('submission', d => postsMatched.push(d));

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
      const postsMatched: any[] = [];
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream('', { rate: 10 });
      submissionStream.on('submission', d => postsMatched.push(d));

      for (let i = 0; i < 5; ++i) {
        snooWrap.addPost('' + i);
      }

      setTimeout(() => {
        const dupCheck = [];
        dupCheck[postsMatched.length - 1] = '';
        dupCheck.fill('');

        for (let i = 0; i < postsMatched.length; ++i) {
          (dupCheck[postsMatched[i].body] as unknown as number)++;
        }
        expect(dupCheck.every((count: any) => count === 1)).to.be.true;
        done();
      }, 100);
    });
    it('can account for drift', function (done) {
      const drift = 1;
      const snooWrap = SnoowrapMock(drift);
      const submissionStream = new SnooStream(snooWrap, drift).submissionStream('', { rate: 10 });
      submissionStream.on('submission', () => done());

      snooWrap.addPost('will only be emitted if drift is accounted for');
    });
    it('limits post events to posts that match regex', function (done) {
      const postsMatched: any[] = [];
      const regex = /abc/;
      const snooWrap = SnoowrapMock();
      const submissionStream = new SnooStream(snooWrap).submissionStream('', { regex });
      submissionStream.on('submission', d => postsMatched.push(d));

      snooWrap.addPost('asdf asdf sadf abc asdf');
      snooWrap.addPost('qwqwe asdf ewqiopadf');

      setTimeout(() => {
        expect(postsMatched.every(p => !!p.body.match(regex))).to.be.true;
        done();
      }, 100);
    });
  });
});
