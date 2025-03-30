import {
    DynamoDBClient,
    DescribeTableCommand,
    DescribeTableCommandOutput,
    CreateTableCommand,
    CreateTableCommandInput,
    CreateTableCommandOutput,
    DeleteTableCommand,
    DeleteTableCommandOutput,
    ResourceNotFoundException,
    ListTablesCommand,
    ListTablesCommandOutput,
    ScanCommand,
    ScanCommandOutput,
    DeleteItemCommand,
    DeleteItemCommandOutput,
    AttributeValue,
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ExecuteStatementCommand,
    ExecuteStatementCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { DEBUG } from "./utils";
import { table } from "node:console";

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

export enum AttributeType {
    NUMBER = "N",
    STRING = "S",
    BINALY = "B",
}

export enum KeyType {
    HASH = "HASH",
    RANGE = "RANGE",
}

export enum IndexType {
    LOCAL = "LOCAL",
    GLOBAL = "GLOBAL",
}

export type AttributeDefinition = {
    attributeName: string;
    attributeType: AttributeType | string;
    keyType: KeyType | string | undefined;
};

export type SecondaryIndex = {
    indexName: string;
    indexType: IndexType | string;
    attributeDefinitinList: Array<AttributeDefinition>;
};

export type CreateTableRequest = {
    tableName: string;
    attributeDefinitinList: Array<AttributeDefinition>;
    indexes: Array<SecondaryIndex>;
};

export default class DynamoDBAccessor {
    docClient: DynamoDBDocumentClient = undefined;

    constructor(config: DynamoDBConfig) {
        const client = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(client);
    }

    async execute(
        sql: string,
        limit: number
    ): Promise<ExecuteStatementCommandOutput> {
        const statement = new ExecuteStatementCommand({
            Statement: sql,
            Limit: limit > 0 ? limit : undefined,
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

    async createTable(
        req: CreateTableRequest
    ): Promise<CreateTableCommandOutput> {
        let createTableParam: CreateTableCommandInput = {
            TableName: req.tableName,
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [],
            KeySchema: [],
        };

        let attributeDefinitions = [];
        let keySchema = [];
        for (let attributes of req.attributeDefinitinList) {
            const attr = {
                AttributeName: attributes.attributeName,
                AttributeType: attributes.attributeType,
            };
            attributeDefinitions.push(attr);
            if (attributes.keyType != undefined) {
                const schema = {
                    AttributeName: attributes.attributeName,
                    KeyType: attributes.keyType,
                };
                keySchema.push(schema);
            }
        }
        createTableParam.AttributeDefinitions = attributeDefinitions;
        createTableParam.KeySchema = keySchema;

        let localSecondaryIndexes = undefined;
        let globalSecondaryIndexs = undefined;
        if (req.indexes != undefined) {
            for (let index of req.indexes) {
                if (index.indexType == IndexType.LOCAL) {
                    let indexInfo = {
                        IndexName: index.indexName,
                        Projection: { ProjectionType: "ALL" },
                    };
                    let indexKeyScema = [];
                    for (let schema of index.attributeDefinitinList) {
                        if (
                            schema.keyType == KeyType.HASH ||
                            schema.keyType == KeyType.RANGE
                        ) {
                            indexKeyScema.push({
                                AttributeName: schema.attributeName,
                                KeyType: schema.keyType,
                            });
                        }
                    }
                    indexInfo["KeySchema"] = indexKeyScema;
                    if (localSecondaryIndexes == undefined)
                        localSecondaryIndexes = [];
                    localSecondaryIndexes.push(indexInfo);
                } else {
                    let indexInfo = {
                        IndexName: index.indexName,
                        Projection: { ProjectionType: "ALL" },
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 1,
                            WriteCapacityUnits: 1,
                        },
                    };
                    let indexKeyScema = [];
                    for (let schema of index.attributeDefinitinList) {
                        if (
                            schema.keyType == KeyType.HASH ||
                            schema.keyType == KeyType.RANGE
                        ) {
                            indexKeyScema.push({
                                AttributeName: schema.attributeName,
                                KeyType: schema.keyType,
                            });
                        }
                    }
                    indexInfo["KeySchema"] = indexKeyScema;
                    if (globalSecondaryIndexs == undefined)
                        globalSecondaryIndexs = [];
                    globalSecondaryIndexs.push(indexInfo);
                }
            }
        }
        if (localSecondaryIndexes != undefined) {
            createTableParam["LocalSecondaryIndexes"] = localSecondaryIndexes;
        }
        if (globalSecondaryIndexs != undefined) {
            createTableParam["GlobalSecondaryIndexes"] = globalSecondaryIndexs;
        }

        if (DEBUG) console.log("%o", createTableParam);

        const command = new CreateTableCommand(createTableParam);

        const response = await this.docClient.send(command);

        return response;
    }

    async deleteTable(
        tableName: string,
        ingnorNotFound: boolean
    ): Promise<DeleteTableCommandOutput> {
        const command = new DeleteTableCommand({
            TableName: tableName,
        });

        let response = undefined;
        try {
            response = await this.docClient.send(command);
        } catch (e) {
            if (e instanceof ResourceNotFoundException) {
                if (ingnorNotFound) {
                    return undefined;
                }
            }
            throw e;
        }

        return response;
    }

    async showTables(
        lastEvaluatedTableName: string
    ): Promise<ListTablesCommandOutput> {
        const command = new ListTablesCommand({
            ExclusiveStartTableName: lastEvaluatedTableName,
        });
        const response = await this.docClient.send(command);
        return response;
    }

    async scanTable(tableName: string): Promise<ScanCommandOutput> {
        const command = new ScanCommand({
            TableName: tableName,
            Limit: 25,
        });

        const response = await this.docClient.send(command);
        return response;
    }

    async deleteItem(
        tableName: string,
        keys: Record<string, AttributeValue>
    ): Promise<DeleteItemCommandOutput> {
        const command = new DeleteItemCommand({
            TableName: tableName,
            Key: keys,
        });
        const response = await this.docClient.send(command);
        return response;
    }
}
