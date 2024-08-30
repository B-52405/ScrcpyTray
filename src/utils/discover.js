const path = require('path');
const { command } = require("./command.js");
const { Logger } = require('./log.js');


const bin_path = path.join(__dirname, "..", "..", "bin")
const nmap_path = path.join(bin_path, "Nmap", "nmap.exe")
const adb_path = path.join(bin_path, "scrcpy-win64-v2.5", "adb.exe")
const prefix_mask = { 0: 0, 128: 1, 192: 2, 224: 3, 240: 4, 248: 5, 252: 6, 254: 7, 255: 8 }
const logger = new Logger("discover.js")


async function discover_nets() {
    const ipconfig = await command("ipconfig")
    const lines = ipconfig.split("\r\n\r\n")
    const nets = []
    for (let i = 2; i < lines.length; i += 2) {
        if (/默认网关.*?\d+\.\d+\.\d+\.\d+/.test(lines[i])) {
            const net_id = lines[i - 1].slice(lines[i - 1].indexOf(" ") + 1, lines[i - 1].length - 1)
            const local_ip = lines[i].match(/IPv4 地址.*? (\d+\.\d+\.\d+\.\d+)/)[1]
            const netmask = lines[i].match(/子网掩码.*? (\d+\.\d+\.\d+\.\d+)/)[1]
            const prefix_pre = netmask.split(".").map(x => prefix_mask[Number(x)])
            const prefix = prefix_pre[0] + prefix_pre[1] + prefix_pre[2] + prefix_pre[3]
            const cidr = `${local_ip}/${prefix}`

            nets.push({ id: net_id, cidr: cidr, index: nets.length })
        }
    }
    return nets
}


async function discover_devices(net) {
    const nmap = await command(`${nmap_path} -p 5555 ${net.cidr}`)
    logger.log("nmap -p 5555 done.")
    const lines = nmap.split("\r\n")
    const devices = []
    for (let i = 5; i < lines.length; i += 7) {
        if (lines[i].match(/5555\/tcp open/)) {
            const line = lines[i - 4].split(" ")
            devices.push({
                id: line[line.length - 1],
                serial: `${line[line.length - 1]}:5555`,
                index: devices.length
            })
        }
    }
    return devices
}


async function discover_devices_adb() {
    const adb_devices = await command(`${adb_path} devices`)
    const devices_adb = adb_devices.split("\r\n").slice(1, -2).map((device) => device.split("\t"))
    const devices = []
    for (const device of devices_adb) {
        devices.push({
            id: device[0].split(":5555")[0],
            serial: device[0],
            state: device[1],
            index: devices.length
        })
    }
    return devices
}


async function discover_devices_usb() {
    const devices = await discover_devices_adb()
    return devices.filter((device) => !/\d+\.\d+\.\d+\.\d+/.test(device.id))
}


async function adb_tcpip() {
    const devices = await discover_devices_usb()
    for (const device of devices) {
        await command(`${adb_path} -s ${device.serial} tcpip 5555`)
    }
}


module.exports = {
    discover_nets,
    discover_devices,
    discover_devices_adb,
    discover_devices_usb,
    adb_tcpip
}
