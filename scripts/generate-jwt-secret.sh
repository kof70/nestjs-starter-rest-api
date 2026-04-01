#!/bin/bash

# Generate a secure JWT secret without Docker
# This creates a random 64-character hexadecimal string

echo "Generating JWT secret..."
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "Generated JWT Secret:"
echo "====================="
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "Add this to your .env file:"
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "Note: Keep this secret secure and never commit it to version control!"
