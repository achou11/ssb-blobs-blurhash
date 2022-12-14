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

test('generate with missing options throws an error', (t) => {
  const sbot = createSbot()

  t.throws(() => sbot.blobsBlurhash.generate('abc123', {}, () => {}))

  sbot.close(true, t.end)
})

test('generate with non-existent blob id produces an error in callback', (t) => {
  const sbot = createSbot()

  sbot.blobsBlurhash.generate('abc123', { width: 48 }, (err, hash) => {
    t.ok(err, 'error occurs')

    sbot.close(true, t.end)
  })
})

test('generate produces a valid blurhash hash', (t) => {
  const sbot = createSbot()

  const imageBuffer = loadImageFixture('square.jpg')

  pull(
    pull.once(imageBuffer),
    sbot.blobs.add((err, blobId) => {
      t.error(err, 'no error adding blob')
      t.ok(blobId, 'blob id created')

      sbot.blobsBlurhash.generate(
        blobId,
        { width: 48, details: true },
        (err, output) => {
          t.error(err, 'no error generating blurhash')
          const { hash, componentX, componentY } = output
          t.ok(isBlurhashValid(hash), 'valid blurhash created')
          t.equal(componentX, 4, 'correct componentX')
          t.equal(componentY, 4, 'correct componentY')
          t.equal(hash, 'UEL:=p00~q~q:*?Hx]t7;2_39Y8_HXV@x]M_', 'correct hash')

          sbot.close(true, t.end)
        }
      )
    })
  )
})

test('generate handles horizontal rectangle', (t) => {
  const sbot = createSbot()

  const imageBuffer = loadImageFixture('hnature.jpg')

  pull(
    pull.once(imageBuffer),
    sbot.blobs.add((err, blobId) => {
      sbot.blobsBlurhash.generate(
        blobId,
        { width: 48, details: true },
        (err, output) => {
          t.error(err, 'no error generating blurhash')
          const { hash, componentX, componentY } = output
          t.ok(isBlurhashValid(hash), 'valid blurhash created')
          t.equal(componentX, 6, 'correct componentX')
          t.equal(componentY, 4, 'correct componentY')
          t.equal(
            hash,
            'W:I5PqRPRltRofjs?dR*bHogj[jsNKo#oeV@WBoLRjbJaeWAWBoe',
            'correct hash'
          )

          sbot.close(true, t.end)
        }
      )
    })
  )
})

test('generate handles vertical rectangle', (t) => {
  const sbot = createSbot()

  const imageBuffer = loadImageFixture('vnature.jpg')

  pull(
    pull.once(imageBuffer),
    sbot.blobs.add((err, blobId) => {
      sbot.blobsBlurhash.generate(
        blobId,
        { width: 48, details: true },
        (err, output) => {
          t.error(err, 'no error generating blurhash')
          const { hash, componentX, componentY } = output
          t.ok(isBlurhashValid(hash), 'valid blurhash created')
          t.equal(componentX, 4, 'correct componentX')
          t.equal(componentY, 6, 'correct componentY')
          t.equal(
            hash,
            'mbEN9nXBH=oc_4afX9o#^+R*S5of.9R+RPof$_WBf,WV-.WCRkae',
            'correct hash'
          )

          sbot.close(true, t.end)
        }
      )
    })
  )
})
