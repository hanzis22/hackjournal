import mysql from 'mysql2/promise'

async function check() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'hackjournal',
  })

  try {
    const [tables]: any = await pool.query('SHOW TABLES')
    console.log('Tables in database:', tables.map((t: any) => Object.values(t)[0]))

    for (const table of ['teams', 'team_members']) {
      try {
        const [cols]: any = await pool.query(`DESCRIBE ${table}`)
        console.log(`\nTable ${table} structure:`)
        console.table(cols)
      } catch (err: any) {
        console.error(`Error describing table ${table}:`, err.message)
      }
    }
  } catch (err: any) {
    console.error('Database connection error:', err.message)
  } finally {
    await pool.end()
  }
}

check()
