import {EventEmitter} from 'events';
import config from 'config';
import {Page, Frame} from 'puppeteer';
import {Hand, Hands} from '../player/hand';
import {Actions} from '../player/actions';
import {Card} from '../player/card';

type Event = 'bet' | 'play';

interface Chip {
  quantity: number;
  chipIndex: number;
  chipValue: number;
}

class GameDriver extends EventEmitter {
  private _iframe: Frame | undefined;
  private _eventManagerHnd: NodeJS.Timeout | undefined;
  private _running = false;
  private _lastEvent: Event | undefined;
  private _chips: number[] | undefined;
  private _cardCount = 0;
  private _minBet: number | undefined;
  private _maxBet: number | undefined;

  constructor(private _page: Page) {
    super();
  }

  emit(event: Event, ...args: any[]): boolean {
    this._lastEvent = event;
    return super.emit(event, ...args);
  }

  private randomDelay(min: number = 55, max: number = 75) {
    if (min >= max) throw new RangeError('min value should be less than max value');
    return Math.round(min + (Math.random() * (max - min)));
  }

  private async checkReadyToBet() {
    const checkReBet = this.iframe.waitForSelector('a.buttonRebet', {visible: true, timeout: 0});
    const checkDealButton = this.iframe.waitForSelector('a.buttonDeal', {visible: true, timeout: 0});
    const checkEmptyBoard = this.iframe.waitForFunction(() => {
      const noCards = !document.querySelector('#Player1 .Hand1 .Cards .card > [class^="card_"]');
      const isButtonDealHidden = document.querySelector<HTMLElement>('a.buttonDeal')?.style.display === 'none';

      return noCards && isButtonDealHidden;
    });

    await Promise.race([
      checkEmptyBoard,
      checkReBet,
      checkDealButton,
    ]);

    await this.iframe.waitForTimeout(this.randomDelay(250, 500));

    return 'bet';
  }

  private async checkInsurance() {
    await this.iframe.waitForSelector('a.buttonInsuranceNo', {visible: true, timeout: 0});
    await this.iframe.waitForTimeout(this.randomDelay(250, 500));

    return 'insurance';
  }

  private async checkReadyToPlay() {
    await this.iframe.waitForFunction((lastCardCount: number) => {
      const playerHand1El = document.querySelectorAll('#Player1 .Hand1 .Cards .card > [class^="card_"]');
      const playerHand2El = document.querySelectorAll('#Player1 .Hand2 .Cards .card > [class^="card_"]');
      const cardRegExp = /card_(S|D|C|H)(02|03|04|05|06|07|08|09|10|J|Q|K|A)/;

      const countCards = (cardEl: Element) => {
        const match = cardEl.classList.value.match(cardRegExp);
        if (match) cardCount++;
      };

      let cardCount = 0;

      if (playerHand1El) playerHand1El.forEach(countCards);
      if (playerHand2El) playerHand2El.forEach(countCards);

      return cardCount > lastCardCount;
    }, {polling: 'mutation', timeout: 0}, this._cardCount);

    await Promise.all([
      this.iframe.waitForSelector('a.buttonStand', {visible: true, timeout: 0}),
      this.iframe.waitForSelector('a.buttonHit', {visible: true, timeout: 0}),
    ]);

    await this.iframe.waitForTimeout(this.randomDelay(250, 500));

    return 'play';
  }

  private async checkPlaying() {
    await this.iframe.waitForFunction(() => {
      const playerCardEl = document.querySelector('#Player1 .Hand1 .Cards .card > [class^="card_"]');
      const cardRegExp = /card_(S|D|C|H)(02|03|04|05|06|07|08|09|10|J|Q|K|A)/;
      const hasPlayerCard = playerCardEl?.classList.value.match(cardRegExp);

      const isHidden = (selector: string) => {
        return document.querySelector<HTMLElement>(selector)?.style.display === 'none';
      }

      const isReBetHidden = isHidden('a.buttonRebet');
      const isStandHidden = isHidden('a.buttonStand');
      const isInsuranceHidden = isHidden('a.buttonInsuranceNo');

      return hasPlayerCard && isReBetHidden && isStandHidden && isInsuranceHidden;
    });

    return 'playing';
  }

  private click(selector: string) {
    return this.iframe.click(selector, {delay: this.randomDelay()});
  }

  private async eventManager() {
    const state = await Promise.race([
      this.checkReadyToBet(),
      this.checkInsurance(),
      this.checkReadyToPlay(),
      this.checkPlaying(),
    ]);

    switch (state) {
      case 'bet':
        if (this._lastEvent !== 'bet') {
          this._cardCount = 0;
          this.emit('bet');
        }
        break;
      case 'insurance':
        await this.click('a.buttonInsuranceNo');
        break;
      case 'play':
        this._cardCount = await this.playerCardCount();
        this.emit('play');
        break;
      case 'playing':
        if (this._lastEvent !== 'play') {
          this._lastEvent = 'play';
        }
        break;
    }

    if (this._running) {
      this._eventManagerHnd = setTimeout(this.eventManager.bind(this), 1000);
    }
  }

  async init() {
    const casinoURL = 'https://www.gamingclub.com';
    const gameURL = 'https://secure.gamingclub.com/premium/game-launch/701/demo'; // demo => real

    const DRIVER_USERNAME = config.get<string>('DRIVER_USERNAME');
    const DRIVER_PASSWORD = config.get<string>('DRIVER_PASSWORD');

    await this._page.goto(casinoURL);

    const isNotAuthenticated = await this._page.$('a[data-info="Login"]');

    if (isNotAuthenticated) {
      await this._page.click(`a[data-info="Login"]`, {
        delay: this.randomDelay(),
      });
      await this._page.waitForSelector('#Login_Username', {visible: true});
      await this._page.waitForTimeout(2000);
      await this._page.$eval('#Login_Username', (el) => (el as HTMLInputElement).value = '');
      await this._page.type('#Login_Username', DRIVER_USERNAME, {delay: this.randomDelay()});
      await this._page.keyboard.press('Tab', {delay: this.randomDelay()});
      await this._page.type('#Login_Password', DRIVER_PASSWORD, {delay: this.randomDelay()});
      await this._page.keyboard.press('Tab', {delay: this.randomDelay()});
      await this._page.waitForFunction(() => {
        const u = document.evaluate('//*[@id="Login_Username"]/parent::*[contains(@class, "form-input-success")]', document);
        const p = document.evaluate('//*[@id="Login_Password"]/parent::*[contains(@class, "form-input-success")]', document);
        return u && p;
      }, {polling: 'mutation'});
      await this._page.click('[data-info="Remember Me"]', {delay: this.randomDelay()});
      await this._page.click('#Login_Submit', {delay: this.randomDelay()});
    } else {
      await this._page.waitForNavigation();
    }

    await this._page.waitForSelector('.navbar-item-profile [data-info="Username"]');
    await this._page.goto(gameURL);
    await this._page.waitForSelector('iframe#lobby-game-iframe');

    const iframeEl = await this._page.$('iframe#lobby-game-iframe');
    if (!iframeEl) throw new Error('lobby-game-iframe not found');

    const iframe = await iframeEl.contentFrame();
    if (!iframe) throw new Error('could not access iframe content frame');

    this._iframe = iframe;

    await this.iframe.waitForSelector('#preloader', {visible: true});
    await this.iframe.waitForSelector('#preloader', {hidden: true});

    const minMaxBet = await this.iframe.evaluate(() => {
      const minBetEl = document.querySelector('#minBetValue')?.textContent;
      const maxBetEl = document.querySelector('#maxBetValue')?.textContent;

      return [minBetEl, maxBetEl];
    });

    const minBet = Number(minMaxBet[0]);
    const maxBet = Number(minMaxBet[1]);

    if (
      (!minBet || Number.isNaN(minBet)) ||
      (!maxBet || Number.isNaN(maxBet))
    ) {
      throw new Error('minBet/maxBet are not valid numbers');
    }

    this._minBet = minBet;
    this._maxBet = maxBet;

    const chips = await this.iframe.evaluate(() => {
      const chipsEl = document.querySelectorAll('div.ChipInPanel[class*="chip"]');
      const chips: string[] = [];

      chipsEl.forEach((chipEl) => {
        const match = chipEl.classList.value.match(/chip(\d+)/);
        if (match) chips.push(match[0].replace('chip', ''));
      });

      return chips;
    });

    if (!chips.length) throw new Error('chips are empty');

    this._chips = chips.map((chip) => {
      const value = Number(chip);

      if (!value || Number.isNaN(value)) {
        throw new Error('chip value is not a valid number');
      }

      return value;
    });
  }

  start() {
    this._running = true;
    this.eventManager();
  }

  stop() {
    this._running = false;
    if (this._eventManagerHnd) clearTimeout(this._eventManagerHnd);
  }

  get isPlaying() {
    return this._running;
  }

  get minBet() {
    if (!this._minBet) throw new Error('min bet is undefined');
    return this._minBet;
  }

  get maxBet() {
    if (!this._maxBet) throw new Error('max bet is undefined');
    return this._maxBet;
  }

  private get chips() {
    if (!this._chips?.length) throw new Error('chips is undefined or empty');
    return this._chips;
  }

  private get iframe() {
    if (!this._iframe) throw new Error('iframe is undefined');
    return this._iframe;
  }

  private elementExists(selector: string): Promise<boolean> {
    return this.iframe.evaluate((selector) => {
      const el = document.querySelector<HTMLElement>(selector);

      if (!el) return false;

      const isVisible = el.style.display !== 'none' && el.style.visibility !== 'hidden';

      return isVisible;
    }, selector);
  }

  async balance(): Promise<number> {
    const balance = Number(
      await this.iframe.$eval('#BalanceValue', (el) => el.textContent?.replace(/\$|,/g, ''))
    );

    if (Number.isNaN(balance)) throw new Error('balance is not a valid number');

    return balance;
  }

  async dealerCard(): Promise<Card> {
    const card = await this.iframe.evaluate(() => {
      const cardEl = document.querySelector('#Dealer .Cards .card > [class^="card_"]');
      const cardRegExp = /card_(S|D|C|H)(02|03|04|05|06|07|08|09|10|J|Q|K|A)/;
      const match = cardEl?.classList.value.match(cardRegExp);

      if (match) return match[0].slice(6);
    });

    if (!card) throw new Error(`could not found dealer's card`);

    return new Card(card);
  }

  private async playerCardCount(): Promise<number> {
    return this.iframe.evaluate(() => {
      const playerHand1El = document.querySelectorAll('#Player1 .Hand1 .Cards .card > [class^="card_"]');
      const playerHand2El = document.querySelectorAll('#Player1 .Hand2 .Cards .card > [class^="card_"]');
      const cardRegExp = /card_(S|D|C|H)(02|03|04|05|06|07|08|09|10|J|Q|K|A)/;

      const countCards = (cardEl: Element) => {
        const match = cardEl.classList.value.match(cardRegExp);
        if (match) cardCount++;
      };

      let cardCount = 0;

      if (playerHand1El) playerHand1El.forEach(countCards);
      if (playerHand2El) playerHand2El.forEach(countCards);

      return cardCount;
    });
  }

  async playerHands(): Promise<Hands> {
    const playerHands = await this.iframe.evaluate(() => {
      const hand1El = document.querySelector('#Player1 .Hand1');
      const hand2El = document.querySelector('#Player1 .Hand2');
      const cardRegExp = /card_(S|D|C|H)(02|03|04|05|06|07|08|09|10|J|Q|K|A)/;
      const cardsSelector = '.Cards .card > [class^="card_"]';

      const result: any = {
        currentHand: 'hand1',
        hand1: [],
        hand2: [],
      };

      const cardMatchFn = (hand: 'hand1' | 'hand2') => {
        return (cardEl: Element) => {
          const match = cardEl.classList.value.match(cardRegExp);

          if (match) {
            const card = match[0].slice(6);
            result[hand].push(card);
          }
        };
      };

      if (hand1El) {
        const hand1CardsEl = hand1El.querySelectorAll(cardsSelector);
        hand1CardsEl.forEach(cardMatchFn('hand1'));
      }

      if (hand2El) {
        const hand2CardsEl = hand2El.querySelectorAll(cardsSelector);
        const isHand2Active = hand2El.hasAttribute('activehand');

        if (isHand2Active) result.currentHand = 'hand2';

        hand2CardsEl.forEach(cardMatchFn('hand2'));
      }

      return result;
    });

    if (!playerHands.hand1.length) throw new Error('player hand1 is empty');

    if (playerHands.currentHand === 'hand2' && !playerHands.hand2.length) {
      throw new Error(`player hand2 is empty`);
    }

    const result: Hands = {
      currentHand: playerHands.currentHand,
      hand1: new Hand(
        playerHands.hand1.map((card: string) => new Card(card))
      ),
      hand2: new Hand(
        playerHands.hand2.map((card: string) => new Card(card))
      ),
    };

    return result;
  }

  async playingHand(): Promise<Hand> {
    const hands = await this.playerHands();
    return hands[hands.currentHand];
  }

  private stand() {
    return this.click('a.buttonStand');
  }

  private hit() {
    return this.click('a.buttonHit');
  }

  private double() {
    return this.click('a.buttonDouble');
  }

  private split() {
    return this.click('a.buttonSplit');
  }

  async availableActions(): Promise<Actions> {
    const [isStand, isHit, isDouble, isSplit] = await Promise.all([
      this.elementExists('a.buttonStand'),
      this.elementExists('a.buttonHit'),
      this.elementExists('a.buttonDouble'),
      this.elementExists('a.buttonSplit'),
    ]);

    const actions: Partial<Actions> = {
      ...(isStand && {stand: this.stand.bind(this)}),
      ...(isHit && {hit: this.hit.bind(this)}),
      ...(isDouble && {double: this.double.bind(this)}),
      ...(isSplit && {split: this.split.bind(this)}),
    };

    return actions as Actions;
  }

  async bet(amount: number) {
    if (Number.isNaN(amount)) throw new Error('bet amount is not a valid number');

    if (amount < this.minBet) throw new Error('bet amount is less than min bet');
    if (amount > this.maxBet) throw new Error('bet amount is greater than max bet');

    const isReBet = await this.elementExists('a.buttonRebet');
    if (isReBet) {
      await this.click('a.buttonRebet');
      await this.iframe.waitForSelector('a.buttonDeal', {visible: true, timeout: 5000});
    }

    let betValue = (await this.betValue()) || 0;

    if (betValue > amount) {
      await this.iframe.waitForTimeout(this.randomDelay(250, 500));
      await this.click('a.buttonClearBets');
    }

    const chipsToBet: Array<Chip> = [];
    const minChip = this.chips[0];

    let rest = amount - (betValue > amount ? 0 : betValue);
    while (rest >= minChip) {
      for (let chipIndex = this.chips.length - 1; chipIndex >= 0; chipIndex--) {
        const chipValue = this.chips[chipIndex];
        const quotient = rest / chipValue;

        if (quotient < 1) continue;

        const quantity = Math.floor(quotient);
        chipsToBet.push({quantity, chipIndex, chipValue});
        rest -= quantity * chipValue;
      }
    }

    const getChipPanelIndex = async () => {
      const index = await this.iframe.evaluate(() => {
        const indexString = document.querySelector('div.ChipsPanel')?.getAttribute('index');

        if (indexString) {
          return parseInt(indexString);
        }
      });

      if (!index) throw new Error('chip panel index is undefined');
      if (Number.isNaN(index)) throw new Error('chip panel index is not a valid number');

      return index;
    };

    for (const chipToBet of chipsToBet) {
      const {quantity, chipIndex} = chipToBet;

      const index = chipIndex + 1;
      let chipPanelIndex = await getChipPanelIndex();

      while (chipPanelIndex !== index) {
        const btn = chipPanelIndex > index ? 'lowerBetButton' : 'upBetButton';

        this.click(`div.${btn}`);
        await this.iframe.waitForSelector(`div.${btn}.pressed`);
        await this.iframe.waitForSelector(`div.${btn}:not(.pressed)`);

        await this.iframe.waitForTimeout(this.randomDelay(70, 150));
        chipPanelIndex = await getChipPanelIndex();
      }

      for (let i = 0; i < quantity; i++) {
        await this.click('div.tapToPlaceBets');
        await this.iframe.waitForTimeout(this.randomDelay(70, 150));
      }
    }

    await this.iframe.waitForTimeout(this.randomDelay(400, 750));
    await this.click('a.buttonDeal');
  }

  private async betValue(): Promise<number> {
    const betValue = Number(
      await this.iframe.$eval('.BetChips .betValueWrap span.betValue', (el) => {
        return el.textContent?.replace(/\$|,/g, '');
      })
    );

    return betValue;
  }
}

export default GameDriver;