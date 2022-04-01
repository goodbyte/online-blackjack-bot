type CardDesc = '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | 'J' | 'Q' | 'K' | 'A';
type CardVal = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

const str2val: {[key in CardDesc]: CardVal} = {
  '02': 2,
  '03': 3,
  '04': 4,
  '05': 5,
  '06': 6,
  '07': 7,
  '08': 8,
  '09': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'A': 11,
};

export class Card {
  desc: CardDesc;
  val: CardVal;

  constructor(card: string) {
    if (!Object.keys(str2val).includes(card)) {
      throw new Error(`failed to convert card "${card}"`);
    }

    this.desc = card as CardDesc;
    this.val = str2val[this.desc];
  }
}