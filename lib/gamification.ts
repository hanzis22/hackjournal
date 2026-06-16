import pool from './db'

export async function addXP(userId: number, amount: number) {
  try {
    // Get current XP
    const [userRows]: any = await pool.query('SELECT xp FROM users WHERE id = ?', [userId])
    if (userRows.length === 0) return
    const currentXP = userRows[0].xp || 0
    const newXP = currentXP + amount

    await pool.query('UPDATE users SET xp = ? WHERE id = ?', [newXP, userId])

    // Check achievement thresholds
    const achievementsToAward: string[] = []
    if (newXP >= 100) achievementsToAward.push('xp_100')
    if (newXP >= 500) achievementsToAward.push('xp_500')
    if (newXP >= 1000) achievementsToAward.push('xp_1000')

    for (const key of achievementsToAward) {
      await awardAchievement(userId, key)
    }
  } catch (err) {
    console.error('Error adding XP:', err)
  }
}

export async function awardAchievement(userId: number, achievementKey: string) {
  try {
    // Check if user already has it
    const [rows]: any = await pool.query(
      'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_key = ?',
      [userId, achievementKey]
    )

    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO user_achievements (user_id, achievement_key) VALUES (?, ?)',
        [userId, achievementKey]
      )
      console.log(`[Achievement] User ${userId} unlocked achievement: ${achievementKey}`)
    }
  } catch (err) {
    // Duplicate key is caught here, ignore
    console.error('Error awarding achievement:', err)
  }
}
