import Snoowrap, { SnoowrapOptions } from 'snoowrap';
import pollify, { PollFunction, PollifyOptions } from 'pollify';
import EventEmitter from 'events';

/**
 * Ducktype check for whether obj is a Snoowrap object
 * @param obj The object to ducktype check as a Snoowrap object
 */
function isSnoowrap(obj: any): obj is Snoowrap {
  return typeof obj.getNew == 'function' && typeof obj.getNewComments == 'function';
}

/**
 * Produces an object that can create comment and submission eventStreams.
 * These eventStreams can be provided with a regex so that only posts that match the provided regex will be emitted.
 * @param options Options to initialize Snoowrap
 * @param drift Difference between system time and Reddit's server time. Not required, but can make SnooStream more responsive on startup.
 */
export class SnooStream {
  #startTime: number;
  #snoowrap: Snoowrap;
  #drift: number;

  constructor(options: SnoowrapOptions, drift = 0) {
    this.#snoowrap = isSnoowrap(options) ? options : new Snoowrap(options);
    this.#startTime = Math.floor(Date.now() / 1000);
    this.#drift = drift;
  }

  /**
   * Returns an eventStream that emits 'post' and 'data' events. 'post' events
   * contain new comments that match the provided regex. 'data' events contain all new
   * comments regardless of whether they matched the regex.
   * @param {string} subreddit The subreddit to get new posts from. Default is the 'all' subreddit
   * @param {object} opts Optional. Any options that can be passed to Snoowrap.getNewComments() or Snoowrap.getNew()
   * @param {number} opts.rate The rate at which to poll Reddit. Default is 1000 ms
   * @param {RegExp} opts.regex The pattern to match. Posts that do not match this are
   * ignored.
   * @param {*} opts.* Any other options for Snoowrap.getNewComments() or Snoowrap.getNew()
   */
  commentStream(subreddit: string = 'all', opts?: Omit<PollifyOptions, 'mode'>) {
    const pollFn = this.#snoowrap.getNewComments.bind(this.#snoowrap);
    return this.postStream(pollFn, subreddit, opts);
  }

  submissionStream(subreddit?: string, opts?: Omit<PollifyOptions, 'mode'>) {
    const pollFn = this.#snoowrap.getNew.bind(this.#snoowrap);
    return this.postStream(pollFn, subreddit, opts);
  }

  private postStream(pollFn: PollFunction, subreddit = 'all', opts?: Omit<PollifyOptions, 'mode'>) {
    const cacheObj = { cache: [] };
    const poll = pollify({ rate: opts?.rate || 1000, mode: 'promise' }, pollFn, subreddit, opts);
    poll.on('data', data => {
      data = this.deDupe(data, cacheObj);
      data.filter((post: any) => post.created_utc >= this.#startTime - this.#drift).forEach((post: any) => this.parse(post, poll, opts?.regex as any));
    });

    return poll;
  }

  private parse(data: any, emitter: EventEmitter, regex: string | RegExp) {
    const match = data.body.match(regex);
    if (match) {
      emitter.emit('post', data, match);
    }
  }

  private deDupe(batch: any, cacheObj: any) {
    const diff = batch.filter((entry: any) => cacheObj.cache.every((oldEntry: any) => entry.id !== oldEntry.id));
    cacheObj.cache = batch;
    return diff;
  }
};

