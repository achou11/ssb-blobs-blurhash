const pull = require('pull-stream')
const blurhash = require('blurhash')
const jimp = require('jimp')

/**
 * @typedef {import('./types/helpers').SSB} SSB
 */

/**
 * @typedef {Object} Options
 * @property {number} Options.width
 * @property {boolean} Options.details
 */

/**
 * @typedef {Object} Output
 * @property {string} Output.hash
 * @property {number} Output.componentX
 * @property {number} Output.componentY
 */

const BASE_COMPONENT_SIZE = 4
const BLURHASH_MIN_COMPONENTS = 1
const BLURHASH_MAX_COMPONENTS = 9

/**
 * @param {number} aspectRatio
 * @returns {boolean}
 */
function isSquareEnough(aspectRatio) {
  return aspectRatio >= 0.8 && aspectRatio <= 1.2
}

/**
 * Utility to ensure the calculated components size
 * is within the 1-9 range that blurhash enforces
 *
 * @param {number} size
 * @returns {number}
 */
function restrictComponentsSize(size) {
  const lowerbound = Math.max(size, BLURHASH_MIN_COMPONENTS)
  return Math.min(lowerbound, BLURHASH_MAX_COMPONENTS)
}

/**
 * @param {Buffer} blob
 * @param {number} desiredWidth
 * @param {boolean} details
 * @returns {Promise<string | Output>}
 */
async function createBlurhash(blob, desiredWidth, details = false) {
  const image = await jimp.read(blob)

  const aspectRatio = image.bitmap.width / image.bitmap.height

  const isSquare = isSquareEnough(aspectRatio)

  const resizedHeight = isSquare
    ? desiredWidth
    : Math.round(desiredWidth / aspectRatio)

  image.resize(desiredWidth, resizedHeight)
  const data = image.bitmap.data

  const otherComponentSize = isSquare
    ? BASE_COMPONENT_SIZE
    : restrictComponentsSize(
        Math.round(
          aspectRatio < 1
            ? BASE_COMPONENT_SIZE / aspectRatio
            : BASE_COMPONENT_SIZE * aspectRatio
        )
      )
  const componentX = aspectRatio < 1 ? BASE_COMPONENT_SIZE : otherComponentSize
  const componentY = aspectRatio < 1 ? otherComponentSize : BASE_COMPONENT_SIZE

  const hash = blurhash.encode(
    new Uint8ClampedArray(data),
    desiredWidth,
    resizedHeight,
    componentX,
    componentY
  )

  if (details) {
    return { hash, componentX, componentY }
  } else {
    return hash
  }
}

module.exports = {
  name: 'blobsBlurhash',
  version: '1.0.0',
  manifest: { generate: 'async' },
  permissions: {
    master: { allow: ['generate'] },
  },
  /**
   * @param {Required<SSB>} ssb
   */
  init(ssb) {
    /**
     * Calculate the blurhash of an image known by its blobId.
     * @param {string} blobId
     * @param {Options} opts
     * @param {import('./types/helpers').CB<*>} cb
     */
    function generate(blobId, opts, cb) {
      if (!opts.width || typeof opts.width !== 'number')
        throw new Error('valid width value in options must be provided')

      pull(
        ssb.blobs.get(blobId),
        pull.collect((err, /** @type {Buffer[]} */ blobs) => {
          if (err) return cb(err)

          const buffer = Buffer.concat(blobs)

          createBlurhash(buffer, opts.width, opts.details)
            .then((hash) => {
              cb(null, hash)
            })
            .catch((err) => {
              cb(err)
            })
        })
      )
    }

    return { generate }
  },
}
