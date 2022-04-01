import Puppet from './puppeteer';
import GameDriver from './drivers/gamingclub';
import {Player} from './player/index';
import statsServer from './stats-server';

init();

async function init() {
  const gamePage = await Puppet.newPage();
  const driver = new GameDriver(gamePage);
  const player = new Player(driver);

  await player.init();

  await statsServer.init(player);
  gamePage.bringToFront();
};