import { execSync } from "child_process";
import { keyInput } from "./input";
import DynamoDBAccessor from "./database";
import minimist from "minimist";

enum InputType {
    TYPE_CONTINUE = 0,
    TYPE_RUN = 1,
    TYPE_END = 9,
}

type OptionType = {
    profile: undefined | string;
    region: undefined | string;
    script: undefined | string;
};

const DEBUG = true;
const DELIMITTER = " ";
const AWS_CLI_DDB_STATEMENT = "aws dynamodb execute-statement --statement";

function checkInput(input: string): InputType {
    if (input == undefined) {
        InputType.TYPE_CONTINUE;
    }
    let cmd = input.trim();

    if (cmd.length == 0) {
        InputType.TYPE_CONTINUE;
    }
    if (cmd[cmd.length - 1] == ";") {
        return InputType.TYPE_RUN;
    }
    if (cmd == "exit") {
        return InputType.TYPE_END;
    }

    return InputType.TYPE_CONTINUE;
}

function convString(src: string): string {
    src = src.trim();
    const res = src.replace(/\"/g, "'");
    return res;
}

function semicolonToBlank(src: string): string {
    const res = src.replace(";", "");
    return res;
}

async function executePartiQL(db: DynamoDBAccessor, sql: string) {
    try {
        const response = await db.execute(sql);
        if (DEBUG) {
            console.log(sql);
            console.log("%o", response);
        }
        if (response != undefined && response.Items != undefined) {
            for (let item of response.Items) {
                console.log("%o", item);
            }
        }
    } catch (e) {
        console.error(e.toString());
    }
}

async function prompt(profile: string, region: string) {
    let command = "";
    let input = "";

    const db: DynamoDBAccessor = new DynamoDBAccessor(profile, region);

    while (1) {
        input = await keyInput("DDBPartiQL> ");
        if (input == undefined) {
            continue;
        }
        input = convString(input);
        if (input.length == 0) {
            continue;
        }
        const type = checkInput(input);
        if (type == InputType.TYPE_END) {
            break;
        }
        command += input;
        if (type == InputType.TYPE_RUN) {
            await executePartiQL(db, semicolonToBlank(command));
            command = "";
        }
        command += DELIMITTER;
    }
}

function options(argv: minimist.ParsedArgs): OptionType {
    let profile = undefined;
    let region = undefined;
    let script = undefined;
    if (argv["p"] != undefined) {
        profile = argv["p"];
    }
    if (argv["r"] != undefined) {
        region = argv["r"];
    }
    const cmdlines = argv._;
    if (cmdlines.length > 0) {
        script = cmdlines[0];
    }
    return { profile, region, script };
}

(function () {
    const argv = minimist(process.argv.slice(2));
    const { profile, region, script } = options(argv);
    prompt(profile, region)
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error.toString());
            process.exit(1);
        });
})();
