const { read_yaml, write_yaml } = require('./yaml.js');
const { statics } = require('../statics.js');


class Config {
    video = true
    audio = true
    usb = false
    lastest = undefined
    memory_net = {}
    memory_usb = []
    buffer = false
    buffer_size = statics.config.buffer_size
    notification = statics.config.notification

    async load() {
        const config_data = await read_yaml(statics.path.config)
        if ("video" in config_data) {
            this.video = config_data.video === true
        }
        if ("audio" in config_data) {
            this.audio = config_data.audio === true
        }
        if ("usb" in config_data) {
            this.usb = config_data.usb === true
        }
        if ("lastest" in config_data) {
            this.lastest = config_data.lastest
        }
        if ("memory_net" in config_data) {
            this.memory_net = config_data.memory_net
        }
        if ("memory_usb" in config_data) {
            this.memory_usb = config_data.memory_usb
        }
        if ("buffer" in config_data) {
            this.buffer = config_data.buffer === true
        }
        if ("buffer_size" in config_data) {
            if (Number.isInteger(config_data.buffer_size)) {
                //buffer size: [0, 3600000]
                this.buffer_size = Math.max(0, Math.min(2000, config_data.buffer_size))
            }
            else {
                this.buffer_size = 1000
            }
        }
        if ("notification" in config_data) {
            this.notification = config_data.notification === true
        }
    }

    async save() {
        await write_yaml(statics.path.config, this)
    }

    args() {
        let args = " --window-title=ScrcpyTray"
        if (!this.video) {
            args += " --no-window"
        }
        else {
            args += " --video-codec=h264"
        }
        if (!this.audio) {
            args += " --no-audio"
        }
        if (this.buffer) {
            if (this.video) {
                args += ` --display-buffer=${this.buffer_size}`
            }
            if (this.audio) {
                args += ` --audio-buffer=${this.buffer_size}`
            }
        }
        return args
    }
}


const config = new Config()
let initialized = false


async function configuration() {
    if (!initialized) {
        await config.load()
        initialized = true
    }
    return config
}


module.exports = {
    configuration
}
