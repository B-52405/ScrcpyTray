const { exec } = require('child_process');
const { app } = require('electron');
const path = require('path');
const { command } = require("./command.js");
const { configuration } = require('./config.js');
const { discover_devices_adb } = require('./discover.js');
const { Logger } = require('./log.js');
const { statics } = require('../statics.js');


let scrcpy = undefined
let device_serial = ""
const logger = new Logger(path.basename(__filename))


async function disconnect() {
    if (scrcpy !== undefined) {
        scrcpy.removeAllListeners("close")
        scrcpy.kill()
        scrcpy = undefined
    }
    if (device_serial !== "") {
        await command(`${statics.path.adb} disconnect ${device_serial}`)
        device_serial = ""
    }
}


async function connect(device) {
    logger.log(`connecting to ${device.serial}.`)

    await disconnect()
    const config = await configuration()
    if (!(config.video || config.audio)) {
        logger.log("nothing to do.")
        return false
    }

    const args = config.args()
    if (config.usb) {
        scrcpy = exec(`${statics.path.scrcpy} --serial=${device.serial} ${args}`)
    }
    else {
        scrcpy = exec(`${statics.path.scrcpy} --tcpip=${device.serial} ${args}`)
    }

    return await new Promise(resolve => {
        scrcpy.stdout.on('data', (data) => {
            if (/\[server\] INFO: Device:/.test(data)) {
                logger.log("connected.")
                device_serial = device.serial

                scrcpy.on("close", async () => {
                    const devices = await discover_devices_adb()
                    for (const device of devices) {
                        if (device.serial === device_serial && device.state === "offline") {
                            logger.log("connection lost.")
                            await disconnect()
                            app.emit("connection_lost")
                            return
                        }
                    }
                    logger.log("device disconnected.")
                    await disconnect()
                    app.emit("device_disconnected")
                })

                scrcpy.stdout.removeAllListeners("data")
                scrcpy.stderr.removeAllListeners("data")
                resolve(true)
            }
        })

        scrcpy.stderr.on('data', async (data) => {
            if (/ERROR: Server connection failed/.test(data)) {
                logger.log("connection failed.")
                scrcpy.stdout.removeAllListeners("data")
                scrcpy.stderr.removeAllListeners("data")
                await disconnect()
                resolve(false)
            }
        })
    })
}


const controller = {
    play: async () => {
        if (scrcpy && device_serial !== "") {
            await command(`${statics.path.adb} -s ${device_serial} shell input keyevent 85`)
        }
    }
}


module.exports = {
    connect,
    disconnect,
    controller
}
