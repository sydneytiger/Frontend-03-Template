/*
  Http request 格式
  1. http使用\r\n 表示换行

  POST / HTTP/1.1                                   ==> request line
  Host:127.0.0.1                                    ==> request headers. key-value pair with delimiter ': '
  Content-Type: application/x-www-form-urlencoded
                                                    ==> 空白行 标志 header 结束 接下来是 body. 
  field1=aaa&code=x%3D1
*/

/*
  Http response 格式

  HTTP/1.1 200 OK                                   ==> status line
  Content-Type: text/html                           ==> response headers. key-value pair with delimiter ': '
  Date: Mon, 10 AUG 2020 11:25:20 GMT
  Connection: keep-alive
  Transfer-Encoding: chunked
                                                    ==> 空白行 标志 header 结束 接下来是 body.
  26                                                ==> chunked body 由一个十六进制数字 单独占一行 下一行就是 body 内容
  <html><body>Hello World</body></html>
  0                                                 ==> 又是一个十六进制数字 直到整个数字是0 表示body 结束
*/
const net = require('net');
const { CLIENT_RENEG_WINDOW } = require('tls');

class Request {
  constructor(options){
    this.method = options.method || "GET";
    this.host = options.host;
    this.port = options.port || 80;
    this.path = options.path || "/";
    this.body = options.body || {};
    this.headers = options.headers || {};

    if(!this.headers["Content-Type"]) {
      this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    if(this.headers["Content-Type"] === "application/json") {
      this.bodyText = JSON.stringify(this.body);
    } else if(this.headers["Content-Type"] === "application/x-www-form-urlencoded") {
      this.bodyText = Object.keys(this.body)
        .map(key => `${key}=${encodeURIComponent(this.body[key])}`)
        .join('&');
    }

    this.headers["Content-Length"] = this.bodyText.length;
  }

  send(connection){
    return new Promise((resolve, reject) => {
      // 逐步收到信息 所以使用状态机
      const parser = new ResponseParser;
      
      if(connection) {
        connection.write(this.toString());
      } else {
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          logger('sending request', this.toString());
          connection.write(this.toString());
        });
      }

      connection.on('data', data => {
        logger('recevided response', data.toString());
        parser.receive(data.toString());
        if(parser.isFinished) {
          resolve(parser.response);
          connection.end();
        }
      });

      connection.on('error', err => {
        reject(err);
        connection.end();
      })

    });
  }

  toString(){
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`;}
}

// Finite state machine 
class ResponseParser {
  constructor(){
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;
    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;
    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;
    this.WAITING_HEADER_BLOCK_END = 6;
    this.WAITING_BODY = 7;

    this.current = this.WAITING_STATUS_LINE;
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }

  get isFinished(){
    return this.bodyParser && this.bodyParser.isFinished;
  }

  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }

  receive(string) {
    // 状态机
    for(let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i));
    }
  }

  receiveChar(char) {
    if(this.current === this.WAITING_STATUS_LINE) {
      if(char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END;
      } else {
        this.statusLine += char;
      }
    } else if(this.current === this.WAITING_STATUS_LINE_END) {
      if(char === '\n') {
        this.current = this.WAITING_HEADER_NAME;
      }
    } else if(this.current === this.WAITING_HEADER_NAME) {
      if(char === ':'){
        this.current = this.WAITING_HEADER_SPACE;
      } else if(char === '\r'){
        this.current = this.WAITING_HEADER_BLOCK_END;
        // Transfer ecnodeing 可以有很多值 node 默认是 chunked
        // 这里开始转入 body 解析
        if(this.headers['Transfer-Encoding'] === 'chunked')
          this.bodyParser = new TrunkedBodyParser();
      } else {
        this.headerName += char;
      }
    } else if(this.current === this.WAITING_HEADER_SPACE) {
      if(char === ' ') {
        this.current = this.WAITING_HEADER_VALUE;
      } 
    } else if(this.current === this.WAITING_HEADER_VALUE) {
      if(char === '\r') {
        this.current = this.WAITING_HEADER_LINE_END;
        this.headers[this.headerName] = this.headerValue;
        this.headerValue = '';
        this.headerName = '';
      } else {
        this.headerValue += char;
      }
    } else if(this.current === this.WAITING_HEADER_LINE_END) {
      if(char === '\n') {
        this.current = this.WAITING_HEADER_NAME;
      }
    } else if(this.current === this.WAITING_HEADER_BLOCK_END){
      if(char === '\n') {
        this.current = this.WAITING_BODY;
      }
    } else if(this.current === this.WAITING_BODY) {
      this.bodyParser.receiveChar(char);
    }
  }
}

// 当读取到 \r 就转换成 WAITING_LENGTH_LINE_END 并等待 \n
class TrunkedBodyParser {
  constructor() {
    this.WAITING_LENGTH = 0;
    this.WAITING_LENGTH_LINE_END = 1;
    this.READING_TRUCNK = 2;
    this.WAITING_NEW_LINE = 3;
    this.WAITING_NEW_LINE_END = 4;

    this.length = 0;
    this.content = [];
    this.isFinished = false;
    this.current = this.WAITING_LENGTH;
  }

  receiveChar(char) {
    if(this.current === this.WAITING_LENGTH) {
      if(char === '\r') {
        // 已经读到 length
        if(this.length === 0) {
          this.isFinished = true;
        }
        this.current = this.WAITING_LENGTH_LINE_END;
      } else {
        this.length *= 16;
        this.length += parseInt(char, 16);
      }
    } else if(this.current === this.WAITING_LENGTH_LINE_END) {
      if(char === '\n') {
        this.current = this.READING_TRUCNK;
      } else if(this.current === this.READING_TRUCNK) {
        this.content.push(char);
        this.length --;
        if(this.length === 0) {
          this.current = this.WAITING_NEW_LINE;
        }
      } else if(this.current === this.WAITING_NEW_LINE) {
        if(char === '\r') {
          this.current = this.WAITING_NEW_LINE_END;
        }
      } else if(this.current === this.WAITING_NEW_LINE_END) {
        if(char === '\n') {
          this.current = this.WAITING_LENGTH;
        }
      }
    }
  }
}

void async function(){
  let request = new Request({
    method: "POST",
    host: "127.0.0.1",
    port: "8008",
    path: "/",
    headers: {
      ["X-Foo2"] : "customed"
    },
    body: {
      name: "Tiger"
    }
  });

  let response = await request.send();

  console.log('response', response);
}();

const logger = (title = 'debugger', data) => {
  console.log(`**** ${title} start ****`);
  console.log(data);
  console.log(`**** ${title} finished ****`);
}