export interface SyncAdapter {
  source: string
  sync(userId: string): Promise<SyncResult>
}

export interface SyncResult {
  taskCount: number
  status: 'success' | 'error'
  error?: string
}
