const { exec } = require('child_process');
const { app } = require('electron');
const path = require('path');
const { command } = require("./command.js");
const { configuration } = require('./config.js');
const { discover_devices_adb } = require('./discover.js');
const { Logger } = require('./log.js');


let scrcpy = undefined
let device_serial = ""
const bin_path = path.join(__dirname, "..", "..", "bin")
const scrcpy_path = path.join(bin_path, "scrcpy-win64-v2.5", "scrcpy.exe")
const adb_path = path.join(bin_path, "scrcpy-win64-v2.5", "adb.exe")
const logger = new Logger("connect.js")


async function disconnect() {
    if (scrcpy !== undefined) {
        scrcpy.removeAllListeners("close")
        scrcpy.kill()
        scrcpy = undefined
    }
    if (device_serial !== "") {
        await command(`${adb_path} disconnect ${device_serial}`)
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
        scrcpy = exec(`${scrcpy_path} --serial=${device.serial} ${args}`)
    }
    else {
        scrcpy = exec(`${scrcpy_path} --tcpip=${device.serial} ${args}`)
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
            await command(`${adb_path} -s ${device_serial} shell input keyevent 85`)
        }
    }
}


module.exports = {
    connect,
    disconnect,
    controller
}
