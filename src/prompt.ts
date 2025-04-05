import { keyInput } from "./input";
import DynamoDBAccessor, {
    DynamoDBConfig,
    AttributeDefinition,
    SecondaryIndex,
    AttributeType,
    CreateTableRequest,
    IndexType,
} from "./database";
import FileReader from "./file_reader";
import { Lex } from "./lex";
import {
    OptionType,
    InputType,
    DELIMITTER,
    HISTORY_LIST_MAX,
    AnalysisType,
} from "./types";
import {
    trimStr,
    semicolonToBlank,
    convertVariables,
    DEBUG,
    setDebug,
} from "./utils";
import { AttributeValue, KeyType } from "@aws-sdk/client-dynamodb";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";
import { paritqlComplement } from "./complement";

let variables: { [key: string]: string | undefined } = {};
let historyList: Array<string> = [];
let currentNextToken: string | undefined = undefined;
const scriptList: Array<FileReader> = [];

const promptLabel = "ddbql> ";
const promptCmdHelp = `
  !?             show help message
  !h             show execute query history
  !v             show variables and values
  clear          clear console
  exit           exit ddbql cli
`;

type BuildInFuncType = {
    name: string;
    func: (cmd: string, option: OptionType) => Promise<AnalysisType>;
};

const buildInFunctions: Array<BuildInFuncType> = [
    {
        name: "sleep",
        func: sleepFunction,
    },
    {
        name: "clear",
        func: clearFunction,
    },
    {
        name: "exit",
        func: exitFunction,
    },
    {
        name: "!",
        func: optionFunction,
    },
    {
        name: "connect",
        func: connectFunction,
    },
    {
        name: ".",
        func: loadScriptFunction,
    },
    {
        name: "echo",
        func: echoFunction,
    },
];

function checkPromptCmd(cmd: string): InputType {
    switch (cmd[1]) {
        case "h":
            return InputType.TYPE_SHOW_HISTORY;
        case "c":
            return InputType.TYPE_SHOW_CURRENT_CMD;
        case "v":
            return InputType.TYPE_SHOW_VARIABLES;
        case "?":
            return InputType.TYPE_SHOW_HELP;
        default:
            break;
    }
    return InputType.TYPE_UNKNOWN;
}

function checkInput(input: string): InputType {
    if (input == undefined) {
        InputType.TYPE_CONTINUE;
    }
    let cmd = input.trim();

    if (cmd.length == 0) {
        InputType.TYPE_CONTINUE;
    }
    if (cmd[0] == "#" || cmd[0] == "-") {
        return InputType.TYPE_COMMENT;
    }
    if (cmd[cmd.length - 1] == ";") {
        return InputType.TYPE_RUN;
    }

    return InputType.TYPE_CONTINUE;
}

function addHistory(cmd: string) {
    if (cmd != undefined) {
        historyList.push(cmd);
        if (historyList.length > HISTORY_LIST_MAX) {
            historyList.shift();
        }
    }
}

async function executePartiQL(
    db: DynamoDBAccessor,
    sql: string,
    option: OptionType,
    nextToken: string
): Promise<boolean> {
    try {
        currentNextToken = undefined;
        let originSQL = sql;
        if (sql == undefined || sql.length == 0) {
            console.error("unknown query: undefined or blank");
            return false;
        }
        sql = convertVariables(semicolonToBlank(sql), variables);
        let complementSql = paritqlComplement(sql);
        if (complementSql == undefined) {
            console.error("partiql syntax error %s", originSQL);
            return false;
        }
        if (DEBUG) console.log(complementSql);
        const response = await db.execute(
            complementSql.sql,
            complementSql.limit,
            nextToken
        );
        if (DEBUG) console.log("%o", response);

        if (response != undefined) {
            const meta = response["$metadata"];
            console.log("http status code: ", meta.httpStatusCode);
            if (response.Items != undefined) {
                if (option.format == "table") {
                    console.table(response.Items);
                } else {
                    console.log(JSON.stringify(response.Items, null, 2));
                }
            }
            if (response.LastEvaluatedKey != undefined) {
                console.log(JSON.stringify(response.LastEvaluatedKey, null, 2));
            }
            if (response.NextToken != undefined) {
                currentNextToken = response.NextToken;
                console.log("NextToken: %s", response.NextToken);
            }
        }
        addHistory(originSQL);
    } catch (e) {
        console.error(e.toString());
        return false;
    }
    return true;
}

async function executeDesc(
    db: DynamoDBAccessor,
    cmd: string
): Promise<boolean> {
    let originCmd = cmd;
    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);

    let txt = lex.next();
    if (txt.toUpperCase() != "DESC") {
        console.error("DESC query error");
        return false;
    }
    let tableName = lex.next();
    if (tableName == undefined) {
        console.error("undefined table name");
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.error("desc syntax error [%s]", cmd);
        return false;
    }
    try {
        if (DEBUG) console.log(cmd);
        const response = await db.describe(tableName);
        if (response != undefined) {
            const meta = response["$metadata"];
            console.log("http status code: ", meta.httpStatusCode);
            if (response.Table != undefined) {
                console.log(JSON.stringify(response.Table, null, 2));
            }
        }
        addHistory(originCmd);
    } catch (e) {
        console.error(e.toString());
        return false;
    }

    return true;
}

async function executeCreateTable(
    db: DynamoDBAccessor,
    cmd: string
): Promise<boolean> {
    let originSQL = cmd;

    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);
    lex.next();
    let txt = lex.next();
    if (txt.toUpperCase() != "TABLE") {
        console.error("create table syntax error [%s]", cmd);
        return false;
    }
    let tableName = lex.next();
    if (tableName == undefined) {
        if (DEBUG) console.error("undefined table name");
        console.error("create table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt != "(") {
        console.error("create table syntax error [%s]", cmd);
        return false;
    }
    let attributeDefinitions: Array<AttributeDefinition> = [];
    let secondaryIndexes: Array<SecondaryIndex> = undefined;
    while (1) {
        txt = lex.next();
        if (txt.toUpperCase() == "INDEX") {
            if (secondaryIndexes == undefined) secondaryIndexes = [];
            txt = lex.next();
            txt = txt.toUpperCase();
            if (txt != IndexType.LOCAL && txt != IndexType.GLOBAL) {
                if (DEBUG) console.error("illegal index type for INDEX");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let indexType = txt;
            let indexName = lex.next();
            if (indexName == undefined) {
                if (DEBUG) console.error("undefined index name for INDEX");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }

            txt = lex.next();
            if (txt != "(") {
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let indexAttributeDefinitinList: Array<AttributeDefinition> = [];
            while (1) {
                txt = lex.next();
                let attrName = txt;
                txt = lex.next();
                if (txt == undefined) {
                    if (DEBUG)
                        console.error("undefined attribute type for INDEX");
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                txt = txt.toUpperCase();
                if (
                    txt != AttributeType.NUMBER &&
                    txt != AttributeType.STRING &&
                    txt != AttributeType.BINALY
                ) {
                    if (DEBUG)
                        console.error("illegal attribute type for INDEX");
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                let attrType = txt;
                txt = lex.next();
                if (txt == undefined) {
                    if (DEBUG)
                        console.error("undefiend attribute type for INDEX");
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                txt = txt.toUpperCase();
                if (txt != KeyType.HASH && txt != KeyType.RANGE) {
                    if (DEBUG) console.error("illegal key type for INDEX");
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                let keyType: KeyType = txt;
                indexAttributeDefinitinList.push({
                    attributeName: attrName,
                    attributeType: attrType,
                    keyType: keyType,
                });
                txt = lex.next();
                if (txt == ")" || txt == undefined) {
                    break;
                }
                if (txt != ",") {
                    if (DEBUG) console.error("no camma end for INDEX");
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
            }
            secondaryIndexes.push({
                indexName: indexName,
                indexType: indexType,
                attributeDefinitinList: indexAttributeDefinitinList,
            });
        } else {
            let attrName = txt;
            if (attrName == undefined) {
                if (DEBUG) console.error("undefined attribute name");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            txt = lex.next();
            if (txt == undefined) {
                if (DEBUG) console.error("undefined attribute type");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            txt = txt.toUpperCase();
            if (
                txt != AttributeType.NUMBER &&
                txt != AttributeType.STRING &&
                txt != AttributeType.BINALY
            ) {
                if (DEBUG) console.error("illegal attribute tyep");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let attrType = txt;
            txt = lex.next();
            if (txt == undefined) {
                if (DEBUG) console.error("undefined attribyte type");
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let keyType = undefined;
            txt = txt.toUpperCase();
            if (txt == KeyType.HASH || txt == KeyType.RANGE) {
                keyType = txt;
                txt = lex.next();
            }
            attributeDefinitions.push({
                attributeName: attrName,
                attributeType: attrType,
                keyType: keyType,
            });
        }
        if (txt == ")" || txt == undefined) break;
        if (txt != ",") {
            if (DEBUG) console.error("not camma end line");
            console.error("create table syntax error [%s]", cmd);
            return false;
        }
    }
    const req: CreateTableRequest = {
        tableName: tableName,
        attributeDefinitinList: attributeDefinitions,
        indexes: secondaryIndexes,
    };
    try {
        if (DEBUG) console.log(JSON.stringify(req, null, 2));
        if (DEBUG) console.log(cmd);
        const response = await db.createTable(req);

        if (response != undefined) {
            const meta = response["$metadata"];
            console.log("http status code: ", meta.httpStatusCode);
            if (response.TableDescription != undefined) {
                console.log(JSON.stringify(response.TableDescription, null, 2));
            }
        }
        addHistory(originSQL);
    } catch (e) {
        console.error(e.toString());
        return false;
    }
    return true;
}

async function executeDeleteTable(
    db: DynamoDBAccessor,
    cmd: string
): Promise<boolean> {
    let originSQL = cmd;
    let ignoreNotFundErr = false;
    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);
    lex.next();
    let txt = lex.next();
    if (txt.toUpperCase() != "TABLE") {
        console.error("drop table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt.toUpperCase() == "IF") {
        txt = lex.next();
        if (txt.toUpperCase() != "EXISTS") {
            console.error("drop table syntax error [%s]", cmd);
            return false;
        }
        ignoreNotFundErr = true;
        txt = lex.next();
    }

    let tableName = txt;
    if (tableName == undefined) {
        console.error("drop table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.error("drop table syntax error [%s]", cmd);
        return false;
    }

    try {
        if (DEBUG) console.log(cmd);
        const response = await db.deleteTable(tableName, ignoreNotFundErr);

        if (response != undefined) {
            const meta = response["$metadata"];
            console.log("http status code: ", meta.httpStatusCode);
            if (response.TableDescription != undefined) {
                console.log(JSON.stringify(response.TableDescription, null, 2));
            }
        }
        addHistory(originSQL);
    } catch (e) {
        console.error(e.toString());
        return false;
    }

    return true;
}

async function executeVariable(cmd: string): Promise<boolean> {
    let originCmd = cmd;
    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);
    lex.next();
    let key = lex.next();
    if (key == undefined) {
        console.error("variable name is undefined");
        return false;
    }
    let txt = lex.next();
    if (txt != "=") {
        console.error("variable syntax error(%s)", cmd);
        return false;
    }
    let value = lex.next();
    if (value == undefined) {
        console.error("variable syntax error(%s)", cmd);
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.error("variable syntax error(%s)", cmd);
        return false;
    }
    variables[key] = value;
    addHistory(originCmd);

    if (DEBUG) console.log("%o", variables);
    return true;
}

async function executeShowTables(
    db: DynamoDBAccessor,
    cmd: string
): Promise<boolean> {
    let originCmd = cmd;
    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);
    let txt = lex.next();
    if (txt.toUpperCase() != "SHOW") {
        console.error("show tables query error");
        return false;
    }
    txt = lex.next();
    if (txt.toUpperCase() != "TABLES") {
        console.error("show tables query error");
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.error("show tables syntax error [%s]", cmd);
        return false;
    }
    try {
        if (DEBUG) console.log(cmd);
        let lastEvaluatedTableName = undefined;
        while (true) {
            let response = await db.showTables(lastEvaluatedTableName);
            if (response == undefined) {
                throw new Error("show tables returned an unexpected response");
            }
            const meta = response["$metadata"];
            console.log("http status code: ", meta.httpStatusCode);
            if (response.TableNames != undefined) {
                for (let name of response.TableNames) {
                    console.log(name);
                }
            }
            if (response.LastEvaluatedTableName != undefined) {
                lastEvaluatedTableName = response.LastEvaluatedTableName;
            } else {
                break;
            }
        }
        addHistory(originCmd);
    } catch (e) {
        console.error(e.toString());
        return false;
    }

    return true;
}

async function executeTruncateTable(
    db: DynamoDBAccessor,
    cmd: string
): Promise<boolean> {
    let originCmd = cmd;
    cmd = convertVariables(cmd, variables);
    const lex = new Lex(cmd);
    let txt = lex.next();
    if (txt.toUpperCase() != "TRUNCATE") {
        console.error("truncate table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt.toUpperCase() != "TABLE") {
        console.error("truncate table syntax error [%s]", cmd);
        return false;
    }
    const tableName = lex.next();
    if (tableName == undefined) {
        console.error("truncate table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.error("truncate table syntax error [%s]", cmd);
        return false;
    }
    try {
        if (DEBUG) console.log(cmd);
        const tableInfo = await db.describe(tableName);
        if (tableInfo == undefined) {
            console.error("table[%s] not found", tableName);
            return false;
        }
        const keySchema = tableInfo.Table.KeySchema;
        let lastEvaluateKey = undefined;
        let deleteItems = 0;
        while (true) {
            const scan = await db.scanTable(tableName);
            lastEvaluateKey = scan.LastEvaluatedKey;
            const items = scan.Items ?? [];

            for (let item of items) {
                const keys: Record<string, AttributeValue> = {};
                for (let key of keySchema) {
                    keys[key.AttributeName] = item[key.AttributeName];
                }
                const deleteItemResponse = await db.deleteItem(tableName, keys);
                if (deleteItemResponse == undefined) {
                    console.error(
                        "table[%s] truncate table is failed",
                        tableName
                    );
                    return false;
                }
                deleteItems++;
            }

            if (lastEvaluateKey == undefined) {
                break;
            }
        }
        console.log("deleted %d items", deleteItems);
        addHistory(originCmd);
    } catch (e) {
        console.error(e.toString());
        return false;
    }

    return true;
}

async function executeCommand(
    db: DynamoDBAccessor,
    cmd: string,
    option: OptionType
): Promise<boolean> {
    let ret = false;
    if (DEBUG) {
        console.log("----EXECUTE COMMAND----");
        console.log(cmd);
    }
    if (cmd[0] == "@") {
        ret = await executeVariable(cmd);
    } else if (cmd.startsWith("desc") || cmd.startsWith("DESC")) {
        ret = await executeDesc(db, cmd);
    } else if (cmd.startsWith("create") || cmd.startsWith("CREATE")) {
        ret = await executeCreateTable(db, cmd);
    } else if (cmd.startsWith("drop") || cmd.startsWith("DROP")) {
        ret = await executeDeleteTable(db, cmd);
    } else if (cmd.startsWith("show") || cmd.startsWith("SHOW")) {
        ret = await executeShowTables(db, cmd);
    } else if (cmd.startsWith("truncate") || cmd.startsWith("TRUNCATE")) {
        ret = await executeTruncateTable(db, cmd);
    } else if (cmd.startsWith("run") || cmd.startsWith("RUN")) {
        let latestCmd = historyList.slice(-1)[0];
        ret = await executePartiQL(db, latestCmd, option, currentNextToken);
    } else {
        ret = await executePartiQL(db, cmd, option, undefined);
    }
    return ret;
}

function initDynamoDBAccessor(option: OptionType): DynamoDBAccessor {
    let credentials = undefined;
    if (option.accessKey != undefined && option.secretAccessKey != undefined) {
        credentials = {
            accessKeyId: option.accessKey,
            secretAccessKey: option.secretAccessKey,
        };
    }

    let config: DynamoDBConfig = {
        endpoint: option.endpoint,
        credentials: credentials,
        profile: option.profile,
        region: option.region,
    };

    return new DynamoDBAccessor(config);
}

async function sleepFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    const lex = new Lex(cmd);
    const name = lex.next();
    const value = lex.next();
    const token = lex.next();

    if (DEBUG) console.log("Calling sleep function");

    if (name != "sleep") {
        console.error("unkown function name [%s]", name);
        return AnalysisType.TYPE_ERROR;
    }
    let intValue = parseInt(value);
    if (isNaN(intValue)) {
        console.error("not integer value in sleep function (%s)", value);
        return AnalysisType.TYPE_ERROR;
    }
    if (token != undefined) {
        console.warn("unknown option in sleep function [%s]", token);
    }
    await setTimeout(intValue);

    return AnalysisType.TYPE_SKIP;
}

async function clearFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    return AnalysisType.TYPE_CLEAR;
}

async function exitFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    return AnalysisType.TYPE_END;
}

async function optionFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    const type = checkPromptCmd(cmd);
    switch (type) {
        case InputType.TYPE_SHOW_HISTORY:
            if (DEBUG) console.log("----SHOW HISTORY----");
            let index = 0;
            for (let cmd of historyList) {
                console.log("[%d]: ", index++, cmd);
            }
            break;
        case InputType.TYPE_SHOW_CURRENT_CMD:
            if (DEBUG) console.log("----SHOW CURRENT COMMAND----");
            return AnalysisType.TYPE_VIEW;
            break;
        case InputType.TYPE_SHOW_VARIABLES:
            if (DEBUG) console.log("----SHOW VARIABLES----");
            for (let key in variables) {
                console.log("[%s] = %s", key, variables[key]);
            }
            break;
        case InputType.TYPE_SHOW_HELP:
            console.log(promptCmdHelp);
            break;
        default:
            break;
    }
    return AnalysisType.TYPE_SKIP;
}

async function connectFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    if (DEBUG) console.log("--- connectFunction");
    const cmdList = cmd.split(" ");
    const connectOption = {
        profile: {
            type: "string",
            short: "p",
            multiple: false,
        },
        region: {
            type: "string",
            short: "r",
            multiple: false,
        },
        endpoint: {
            type: "string",
            short: "E",
            multiple: false,
        },
        access_key: {
            type: "string",
            multiple: false,
        },
        secret_access_key: {
            type: "string",
            multiple: false,
        },
    } as const;

    try {
        const { values } = parseArgs({
            args: cmdList,
            options: connectOption,
            allowPositionals: true,
        });
        let isChanged = false;
        if (values["profile"] != undefined) {
            option.profile = values["profile"];
            isChanged = true;
        }
        if (values["endpoint"] != undefined) {
            option.endpoint = values["endpoint"];
            isChanged = true;
        }
        if (values["region"] != undefined) {
            option.region = values["region"];
            isChanged = true;
        }
        if (values["access_key"] != undefined) {
            option.accessKey = values["access_key"];
            isChanged = true;
        }
        if (values["secret_access_key"] != undefined) {
            option.secretAccessKey = values["secret_access_key"];
            isChanged = true;
        }
        if (!isChanged) {
            return AnalysisType.TYPE_SKIP;
        }
    } catch (e) {
        console.error("connect argument error. %s", cmd);
        return AnalysisType.TYPE_ERROR;
    }

    return AnalysisType.TYPE_RECONNECT;
}

async function loadScriptFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    let cmdList = cmd.split(" ");
    let fileName = cmdList[1];

    if (DEBUG) console.log(`load script file = ${fileName}`);

    let script = new FileReader();
    if (!script.load(fileName)) {
        console.log(`error load script(not found ${fileName})`);
        return AnalysisType.TYPE_ERROR;
    }
    scriptList.push(script);
    return AnalysisType.TYPE_SKIP;
}

async function echoFunction(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    if (DEBUG) console.log("--- connectFunction");
    const lex = new Lex(cmd);
    lex.next();

    let token = lex.next();
    let str = "";
    while (token != undefined) {
        str += convertVariables(token, variables);
        token = lex.next();
    }
    console.log(str);
    return AnalysisType.TYPE_SKIP;
}

async function analysisCommand(
    cmd: string,
    option: OptionType
): Promise<AnalysisType> {
    cmd = cmd.trim();

    for (let func of buildInFunctions) {
        if (cmd.startsWith(func.name)) {
            return await func.func(cmd, option);
        }
    }
    return AnalysisType.TYPE_NORMAL;
}

async function mainLoop(
    db: DynamoDBAccessor,
    fileReader: FileReader,
    option: OptionType
): Promise<number> {
    let command = "";
    let input = "";
    let scriptMode = false;

    if (DEBUG) {
        console.log(option);
    }

    if (fileReader != undefined) {
        scriptMode = true;
        scriptList.push(fileReader);
    }

    while (1) {
        if (!scriptMode) {
            if (scriptList.length > 0) {
                let script = scriptList.slice(-1)[0];
                input = script.read();
                if (input == undefined) {
                    scriptList.pop();
                }
            } else {
                input = await keyInput(promptLabel);
            }
            if (input == undefined) {
                continue;
            }
        } else {
            if (scriptList.length > 0) {
                let script = scriptList.slice(-1)[0];
                input = script.read();
                if (input == undefined) {
                    scriptList.pop();
                    continue;
                }
            } else {
                if (DEBUG) console.log("script file is over");
                break;
            }
        }
        if (DEBUG) console.log(input);

        input = trimStr(input);
        if (input.length == 0) {
            continue;
        }
        const type = checkInput(input);
        if (type == InputType.TYPE_COMMENT) continue;

        let analysisRes = await analysisCommand(input, option);
        if (analysisRes != 0) {
            switch (analysisRes) {
                case AnalysisType.TYPE_VIEW:
                    console.log(command);
                    continue;
                case AnalysisType.TYPE_CLEAR:
                    if (DEBUG) console.log("----CLEAR----");
                    console.clear();
                    command = "";
                    continue;
                case AnalysisType.TYPE_END:
                    if (DEBUG) console.log("----END----");
                    return 0;
                case AnalysisType.TYPE_SKIP:
                    continue;
                case AnalysisType.TYPE_RECONNECT:
                    if (DEBUG) console.log("----RECONNECT----");
                    command = "";
                    db = initDynamoDBAccessor(option);
                    continue;
                case AnalysisType.TYPE_ERROR:
                    if (scriptMode && !option.nostop) {
                        if (DEBUG) console.error("error for script mode");
                        return -1;
                    }
                    command = "";
                    continue;
                default:
                    break;
            }
        }

        command += input;
        command += DELIMITTER;
        if (type == InputType.TYPE_RUN) {
            const ok = await executeCommand(db, command, option);
            if (!ok && scriptMode && !option.nostop) {
                if (DEBUG) console.error("error for script mode");
                return -1;
            }
            command = "";
        }
    }
    return 0;
}

export async function Prompt(option: OptionType): Promise<number> {
    let fileReader = undefined;

    setDebug(option.debug);
    variables = {};
    historyList = [];

    const db = initDynamoDBAccessor(option);

    if (option.script != undefined) {
        fileReader = new FileReader();
        if (!fileReader.load(option.script)) {
            console.error("no input script file");
            return -1;
        }
    }

    return await mainLoop(db, fileReader, option);
}
