const { read_yaml, write_yaml } = require('./yaml.js');
const path = require('path');


const config_path = path.join(__dirname, "..", "..", "config.yaml")


class Config {
    video = true
    audio = true
    control = true

    async save() {
        await write_yaml(config_path, this)
    }

    args(ip) {
        let args = ` --window-title="ScrcpyTray" --tcpip=${ip}`
        if (!this.video) {
            args += " --no-video --no-window"
        }
        if (!this.audio) {
            args += " --no-audio"
        }
        if (!this.control) {
            args += " --no-control"
        }
        return args
    }
}


const config = new Config()
let initialized = false


async function config_setter() {
    if (initialized) {
        return config
    }

    const config_data = await read_yaml(config_path)
    if ("video" in config_data) {
        config.video = config_data.video == true
    }
    if ("audio" in config_data) {
        config.audio = config_data.audio == true
    }
    if ("control" in config_data) {
        config.control = config_data.control == true
    }
    initialized = true

    return config
}


module.exports = {
    config_setter
}
