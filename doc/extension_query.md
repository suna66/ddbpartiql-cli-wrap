# extension query

## Describe table query

### query format

```
desc "{table name}";
```

## Create table query

### query format

```
create table "{table name}" (
    {fieldName} {N|S|B} [HASH/RANGE],
    {fieldName} {N|S|B} [HASH/RANGE]
     :
    [index {local|global} {index name} (
        {fieldName} {N|S|B} {HASH/RANGE},
        {fieldName} {N|S|B} {HASH/RANGE}
    )]
);
```

## Delete table query

### query format

```
drop table [if exists] "{table name}";
```

## Sleep query

### query format

```
sleep(ms);
```
