const { Tray, Menu } = require('electron');
const path = require("path");
const { config_setter } = require('./utils/config.js');
const { find_nets, connect } = require('./utils/net.js');


const assets_path = path.join(__dirname, "..", "assets")
let cidr = undefined


async function create_tray() {
    const iconPath = path.join(assets_path, 'icon.png')
    const tray = new Tray(iconPath)
    const nets = await find_nets()
    const config = await config_setter()
    if(nets.length > 0){
        cidr = nets[0].cidr
        connect(nets[0].cidr)
    }

    function click_generator(id) {
        return async (item) => {
            config[id] = !config[id]
            item.checked = config[id]
            await config.save()
            if(cidr){
                await connect(cidr)
            }
        }
    }

    let menuItems = [{ type: 'separator' }]
    for (const net of nets) {
        menuItems.push({
            label: net.id,
            type: "radio",
            click: async (item) => {
                await connect(net.cidr)
            }
        })
    }
    menuItems[0].checked = true
    menuItems = menuItems.concat([
        { type: 'separator' },
        {
            label: '视频',
            type: 'checkbox',
            checked: config.video,
            click: click_generator("video")
        },
        {
            label: '音频',
            type: 'checkbox',
            checked: config.audio,
            click: click_generator("audio")
        },
        {
            label: '控制',
            type: 'checkbox',
            checked: config.control,
            click: click_generator("control")
        },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
    ])

    const contextMenu = Menu.buildFromTemplate(menuItems)
    tray.setContextMenu(contextMenu)
    tray.setToolTip('ScrcpyTray')
}


module.exports = {
    create_tray
}
