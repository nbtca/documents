// The Pages project binds its R2 bucket as `ASSETS`. That binding is the only
// credential these functions hold.

export interface StoredObject {
  body: ReadableStream | ArrayBuffer | Uint8Array
  httpEtag?: string
}

export interface AssetBucket {
  put: (key: string, value: ArrayBuffer | ArrayBufferView, options?: {
    httpMetadata?: { contentType?: string }
  }) => Promise<unknown>
  get: (key: string) => Promise<StoredObject | null>
}

export interface AssetEnv {
  ASSETS?: AssetBucket
}
