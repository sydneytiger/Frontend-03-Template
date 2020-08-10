const {logger} = require('./utils.js');
const EOF = Symbol('EOF');

/*
  token object sample
  {
    type: 'startTage',
    tagName: 'div',
    isSelfClosing: false
  }

  attribute object sample
  {
    name: 'class',
    value: 'title'
  }

  text object sample
  {
    type: 'text',
    content: ''
  }
*/
let currentToken = null, currentAttribute = null, currentTextNode = null;
let stack = [{type: 'document', children:[]}];

// 创建 DOM 树的逻辑都在 emit 的方法里
// 此处做 HTML 语法分析
/*
  sample element object
  {
    type: 'element',
    children: [],
    attributes: [],
    tagName: token.tagName,
    parent: [Object]
  }
*/
/*
  使用栈构造 DOM tree
  1. 遇到startTag 就创建一个 element object并且入栈
  2. self-closing tag 不入栈
  3. 任何元素的父元素都是入栈前的栈顶元素
  4. 栈顶元素的意义就是用于当父元素 今后到来的每一个非 close tag 都是它的 chidren
  5. 解析完毕后栈内应该只有一个根元素 document
*/
function emit(token) {
  if(token.type === 'text') return;

  let top = stack[stack.length - 1];

  if(token.type === 'startTag') {
    let element = {
      type: 'element',
      children: [],
      attributes: [],
      tagName: token.tagName,
      parent: top
    };

    // build attributes
    for(let prop in token) {
      if(prop !== 'type' && prop !== 'tagName') {
        element.attributes.push({
          name: prop,
          value: token[prop]
        });
      }
    }

    top.children.push(element);

    // self closing tag不会有 children 元素 所以不需要入栈
    if(!token.isSelfClosing){
      stack.push(element);
    }

    currentTextNode = null;
  } else if(token.type === 'endTag') {
    if(top.tagName != token.tagName) {
      throw new Error('Start tag does not match end tag');
    } else {
      stack.pop();
    }

    currentTextNode = null;
  } else if(token.type === 'text'){
    if(!currentTextNode) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode);  
    }

    currentTextNode.content += token.content;
  }

}

/*
  parsing html tags:
  1 opening tag
  2 closing tag
  3 self-close tag
*/

// 一些列状态机 此处做词法分析 Lexical analysis
// 初始状态
/*
  sample output

{ type: 'startTag',
  tagName: 'html',
  isSelfClosing: false,
  maaa: 'a' }
{ type: 'startTag', tagName: 'head', isSelfClosing: false }
{ type: 'startTag', tagName: 'style', isSelfClosing: false }
{ type: 'endTag', tagName: 'style', isSelfClosing: false }
{ type: 'endTag', tagName: 'head', isSelfClosing: false }
{ type: 'startTag', tagName: 'body', isSelfClosing: false }
{ type: 'startTag',
  tagName: 'div',
  isSelfClosing: false,
  class: 'title margin-left-xs' }
{ type: 'startTag',
  tagName: 'img',
  isSelfClosing: true,
  id: 'myid' }
{ type: 'startTag',
  tagName: 'img',
  isSelfClosing: true,
  style: 'display:none' }
{ type: 'endTag', tagName: 'div', isSelfClosing: false }
{ type: 'endTag', tagName: 'body', isSelfClosing: false }
{ type: 'endTag', tagName: 'html', isSelfClosing: false }
*/
function data(char) {
  if(char === '<')    // '<' <== 找到'<' 开始解析 opening tag
    return tagOpen;
  else if(char === EOF)
    emit({ type: "EOF"});
  else {
      emit({
        type: 'text',
        content: char
      });
      return data;
    }
}

// tag 开始状态
function tagOpen(char) {
  if(char === '/'){                     // '</' <== 找到'</' 开始解析closing tag
    return endTagOpen;
  } else if(char.match(/^[a-zA-Z]$/)){  // '<h' <== 找到一个字母 开始解析 tag name
    currentToken = {
      type: 'startTag',
      tagName: '',
      isSelfClosing: false
    }
    return tagName(char);
  } else{
    return;
  }
}

function endTagOpen(char) {
  if(char.match(/^[a-zA-Z]$/)){    // '</html' <== 找到一个字母 继续解析 tag name 
    currentToken = {
      type: 'endTag',
      tagName: '',
      isSelfClosing: false
    }
    return tagName(char);
  }
  else if(char === '>')           // '</html>' <== 找到'>'
    console.log(">")
  else if(char === EOF)
    console.log(EOF);
  else
    console.log('else')
}

function tagName(char) {
  if(char.match(/^[\t\n\t ]$/)){      // 四种有效空白符 \t=tab \n=newline \f=formfeed 和 空格 ' '
    return beforAttributeName;        // '<div ' <== 完成tag name解析 进入 attribute解析状态
  }
  else if(char === '/')
    return selfClosingStartTag;       // '<div /' <== 进入 self closing状态
  else if(char.match(/^[a-zA-Z]$/)){  // '<di' <== 仍然在继续解析 tag name
    currentToken.tagName += char;
    return tagName;
  }
  else if(char === '>'){               // '<div>' <== opening tag 结束 回到初始状态
    emit(currentToken);
    return data;
  }
  else
    return tagName;
}

function beforAttributeName(char) {
  if(char.match(/^[\t\n\t ]$/))     
    return beforAttributeName;
  else if(char === '>' || char === '/' || char === EOF){   // '<button disabled> or <div class="title">' <== 结束attribute 回到初始状态
    return afterAttributeName(char);
  } else if(char === '='){
    //TODO:
  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(char);
  }
}

function attributeName(char){
  if(char.match(/^[\t\n\t ]$/) || char === '/' || char === '>' || char === EOF){
    return afterAttributeName(char);        // '<div class="abc" '
  } else if(char === '=') {
    return beforAttributeValue;
  } else if(char === '\u0000') {
    // TODO:
  } else if(char === "\"" || char === "'" || char === '<') {
    // TODO:
  } else {
    currentAttribute.name += char;
    return attributeName;
  }
}

function afterAttributeName(char) {
  if(char.match(/^[\t\n\t ]$/)) {
    return beforAttributeName;
  } else if(char === '/') {
    return selfClosingStartTag;
  } else if(char === '=') {
    return beforAttributeValue;
  } else if(char === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if(char === EOF) {

  } else {
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(char);
  }
}

function beforAttributeValue(char) {
  if(char.match(/^[\t\n\t ]$/) || char === '/' || char === '>' || char === EOF){
    return beforAttributeValue;
  } else if(char === "\"") {
    return doubleQuotedAttributeValue;
  } else if(char === "\'") {
    return singleQuotedAttributeValue;
  } else if(char === '>') {
    // return data;
  } else {
    return unquotedAttributeValue(char);
  }
}

function doubleQuotedAttributeValue(char){
  if(char === "\"") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if(char === "\u0000") {
    // TODO:
  } else if(char === EOF) {
    // TODO:
  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(char) {
  if(char === "\'") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if(char === "\u0000") {
    // TODO:
  } else if(char === EOF) {
    // TODO:
  } else {
    currentAttribute.value += char;
    return singleQuotedAttributeValue;
  }
}

function unquotedAttributeValue(char) {
  if(char.match(/^[\t\n\t ]$/)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforAttributeName;
  } else if(char === '/') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if(char === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if(char === "\u0000") {
    // TODO:
  } else if(char === EOF) {
    // TODO:
  } else if(char === "\"" || char === "'" || char === "<" || char === "=" || char === "`") {
    // TODO:
  } else {
    currentAttribute.value += char;
    return unquotedAttributeValue;
  }
}

function afterQuotedAttributeValue(char) {
  if(char.match(/^[\t\n\t ]$/)) {
    return beforAttributeName;
  } else if(char === '/') {
    return selfClosingStartTag;
  } else if(char === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if(char === EOF){
    // TODO:
  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue; //?
  }
}

function selfClosingStartTag(char) {
  if(char === '>'){                  // '<button /' <== 已经解析到'/' 只有'>'是有效
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  }                  
  else if(char === EOF){
    console.log('TODO')
  }
  else {
    console.log('TODO')
  }
}


module.exports.parseHTML = function parseHTML(html) {
  let state = data;
  for(let char of html) {
    state = state(char);
  }
  state = state(EOF);
  return stack[0];
}