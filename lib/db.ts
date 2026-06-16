import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'hackjournal',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
})

async function runMigration() {
  try {
    const [columns]: any = await pool.query('SHOW COLUMNS FROM writeups')
    const columnNames = columns.map((col: any) => col.Field)

    const newColumns = [
      { name: 'writeup_mode', definition: "ENUM('journal', 'cve') DEFAULT 'journal'" },
      { name: 'cve_id', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'cve_product', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'cve_version', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'cve_cwe', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'cve_cvss_score', definition: 'DECIMAL(3,1) DEFAULT NULL' },
      { name: 'cve_cvss_vector', definition: 'VARCHAR(150) DEFAULT NULL' },
      { name: 'cve_cvss_severity', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'cve_impact', definition: 'LONGTEXT DEFAULT NULL' },
      { name: 'cve_poc', definition: 'LONGTEXT DEFAULT NULL' },
      { name: 'cve_remediation', definition: 'LONGTEXT DEFAULT NULL' },
      { name: 'is_encrypted', definition: 'TINYINT DEFAULT 0' },
      { name: 'encryption_salt', definition: 'VARCHAR(128) DEFAULT NULL' },
      { name: 'encryption_iv', definition: 'VARCHAR(128) DEFAULT NULL' },
      { name: 'attack_chain', definition: 'LONGTEXT DEFAULT NULL' },
      // Sprint 2 - Folders
      { name: 'folder_id', definition: 'INT DEFAULT NULL' },
      { name: 'is_starred', definition: 'TINYINT DEFAULT 0' },
      // Sprint 3 - Checklists, diagrams
      { name: 'checklist_state', definition: 'LONGTEXT DEFAULT NULL' },
      { name: 'network_diagram', definition: 'LONGTEXT DEFAULT NULL' },
      // Sprint 4 - Collaboration & Project Management
      { name: 'team_id', definition: 'INT DEFAULT NULL' },
      { name: 'engagement_id', definition: 'INT DEFAULT NULL' }
    ]

    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        await pool.query(`ALTER TABLE writeups ADD COLUMN ${col.name} ${col.definition}`)
        console.log(`[Migration] Column ${col.name} added successfully.`)
      }
    }

    // Migration for users table
    const [uCols]: any = await pool.query('SHOW COLUMNS FROM users')
    const uColNames = uCols.map((col: any) => col.Field)
    if (!uColNames.includes('api_key')) {
      await pool.query('ALTER TABLE users ADD COLUMN api_key VARCHAR(100) DEFAULT NULL')
      console.log('[Migration] Column api_key added to users table successfully.')
    }
    
    // Additional columns for users
    const newUColumns = [
      { name: 'xp', definition: 'INT DEFAULT 0' },
      { name: 'ai_provider', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'ai_api_key_encrypted', definition: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'ai_endpoint', definition: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'language', definition: "VARCHAR(5) DEFAULT 'id'" }
    ]
    for (const col of newUColumns) {
      if (!uColNames.includes(col.name)) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`)
        console.log(`[Migration] Column ${col.name} added to users table successfully.`)
      }
    }

    // Create new tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id INT DEFAULT NULL,
        color VARCHAR(20) DEFAULT '#7F77DD',
        icon VARCHAR(10) DEFAULT '📁',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        writeup_mode ENUM('journal','cve') DEFAULT 'journal',
        template_data LONGTEXT NOT NULL,
        is_builtin TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS writeup_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        writeup_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(500),
        content LONGTEXT,
        full_snapshot LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255),
        url VARCHAR(500) NOT NULL,
        platform ENUM('discord','slack','telegram','custom') DEFAULT 'custom',
        events VARCHAR(500) DEFAULT 'writeup_created',
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        writeup_id INT NOT NULL,
        type ENUM('upvote','bookmark','comment') NOT NULL,
        content TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (user_id, writeup_id, type)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner','editor','viewer') DEFAULT 'viewer',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS engagements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        client VARCHAR(255),
        scope LONGTEXT,
        status ENUM('scoping','recon','exploitation','reporting','retesting','complete') DEFAULT 'scoping',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_key VARCHAR(100) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_achievement (user_id, achievement_key)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vault_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'credential',
        encrypted_data TEXT NOT NULL,
        encryption_iv VARCHAR(128) NOT NULL,
        encryption_salt VARCHAR(128) NOT NULL,
        notes TEXT DEFAULT NULL,
        expires_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('[Migration] All tables and columns migrated successfully.')
  } catch (err) {
    console.error('[Migration] Failed to run migration:', err)
  }
}

// Run migration in background
runMigration()

export default pool

