#!/bin/bash

ENDPOINT=http://localhost:4566
REGION=ap-northeast-1
TEST_TABLE_JSON=test_table.json
TEST_TABLE_NAME=ddb-test-table
TEST_SQL=test.sql
ERROR_FLG=0

cd "$(dirname "$0")"

docker compose up -d

export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=${REGION}
# export no_proxy=localhost,127.0.0.1,[::1]

aws dynamodb create-table --cli-input-json file://${TEST_TABLE_JSON} --endpoint-url=${ENDPOINT} --no-cli-pager
if [ $? -ne 0 ]; then
    echo "[ERROR] create table error"
    ERROR_FLG=1
fi

../bin/cli.js -r ${REGION} --endpoint ${ENDPOINT} ${TEST_SQL}
if [ $? -ne 0 ]; then
    echo "[ERROR] ddbpartiql cli error"
    ERROR_FLG=1
fi

aws dynamodb delete-table --table-name ${TEST_TABLE_NAME} --endpoint-url=${ENDPOINT} --no-cli-pager
if [ $? -ne 0 ]; then
    echo "[ERROR] delete table error"
    ERROR_FLG=1
fi

docker compose down

if [ $ERROR_FLG -eq 1 ]; then
    echo "ERROR."
    exit 1
fi

echo "SUCCESS."
exit 0
