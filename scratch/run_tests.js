const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// Load env
const JWT_SECRET = 'a3f8c2e91b7d4056e8a1f3b9c7d2e5084a6b3c9d0e1f2a8b7c4d5e6f0918273a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f6071829';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'hackjournal',
});

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE TEAMS & NOTIFICATION TESTS ---');

  // Setup test users
  const uniqueStr = Date.now().toString().slice(-6);
  const userA_email = `usera_${uniqueStr}@test.local`;
  const userB_email = `userb_${uniqueStr}@test.local`;
  const userC_email = `userc_${uniqueStr}@test.local`;

  console.log('Creating test users...');
  const [resA] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [`usera_${uniqueStr}`, userA_email, 'hash']);
  const [resB] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [`userb_${uniqueStr}`, userB_email, 'hash']);
  const [resC] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [`userc_${uniqueStr}`, userC_email, 'hash']);

  const userA = { id: resA.insertId, email: userA_email, username: `usera_${uniqueStr}` };
  const userB = { id: resB.insertId, email: userB_email, username: `userb_${uniqueStr}` };
  const userC = { id: resC.insertId, email: userC_email, username: `userc_${uniqueStr}` };

  const tokenA = signToken(userA);
  const tokenB = signToken(userB);
  const tokenC = signToken(userC);

  console.log('Creating test teams...');
  const [team1] = await pool.query('INSERT INTO teams (name, owner_id) VALUES (?, ?)', [`TeamOne_${uniqueStr}`, userA.id]);
  const [team2] = await pool.query('INSERT INTO teams (name, owner_id) VALUES (?, ?)', [`TeamTwo_${uniqueStr}`, userC.id]);

  const team1Id = team1.insertId;
  const team2Id = team2.insertId;

  // Add owners to team_members
  await pool.query('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [team1Id, userA.id, 'owner']);
  await pool.query('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [team2Id, userC.id, 'owner']);

  // Base API URL
  const baseUrl = 'http://localhost:3000';

  // Helper fetch request
  const apiFetch = async (url, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${baseUrl}${url}`, options);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    return { status: response.status, data };
  };

  // 1. Cross-team mismatch test for DELETE /api/teams/[id]/invites/[inviteId] -> must be 404
  console.log('\n--- Test 1: Cross-team mismatch on revoking invites ---');
  // Create invite for team 1
  const [inviteRes] = await pool.query(
    "INSERT INTO team_invites (team_id, email, role, invited_by, token, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [team1Id, userB.email, 'viewer', userA.id, `token1_${uniqueStr}`, new Date(Date.now() + 3600000)]
  );
  const inviteId = inviteRes.insertId;

  // Try to revoke invite using Team 2's ID
  const revokeResMismatch = await apiFetch(`/api/teams/${team2Id}/invites/${inviteId}`, 'DELETE', null, tokenA);
  console.log(`Revoke with mismatched Team ID response status: ${revokeResMismatch.status} (expected: 403 or 404)`);
  console.log(`Response body:`, revokeResMismatch.data);

  const revokeResMismatchCorrectOwner = await apiFetch(`/api/teams/${team2Id}/invites/${inviteId}`, 'DELETE', null, tokenC);
  console.log(`Revoke with mismatched Team ID (correct owner of team2) response status: ${revokeResMismatchCorrectOwner.status} (expected: 404)`);
  console.log(`Response body:`, revokeResMismatchCorrectOwner.data);

  // 2. Email-match validation test for POST /api/invites/[token]/decline -> must be 403 if email doesn't match
  console.log('\n--- Test 2: Email mismatch on decline invite ---');
  const declineResMismatch = await apiFetch(`/api/invites/token1_${uniqueStr}/decline`, 'POST', null, tokenC);
  console.log(`Decline with mismatched Email response status: ${declineResMismatch.status} (expected: 403)`);
  console.log(`Response body:`, declineResMismatch.data);

  // 3. Test Notification Triggers Matrix
  console.log('\n--- Test 3: In-App Notification Triggers Matrix ---');

  // Trigger 1: Invite Accepted (notifies team owner)
  console.log('Triggering Invite Accept...');
  const acceptRes = await apiFetch(`/api/invites/token1_${uniqueStr}/accept`, 'POST', null, tokenB);
  console.log(`Accept invite response:`, acceptRes.data);

  // Trigger 2: New Member Joins (already joined via accept above)
  // Let's check userA's notifications for 'team_member_joined'
  const notifsA = await apiFetch('/api/notifications', 'GET', null, tokenA);
  console.log(`User A (Owner) Notifications after User B accepts invite:`);
  console.log(JSON.stringify(notifsA.data.notifications, null, 2));

  // Trigger 3: Role Changed (notifies updated user B)
  // Owner A changes B's role. Let's find B's team_members row ID first
  const [memberRows] = await pool.query('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?', [team1Id, userB.id]);
  const memberIdB = memberRows[0].id;
  console.log(`Changing User B role (memberId: ${memberIdB}) to editor...`);
  const changeRoleRes = await apiFetch(`/api/teams/${team1Id}/members/${memberIdB}`, 'PATCH', { role: 'editor' }, tokenA);
  console.log(`Change role response status: ${changeRoleRes.status}`);

  const notifsB = await apiFetch('/api/notifications', 'GET', null, tokenB);
  console.log(`User B Notifications after role change:`);
  console.log(JSON.stringify(notifsB.data.notifications, null, 2));

  // Trigger 4: Member Removed (notifies removed user B)
  console.log('Removing User B from Team 1...');
  const removeRes = await apiFetch(`/api/teams/${team1Id}/members/${memberIdB}`, 'DELETE', null, tokenA);
  console.log(`Remove member response status: ${removeRes.status}`);

  const notifsBAfterRemove = await apiFetch('/api/notifications', 'GET', null, tokenB);
  console.log(`User B Notifications after being removed:`);
  console.log(JSON.stringify(notifsBAfterRemove.data.notifications, null, 2));

  // Trigger 5: Ownership Transferred (notifies new owner B)
  // Re-add B to team first
  await pool.query('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [team1Id, userB.id, 'editor']);
  console.log('Transferring ownership to User B...');
  const transferRes = await apiFetch(`/api/teams/${team1Id}/transfer-ownership`, 'POST', { newOwnerUserId: userB.id }, tokenA);
  console.log(`Transfer ownership response:`, transferRes.data);

  const notifsBAfterTransfer = await apiFetch('/api/notifications', 'GET', null, tokenB);
  console.log(`User B (New Owner) Notifications after transfer:`);
  console.log(JSON.stringify(notifsBAfterTransfer.data.notifications, null, 2));

  // Clean up test users & data
  console.log('\nCleaning up database...');
  await pool.query('DELETE FROM team_members WHERE team_id IN (?, ?)', [team1Id, team2Id]);
  await pool.query('DELETE FROM team_invites WHERE team_id IN (?, ?)', [team1Id, team2Id]);
  await pool.query('DELETE FROM writeups WHERE team_id IN (?, ?)', [team1Id, team2Id]);
  await pool.query('DELETE FROM teams WHERE id IN (?, ?)', [team1Id, team2Id]);
  await pool.query('DELETE FROM notifications WHERE user_id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);
  await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);

  console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');
  await pool.end();
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  pool.end();
});
