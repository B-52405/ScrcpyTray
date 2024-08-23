const dayjs = require('dayjs');


class Logger {
    #TAG
    #format

    constructor(TAG, format = "YYYY/MM/DD-HH:mm:ss") {
        this.#TAG = TAG.slice(0, 12).padEnd(12, " ")
        this.#format = format
    }

    log(message) {
        console.log(dayjs().format(this.#format), this.#TAG, "|", message)
    }
}


module.exports = {
    Logger
}
