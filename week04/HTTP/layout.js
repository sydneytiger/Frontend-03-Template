

const {logger, isEmptyObject} = require('./utils.js');

function getStyle(element) {
  element.style = element.style || {};

  for(let prop of element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value;

    if(element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop].value.replace('px', ''));
    }

    if(element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop].value);
    }
  }

  return element.style;
}

function layout(element) {
  if(!element || !element.computedStyle || isEmptyObject(element.computedStyle)) return;

  var styles = getStyle(element);

  if(!styles || styles.display !== 'flex') return;

  const items = element.children.filter(e => e.type === 'element');

  items.sort((a, b) => (a.order || 0) - (b.order || 0));

  ['width', 'height'].forEach(size => {
    if(!styles[size] || styles[size] === 'auto') styles[size] = null;
  });

  // assign a default value to flex-direction, align-items, justify-content, flex-wrap and align-content
  if(!styles.flexDirection || styles.flexDirection === 'auto') styles.flexDirection = 'row';
  if(!styles.alignItems || styles.alignItems === 'auto') styles.alignItems = 'strech';
  if(!styles.justifyContent || styles.justifyContent === 'auto') styles.justifyContent = 'flex-start';
  if(!styles.flexWrap || styles.flexWrap === 'auto') styles.flexWrap = 'nowrap';
  if(!styles.alignContent || styles.alignContent === 'auto') styles.alignContent = 'strech';

  let mainSize, mainStart, mainEnd, mainSign, mainBase, 
      crossSize, crossStart, crossEnd, crossSign, corssBase;
  
  if(styles.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }

  if(styles.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = styles.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }

  if(styles.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if(styles.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = styles.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if(styles.flexWrap === 'wrap-reverse') {
    const temp = crossStart;
    crossStart = crossEnd;
    crossEnd = temp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = 1;
  }
}

module.exports.layout = layout;