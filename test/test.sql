# comment
- comment

# Create Table
drop table if exists "test-create-table";
create table "test-create-table" (
    id N HASH,
    name S RANGE,
    age N,
    index local "index-test-local"(
        id N HASH,
        age N RANGE
    ),
    index global "index-test-global"(
        name S HASH,
        age N RANGE
    )
);

# show all tables;
show tables;

insert into "ddb-test-table" value 
  {'id': 10, 'name': 'name1','age': 20};

insert into "ddb-test-table" value 
  {'id': 11, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};

# complement test(insert)
insert into ddb-test-table value 
  {"id": 12, "name": "name2","age": 30, "update_at": ${NOW}};

@age = 30;
@table_name = ddb-test-table;

desc "${table_name}";

select * from "ddb-test-table";


update "${table_name}"
  set age = ${age} 
  where id=10 and name='name1';

update ${table_name}
  set age = 50
  where id=12 and name='name2';

select * from "${table_name}";

select * from 
${table_name};

select    *     from          ${table_name};

. ./sub.sql
# . ./aaaa.sql

select * from "ddb-test-table"."ddb-test-index" where name='name1';
select * from ddb-test-table.ddb-test-index where name='name1';

delete from "ddb-test-table"
where id=10 and name='name1';

delete from ddb-test-table
where id=12 and name="name2";

select * from "ddb-test-table";

show tables;
connect -r us-east-1
show tables;
connect -r ap-northeast-1

# show created table
desc "test-create-table";

insert into "test-create-table" value 
  {'id': 20, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 21, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 22, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 23, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 24, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 25, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 26, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 27, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 28, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 29, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 30, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 31, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 32, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 33, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 34, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 35, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 36, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 37, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};

insert into "test-create-table" value 
  {'id': 38, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 39, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 40, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 41, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 42, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 43, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 44, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 45, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 46, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 47, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 48, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 49, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 50, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 51, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 52, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 53, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};
insert into "test-create-table" value 
  {'id': 54, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};

select * from test-create-table;
trancate table test-create-table;

select * from test-create-table;


# drop table
drop table if exists "test-create-table";

sleep 3000

!?

!h

!v

echo "echo test ${table_name}" "hello" 10