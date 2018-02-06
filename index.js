const fslib = require('fs');
const WebSocket = require('ws');

const pSingle = f => (...args) => new Promise((resolve, reject) => f(...args, (err, res) => err ? reject(err) : resolve(res)))

const fs = {
  writeFile: pSingle(fslib.writeFile),
  mkdir: dir => pSingle(fslib.mkdir)(dir).catch(mkDirHandler),
}

fs.mkdir('./data')
  .then(() => {

    const ws = new WebSocket('wss://ws-feed.gdax.com');

    ws.on('open', function open() {
      ws.send(JSON.stringify({
        "type": "subscribe",
        "product_ids": [
            "ETH-EUR"
        ],
        "channels": [
            "level2",
            "matches",
            "heartbeat",
            {
                "name": "ticker",
                "product_ids": [
                    "ETH-EUR"
                ]
            }
        ]
      }));
    });

    ws.on('message', data => {
      const message = JSON.parse(data)
      if (message.time && message.type) {
        const hourDir = `data/${message.type}`
        const dir = `data/${message.type}/${message.time.substr(0, 'YYYY-MM-DDThh'.length)}`
        fs.mkdir(hourDir)
          .then(() => fs.mkdir(dir))
          .then(() => fs.writeFile(`${dir}/${message.time}_${message.type}.json`, data))
          .catch(fatalError)
      } else {
        console.log('message:', message)
      }
    });

  })
  .catch(fatalError)

function fatalError(err) {
  console.trace(err)
  process.exit(1)
}

function mkDirHandler(err) {
  if (err && err.code === 'EEXIST') return
  throw err
}
