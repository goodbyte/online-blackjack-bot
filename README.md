# Online Blackjack BOT

An online blackjack bot made with Puppeteer and Typescript. [Video](https://youtu.be/szq_B0PrBFw).

![thumbnail](https://user-images.githubusercontent.com/5304800/160318810-6adbce7b-90f8-4217-a816-cd1e9663e16a.png)

## Requirements

This project uses [node](http://nodejs.org) and [npm](https://npmjs.com). Go check them out if you don't have them installed.

## Getting started

First you'll need to create an account on [GamingClub Casino](https://gamingclub.com/), and then set your credentials at `/config/default.json`.

```json
{
  "DRIVER_USERNAME": "username",
  "DRIVER_PASSWORD": "password",
  "PORT": 3000
}
```

and that's about it, install the dependencies and run.

```bash
npm install
npm start
```

When you're ready to start losing money, change the gameURL at `/src/drivers/gamingclub.ts`

```js
const gameURL = `https://secure.gamingclub.com/premium/game-launch/701/demo`; // demo => real
```

## License

[MIT](https://github.com/goodbyte/online-blackjack-bot/blob/master/LICENSE)