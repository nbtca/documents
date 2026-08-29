interface ImportMetaEnv {
  readonly VITE_LOGTO_ENDPOINT?: string
  readonly VITE_LOGTO_APP_ID?: string
  readonly VITE_LOGTO_CALLBACK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
