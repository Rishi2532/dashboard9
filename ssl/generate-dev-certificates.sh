#!/bin/bash
# Script to generate self-signed SSL certificates for development

# Make sure we're in the ssl directory
cd "$(dirname "$0")"

echo "Generating self-signed SSL certificates for development..."

# Generate a private key (2048 bit)
openssl genrsa -out privatekey.pem 2048

if [ $? -ne 0 ]; then
  echo "Failed to generate private key"
  exit 1
fi

echo "Private key generated successfully"

# Generate a self-signed certificate valid for 365 days
openssl req -new -x509 -key privatekey.pem -out certificate.pem -days 365 -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if [ $? -ne 0 ]; then
  echo "Failed to generate self-signed certificate"
  exit 1
fi

echo "Self-signed certificate generated successfully"
echo "Files created:"
echo "  - privatekey.pem"
echo "  - certificate.pem"
echo ""
echo "Restart the server to use SSL"
echo "Note: You will see browser warnings when using self-signed certificates. This is normal for development."