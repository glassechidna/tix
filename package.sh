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
