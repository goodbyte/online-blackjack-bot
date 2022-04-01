import {Card} from './card';

export interface Hands {
  currentHand: 'hand1' | 'hand2';
  hand1: Hand,
  hand2: Hand,
}

export class Hand {
  get numOfCards(): number {
    return this.cards.length;
  }

  get score(): number {
    return this.cards
      .sort((card) => card.val === 11 ? 1 : -1)
      .reduce((acc, card) => {
        const value = card.val;
        return acc += (value === 11 && acc + value > 21) ? 1 : value;
       }, 0);
  }

  get isBlackjack(): boolean {
    const {cards} = this;

    if (cards.length !== 2) return false;

    const firstCard = cards[0];
    const secondCard = cards[1];

    const got10 = firstCard.val === 10 || secondCard.val === 10;
    const gotAce = firstCard.val === 11 || secondCard.val === 11;

    return got10 && gotAce;
  }

  get hasPairs(): boolean {
    const {cards} = this;

    if (cards.length !== 2) return false;

    return cards[0].desc === cards[1].desc;
  }

  get isSoft(): boolean {
    if (this.cards.length !== 2) return false;

    return this.cards.some((card) => card.val === 11);
  }

  constructor(public cards: Card[]) {}

  pairsOf(): number {
    if (!this.hasPairs) throw new Error('"pairsOf" called without a pairs hand');

    return this.cards[0].val;
  }

  softOf(): number {
    if (!this.isSoft) throw new Error('"softOf" called without a soft hand');

    const firstCard = this.cards[0];
    const secondCard = this.cards[1];

    return firstCard.val === 11 ? secondCard.val : firstCard.val;
  }

  addCard(card: Card) {
    this.cards.push(card);
  }

  reset() {
    this.cards = [];
  }
}