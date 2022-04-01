import {EventEmitter} from 'events';
import {Hand} from './hand';
import {Card} from './card';
import {Actions} from './actions';
import {
  Plays,
  hard as hardStrategy,
  soft as softStrategy,
  pairs as pairsStrategy,
} from './strategy';

interface Driver extends EventEmitter {
  minBet: number;
  maxBet: number;
  isPlaying: boolean;
  init(): Promise<void>,
  start(): void,
  stop(): void,
  balance(): Promise<number>;
  bet(amount: number): Promise<void>;
  dealerCard(): Promise<Card>;
  playingHand(): Promise<Hand>;
  availableActions(): Promise<Actions>;
}

type PlayActions = {
  [K in Plays]: () => Promise<void>;
}

type StreakPosition = {
  start: number;
  end: number;
}

type StreakLog = {
  count: number;
  position: StreakPosition[];
}

type StreakLogs = {
  win: StreakLog[];
  loss: StreakLog[];
}

type PlayChart = {
  x: string;
  balance: number;
}

export interface Player {
  on(event: 'propertyChanged' | 'elementPushed', listener: (...args: any[]) => void): this;
  emit(event: 'propertyChanged', data: {property: string, value: any}): boolean;
  emit(event: 'elementPushed', data: {arrayName: string, element: any}): boolean;
}

export class Player extends EventEmitter {
  betIndex = 0;
  betList = [1, 1, 1, 1, 5, 10, 20, 1];
  lastBet = 0;
  initialBalance = 0;
  lowestBalance = 0;
  highestBalance = 0;
  playNumber = 0;
  currentBalance = 0;
  lastBalance = 0;
  wins = 0;
  draws = 0;
  losses = 0;
  playChart: PlayChart[] = [];
  lossStreak = 0;
  winStreak = 0;
  lossStreakRecord = 0;
  winStreakRecord = 0;
  streakLogs: StreakLogs = {
    win: [],
    loss: [],
  };

  constructor(private _game: Driver) {
    super();

    const proxy = new Proxy(this, {
      set(target: any, property, value) {
        target.emit('propertyChanged', {property, value});
        target[property] = value;
        return true;
      },
    });

    this._game.on('bet', this.bet.bind(proxy));
    this._game.on('play', this.play.bind(proxy));

    return proxy;
  }

  get isPlaying() {
    return this._game.isPlaying;
  }

  setLastBalance(balance: number) {
    if (balance < this.lowestBalance) this.lowestBalance = balance;
    else if (balance > this.highestBalance) this.highestBalance = balance;

    this.lastBalance = balance;
  }

  streakLogging(streakType: 'win' | 'loss') {
    const streakName = streakType === 'win' ? 'winStreak' : 'lossStreak';
    const streakNumber = this[streakName];

    if (streakNumber > 0) {
      if (this.streakLogs[streakType][streakNumber] == undefined) {
        this.streakLogs[streakType][streakNumber] = {
          count: 0,
          position: [],
        };
      }

      const streakLog = this.streakLogs[streakType][streakNumber];
      streakLog.count++;
      streakLog.position.push({
        start: this.playNumber - streakNumber - 1,
        end: this.playNumber - 1,
      });

      this.emit('propertyChanged', {
        property: 'streakLogs',
        value: this.streakLogs,
      });

      this[streakName] = 0;
    }
  }

  addWin() {
    this.wins++;
    this.winStreak++;

    this.streakLogging('loss');

    if (this.winStreak > this.winStreakRecord) {
      this.winStreakRecord = this.winStreak;
    }
  }

  addLose() {
    this.losses++;
    this.lossStreak++;

    this.streakLogging('win');

    if (this.lossStreak > this.lossStreakRecord) {
      this.lossStreakRecord = this.lossStreak;
    }
  }

  async init() {
    await this._game.init();

    this.initialBalance = await this._game.balance();
    this.currentBalance = this.lowestBalance = this.highestBalance = this.initialBalance;

    if (this.betList[this.betIndex] < this._game.minBet) {
      throw new Error(`initial bet value is lower than minBet`)
    }
  }

  start() {
    this._game.start();
  }

  stop() {
    this._game.stop();
  }

  toggle() {
    this.isPlaying ? this.stop() : this.start();
  }

  async bet() {
    this.currentBalance = await this._game.balance();
    const lostBalance = this.currentBalance - this.lastBalance;

    // win/lose checker
    if (this.lastBalance) {                     // to skip the first game
      this.playNumber++;
      if (lostBalance > 0) this.addWin();
      else if (lostBalance === 0) this.draws++;
      else if (lostBalance < 0) this.addLose();

      const playObj = {
        x: this.playNumber.toString(),
        balance: this.currentBalance - this.initialBalance,
      };

      this.playChart.push(playObj);
      this.emit('elementPushed', {arrayName: 'playChart', element: playObj});
    }

    if (this.lossStreak) {
      this.betIndex = this.lossStreak > this.betList.length - 1 ?
        this.betList.length - 1 :
        this.lossStreak;
    } else {
      this.betIndex = 0;
    }

    let resultBet = this.betList[this.betIndex];

    if (resultBet > this.currentBalance) {
      if (this.currentBalance >= this._game.minBet) {
        console.warn('all in :(');
        resultBet = this.currentBalance;
      } else {
        console.error('game over');
        process.exit();
      }
    }

    this.lastBet = resultBet;
    this.setLastBalance(this.currentBalance);

    this._game.bet(resultBet);
  }

  async play() {
    const [dealerCard, hand, actions] = await Promise.all([
      this._game.dealerCard(),
      this._game.playingHand(),
      this._game.availableActions(),
    ]);

    const dealerScore = dealerCard.val;
    const availablePlays: PlayActions = {
      'S': actions.stand,
      'H': actions.hit,
      'D': actions.double,
      'T': actions.split,
    };

    let handScore = hand.score;
    let strategy = hardStrategy;

    if (hand.hasPairs) {
      strategy = pairsStrategy;
      handScore = hand.pairsOf();
    } else if (hand.isSoft) {
      strategy = softStrategy;
      handScore = hand.softOf();
    } else if (handScore >= 17) {
      return actions.stand();
    }

    let play = strategy[handScore][dealerScore]; // = (S|H|D|T)

    if (!play) throw this.noStrategyFoundError(hand, dealerScore);

    if (availablePlays[play]) {
      availablePlays[play]();
    } else {
      if (play === 'D') {
        actions.hit();
      } else if (play === 'T') {
        handScore = hand.score;

        if (handScore >= 17) {
          actions.stand();
        } else {
          play = hardStrategy[handScore][dealerScore];

          if (!play) throw this.noStrategyFoundError(hand, dealerScore);

          if (availablePlays[play]) {
            availablePlays[play]();
          } else if (play === 'D') {
            actions.hit();
          } else {
            actions.stand();
          }
        }
      } else {
        throw new Error(`could not perform action ${play}`);
      }
    }
  }

  private noStrategyFoundError(hand: Hand, dealerScore: number) {
    const cards = hand.cards.map((card) => card.desc).join(', ');
    return new Error(
      `no strategy found for a hand of ${cards} with a score of ${hand.score} and a dealer card value of ${dealerScore}`
    );
  }
}