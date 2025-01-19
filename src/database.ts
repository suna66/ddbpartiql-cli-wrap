import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ExecuteStatementCommand,
} from "@aws-sdk/lib-dynamodb";

export default class DynamoDBAccessor {
    docClient: DynamoDBDocumentClient = undefined;

    constructor(profile: string, region: string) {
        const client = new DynamoDBClient({ region: region, profile: profile });
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
