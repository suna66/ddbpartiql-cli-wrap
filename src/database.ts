import {
    DynamoDBClient,
    DescribeTableCommand,
    DescribeTableCommandOutput,
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ExecuteStatementCommand,
    ExecuteStatementCommandOutput,
} from "@aws-sdk/lib-dynamodb";

export type DynamoDBConfig = {
    endpoint: string | undefined;
    profile: string | undefined;
    credentials:
        | {
              accessKeyId: string | undefined;
              secretAccessKey: string | undefined;
          }
        | undefined;
    region: string | undefined;
};

export default class DynamoDBAccessor {
    docClient: DynamoDBDocumentClient = undefined;

    constructor(config: DynamoDBConfig) {
        const client = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(client);
    }

    async execute(sql: string): Promise<ExecuteStatementCommandOutput> {
        const statement = new ExecuteStatementCommand({
            Statement: sql,
        });
        const response = await this.docClient.send(statement);

        return response;
    }

    async describe(tableName: string): Promise<DescribeTableCommandOutput> {
        const command = new DescribeTableCommand({
            TableName: tableName,
        });

        const response = await this.docClient.send(command);

        return response;
    }
}
