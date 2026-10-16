export type Slice = { id: string; title: string; epic?: string; size?: string; needs: string[] }
export type BoardColumn = { key: string; label: string; count: number; slices: Slice[] }
export type Epic = { id: string; name: string; status: string; done: number; blocker: string }

declare module 'claude-code' {
  interface PluginState {
    meto: {
      isMeto: boolean
      board: BoardColumn[]
      epics: Epic[]
      startedAt: number
      isTouched: boolean
      isHandoffStale: boolean
    }
  }
}
