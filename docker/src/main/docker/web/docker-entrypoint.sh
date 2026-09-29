#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/local-certs
mkdir -p "$CERT_DIR"

if [ ! -s "$CERT_DIR/fullchain.pem" ] || [ ! -s "$CERT_DIR/privkey.pem" ]; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:3072 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  chmod 600 "$CERT_DIR/privkey.pem"
fi

exec nginx -g 'daemon off;'
