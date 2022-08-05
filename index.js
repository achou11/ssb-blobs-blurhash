const pull = require('pull-stream')
const blurhash = require('blurhash')
const sharp = require('sharp')

/**
 * @typedef {import('./types/helpers').SSB} SSB
 */

/**
 * @typedef {Object} Options
 * @property {number} Options.width
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
 * @returns {Promise<string>}
 */
async function createBlurhash(blob, desiredWidth) {
  const image = sharp(blob)

  const metadata = await sharp(blob).metadata()

  if (!(metadata.width && metadata.height))
    throw new Error('Could not determine height and width of image')

  const aspectRatio = metadata.width / metadata.height

  const isSquare = isSquareEnough(aspectRatio)

  const { data, info } = await image
    .raw()
    .ensureAlpha()
    .resize(
      desiredWidth,
      isSquare ? desiredWidth : Math.round(desiredWidth / aspectRatio)
    )
    .toBuffer({ resolveWithObject: true })

  const componentY = isSquare
    ? BASE_COMPONENT_SIZE
    : restrictComponentsSize(Math.round(BASE_COMPONENT_SIZE / aspectRatio))

  return blurhash.encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    BASE_COMPONENT_SIZE,
    componentY
  )
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
     * Get the storage capacity used for a specfic feed id
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

          createBlurhash(buffer, opts.width)
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
