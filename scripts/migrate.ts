/**
 * Database Migration Script for HackJournal - Phase 2.
 * 
 * Run manually: npx tsx scripts/migrate.ts
 * Or via npm:   npm run db:migrate
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
    { name: 'cloned_from_id', definition: 'INT DEFAULT NULL' },
    { name: 'global_severity', definition: "ENUM('Critical', 'High', 'Medium', 'Low', 'Info', 'None') DEFAULT 'None'" },
    { name: 'status', definition: "ENUM('draft', 'in_review', 'approved', 'completed') DEFAULT 'draft'" },
    { name: 'reviewer_id', definition: 'INT DEFAULT NULL' },
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

async function migrateTeamsColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM teams')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'is_archived', definition: 'TINYINT DEFAULT 0' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE teams ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column teams.${col.name} added`)
    }
  }
}

async function migrateEngagementsColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM engagements')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'team_id', definition: 'INT DEFAULT NULL' },
    { name: 'attack_map_data', definition: 'JSON DEFAULT NULL' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE engagements ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column engagements.${col.name} added`)
    }
  }
}

async function migrateTemplatesColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM templates')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'team_id', definition: 'INT DEFAULT NULL' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE templates ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column templates.${col.name} added`)
    }
  }
}

async function migrateVaultEntriesColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM vault_entries')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'team_id', definition: 'INT DEFAULT NULL' },
    { name: 'engagement_id', definition: 'INT DEFAULT NULL' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE vault_entries ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column vault_entries.${col.name} added`)
    }
  }
}

async function migrateWriteupCommentsColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM writeup_comments')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'is_task', definition: 'TINYINT DEFAULT 0' },
    { name: 'task_assignee_id', definition: 'INT DEFAULT NULL' },
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE writeup_comments ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column writeup_comments.${col.name} added`)
    }
  }
}

async function migrateFindingsLibraryColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM findings_library')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'team_id', definition: 'INT DEFAULT NULL' },
    { name: 'is_system_template', definition: 'TINYINT(1) DEFAULT 0' }
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE findings_library ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column findings_library.${col.name} added`)
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
    CREATE TABLE IF NOT EXISTS vault_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vault_entry_id INT NOT NULL,
      user_id INT NOT NULL,
      action ENUM('revealed', 'copied') NOT NULL,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_invites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      role ENUM('editor','viewer') DEFAULT 'viewer',
      invited_by INT NOT NULL,
      token VARCHAR(100) NOT NULL UNIQUE,
      status ENUM('pending','accepted','expired','revoked') DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      link VARCHAR(500),
      is_read TINYINT DEFAULT 0,
      is_task TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS muted_threads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      comment_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_thread (user_id, comment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS writeup_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      writeup_id INT NOT NULL,
      user_id INT NOT NULL,
      parent_comment_id INT DEFAULT NULL,
      content TEXT NOT NULL,
      anchor_quote TEXT DEFAULT NULL,
      anchor_prefix VARCHAR(150) DEFAULT NULL,
      anchor_suffix VARCHAR(150) DEFAULT NULL,
      is_resolved TINYINT DEFAULT 0,
      is_muted TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS findings_library (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      severity ENUM('Critical', 'High', 'Medium', 'Low', 'Info', 'None') NOT NULL,
      description TEXT NOT NULL,
      remediation TEXT NOT NULL,
      team_id INT DEFAULT NULL,
      is_system_template TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS writeups_findings_mapping (
      id INT AUTO_INCREMENT PRIMARY KEY,
      writeup_id INT NOT NULL,
      finding_library_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS war_room_commands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      engagement_id INT NOT NULL,
      user_id INT NOT NULL,
      command TEXT NOT NULL,
      tool_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  console.log('  ✓ All tables created/verified')
}

// ─── Foreign Key Constraints ────────────────────────────────────────────────

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
  { name: 'fk_writeups_cloned_from', table: 'writeups',        column: 'cloned_from_id', refTable: 'writeups',    refColumn: 'id', onDelete: 'SET NULL' },
  { name: 'fk_writeups_reviewer',    table: 'writeups',        column: 'reviewer_id',   refTable: 'users',       refColumn: 'id', onDelete: 'SET NULL' },
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
  { name: 'fk_engagements_team',    table: 'engagements',      column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'CASCADE' },
  // vault_entries
  { name: 'fk_vault_user',          table: 'vault_entries',    column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_vault_team',          table: 'vault_entries',    column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_vault_engagement',    table: 'vault_entries',    column: 'engagement_id', refTable: 'engagements', refColumn: 'id', onDelete: 'CASCADE' },
  // vault_audit_logs
  { name: 'fk_val_vault_entry',     table: 'vault_audit_logs', column: 'vault_entry_id', refTable: 'vault_entries', refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_val_user',            table: 'vault_audit_logs', column: 'user_id',        refTable: 'users',        refColumn: 'id', onDelete: 'CASCADE' },
  // user_achievements
  { name: 'fk_achievements_user',   table: 'user_achievements',column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // templates
  { name: 'fk_templates_user',      table: 'templates',        column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'SET NULL' },
  { name: 'fk_templates_team',      table: 'templates',        column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'CASCADE' },
  // team_invites
  { name: 'fk_ti_team',             table: 'team_invites',     column: 'team_id',       refTable: 'teams',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_ti_user',             table: 'team_invites',     column: 'invited_by',    refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // notifications
  { name: 'fk_notif_user',          table: 'notifications',    column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // writeup_comments
  { name: 'fk_comments_writeup',    table: 'writeup_comments', column: 'writeup_id',    refTable: 'writeups',    refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_comments_user',       table: 'writeup_comments', column: 'user_id',       refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_comments_parent',     table: 'writeup_comments', column: 'parent_comment_id', refTable: 'writeup_comments', refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_comments_assignee',   table: 'writeup_comments', column: 'task_assignee_id', refTable: 'users',       refColumn: 'id', onDelete: 'CASCADE' },
  // findings library mapping
  { name: 'fk_wfm_writeup',         table: 'writeups_findings_mapping', column: 'writeup_id', refTable: 'writeups', refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_wfm_library',         table: 'writeups_findings_mapping', column: 'finding_library_id', refTable: 'findings_library', refColumn: 'id', onDelete: 'CASCADE' },
  // findings library team constraint
  { name: 'fk_findings_library_team', table: 'findings_library', column: 'team_id', refTable: 'teams', refColumn: 'id', onDelete: 'CASCADE' },
  // war room command constraints
  { name: 'fk_wrc_engagement',      table: 'war_room_commands', column: 'engagement_id', refTable: 'engagements', refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_wrc_user',            table: 'war_room_commands', column: 'user_id', refTable: 'users', refColumn: 'id', onDelete: 'CASCADE' },
  // muted_threads
  { name: 'fk_mt_user',             table: 'muted_threads',    column: 'user_id',       refTable: 'users',            refColumn: 'id', onDelete: 'CASCADE' },
  { name: 'fk_mt_comment',          table: 'muted_threads',    column: 'comment_id',    refTable: 'writeup_comments', refColumn: 'id', onDelete: 'CASCADE' },
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

async function migrateNotificationsColumns() {
  const [columns]: any = await pool.query('SHOW COLUMNS FROM notifications')
  const columnNames = columns.map((col: any) => col.Field)

  const newColumns = [
    { name: 'is_task', definition: 'TINYINT DEFAULT 0' }
  ]

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await pool.query(`ALTER TABLE notifications ADD COLUMN ${col.name} ${col.definition}`)
      console.log(`  ✓ Column notifications.${col.name} added`)
    }
  }
}

export async function runAllMigrations() {
  await migrateWriteupsColumns()
  await migrateUsersColumns()
  await migrateTeamsColumns()
  await migrateEngagementsColumns()
  await migrateTemplatesColumns()
  await migrateWriteupCommentsColumns()
  await migrateVaultEntriesColumns()
  await migrateFindingsLibraryColumns()
  await migrateNotificationsColumns()
  await createTables()
  await addForeignKeys()
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   HackJournal Database Migration - Phase 2   ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()

  try {
    console.log('Running all migrations...')
    await runAllMigrations()
    console.log()
    console.log('✅ Migration completed successfully!')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (typeof window === 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('migrate')) {
  main()
}
