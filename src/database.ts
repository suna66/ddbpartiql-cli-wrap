import {
    DynamoDBClient,
    DescribeTableCommand,
    DescribeTableCommandOutput,
    CreateTableCommand,
    CreateTableCommandInput,
    CreateTableCommandOutput,
    DeleteTableCommand,
    DeleteTableCommandOutput,
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
    LOCAL = "local",
    GLOBAL = "global",
}

export type AttributeDefinition = {
    attributeName: string;
    attributeType: AttributeType;
    keyType: KeyType | undefined;
};

export type SecondaryIndex = {
    indexName: string;
    indexType: IndexType;
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
                                AttributName: schema.attributeName,
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
                                AttributName: schema.attributeName,
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

        const command = new CreateTableCommand(createTableParam);

        const response = await this.docClient.send(command);

        return response;
    }

    async deleteTable(tableName: string): Promise<DeleteTableCommandOutput> {
        const command = new DeleteTableCommand({
            TableName: tableName,
        });

        const response = await this.docClient.send(command);

        return response;
    }
}
