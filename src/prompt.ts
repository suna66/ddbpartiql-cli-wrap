import { keyInput } from "./input";
import DynamoDBAccessor, { DynamoDBConfig } from "./database";
import FileReader from "./file_reader";
import { Lex } from "./lex";
import { OptionType, InputType, DELIMITTER } from "./types";
import { trimStr, semicolonToBlank, convertVariables } from "./utils";

let DEBUG = true;
let variables: { [key: string]: string | undefined } = {};

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
    if (cmd == "exit") {
        return InputType.TYPE_END;
    }
    if (cmd == "clear") {
        return InputType.TYPE_CLEAR;
    }

    return InputType.TYPE_CONTINUE;
}

async function executePartiQL(
    db: DynamoDBAccessor,
    sql: string
): Promise<boolean> {
    try {
        sql = convertVariables(semicolonToBlank(sql), variables);
        console.log(sql);
        const response = await db.execute(sql);
        if (DEBUG) console.log("%o", response);

        const meta = response["$metadata"];
        console.log("http statuc code: ", meta.httpStatusCode);
        if (response.Items != undefined) {
            console.log(JSON.stringify(response.Items, null, 2));
        }
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
        console.log("desc syntax error [%s]", cmd);
        return false;
    }
    try {
        console.log(cmd);
        const response = await db.describe(tableName);
        if (response != undefined && response.Table != undefined) {
            console.log(JSON.stringify(response.Table, null, 2));
        }
    } catch (e) {
        console.error(e.toString());
        return false;
    }

    return true;
}

async function executeVariable(cmd: string): Promise<boolean> {
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
            input = await keyInput("DDBPartiQL> ");
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
        if (type == InputType.TYPE_COMMENT) {
            continue;
        }
        if (type == InputType.TYPE_END) {
            if (DEBUG) console.log("----END----");
            break;
        }
        if (type == InputType.TYPE_CLEAR) {
            if (DEBUG) console.log("----CLEAR----");
            console.clear();
            command = "";
            continue;
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
