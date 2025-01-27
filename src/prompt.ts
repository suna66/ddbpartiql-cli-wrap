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
import { OptionType, InputType, DELIMITTER, HISTORY_LIST_MAX } from "./types";
import { trimStr, semicolonToBlank, convertVariables } from "./utils";
import { KeyType } from "@aws-sdk/client-dynamodb";

let DEBUG = true;
let variables: { [key: string]: string | undefined } = {};
let historyList: Array<string> = [];
const promptLabel = "ddbpartiql> ";
const promptCmdHelp = `
  !?             show help message
  !h             show execute query history
  !v             show variables and values
  clear          clear console
  exit           exit ddbpartiql cli
`;

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
    if (cmd[0] == "!") {
        return checkPromptCmd(cmd);
    }
    if (cmd[cmd.length - 1] == ";") {
        return InputType.TYPE_RUN;
    }
    if (cmd == "exit") {
        return InputType.TYPE_END;
    }
    if (cmd == "clear") {
        return InputType.TYPE_CLEAR;
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
    sql: string
): Promise<boolean> {
    try {
        let originSQL = sql;
        sql = convertVariables(semicolonToBlank(sql), variables);
        console.log(sql);
        const response = await db.execute(sql);
        if (DEBUG) console.log("%o", response);

        const meta = response["$metadata"];
        console.log("http status code: ", meta.httpStatusCode);
        if (response.Items != undefined) {
            console.log(JSON.stringify(response.Items, null, 2));
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
        console.log(cmd);
        const response = await db.describe(tableName);
        if (response != undefined && response.Table != undefined) {
            console.log(JSON.stringify(response.Table, null, 2));
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
    if (DEBUG) console.log(cmd);
    const lex = new Lex(cmd);
    lex.next();
    let txt = lex.next();
    if (txt.toUpperCase() != "TABLE") {
        console.error("create table syntax error [%s]", cmd);
        return false;
    }
    let tableName = lex.next();
    if (tableName == undefined) {
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
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let indexType = txt;
            let indexName = lex.next();
            if (indexName == undefined) {
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
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                txt = txt.toUpperCase();
                if (
                    txt != AttributeType.NUMBER &&
                    txt != AttributeType.STRING &&
                    txt != AttributeType.BINALY
                ) {
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                let attrType = txt;
                txt = lex.next();
                if (txt == undefined) {
                    console.error("create table syntax error [%s]", cmd);
                    return false;
                }
                txt = txt.toUpperCase();
                if (txt != KeyType.HASH && txt != KeyType.RANGE) {
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
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            txt = lex.next();
            if (txt == undefined) {
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            txt = txt.toUpperCase();
            if (
                txt != AttributeType.NUMBER &&
                txt != AttributeType.STRING &&
                txt != AttributeType.BINALY
            ) {
                console.error("create table syntax error [%s]", cmd);
                return false;
            }
            let attrType = txt;
            txt = lex.next();
            if (txt == undefined) {
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
        const response = await db.createTable(req);
        if (response != undefined) {
            console.log(JSON.stringify(response, null, 2));
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
    if (DEBUG) console.log(cmd);
    const lex = new Lex(cmd);
    lex.next();
    let txt = lex.next();
    if (txt.toUpperCase() != "TABLE") {
        console.log("delete table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt.toUpperCase() == "IF") {
        txt = lex.next();
        if (txt.toUpperCase() != "EXISTS") {
            console.log("delete table syntax error [%s]", cmd);
            return false;
        }
        ignoreNotFundErr = true;
    }

    let tableName = lex.next();
    if (tableName == undefined) {
        console.log("delete table syntax error [%s]", cmd);
        return false;
    }
    txt = lex.next();
    if (txt != ";") {
        console.log("delete table syntax error [%s]", cmd);
        return false;
    }

    try {
        const response = await db.deleteTable(tableName, ignoreNotFundErr);
        if (response != undefined) {
            console.log(JSON.stringify(response, null, 2));
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

async function executeCommand(
    db: DynamoDBAccessor,
    cmd: string
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
    } else {
        ret = await executePartiQL(db, cmd);
    }
    return ret;
}

export async function Prompt(option: OptionType): Promise<number> {
    let command = "";
    let input = "";
    let scriptMode = false;
    let fileRreader = undefined;

    DEBUG = option.debug;
    variables = {};
    historyList = [];

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

    const db: DynamoDBAccessor = new DynamoDBAccessor(config);

    if (option.script != undefined) {
        scriptMode = true;
        fileRreader = new FileReader();
        if (!fileRreader.load(option.script)) {
            console.error("no input script file");
            return -1;
        }
    }

    while (1) {
        if (!scriptMode) {
            input = await keyInput(promptLabel);
            if (input == undefined) {
                continue;
            }
        } else {
            input = fileRreader.read();
            if (input == undefined) {
                break;
            }
            if (DEBUG) console.log(input);
        }
        input = trimStr(input);
        if (input.length == 0) {
            continue;
        }
        const type = checkInput(input);

        switch (type) {
            case InputType.TYPE_COMMENT:
                continue;
            case InputType.TYPE_END:
                if (DEBUG) console.log("----END----");
                return 0;
            case InputType.TYPE_CLEAR:
                if (DEBUG) console.log("----CLEAR----");
                console.clear();
                command = "";
                continue;
            case InputType.TYPE_SHOW_HISTORY:
                if (DEBUG) console.log("----SHOW HISTORY----");
                let index = 0;
                for (let cmd of historyList) {
                    console.log("[%d]: ", index++, cmd);
                }
                continue;
            case InputType.TYPE_SHOW_CURRENT_CMD:
                if (DEBUG) console.log("----SHOW CURRENT COMMAND----");
                console.log(command);
                continue;
            case InputType.TYPE_SHOW_VARIABLES:
                if (DEBUG) console.log("----SHOW VARIABLES----");
                for (let key in variables) {
                    console.log("[%s] = %s", key, variables[key]);
                }
                continue;
            case InputType.TYPE_SHOW_HELP:
                console.log(promptCmdHelp);
                continue;
            default:
                break;
        }

        command += input;
        command += DELIMITTER;
        if (type == InputType.TYPE_RUN) {
            const ok = await executeCommand(db, command);
            if (!ok && scriptMode) {
                if (DEBUG) console.error("error for script mode");
                return -1;
            }
            command = "";
        }
    }
    return 0;
}
