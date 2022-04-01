import http from 'http';
import config from 'config';
import express from 'express';
import {Server} from 'socket.io';
import {Player} from './player';
import Puppet from './puppeteer';

class StatsServer {
  static async init(player: Player) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    const PORT = config.get<number>('PORT');

    io.on('connection', (socket) => {
      const data = Object.fromEntries(
        Object.entries(player)
          .filter(([key]) => key[0] !== '_')
      );

      socket.emit('stats', {...data, isPlaying: player.isPlaying});

      socket.on('toggle', () => {
        player.toggle();
        socket.emit('propertyChanged', {property: 'isPlaying', value: player.isPlaying});
      });

      player.on('propertyChanged', socket.emit.bind(socket, 'propertyChanged'));
      player.on('elementPushed', socket.emit.bind(socket, 'elementPushed'));
    });

    app.use(express.static('public'));

    server.listen(PORT);

    const statsPage = await Puppet.newPage();
    statsPage.goto(`http://localhost:${PORT}`);
  }
}

export default StatsServer;

