import 'whatwg-fetch'

// mock worker API
Object.defineProperty(window, 'Worker', { value: 'worker' })

// process.on('uncaughtException', function (err) {
//     console.log(err);
// }); 
