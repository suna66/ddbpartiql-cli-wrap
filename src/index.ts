import { Prompt } from "./prompt";
import { OptionType } from "./types";
import { parseArgs } from "node:util";

const VERSION = "0.2.0";
const help = `
version: ${VERSION}
ddbpartiql [OPTIONS] [scritp file]

OPTIONS:
    -h/--help                   printing how to use
    -p/--profile <profile>      aws profile name
    -r/--region  <region>       aws region name
    -v/--verbose                verbose mode
    -E/--endpoint <url>         endpoint url
    -F/--format {json/table}    query response format(default: json)
    --access_key <value>        aws credential access key id
    --secret_access_key <value> aws credential secret access key
`;

const options = {
    help: {
        type: "boolean",
        short: "h",
    },
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
    verbose: {
        type: "boolean",
        short: "v",
        multiple: false,
    },
    endpoint: {
        type: "string",
        short: "E",
        multiple: false,
    },
    format: {
        type: "string",
        short: "F",
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

function commandOptions(): OptionType | undefined {
    const args: Array<string> = process.argv.slice(2);
    const { values, positionals } = parseArgs({
        args: args,
        options: options,
        allowPositionals: true,
    });

    let profile = undefined;
    let region = undefined;
    let endpoint = undefined;
    let format = "json";
    let accessKey = undefined;
    let secretAccessKey = undefined;
    let script = undefined;
    let debug = false;
    if (values["help"] != undefined) {
        console.log(help);
        return undefined;
    }
    if (values["profile"] != undefined) {
        profile = values["profile"];
    }
    if (values["region"] != undefined) {
        region = values["region"];
    }
    if (values["verbose"] != undefined) {
        debug = values["verbose"];
    }
    if (values["endpoint"] != undefined) {
        endpoint = values["endpoint"];
    }
    if (values["format"] != undefined) {
        format = values["format"];
    }
    if (values["access_key"] != undefined) {
        accessKey = values["access_key"];
    }
    if (values["secret_access_key"] != undefined) {
        secretAccessKey = values["secret_access_key"];
    }

    if (positionals != undefined) {
        if (positionals.length > 0) {
            script = positionals[0];
        }
    }
    return {
        profile,
        region,
        endpoint,
        format,
        accessKey,
        secretAccessKey,
        script,
        debug,
    };
}

(function () {
    let op = undefined;

    try {
        op = commandOptions();
        if (op == undefined) {
            process.exit(0);
        }
    } catch (e) {
        console.error("error: command line option error");
        console.log(help);
        process.exit(1);
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
