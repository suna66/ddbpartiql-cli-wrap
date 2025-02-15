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

insert into "ddb-test-table" value 
  {'id': 10, 'name': 'name1','age': 20};

insert into "ddb-test-table" value 
  {'id': 11, 'name': '${UUID}','age': 20, 'update_at': ${NOW}};

@age = 30;
@table_name = ddb-test-table;

desc "${table_name}";

select * from "ddb-test-table";


update "${table_name}"
  set age = ${age} 
  where id=10 and name='name1';

select * from "${table_name}";

select * from "ddb-test-table"."ddb-test-index" where name='name1';

delete from "ddb-test-table"
where id=10 and name='name1';

select * from "ddb-test-table";

# show created table
desc "test-create-table";

# drop table
drop table if exists "test-create-table";

sleep 3000

!?

!h

!v
