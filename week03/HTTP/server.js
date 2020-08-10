
const http = require('http');
const fs = require('fs');

const port = 8008;

http.createServer((request, response) => {
  let body = [];
  request.on('error', err => {
    console.log(err);
  })
  .on('data', chunk => {
    body.push(chunk);
    // body.push(Buffer.from(chunk));
  })
  .on('end', () => {
    body = Buffer.concat(body).toString();
    console.log(`${new Date().toLocaleString()} body:${decodeURIComponent(body)}`);
    
    const html = fs.readFileSync('./sample.html', { encoding: 'utf8', flag: 'r'});
    
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(html);
  });
}).listen(port);

console.log("server started listen on port:", port);