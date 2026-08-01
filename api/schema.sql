CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operations_admin', 'manager', 'warehouse', 'viewer') NOT NULL DEFAULT 'viewer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  fingerprint CHAR(64) PRIMARY KEY,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  window_started TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role VARCHAR(30) NOT NULL,
  permission_key VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role, permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE warranties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warranty_id VARCHAR(40) NOT NULL UNIQUE,
  project_number VARCHAR(6) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  site_address VARCHAR(180) NOT NULL,
  warranty_type VARCHAR(60) NOT NULL,
  issued_at DATE NOT NULL,
  status ENUM('Issued', 'Review', 'Archived') NOT NULL DEFAULT 'Review',
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_warranties_user FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_warranties_issued (issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(100) NOT NULL,
  custodian VARCHAR(100) NOT NULL,
  status ENUM('Ready', 'Checked out', 'Maintenance', 'Retired') NOT NULL DEFAULT 'Ready',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asset_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id VARCHAR(40) NOT NULL,
  from_location VARCHAR(100) NOT NULL,
  to_location VARCHAR(100) NOT NULL,
  custodian VARCHAR(100) NOT NULL,
  actor_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transfers_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_transfers_asset (asset_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NOT NULL,
  action VARCHAR(60) NOT NULL,
  title VARCHAR(120) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO role_permissions (role, permission_key) VALUES
  ('admin', 'dashboard.view'), ('admin', 'warranties.read'), ('admin', 'warranties.create'), ('admin', 'inventory.read'), ('admin', 'inventory.transfer'), ('admin', 'traceability.read'), ('admin', 'users.manage'), ('admin', 'roles.manage'),
  ('operations_admin', 'dashboard.view'), ('operations_admin', 'warranties.read'), ('operations_admin', 'warranties.create'), ('operations_admin', 'inventory.read'), ('operations_admin', 'inventory.transfer'), ('operations_admin', 'traceability.read'), ('operations_admin', 'users.manage'),
  ('manager', 'dashboard.view'), ('manager', 'warranties.read'), ('manager', 'warranties.create'), ('manager', 'inventory.read'), ('manager', 'inventory.transfer'), ('manager', 'traceability.read'),
  ('warehouse', 'dashboard.view'), ('warehouse', 'warranties.read'), ('warehouse', 'inventory.read'), ('warehouse', 'inventory.transfer'), ('warehouse', 'traceability.read'),
  ('viewer', 'dashboard.view'), ('viewer', 'warranties.read'), ('viewer', 'inventory.read'), ('viewer', 'traceability.read')
ON DUPLICATE KEY UPDATE permission_key = VALUES(permission_key);

-- Generate a real hash on the server before inserting an operator:
-- php -r "echo password_hash('REPLACE_WITH_A_LONG_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Your Name', 'you@example.com', 'PASTE_HASH_HERE', 'operations_admin');
