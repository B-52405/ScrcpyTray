const path = require("path");


const bin_path = path.join(__dirname, "..", "bin")


const statics = {
    string: {
        app: "ScrcpyTray"
    },
    path: {
        scrcpy: path.join(bin_path, "scrcpy-win64-v2.5", "scrcpy.exe"),
        adb: path.join(bin_path, "scrcpy-win64-v2.5", "adb.exe"),
        nmap: path.join(bin_path, "Nmap", "nmap.exe"),
        assets: path.join(__dirname, "..", "assets"),
        config: path.join(__dirname, "..", "config.yaml")
    },
    config: {
        buffer_size: 1000,
        notification: true
    }
}


Object.freeze(statics)
for (const key in statics) {
    Object.freeze(statics[key])
}


module.exports = {
    statics
}