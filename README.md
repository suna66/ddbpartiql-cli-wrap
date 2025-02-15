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
    -h/--help                   printing how to use
    -p/--profile {profile}      aws profile name
    -r/--region  {region}       aws region name
    -v/--verbose                verbose mode
    -E/--endpoint {url}         endpoint url
    -F/--format {json/table}    query response format(default: json)
    --access_key {value}        aws credential access key id
    --secret_access_key {value} aws credential secret access key
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

#### Show Tables(extension query)

```bash
ddbpartiql> show tables;
```

#### Describe Table(extension query)

```bash
ddbpartiql> desc "ddb-test-table";
```

#### Create Table(extension query)

```bash
ddbpartiql> create table "test-table"(id N HASH, age N RANGE, index global "index-global"(age N HASH));
```

#### Drop Table(extension query)

```bash
ddbpartiql> drop table "test-table";
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

#### build-in variables

- `UUID` : Generating UUID.
- `NOW`  : Current UNIX epoch time(Second).

#### build-in functions

- `sleep {integer}`   : sleep thread(ms)
- `clear`             : clear console
- `exit`              : exit prompt
- `connect`           : re-connect dynamodb
    ```
    [OPTIOIN]
    -p/--profile {profile}      aws profile name
    -r/--region  {region}       aws region name
    -E/--endpoint {url}         endpoint url
    --access_key {value}        aws credential access key id
    --secret_access_key {value} aws credential secret access key
    ```
- `echo` [string]...  : output string

## Copyright and Disclaimer

This software is free software. Please feel free to use it. The copyright is held by the author, "suna66".

Neither I, anyone related to me, nor any of the organizations or groups I belong to, will be held responsible for any damages, losses, or other inconveniences that may arise from the use of this software. Use at your own risk.
