const test = require('tape')
const fs = require('fs')
const path = require('path')
const tmp = require('tmp')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')
const ssbKeys = require('ssb-keys')
const pull = require('pull-stream')
const { isBlurhashValid } = require('blurhash')

tmp.setGracefulCleanup()

const { name: fixtureDirPath } = tmp.dirSync({
  name: `ssb-blobs-blurhash-${Date.now()}`,
  unsafeCleanup: true,
})

function loadImageFixture(name) {
  return fs.readFileSync(path.resolve(__dirname, './fixtures', name))
}

function createSbot() {
  const keys = ssbKeys.loadOrCreateSync(path.join(fixtureDirPath, 'secret'))

  const sbot = SecretStack({ appKey: caps.shs })
    .use(require('ssb-blobs'))
    .use(require('../index'))
    .call(null, { keys, path: fixtureDirPath })

  return sbot
}

test('generate', (t) => {
  const sbot = createSbot()

  const imageBuffer = loadImageFixture('square.jpg')

  pull(
    pull.once(imageBuffer),
    sbot.blobs.add((err, blobId) => {
      t.error(err, 'no error adding blob')
      t.ok(blobId, 'blob id created')

      sbot.blobsBlurhash.generate(blobId, { width: 48 }, (err, hash) => {
        t.error(err, 'no error generating blurhash')
        t.ok(isBlurhashValid(hash), 'valid blurhash created')

        sbot.close(true, t.end)
      })
    })
  )
})
