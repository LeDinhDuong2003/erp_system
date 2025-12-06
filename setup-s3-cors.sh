#!/bin/bash
# Setup CORS for S3 bucket

BUCKET_NAME="erp-system-2025"

aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration file://s3-cors-policy.json

echo "CORS policy applied to bucket: $BUCKET_NAME"
