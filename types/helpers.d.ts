import { Source } from 'pull-stream'

export interface CB<T> {
  (err: any, val?: T): void
}

export interface SSB {
  blobs: {
    get: (blobId: string) => Source
  }
}
