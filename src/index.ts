import { keyInput } from "./input";
import DynamoDBAccessor, { DynamoDBConfig } from "./database";
import FileReader from "./file_reader";
import minimist from "minimist";

enum InputType {
    TYPE_CONTINUE = 0,
    TYPE_RUN = 1,
    TYPE_COMMENT = 2,
    TYPE_END = 9,
}

type OptionType = {
    profile: undefined | string;
    region: undefined | string;
    endpoint: undefined | string;
    accessKey: undefined | string;
    secretAccessKey: undefined | string;
    script: undefined | string;
    debug: undefined | boolean;
};

let DEBUG = true;
const DELIMITTER = " ";
const VERSION="0.1.0";
const help = `
version: ${VERSION}
ddbpariql [OPTIONS] [scritp file]

OPTIONS:
    -h                          printing how to use
    -p <profile>                aws profile name
    -r <region>                 aws region name
    -v <true/false>             verbose mode
    --endpoint <url>            endpoint url
    --access_key <value>        aws credential access key id
    --secret_access_key <value> aws credential secret access key
`;

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

    return InputType.TYPE_CONTINUE;
}

function trimStr(src: string): string {
    if (src == undefined) {
        return "";
    }
    return src.trim();
}

function semicolonToBlank(src: string): string {
    const res = src.replace(";", "");
    return res;
}

async function executePartiQL(db: DynamoDBAccessor, sql: string): Promise<boolean> {
    try {
        if (DEBUG) console.log(sql);
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

async function prompt(option: OptionType): Promise<number> {
    let command = "";
    let input = "";
    let scriptMode = false;
    let fileRreader = undefined;

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
        command += input;
        command += DELIMITTER;
        if (type == InputType.TYPE_RUN) {
            if (DEBUG) {
                console.log("----EXECUTE PartiQL----");
                console.log(command);
            }
            const ok = await executePartiQL(db, semicolonToBlank(command));
            if (!ok && scriptMode) {
                if (DEBUG) console.error("error for script mode");
                return -1;
            }
            command = "";
        }
    }
    return 0;
}

function commandOptions(argv: minimist.ParsedArgs): OptionType | undefined {
    let profile = undefined;
    let region = undefined;
    let endpoint = undefined;
    let accessKey = undefined;
    let secretAccessKey = undefined;
    let script = undefined;
    let debug = false;
    if (argv["h"] != undefined) {
        console.log(help);
        return undefined;
    }
    if (argv["p"] != undefined) {
        profile = argv["p"];
    }
    if (argv["r"] != undefined) {
        region = argv["r"];
    }
    if (argv["v"] != undefined) {
        debug = argv["v"] == "true" ? true : false;
    }
    if (argv["endpoint"] != undefined) {
        endpoint = argv["endpoint"];
    }
    if (argv["access_key"] != undefined) {
        accessKey = argv["access_key"];
    }
    if (argv["secret_access_key"] != undefined) {
        secretAccessKey = argv["secret_access_key"];
    }
    const cmdlines = argv._;
    if (cmdlines.length > 0) {
        script = cmdlines[0];
    }
    return {
        profile,
        region,
        endpoint,
        accessKey,
        secretAccessKey,
        script,
        debug,
    };
}

(function () {
    const argv = minimist(process.argv.slice(2));
    const op = commandOptions(argv);
    if (op == undefined) {
        process.exit(0);
    }
    DEBUG = op.debug;
    if (DEBUG) console.log(op);
    prompt(op)
        .then((ret) => {
            process.exit(ret);
        })
        .catch((error) => {
            console.error(error.toString());
            process.exit(1);
        });
})();
