import { pool } from "../db/pool.js";
import { rowToUser } from "../users/user.mapper.js";

export async function createSession({ id, userId, refreshTokenHash, expiresAt, ipAddress, userAgent }) {
  await pool.query(
    `INSERT INTO user_sessions
      (id, user_id, refresh_token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, refreshTokenHash, expiresAt, ipAddress ?? null, userAgent ?? null],
  );
}

export async function findSessionByRefreshHash(refreshTokenHash) {
  const [rows] = await pool.query(
    `SELECT
       s.id AS session_id,
       s.user_id,
       s.refresh_token_hash,
       s.expires_at,
       s.revoked_at,
       u.id,
       u.name,
       u.email,
       u.role,
       u.can_delete_products,
       u.created_at,
       u.updated_at
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = ?`,
    [refreshTokenHash],
  );

  if (!rows[0]) return undefined;

  return {
    session: {
      id: rows[0].session_id,
      userId: Number(rows[0].user_id),
      expiresAt: rows[0].expires_at,
      revokedAt: rows[0].revoked_at,
    },
    user: rowToUser(rows[0]),
  };
}

export async function findActiveSession(sessionId, userId) {
  const [rows] = await pool.query(
    `SELECT
       s.id AS session_id,
       s.user_id,
       s.expires_at,
       s.revoked_at,
       u.id,
       u.name,
       u.email,
       u.role,
       u.can_delete_products,
       u.created_at,
       u.updated_at
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.user_id = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()`,
    [sessionId, userId],
  );

  if (!rows[0]) return undefined;

  return {
    session: {
      id: rows[0].session_id,
      userId: Number(rows[0].user_id),
      expiresAt: rows[0].expires_at,
      revokedAt: rows[0].revoked_at,
    },
    user: rowToUser(rows[0]),
  };
}

export async function rotateSession(sessionId, refreshTokenHash, expiresAt) {
  const [result] = await pool.query(
    `UPDATE user_sessions
     SET refresh_token_hash = ?, expires_at = ?, last_used_at = NOW(), revoked_at = NULL
     WHERE id = ? AND revoked_at IS NULL`,
    [refreshTokenHash, expiresAt, sessionId],
  );
  return result.affectedRows > 0;
}

export async function revokeSessionByRefreshHash(refreshTokenHash) {
  const [result] = await pool.query(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE refresh_token_hash = ? AND revoked_at IS NULL`,
    [refreshTokenHash],
  );
  return result.affectedRows > 0;
}

export async function revokeSessionById(sessionId) {
  const [result] = await pool.query(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [sessionId],
  );
  return result.affectedRows > 0;
}

export async function revokeAllUserSessions(userId, exceptSessionId = undefined) {
  const values = [userId];
  let exceptClause = "";
  if (exceptSessionId) {
    exceptClause = " AND id <> ?";
    values.push(exceptSessionId);
  }

  const [result] = await pool.query(
    `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL${exceptClause}`,
    values,
  );
  return result.affectedRows;
}
