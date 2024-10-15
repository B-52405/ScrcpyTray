const { Tray, Menu, app } = require("electron");
const path = require("path");
const { configuration } = require("./utils/config.js");
const { connect, disconnect, controller } = require("./utils/connect.js");
const { discover_nets, discover_devices_usb, discover_devices, adb_tcpip } = require("./utils/discover.js");
const { Logger } = require("./utils/log.js");
const { sleep } = require("./utils/sleep.js");
const { notification } = require("./notification.js");
const { statics } = require("./statics.js");


let net_selected = undefined
let net_selected_index = 0
let device_selected = undefined
let device_selected_index = 0
let tray = undefined
const config_items = ["video", "audio", "buffer"]
const config_labels = {
    video: "视频",
    audio: "音频",
    buffer: "缓冲"
}
const connect_labels = {
    disconnect: "未连接    ",
    connecting: "连接中    ",
    connected: "已连接    "
}
const menu = {
    connect: undefined,
    nets: [],
    devices: [],
    config: {},
    actions: []
}
let reconnect = false
const reconnect_resolves = []
const reconnect_interval = 1000
const logger = new Logger(path.basename(__filename))


function set_context_menu() {
    const menu_items = [menu.connect]
    menu_items.push({ type: "separator" })
    menu.nets.map((net) => { menu_items.push(net) })
    menu_items.push({ type: "separator" })
    menu.devices.map((device) => { menu_items.push(device) })
    menu_items.push({ type: "separator" })
    Object.keys(menu.config).map((item) => menu_items.push(menu.config[item]))
    menu_items.push({ type: "separator" })
    menu.actions.map((action) => { menu_items.push(action) })
    menu_items.push({ type: "separator" })
    menu_items.push({ label: "退出", role: "quit" })

    tray.setContextMenu(Menu.buildFromTemplate(menu_items))
}


async function try_connect() {
    const config = await configuration()
    if ((!net_selected && !config.usb) || !device_selected) {
        return false
    }

    if (menu.connect.label !== connect_labels.connecting) {
        menu.connect.label = connect_labels.connecting
        set_context_menu()
    }

    const connected = await connect(device_selected)
    if (connected) {
        if (config.notification) {
            notification("已连接", device_selected.id)
        }
        if (config.usb) {
            if (!config.memory_usb.includes(device_selected.id)) {
                config.memory_usb.push(device_selected.id)
            }
        }
        else {
            if (!(net_selected.id in config.memory_net)) {
                config.memory_net[net_selected.id] = [device_selected.id]
            }
            else if (!config.memory_net[net_selected.id].includes(device_selected.id)) {
                config.memory_net[net_selected.id].push(device_selected.id)
            }

            config.lastest = net_selected.id
        }
        config.save()

        menu.connect.label = connect_labels.connected
        set_context_menu()
        return true
    }
    else {
        if (config.notification && !reconnect) {
            notification("连接失败", device_selected.id)
        }
        menu.connect.label = connect_labels.disconnect
        set_context_menu()
        return false
    }
}


async function await_reconnect() {
    if (reconnect) {
        await new Promise((resolve) => {
            reconnect_resolves.push(resolve)
        })
    }
}


function set_menu_connect() {
    menu.connect = {
        label: connect_labels.disconnect,
        click: async () => {
            logger.log("clicked: connect.")
            await await_reconnect()
            const label = menu.connect.label
            if (label === connect_labels.disconnect) {
                await try_connect()
            }
            else {
                menu.connect.label = connect_labels.disconnect
                set_context_menu()
                await disconnect()
            }
        }
    }
    logger.log("set menu connect done.")
}


async function set_menu_nets() {
    menu.nets = []
    const nets = await discover_nets()
    const config = await configuration()
    for (const net of nets) {
        menu.nets.push({
            label: net.id,
            type: "radio",
            click: async () => {
                logger.log(`clicked: ${net.id}.`)
                await await_reconnect()
                menu.connect.label = connect_labels.disconnect
                set_context_menu()
                menu.nets[net_selected_index].checked = false
                menu.nets[net.index].checked = true
                net_selected = net
                net_selected_index = net.index
                config.usb = false
                config.save()

                await disconnect()
                await set_menu_devices()
                await try_connect()
            }
        })

        if (!config.usb) {
            if ((!net_selected && net.id in config.memory_net) || net.id === config.lastest) {
                net_selected = net
                net_selected_index = net.index
            }
        }
    }
    menu.nets.push({
        label: "USB连接",
        type: "radio",
        click: async () => {
            logger.log("clicked: select usb.")
            await await_reconnect()
            menu.nets[net_selected_index].checked = false
            menu.nets[menu.nets.length - 2].checked = true
            net_selected = undefined
            net_selected_index = menu.nets.length - 2
            config.usb = true
            config.save()

            await disconnect()
            await set_menu_devices()
            await try_connect()
        }
    })
    menu.nets.push({
        label: "断开网络",
        type: "radio",
        click: async () => {
            logger.log("clicked: no net.")
            await await_reconnect()
            menu.nets[net_selected_index].checked = false
            menu.nets[menu.nets.length - 1].checked = true
            net_selected = undefined
            net_selected_index = menu.nets.length - 1
            config.usb = false
            config.save()

            menu.connect.label = connect_labels.disconnect
            await set_menu_devices()
            await disconnect()
        }
    })

    if (!config.usb) {
        if (net_selected === undefined && nets.length > 0) {
            net_selected = nets[0]
            net_selected_index = 0
        }
    }
    else {
        net_selected_index = menu.nets.length - 2
    }
    menu.nets[net_selected_index].checked = true
    logger.log("set menu nets done.")
}


async function set_menu_devices() {
    menu.devices = [
        {
            label: "查找中...",
            enabled: false
        }
    ]
    set_context_menu()
    menu.devices = []
    let devices = []
    const config = await configuration()
    if (config.usb) {
        devices = await discover_devices_usb()
        console.log(devices)
    }
    else if (net_selected) {
        await adb_tcpip()
        devices = await discover_devices(net_selected)
    }
    if (device_selected && !devices.includes(device_selected)) {
        device_selected = undefined
    }

    for (const device of devices) {
        menu.devices.push({
            label: device.id,
            type: "radio",
            click: async () => {
                logger.log(`clicked: ${device.id}.`)
                await await_reconnect()
                menu.devices[device_selected_index].checked = false
                menu.devices[device.index].checked = true
                device_selected = device
                device_selected_index = device.index

                await try_connect()
            }
        })

        if (!device_selected) {
            if ((config.usb && config.memory_usb.includes(device.id))
                || (net_selected && net_selected.id in config.memory_net
                    && config.memory_net[net_selected.id].includes(device.id))) {
                device_selected = device
            }
        }
    }
    menu.devices.push({
        label: "断开设备",
        type: "radio",
        click: async () => {
            logger.log("clicked: no device.")
            await await_reconnect()
            menu.devices[device_selected_index].checked = false
            menu.devices[menu.devices.length - 1].checked = true
            device_selected = undefined
            device_selected_index = menu.devices.length - 1

            menu.connect.label = connect_labels.disconnect
            set_context_menu()
            await disconnect()
        }
    })

    if (device_selected) {
        device_selected_index = device_selected.index
    }
    else {
        if (devices.length > 0) {
            device_selected = devices[0]
            device_selected_index = 0
        }
        else {
            device_selected_index = menu.devices.length - 1
        }
    }
    menu.devices[device_selected_index].checked = true
    menu.connect.label = connect_labels.disconnect
    set_context_menu()
    logger.log("set menu devices done.")
}


async function set_menu_config() {
    const config = await configuration()
    for (const item of config_items) {
        menu.config[item] = {
            label: config_labels[item],
            type: "checkbox",
            checked: config[item],
            click: async () => {
                logger.log(`clicked: ${item}.`)
                config[item] = !config[item]
                config.save()
                menu.config[item].checked = config[item]
                set_context_menu()
                if (reconnect) {
                    return
                }
                if (menu.connect.label === connect_labels.connecting) {
                    await disconnect()
                    await try_connect()
                }
                else if (menu.connect.label === connect_labels.connected) {
                    await try_connect()
                }
            }
        }
    }
    logger.log("set menu config done.")
}


function set_menu_actions() {
    menu.actions.push({
        label: "播放/暂停",
        click: async () => {
            await controller.play()
        }
    })
    logger.log("set menu actions done.")
}


async function create_tray() {
    tray = new Tray(path.join(statics.path.assets, "icon.png"))
    tray.setToolTip(statics.string.app)
    tray.on("double-click", async () => {
        await disconnect()
        app.relaunch()
        app.exit(0)
    })

    set_menu_connect()
    await set_menu_nets()
    await set_menu_config()
    set_menu_actions()
    set_context_menu()
    await set_menu_devices()
    await try_connect()
}


function device_disconnected_handler() {
    menu.connect.label = connect_labels.disconnect
    set_context_menu()
}


async function connection_lost_handler() {
    const config = await configuration()
    if (config.usb) {
        set_menu_devices()
        if (config.notification) {
            notification("设备断开", device_selected.id)
        }
    }
    else {
        logger.log("start reconnect.")
        if (config.notification) {
            notification("正在重连……", device_selected.id)
        }
        reconnect = true
        menu.connect.label = connect_labels.connecting
        set_context_menu()
        new Promise(async (resolve) => {
            while (reconnect) {
                const devices = await discover_devices({ cidr: device_selected.id })
                let connected = false
                if (devices.length > 0) {
                    connected = await try_connect()
                }
                if (reconnect_resolves.length > 0 || connected) {
                    logger.log("stop reconnect.")
                    for (const reconnect_resolve of reconnect_resolves) {
                        reconnect_resolve()
                    }
                    reconnect_resolves.length = 0
                    reconnect = false
                    resolve()
                }

                await sleep(reconnect_interval)
            }
        })
    }
}


module.exports = {
    create_tray,
    device_disconnected_handler,
    connection_lost_handler
}
