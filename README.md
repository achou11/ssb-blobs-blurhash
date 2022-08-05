# ssb-blobs-blurhash

> SSB secret stack plugin to generate a blurhash hash for a provided blob

## Install

`npm install ssb-blobs-blurhash

## Usage

- Requires **Node 12** or higher
- Requires `ssb-blobs`

```js
SecretStack({appKey: require('ssb-caps').shs})
+ .use(require('ssb-blobs'))
+ .use(require('ssb-blobs-blurhash'))
  .call(null, config)
```

## API

### `ssb.blobsBlurhash.generate(blobId, opts, cb) (muxrpc "async")`

- `blobId: string`: ssb blob id
- `opts: { width: number }`: options to use for generation. `width` is the desired pixel width of the image that's used to generate the hash for.
- `cb: (err: any, hash: string) => void`: callback that provides the hash generated by [blurhash](https://github.com/woltapp/blurhash)

```js
ssb.blobsBlurHash.generate('abc123', null, (err, hash) => {
    if (err) throw err

    console.log(`Blurhash result is ${hash}`)
})
```

## License

MIT

