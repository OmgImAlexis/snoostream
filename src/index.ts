import Snoowrap, { SnoowrapOptions, Comment, Submission } from 'snoowrap';
import pollify, { PollFunction, Pollify, PollifyOptions } from 'pollify';
import EventEmitter from 'events';

/**
 * Check if an object is an instance of Snoowrap.
 */
function isSnoowrap(obj: Record<string, any>): obj is Snoowrap {
  const isSnoowrapInstance = obj instanceof Snoowrap;
  const isSnoowrapMock = typeof obj === 'object' && typeof (obj as Snoowrap).getNew === 'function' && typeof (obj as Snoowrap).getNewComments === 'function';
  return isSnoowrapInstance || isSnoowrapMock;
}

interface CommentEvent<Data> {
  'comment': (data: Data, startTime: number) => void;
};

interface SubmissionEvent<Data> {
  'submission': (data: Data, startTime: number) => void;
};

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
   * Returns an eventStream that emits `'comment'` and `'data'` events.
   * `'comment'` events contain new comments that match the provided regex.
   * `'data'` events contain all new comments regardless of whether they matched the regex.
   * @param subreddit The subreddit to get new posts from. Default is the `'all'` subreddit.
   * @param opts Any options that can be passed to `Snoowrap.getNewComments()`.
   * @param opts.rate The rate at which to poll Reddit. Default is 1000 ms
   * @param opts.regex The pattern to match. Posts that do not match this are ignored.
   * @param opts Any other options for `Snoowrap.getNewComments()`
   */
  commentStream(subreddit: string = 'all', opts?: Omit<PollifyOptions, 'mode'>) {
    const pollFn = this.#snoowrap.getNewComments.bind(this.#snoowrap) as unknown as PollFunction<Comment[]>;
    return this.parseStream(pollFn, 'comment', subreddit, opts);
  }

  /**
   * Returns an eventStream that emits `'submission'` and `'data'` events.
   * `'submission'` events contain new submissions that match the provided regex.
   * `'data'` events contain all new submissions regardless of whether they matched the regex.
   * @param subreddit The subreddit to get new posts from. Default is the `'all'` subreddit.
   * @param opts Any options that can be passed to `Snoowrap.getNew()`.
   * @param opts.rate The rate at which to poll Reddit. Default is `1000`ms.
   * @param opts.regex The pattern to match. Posts that do not match this are ignored.
   * @param opts Any other options for `Snoowrap.getNew()`
   */
  submissionStream(subreddit: string = 'all', opts?: Omit<PollifyOptions, 'mode'>) {
    const pollFn = this.#snoowrap.getNew.bind(this.#snoowrap) as unknown as PollFunction<Submission[]>;
    return this.parseStream(pollFn, 'submission', subreddit, opts);
  }

  private parseStream(pollFn: PollFunction<(Comment)[]>, type: 'comment', subreddit: string, opts?: Omit<PollifyOptions, 'mode'>): Pollify<Comment[], CommentEvent<Comment>>;
  private parseStream(pollFn: PollFunction<(Submission)[]>, type: 'submission', subreddit: string, opts?: Omit<PollifyOptions, 'mode'>): Pollify<Submission[], SubmissionEvent<Submission>>;
  private parseStream(pollFn: PollFunction<(Comment | Submission)[]>, type: 'comment' | 'submission', subreddit = 'all', opts?: Omit<PollifyOptions, 'mode'>): unknown {
    // Validation
    if (typeof subreddit !== 'string') throw new TypeError(`"subreddit" value of "${subreddit}" must be a string, not ${typeof subreddit}.`);
    if (subreddit.length < 2) throw new TypeError(`"subreddit" must be at least 2 characters, "${subreddit}" is invalid`);

    const cacheObject = { cache: [] };
    const poll = pollify<(Comment | Submission)[], CommentEvent<(Comment | Submission)[]> | SubmissionEvent<(Comment | Submission)>>({ rate: opts?.rate || 1000, mode: 'promise' }, pollFn, subreddit, opts);
    poll.on('data', data => {
      data = this.deDupe(data, cacheObject);
      data.filter(item => item.created_utc >= this.#startTime - this.#drift).forEach(item => this.parse(type, item, poll, opts?.regex!));
    });

    return poll;
  }

  private parse(type: 'comment' | 'submission', data: Comment | Submission, emitter: EventEmitter, regex: string | RegExp) {
    const match = type === 'comment' ? (data as Comment).body.match(regex) : (data as Submission).selftext.match(regex);
    if (match) {
      emitter.emit(type, data, match);
    }
  }

  private deDupe(batch: (Comment | Submission)[], cacheObject: { cache: (Comment | Submission)[] }) {
    const diff = batch.filter(entry => cacheObject.cache.every(oldEntry => entry.id !== oldEntry.id));
    cacheObject.cache = batch;
    return diff;
  }
}
