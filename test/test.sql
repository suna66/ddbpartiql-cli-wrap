# comment
- comment

insert into "ddb-test-table" value 
  {'id': 10, 'name': 'name1','age': 20};

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

!?

!h

!v
