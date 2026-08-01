<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    echo json_encode(['message' => 'API is not configured. Copy api/config.example.php to api/config.php on the server.']);
    exit;
}

$config = require $configPath;
session_name('orius_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (bool)($config['session_secure'] ?? true),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input') ?: '{}';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function database(array $config): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $pdo = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function publicUser(array $user): array
{
    return ['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']];
}

function currentUser(): ?array
{
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function requireAuth(): array
{
    $user = currentUser();
    if (!$user) {
        respond(['message' => 'Authentication required.'], 401);
    }
    return $user;
}

function requireRoles(array $roles): array
{
    $user = requireAuth();
    if (!in_array($user['role'], $roles, true)) {
        respond(['message' => 'Your role cannot perform this action.'], 403);
    }
    return $user;
}

function requireCsrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$sent || !hash_equals((string)$_SESSION['csrf_token'], $sent)) {
        respond(['message' => 'Invalid security token. Refresh the page and try again.'], 419);
    }
}

function validRole(string $role): bool
{
    return in_array($role, ['admin', 'operations_admin', 'manager', 'warehouse', 'viewer'], true);
}

function roleCanCreate(string $actorRole, string $newRole): bool
{
    if ($actorRole === 'admin') return validRole($newRole);
    if ($actorRole === 'operations_admin') return in_array($newRole, ['operations_admin', 'manager', 'warehouse', 'viewer'], true);
    return false;
}

function validPermission(string $permission): bool
{
    return in_array($permission, ['dashboard.view', 'warranties.read', 'warranties.create', 'inventory.read', 'inventory.transfer', 'traceability.read', 'users.manage', 'roles.manage'], true);
}

function textField(array $data, string $key, int $max, bool $required = true): string
{
    $value = trim((string)($data[$key] ?? ''));
    if ($required && $value === '') {
        respond(['message' => "Field {$key} is required."], 422);
    }
    if (mb_strlen($value) > $max) {
        respond(['message' => "Field {$key} is too long."], 422);
    }
    return $value;
}

$action = (string)($_GET['action'] ?? 'session');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    $pdo = database($config);

    if ($action === 'login' && $method === 'POST') {
        $data = body();
        $email = strtolower(textField($data, 'email', 190));
        $password = (string)($data['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            respond(['message' => 'Invalid email or password.'], 401);
        }
        $fingerprint = hash_hmac('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $email, (string)$config['app_key']);
        $attempts = $pdo->prepare('SELECT attempts, window_started FROM login_attempts WHERE fingerprint = :fingerprint LIMIT 1');
        $attempts->execute(['fingerprint' => $fingerprint]);
        $attempt = $attempts->fetch();
        if ($attempt && strtotime((string)$attempt['window_started']) > (time() - 900) && (int)$attempt['attempts'] >= 5) {
            respond(['message' => 'Too many attempts. Try again in a few minutes.'], 429);
        }
        $statement = $pdo->prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = :email AND is_active = 1 LIMIT 1');
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $recordAttempt = $pdo->prepare('INSERT INTO login_attempts (fingerprint, attempts, window_started) VALUES (:fingerprint, 1, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE attempts = IF(window_started < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), 1, attempts + 1), window_started = IF(window_started < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), CURRENT_TIMESTAMP, window_started)');
            $recordAttempt->execute(['fingerprint' => $fingerprint]);
            usleep(250000);
            respond(['message' => 'Invalid email or password.'], 401);
        }
        $clearAttempts = $pdo->prepare('DELETE FROM login_attempts WHERE fingerprint = :fingerprint');
        $clearAttempts->execute(['fingerprint' => $fingerprint]);
        session_regenerate_id(true);
        $_SESSION['user'] = publicUser($user);
        respond(['user' => $_SESSION['user'], 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($action === 'logout' && $method === 'POST') {
        requireAuth(); requireCsrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], '', (bool)$params['secure'], (bool)$params['httponly']);
        }
        session_destroy();
        respond(['ok' => true]);
    }

    if ($action === 'session' && $method === 'GET') {
        $user = currentUser();
        if (!$user) respond(['message' => 'Authentication required.', 'csrfToken' => $_SESSION['csrf_token']], 401);
        respond(['user' => $user, 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($action === 'request-password-reset' && $method === 'POST') {
        $data = body();
        $email = strtolower(textField($data, 'email', 190));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['message' => 'If the account exists, recovery instructions will be sent shortly.']);
        $resetFingerprint = hash_hmac('sha256', 'reset|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $email, (string)$config['app_key']);
        $resetAttempts = $pdo->prepare('SELECT attempts, window_started FROM login_attempts WHERE fingerprint = :fingerprint LIMIT 1');
        $resetAttempts->execute(['fingerprint' => $resetFingerprint]);
        $resetAttempt = $resetAttempts->fetch();
        if ($resetAttempt && strtotime((string)$resetAttempt['window_started']) > (time() - 900) && (int)$resetAttempt['attempts'] >= 5) {
            respond(['message' => 'If the account exists, recovery instructions will be sent shortly.']);
        }
        $recordResetAttempt = $pdo->prepare('INSERT INTO login_attempts (fingerprint, attempts, window_started) VALUES (:fingerprint, 1, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE attempts = IF(window_started < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), 1, attempts + 1), window_started = IF(window_started < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), CURRENT_TIMESTAMP, window_started)');
        $recordResetAttempt->execute(['fingerprint' => $resetFingerprint]);
        $statement = $pdo->prepare('SELECT id FROM users WHERE email = :email AND is_active = 1 LIMIT 1');
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        if ($user) {
            $rawToken = bin2hex(random_bytes(32));
            $insert = $pdo->prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:user, :token, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE))');
            $insert->execute(['user' => $user['id'], 'token' => hash('sha256', $rawToken)]);
            // A private mail adapter must deliver the raw token. Never return it to the browser.
        }
        respond(['message' => 'If the account exists, recovery instructions will be sent shortly.']);
    }

    requireAuth();

    if ($action === 'users' && $method === 'GET') {
        requireRoles(['admin', 'operations_admin']);
        $records = $pdo->query("SELECT id, name, email, role, IF(is_active = 1, 'Active', 'Suspended') AS status, DATE_FORMAT(created_at, '%d %b %Y') AS lastAccess FROM users ORDER BY name ASC LIMIT 500")->fetchAll();
        respond(['records' => $records]);
    }

    if ($action === 'users' && $method === 'POST') {
        $actor = requireRoles(['admin', 'operations_admin']); requireCsrf(); $data = body();
        $name = textField($data, 'name', 100); $email = strtolower(textField($data, 'email', 190)); $password = (string)($data['password'] ?? ''); $role = textField($data, 'role', 30);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['message' => 'Work email is invalid.'], 422);
        if (strlen($password) < 12 || strlen($password) > 128) respond(['message' => 'Temporary password must be between 12 and 128 characters.'], 422);
        if (!roleCanCreate((string)$actor['role'], $role)) respond(['message' => 'Your role cannot assign that profile.'], 403);
        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :password_hash, :role)');
            $insert->execute(['name' => $name, 'email' => $email, 'password_hash' => password_hash($password, PASSWORD_DEFAULT), 'role' => $role]);
            $id = (int)$pdo->lastInsertId();
            $audit = $pdo->prepare('INSERT INTO audit_events (actor_id, action, title, detail, entity_type, entity_id) VALUES (:actor, "user.created", "User profile created", :detail, "user", :entity)');
            $audit->execute(['actor' => $actor['id'], 'detail' => $email . ' · ' . $role, 'entity' => (string)$id]);
            $pdo->commit();
            respond(['id' => $id], 201);
        } catch (PDOException $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ((int)$error->errorInfo[1] === 1062) respond(['message' => 'A user with that email already exists.'], 409);
            throw $error;
        }
    }

    if ($action === 'permissions' && $method === 'GET') {
        requireRoles(['admin', 'operations_admin']);
        $rows = $pdo->query('SELECT role, permission_key FROM role_permissions ORDER BY role, permission_key')->fetchAll();
        $permissions = [];
        foreach ($rows as $row) $permissions[$row['role']][] = $row['permission_key'];
        respond(['records' => $permissions]);
    }

    if ($action === 'permissions' && $method === 'PUT') {
        requireRoles(['admin']); requireCsrf(); $data = body(); $requested = $data['permissions'] ?? [];
        if (!is_array($requested)) respond(['message' => 'Permission policy is invalid.'], 422);
        $normalizedPolicy = [];
        foreach ($requested as $role => $permissionList) {
            if (!validRole((string)$role) || !is_array($permissionList)) respond(['message' => 'Permission policy contains an invalid profile.'], 422);
            $normalizedPolicy[$role] = [];
            foreach ($permissionList as $permission) {
                if (!validPermission((string)$permission)) respond(['message' => 'Permission policy contains an invalid capability.'], 422);
                $normalizedPolicy[$role][] = $permission;
            }
        }
        $pdo->beginTransaction();
        $pdo->exec('DELETE FROM role_permissions');
        $insert = $pdo->prepare('INSERT INTO role_permissions (role, permission_key) VALUES (:role, :permission)');
        foreach ($normalizedPolicy as $role => $permissionList) {
            foreach ($permissionList as $permission) {
                $insert->execute(['role' => $role, 'permission' => $permission]);
            }
        }
        $pdo->commit();
        respond(['ok' => true]);
    }

    if ($action === 'warranties' && $method === 'GET') {
        $records = $pdo->query("SELECT warranty_id AS id, project_number AS project, customer_name AS customer, site_address AS site, warranty_type AS type, issued_at AS issued, status FROM warranties ORDER BY issued_at DESC, id DESC LIMIT 200")->fetchAll();
        respond(['records' => $records]);
    }

    if ($action === 'assets' && $method === 'GET') {
        $records = $pdo->query("SELECT asset_id AS id, name, location, custodian AS owner, status FROM assets ORDER BY name ASC LIMIT 500")->fetchAll();
        respond(['records' => $records]);
    }

    if ($action === 'timeline' && $method === 'GET') {
        $records = $pdo->query("SELECT title, detail, DATE_FORMAT(created_at, '%d %b · %H:%i') AS time FROM audit_events ORDER BY created_at DESC, id DESC LIMIT 100")->fetchAll();
        respond(['records' => $records]);
    }

    if ($action === 'warranties' && $method === 'POST') {
        $user = requireRoles(['admin', 'operations_admin', 'manager']); requireCsrf(); $data = body();
        $project = strtoupper(textField($data, 'project', 6));
        if (!preg_match('/^OR-[0-9]{3}$/', $project)) respond(['message' => 'Project number must look like OR-019.'], 422);
        $customer = textField($data, 'customer', 100); $site = textField($data, 'site', 180); $type = textField($data, 'type', 60);
        $issued = textField($data, 'issued', 10);
        $date = DateTime::createFromFormat('Y-m-d', $issued);
        if (!$date || $date->format('Y-m-d') !== $issued) respond(['message' => 'Issued date is invalid.'], 422);
        $warrantyId = 'WAR-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(2)));
        $pdo->beginTransaction();
        $insert = $pdo->prepare('INSERT INTO warranties (warranty_id, project_number, customer_name, site_address, warranty_type, issued_at, status, created_by) VALUES (:id, :project, :customer, :site, :type, :issued, "Issued", :user)');
        $insert->execute(['id' => $warrantyId, 'project' => $project, 'customer' => $customer, 'site' => $site, 'type' => $type, 'issued' => $issued, 'user' => $user['id']]);
        $audit = $pdo->prepare('INSERT INTO audit_events (actor_id, action, title, detail, entity_type, entity_id) VALUES (:actor, "warranty.created", "Warranty certificate issued", :detail, "warranty", :entity)');
        $audit->execute(['actor' => $user['id'], 'detail' => $warrantyId . ' · ' . $customer, 'entity' => $warrantyId]);
        $pdo->commit();
        respond(['id' => $warrantyId], 201);
    }

    if ($action === 'transfers' && $method === 'POST') {
        $user = requireRoles(['admin', 'operations_admin', 'manager', 'warehouse']); requireCsrf(); $data = body();
        $assetId = textField($data, 'assetId', 40); $destination = textField($data, 'destination', 100); $custodian = textField($data, 'custodian', 100);
        $pdo->beginTransaction();
        $find = $pdo->prepare('SELECT location, custodian, status FROM assets WHERE asset_id = :id FOR UPDATE'); $find->execute(['id' => $assetId]); $old = $find->fetch();
        if (!$old) { $pdo->rollBack(); respond(['message' => 'Asset not found.'], 404); }
        $update = $pdo->prepare('UPDATE assets SET location = :location, custodian = :custodian, status = "Checked out", updated_at = CURRENT_TIMESTAMP WHERE asset_id = :id');
        $update->execute(['location' => $destination, 'custodian' => $custodian, 'id' => $assetId]);
        $transfer = $pdo->prepare('INSERT INTO asset_transfers (asset_id, from_location, to_location, custodian, actor_id) VALUES (:asset, :from_location, :to_location, :custodian, :actor)');
        $transfer->execute(['asset' => $assetId, 'from_location' => $old['location'], 'to_location' => $destination, 'custodian' => $custodian, 'actor' => $user['id']]);
        $audit = $pdo->prepare('INSERT INTO audit_events (actor_id, action, title, detail, entity_type, entity_id) VALUES (:actor, "asset.transferred", "Asset handoff recorded", :detail, "asset", :entity)');
        $audit->execute(['actor' => $user['id'], 'detail' => $assetId . ' · ' . $destination, 'entity' => $assetId]);
        $pdo->commit();
        respond(['ok' => true]);
    }

    respond(['message' => 'Unknown action or method.'], 404);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log($error->getMessage());
    respond(['message' => 'Unexpected server error. Check the server logs.'], 500);
}
