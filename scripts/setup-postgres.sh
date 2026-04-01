#!/bin/bash

# Setup PostgreSQL for LMS project
# This script starts PostgreSQL, creates the database and user

echo "Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo "Waiting for PostgreSQL to be ready..."
sleep 2

echo "Creating database and user..."
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || echo "User postgres already exists"
sudo -u postgres psql -c "ALTER USER postgres WITH SUPERUSER;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE lms_db OWNER postgres;" 2>/dev/null || echo "Database lms_db already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lms_db TO postgres;"

echo "PostgreSQL setup complete!"
echo "Database: lms_db"
echo "User: postgres"
echo "Password: postgres"
echo "Connection string: postgresql://postgres:postgres@localhost:5432/lms_db"
