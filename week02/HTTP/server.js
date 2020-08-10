const http = require('http');

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
    console.log('body:', body);
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<html><body>Hello Tiger Chen</body></html> \n');
  });
}).listen(port);

console.log("server started listen on port:", port);