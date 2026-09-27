declare function vacuum(
  directory: string,
  options: vacuum.Options | null | undefined,
  callback: vacuum.Callback
): void

declare namespace vacuum {
  interface Options {
    base?: string
    purge?: boolean
    log?: (...args: unknown[]) => void
  }

  type Callback = (error: Error | null) => void
}

export = vacuum
