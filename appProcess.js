process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message, err.stack)
    process.exit(1)
})

process.on('unhandledRejection', function (promise, err) {
    console.error((new Date).toUTCString() + ' unhandledRejection:', promise, err)
    process.exit(1)
})