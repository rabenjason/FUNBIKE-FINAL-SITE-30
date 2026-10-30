-- FunBike - catalogue produits unique
-- Une seule ligne par produit : motos, pieces et equipements.

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) NOT NULL,
  product_type ENUM('bike', 'part') NOT NULL DEFAULT 'part',
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(150) NOT NULL DEFAULT '',
  category VARCHAR(150) NOT NULL DEFAULT '',
  description TEXT NULL,
  image_url VARCHAR(2048) NOT NULL,
  images JSON NOT NULL,
  image_alt VARCHAR(500) NOT NULL DEFAULT '',
  specs JSON NOT NULL,
  price VARCHAR(100) NOT NULL DEFAULT 'Sur devis',
  status ENUM('PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',

  home_new TINYINT(1) NOT NULL DEFAULT 0,
  motos_home TINYINT(1) NOT NULL DEFAULT 0,
  essentials_home TINYINT(1) NOT NULL DEFAULT 0,

  home_new_order INT NULL,
  motos_home_order INT NULL,
  essentials_home_order INT NULL,

  home_card JSON NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_products_status (status),
  INDEX idx_products_type_status (product_type, status),
  INDEX idx_products_home_new (status, home_new, home_new_order),
  INDEX idx_products_motos_home (status, motos_home, motos_home_order),
  INDEX idx_products_essentials_home (status, essentials_home, essentials_home_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Utilisateurs du futur dashboard (aucun mot de passe en clair).
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'MARKETING') NOT NULL DEFAULT 'MARKETING',
  can_delete_products TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions d'authentification : seuls les hash SHA-256 des refresh tokens
-- sont stockes. Les lignes expirees ou revoquees ne donnent plus acces.
CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_user_sessions_refresh_hash (refresh_token_hash),
  INDEX idx_user_sessions_user (user_id),
  INDEX idx_user_sessions_expires (expires_at),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
