import { keyInput } from "./input";
import DynamoDBAccessor, { DynamoDBConfig } from "./database";
import FileReader from "./file_reader";
import minimist from "minimist";
import { Prompt } from "./prompt";
import { OptionType } from "./types";

const VERSION = "0.1.0";
const help = `
version: ${VERSION}
ddbpartiql [OPTIONS] [scritp file]

OPTIONS:
    -h                          printing how to use
    -p <profile>                aws profile name
    -r <region>                 aws region name
    -v <true/false>             verbose mode
    --endpoint <url>            endpoint url
    --access_key <value>        aws credential access key id
    --secret_access_key <value> aws credential secret access key
`;

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

    Prompt(op)
        .then((ret) => {
            process.exit(ret);
        })
        .catch((error) => {
            console.error(error.toString());
            process.exit(1);
        });
})();
