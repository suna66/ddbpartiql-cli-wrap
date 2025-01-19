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
    debug: undefined | boolean;
};

let DEBUG = true;
const DELIMITTER = " ";

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

async function prompt(option: OptionType) {
    let command = "";
    let input = "";
    let scriptMode = false;

    const db: DynamoDBAccessor = new DynamoDBAccessor(
        option.profile,
        option.region
    );

    if (option.script != undefined) {
        scriptMode = true;
    }

    DEBUG = option.debug;
    while (1) {
        if (!scriptMode) {
            input = await keyInput("DDBPartiQL> ");
            if (input == undefined) {
                continue;
            }
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

function commandOptions(argv: minimist.ParsedArgs): OptionType {
    let profile = undefined;
    let region = undefined;
    let script = undefined;
    let debug = false;
    if (argv["p"] != undefined) {
        profile = argv["p"];
    }
    if (argv["r"] != undefined) {
        region = argv["r"];
    }
    if (argv["v"] != undefined) {
        debug = argv["v"] == "true" ? true : false;
    }
    const cmdlines = argv._;
    if (cmdlines.length > 0) {
        script = cmdlines[0];
    }
    return { profile, region, script, debug };
}

(function () {
    const argv = minimist(process.argv.slice(2));
    const op = commandOptions(argv);
    prompt(op)
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error.toString());
            process.exit(1);
        });
})();
