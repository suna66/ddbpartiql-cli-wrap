import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ExecuteStatementCommand,
} from "@aws-sdk/lib-dynamodb";

export type DynamoDBConfig = {
    endpoint: string | undefined;
    profile: string | undefined;
    credentials: {
        accessKeyId: string | undefined;
        secretAccessKey: string | undefined;
    };
    region: string | undefined;
};

export default class DynamoDBAccessor {
    docClient: DynamoDBDocumentClient = undefined;

    constructor(config: DynamoDBConfig) {
        const client = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(client);
    }

    async execute(sql: string) {
        const statement = new ExecuteStatementCommand({
            Statement: sql,
        });
        const response = await this.docClient.send(statement);

        return response;
    }
}
