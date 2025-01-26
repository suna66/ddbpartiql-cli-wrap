# ddbpartiQL-Wrap

## Overview

PartiQL front-end wrapper tool for DynamoDB

## Install

### Build & Install

```bash
$ npm i
$ npm run build
$ npm install -g .
```

## Command

```bash
ddbpartiql [OPTIONS] [scritp file]

OPTIONS:
    -h                          printing how to use 
    -p <profile>                aws profile name
    -r <region>                 aws region name
    -v <true/false>             verbose mode
    --endpoint <url>            endpoint url
    --access_key <value>        aws credential access key id
    --secret_access_key <value> aws credential secret access key
```

## Example

#### Insert

```bash
ddbpartiql> insert into "ddb-test-table" value {'id': 10, 'name': 'name1','age': 20};
```

#### Select

```bash
ddbpartiql> select * from "ddb-test-table";
```

#### Select for INDEX

```bash
ddbpartiql> select * from "ddb-test-table"."ddb-test-index" where name='name1';
```

#### Update

```bash
ddbpartiql> update "ddb-test-table"
  set age = 25 
  set address="hogehoge"
  where id=10 and name='name1';
```

#### Delete

```bash
ddbpartiql> delete from "ddb-test-table" where id=10 and name='name1';
```

#### Describe Table

```bash
ddbpartiql> desc "ddb-test-table";
```

#### Clear prompt

```bash
ddbpartiql> clear
```

#### Exit partiql prompt

```bash
ddbpartiql> exit
```

#### Simple variable system

```bash
ddbpartiql> @variable = ddb-test-table;
ddbpartiql> select * from "${variable}"
```