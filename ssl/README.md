# SSL Certificate Setup

To enable HTTPS on port 443 for local development, place your SSL certificate files in this directory:

1. `privatekey.pem` - Your private key file
2. `certificate.pem` - Your SSL certificate file

## Generating Self-Signed Certificates for Development

If you don't have SSL certificates and just want to test HTTPS locally, you can generate self-signed certificates using OpenSSL:

```bash
# Navigate to the ssl directory
cd ssl

# Generate a private key
openssl genrsa -out privatekey.pem 2048

# Generate a self-signed certificate
openssl req -new -x509 -key privatekey.pem -out certificate.pem -days 365
```

When prompted for information during certificate generation, you can use your own details or defaults for local testing.

## Important Notes

1. When using self-signed certificates, browsers will show a security warning. You'll need to manually bypass this warning during development.

2. For production, you should use proper certificates from a trusted certificate authority.

3. Running on port 443 requires administrator/root privileges on most systems. If you get permission errors, you have two options:
   - Run the application with elevated privileges (using sudo on Linux/macOS)
   - Modify the port in server/routes.ts to use a higher port number (e.g., 8443)

4. If port 443 is already in use on your system, you'll need to either:
   - Stop the service using that port
   - Change the HTTPS port in server/routes.ts