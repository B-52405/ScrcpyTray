const path = require('path');
const { read_yaml, write_yaml } = require('./yaml.js');


const config_path = path.join(__dirname, "..", "..", "config.yaml")
const buffer_size = 1000
const video_buffer = ` --display-buffer=${buffer_size}`
const audio_buffer = ` --audio-buffer=${buffer_size}`


class Config {
    video = true
    audio = true
    buffer = false
    usb = false
    lastest = undefined
    memory_net = {}
    memory_usb = []

    async load() {
        const config_data = await read_yaml(config_path)
        if ("video" in config_data) {
            this.video = config_data.video == true
        }
        if ("audio" in config_data) {
            this.audio = config_data.audio == true
        }
        if ("buffer" in config_data) {
            this.buffer = config_data.buffer == true
        }
        if ("usb" in config_data) {
            this.usb = config_data.usb == true
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
    }

    async save() {
        await write_yaml(config_path, this)
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
                args += video_buffer
            }
            if (this.audio) {
                args += audio_buffer
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
