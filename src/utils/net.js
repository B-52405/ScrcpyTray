const { exec } = require('child_process');
const path = require('path');
const { run_command } = require("./utils.js");
const { config_setter } = require('./config.js');


let scrcpy = undefined
const net_ip = {}
const bin_path = path.join(__dirname, "..", "..", "bin")
const nmap_path = path.join(bin_path, "Nmap", "nmap.exe")
const scrcpy_path = path.join(bin_path, "scrcpy-win64-v2.5", "scrcpy.exe")
const adb_path = path.join(bin_path, "scrcpy-win64-v2.5", "adb.exe")
const prefix_mask = {0: 0, 128: 1, 192: 2, 224: 3, 240: 4, 248: 5, 252: 6, 254: 7, 255: 8}


async function find_nets(){
    const ipconfig = await run_command("ipconfig")
    const lines = ipconfig.split("\r\n\r\n")
    const nets = []
    for (let i = 2; i < lines.length; i += 2){
        if (/默认网关.*?\d+\.\d+\.\d+\.\d+/.test(lines[i])){
            const net_id = lines[i - 1].slice(lines[i - 1].indexOf(" ") + 1, lines[i - 1].length - 1)
            const local_ip = lines[i].match(/IPv4 地址.*? (\d+\.\d+\.\d+\.\d+)/)[1]
            const netmask = lines[i].match(/子网掩码.*? (\d+\.\d+\.\d+\.\d+)/)[1]
            const prefix_pre = netmask.split(".").map(x => prefix_mask[Number(x)])
            const prefix = prefix_pre[0] + prefix_pre[1] + prefix_pre[2] + prefix_pre[3]
            const cidr = `${local_ip}/${prefix}`

            nets.push({id: net_id, cidr: cidr})
        }
    }

    return nets
}


async function connect(cidr){
    await disconnect()

    const config = await config_setter()
    if (!net_ip[cidr]){
        const adb_devices = await run_command(`${adb_path} devices`)
        const devices = adb_devices.split("\r\n").slice(1, -2).map((device) => device.split("\t")[0])
        for(const device of devices){
            if(!/\d+\.\d+\.\d+\.\d+:5555/.test(device)){
                await run_command(`${adb_path} -s ${device} tcpip 5555`)
            }
        }
        console.log("adb tcpip done.")

        const nmap = await run_command(`${nmap_path} -p 5555 ${cidr}`)
        console.log("nmap -p 5555 done.")
        const lines = nmap.split("\r\n")
        for (let i = 5; i < lines.length; i += 7){
            if(lines[i].match(/5555\/tcp open/)){
                const line = lines[i - 4].split(" ")
                net_ip[cidr] = line[line.length - 1]
            }
        }
    }
    if (!net_ip[cidr]){
        return false
    }
    const args = config.args(net_ip[cidr])
    console.log(`args done. args: ${JSON.stringify(args)}`)
    scrcpy = exec(scrcpy_path + args)
    return true
}


async function disconnect() {
    if(scrcpy !== undefined){
        scrcpy.kill()
        await run_command(`${adb_path} disconnect`)
        console.log("disconnected.")
    }
}


module.exports = {
    find_nets,
    connect,
    disconnect
}
