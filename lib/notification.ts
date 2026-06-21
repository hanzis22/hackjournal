import pool from './db'

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link: string = '',
  parentCommentId: number | null = null
): Promise<boolean> {
  try {
    // Check if the user has muted this thread
    if (parentCommentId) {
      const [mutedRows]: any = await pool.query(
        'SELECT id FROM muted_threads WHERE user_id = ? AND comment_id = ?',
        [userId, parentCommentId]
      )
      if (mutedRows.length > 0) {
        // Skip creating notification because the user muted replies to this comment thread
        return false
      }
    }

    // Determine if this is an Action Required / Task type notification
    const isTask = (type === 'task_assignment' || type === 'review_request' || type === 'team_invite') ? 1 : 0

    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link, is_task) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, title, message, link, isTask]
    )
    return true
  } catch (error) {
    console.error('[Create Notification Error]', error)
    return false
  }
}
