const { exec } = require('child_process');
const iconv = require('iconv-lite');
const { promisify } = require('util');
const path = require('path');
const { Logger } = require('./log.js');


const exec_promise = promisify(exec)
const logger = new Logger(path.basename(__filename))


async function command(command, encoding = "gbk") {
    try {
        logger.log(`command: ${command}`)
        const { stdout, stderr } = await exec_promise(command, { encoding: 'buffer' })
        if (stdout) {
            return iconv.decode(stdout, encoding)
        }
        return iconv.decode(stderr, encoding)
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    command
}
