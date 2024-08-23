const { Tray, Menu, app } = require("electron");
const path = require("path");
const { config_setter } = require("./utils/config.js");
const { find_nets, connect, disconnect } = require("./utils/net.js");
const { Logger } = require("./utils/log.js");


const assets_path = path.join(__dirname, "..", "assets")
let net_selected = undefined
const menu = {
    connect: undefined,
    nets: [],
    config: {
        video: undefined,
        audio: undefined,
        control: undefined
    }
}
const config_id = {
    video: "视频",
    audio: "音频",
    control: "控制"
}
let tray = undefined
const connect_label = {
    disconnect: "未连接",
    connecting: "连接中",
    connected: "已连接"
}
let retry = false
let retry_resolver = () => { }
const logger = new Logger("tray.js")


function set_context_menu() {
    const menu_items = [menu.connect]
    menu_items.push({ type: "separator" })
    menu.nets.map((net) => { menu_items.push(net) })
    menu_items.push({ type: "separator" })
    menu_items.push(menu.config.video)
    menu_items.push(menu.config.audio)
    menu_items.push(menu.config.control)
    menu_items.push({ type: "separator" })
    menu_items.push({ label: "退出", role: "quit" })

    tray.setContextMenu(Menu.buildFromTemplate(menu_items))
}


async function try_connect() {
    if (net_selected === undefined) {
        return
    }

    menu.connect.label = connect_label.connecting
    set_context_menu()
    const connected = await connect(net_selected)
    if (connected) {
        menu.connect.label = connect_label.connected
    }
    else {
        menu.connect.label = connect_label.disconnect
    }
    set_context_menu()
    return connected
}


async function create_tray() {
    tray = new Tray(path.join(assets_path, "icon.png"))
    tray.setToolTip("ScrcpyTray")
    const nets = await find_nets()
    const config = await config_setter()
    if (nets.length > 0) {
        net_selected = nets[0]
    }

    function menu_config(id) {
        return {
            label: config_id[id],
            type: "checkbox",
            checked: config[id],
            click: async () => {
                logger.log(`clicked: video.`)
                config[id] = !config[id]
                config.save()
                menu.config[id].checked = config[id]
                set_context_menu()
                if (menu.connect.label === connect_label.connected) {
                    await try_connect()
                }
                else if (menu.connect.label === connect_label.connecting) {
                    await disconnect()
                    await try_connect()
                }
            }
        }
    }

    menu.connect = {
        label: connect_label.connecting,
        click: async () => {
            logger.log(`clicked: connect.`)
            const label = menu.connect.label
            if (retry) {
                retry = false
                await new Promise((resolve) => {
                    retry_resolver = resolve
                })
                menu.connect.label = connect_label.disconnect
                set_context_menu()
                return
            }
            if (label === connect_label.disconnect) {
                await try_connect()
            }
            else if (label === connect_label.connected || label === connect_label.connecting) {
                menu.connect.label = connect_label.disconnect
                set_context_menu()
                await disconnect()
            }
        }
    }
    for (const net of nets) {
        menu.nets.push({
            label: net.id,
            type: "radio",
            click: async () => {
                logger.log(`clicked: ${net.id}.`)
                menu.nets[net_selected.index].checked = false
                menu.nets[net.index].checked = true
                net_selected = net
                await try_connect()
            }
        })
    }
    menu.config.video = menu_config("video")
    menu.config.audio = menu_config("audio")
    menu.config.control = menu_config("control")
    set_context_menu()

    tray.on("double-click", async () => {
        await disconnect()
        app.relaunch()
        app.exit(0)
    })

    await try_connect()
}


function controller_error_handler() {
    retry = true
    new Promise(async (resolve) => {
        while (retry) {
            const connected = await try_connect()
            retry_resolver()
            if (connected) {
                break
            }
        }
        resolve()
    })
}


function killing_the_server_handler() {
    menu.connect.label = connect_label.disconnect
    set_context_menu()
}


module.exports = {
    create_tray,
    controller_error_handler,
    killing_the_server_handler
}
