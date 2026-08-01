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

-- Generate a real hash on the server before inserting an operator:
-- php -r "echo password_hash('REPLACE_WITH_A_LONG_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Your Name', 'you@example.com', 'PASTE_HASH_HERE', 'operations_admin');
