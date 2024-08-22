const { exec } = require('child_process');
const { promisify } = require('util');
const iconv = require('iconv-lite');


const exec_promise = promisify(exec)


async function run_command(command, encoding = "gbk"){
    try {
        const { stdout, stderr } = await exec_promise(command, { encoding: 'buffer' })
        if (stdout) {
            return iconv.decode(stdout, encoding)
        }
        return iconv.decode(stderr, encoding)
    } catch (error) {
        console.error(error)
    }
}


async function sleep(time){
    await new Promise(resolve => {
        setTimeout(resolve, time)
    })
}


module.exports = {
    run_command,
    sleep
}

