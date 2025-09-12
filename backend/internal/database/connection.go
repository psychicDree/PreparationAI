package database

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"preparation-ai/internal/config"
)

var DB *sql.DB

func Connect() (*sql.DB, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}

	dsn := cfg.GetDatabaseDSN()

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.Database.MaxConns)
	db.SetMaxIdleConns(cfg.Database.MinConns)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	return db, nil
}

func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
