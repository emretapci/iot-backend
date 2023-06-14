import net from 'net';
import express from 'express';
import fs from 'fs';

const server = net.createServer();

let connection;

const handleConnection = conn => {
  const remoteAddress = `${conn.remoteAddress}:${conn.remotePort}`;
  console.log(`New client connection from ${remoteAddress} at ${new Date(Date.now()).toLocaleString()}`);

  connection = conn;

  connection.on('close', () => {
    console.log('disconnected');
    connection = null;
  });
}

server.on('connection', handleConnection);

server.on('error', console.log);

server.listen(9876, () => {
  console.log('Server is listening');
});

const app = express();

app.get('/', (req, res) => {
  fs.readFile('./frontend.html', (err, html) => {
    res.set('Content-type', 'text/html; charset=utf-8');
    res.send(html);
  });
});

app.get('/be', (req, res) => {
  if (connection) {
    connection.write('s');
    res.json({
      success: true
    });
  }
  else {
    res.json({
      success: false,
      reason: 'no connection'
    });
  }
});

const getConfig = () => Promise.race(
  [
    new Promise(resolve => {
      if (!connection) {
        resolve({
          success: false,
          reason: 'no connection'
        });
        return;
      }
      const buffer = Buffer.alloc(4);
      let offset = 0;
      const dataHandler = data => {
        data.copy(buffer, offset, 0);
        offset += data.length;
        if (offset == 4) {
          connection.removeListener('data', dataHandler);
          console.log('resolved');
          resolve({
            success: true,
            startIntervalMs: buffer.readInt16LE(0),
            pin: buffer.readInt8(2)
          });
        }
      }
      connection.on('data', dataHandler);
      connection.write('?');
    }),
    new Promise(resolve => {
      setTimeout(() => resolve({
        success: false,
        reason: 'timeout while reading from device'
      }), 2000);
    })
  ]
);

app.get('/be/s', async (req, res) => {
  if (!connection) {
    res.json({
      success: false,
      reason: 'no connection'      
    });
    return;
  }

  const buffer = Buffer.alloc(4);
  buffer.write('*');
  buffer.writeInt16LE(req.query.startIntervalMs, 1);
  buffer.writeInt8(req.query.pin, 3);
  connection.write(buffer);
  res.json(await getConfig());
});

app.get('/be/q', async (req, res) => {
  console.log('requested');
  res.json(await getConfig());
});

app.listen(9877);
