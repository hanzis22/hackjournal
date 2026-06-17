/**
 * Database Migration Script for HackJournal.
 * 
 * Run manually: npx tsx scripts/migrate.ts
 * Or via npm:   npm run db:migrate
 * 
 * This script:
 * 1. Creates new tables if they don't exist
 * 2. Adds new columns to existing tables (idempotent)
 * 3. Adds foreign key constraints (idempotent, won't fail if already exists)
 */

import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'hackjournal',
  waitForConnections: true,
  connectionLimit:    5,
  queueLimit:         0,
  charset:            'utf8mb4',
})

// ─── Column Migrations ──────────────────────────────────────────────────────

async function migrateWriteupsColumns() {
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
    { name: 'folder_id', definition: 'INT DEFAULT NULL' },
    { name: 'is_starred', definition: 'TINYINT DEFAULT 0' },
    { name: 'checklist_state', definition: 'LONGTEXT DEFAULT NULL' },
    { name: 'network_diagram', definition: 'LONGTEXT DEFAULT NULL' },
    { name: 'team_id', definition: 'INT DEFAULT NULL' },
    { name: 'engagement_id', definition: 'INT DEFAULT NULL' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE writeups ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column writeups.${col.name} added`)
    }
  }
}

async function migrateUsersColumns() {
  const [uCols]: any = await pool.query('SHOW COLUMNS FROM users')
  const uColNames = uCols.map((col: any) => col.Field)

  const newUColumns = [
    { name: 'api_key', definition: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'xp', definition: 'INT DEFAULT 0' },
    { name: 'ai_provider', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'ai_api_key_encrypted', definition: 'VARCHAR(500) DEFAULT NULL' },
    { name: 'ai_endpoint', definition: 'VARCHAR(500) DEFAULT NULL' },
    { name: 'language', definition: "VARCHAR(5) DEFAULT 'id'" },
  ]

  for (const col of newUColumns) {
    if (!uColNames.includes(col.name)) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column users.${col.name} added`)
    }
  }
}

// ─── Table Creation ──────────────────────────────────────────────────────────

async function createTables() {
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('owner','editor','viewer') DEFAULT 'viewer',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      achievement_key VARCHAR(100) NOT NULL,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_achievement (user_id, achievement_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
      expires_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key_str VARCHAR(255) PRIMARY KEY,
      count INT NOT NULL,
      reset_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  console.log('  ✓ All tables created/verified')
}

// ─── Foreign Key Constraints (LOG-02) ────────────────────────────────────────

interface FKConstraint {
  name: string
  table: string
  column: string
  refTable: string
  refColumn: string
  onDelete: string
}

const FK_CONSTRAINTS: FKConstraint[] = [
  // writeups
  { name: 'fk_writeups_user',       table: 'writeups',         column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_writeups_folder',     table: 'writeups',         column: 'folder_id',     refTable: 'folders',     refColumn: 'id', onDelete: 'SET NULL' },
  { name: 'fk_writeups_team',       table: 'writeups',         column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'SET NULL' },
  { name: 'fk_writeups_engagement', table: 'writeups',         column: 'engagement_id', refTable: 'engagements', refColumn: 'id', onDelete: 'SET NULL' },
  // folders
  { name: 'fk_folders_user',        table: 'folders',          column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_folders_parent',      table: 'folders',          column: 'parent_id',     refTable: 'folders',     refColumn: 'id', onDelete: 'CASCADE' },
  // webhooks
  { name: 'fk_webhooks_user',       table: 'webhooks',         column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // writeup_versions
  { name: 'fk_wv_writeup',          table: 'writeup_versions', column: 'writeup_id',    refTable: 'writeups',    refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_wv_user',             table: 'writeup_versions', column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // interactions
  { name: 'fk_interactions_user',   table: 'interactions',     column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_interactions_writeup',table: 'interactions',     column: 'writeup_id',    refTable: 'writeups',    refColumn: 'id', onDelete: 'CASCADE' },
  // teams
  { name: 'fk_teams_owner',         table: 'teams',            column: 'owner_id',      refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // team_members
  { name: 'fk_tm_team',             table: 'team_members',     column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_tm_user',             table: 'team_members',     column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // engagements
  { name: 'fk_engagements_user',    table: 'engagements',      column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // vault_entries
  { name: 'fk_vault_user',          table: 'vault_entries',    column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // user_achievements
  { name: 'fk_achievements_user',   table: 'user_achievements',column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // templates
  { name: 'fk_templates_user',      table: 'templates',        column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'SET NULL' },
]

async function addForeignKeys() {
  for (const fk of FK_CONSTRAINTS) {
    try {
      // Check if constraint already exists
      const [existing]: any = await pool.query(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [fk.table, fk.name]
      )

      if (existing.length > 0) {
        continue // Already exists, skip
      }

      // Add index on the column first (FK requires an index)
      try {
        await pool.query(`ALTER TABLE ${fk.table} ADD INDEX idx_${fk.name} (${fk.column})`)
      } catch {
        // Index might already exist, that's fine
      }

      await pool.query(
        `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} 
         FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn}) 
         ON DELETE ${fk.onDelete}`
      )
      console.log(`  ✓ FK ${fk.name}: ${fk.table}.${fk.column} → ${fk.refTable}.${fk.refColumn}`)
    } catch (err: any) {
      // Don't fail the whole migration for one FK
      console.warn(`  ⚠ FK ${fk.name} skipped: ${err.message?.slice(0, 100)}`)
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   HackJournal Database Migration             ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()

  try {
    console.log('[1/4] Migrating writeups columns...')
    await migrateWriteupsColumns()

    console.log('[2/4] Migrating users columns...')
    await migrateUsersColumns()

    console.log('[3/4] Creating/verifying tables...')
    await createTables()

    console.log('[4/4] Adding foreign key constraints...')
    await addForeignKeys()

    console.log()
    console.log('✅ Migration completed successfully!')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
