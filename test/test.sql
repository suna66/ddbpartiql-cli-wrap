# comment
- comment

insert into "ddb-test-table" value 
  {'id': 10, 'name': 'name1','age': 20};

desc "ddb-test-table";

select * from "ddb-test-table";

update "ddb-test-table"
  set age = 25 
  where id=10 and name='name1';

select * from "ddb-test-table";

select * from "ddb-test-table"."ddb-test-index" where name='name1';

delete from "ddb-test-table"
where id=10 and name='name1';

select * from "ddb-test-table";
