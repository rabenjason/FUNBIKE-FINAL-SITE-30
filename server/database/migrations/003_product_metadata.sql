-- Ajoute la colonne metadata aux bases existantes, sans erreur si elle existe deja.
SET @metadata_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'metadata'
);
SET @metadata_sql = IF(
  @metadata_exists = 0,
  'ALTER TABLE products ADD COLUMN metadata JSON NULL AFTER home_card',
  'SELECT 1'
);
PREPARE metadata_stmt FROM @metadata_sql;
EXECUTE metadata_stmt;
DEALLOCATE PREPARE metadata_stmt;
