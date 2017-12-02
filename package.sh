#!/bin/bash
set -exo pipefail
#$deps=$(jq -r '.dependencies | to_entries[] | select(.value.dev != true) | .key' package-lock.json)
rm -rf .tmp
mkdir -p .tmp/node_modules
for dep in $(jq -r '.dependencies | to_entries[] | select(.value.dev != true) | .key' package-lock.json); do
  cp -rf node_modules/$dep .tmp/node_modules/
done;
rm -rf .tmp/node_modules/aws-sdk/dist
rm -rf .tmp/node_modules/aws-sdk/**/*.d.ts
npx tsc
cp -rf src .tmp/
(cd .tmp && zip -r ../package.zip .)

S3_BUCKET=tix-dev-serverlessdeploymentbucket-1q3d6t573tfkn
S3_KEY=package.zip

aws s3 cp package.zip s3://$S3_BUCKET/$S3_KEY
S3_OBJVER=$(aws s3api head-object --bucket $S3_BUCKET --key $S3_KEY --query VersionId --output text)

stackit up \
  --stack-name tix-test \
  --template cfn.yml \
  --previous-param-value NewEmailTopic \
  --previous-param-value S3Bucket \
  --previous-param-value S3Key \
  --previous-param-value MailBucket \
  --param-value S3ObjectVersion=$S3_OBJVER \
