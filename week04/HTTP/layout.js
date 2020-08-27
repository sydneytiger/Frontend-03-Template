

const {logger, isEmptyObject} = require('./utils.js');

function getStyle(element) {
  element.style = element.style || {};

  for(let prop in element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value;

    if(element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop].replace('px', ''));
    } else if(element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }

  return element.style;
}

function layout(element) {
  if(!element || !element.computedStyle || isEmptyObject(element.computedStyle)) return;

  var styles = getStyle(element);

  // 目前只处理 flex 排版模式
  if(!styles || styles.display !== 'flex') return;

  // 过滤掉所有type==='text'元素
  const items = element.children.filter(e => e.type === 'element');

  items.sort((a, b) => (a.order || 0) - (b.order || 0));

  ['width', 'height'].forEach(size => {
    if(!styles[size] || styles[size] === 'auto') styles[size] = null;
  });

  // assign a default value to flex-direction, align-items, justify-content, flex-wrap and align-content
  if(!styles.flexDirection || styles.flexDirection === 'auto') styles.flexDirection = 'row';
  if(!styles.alignItems || styles.alignItems === 'auto') styles.alignItems = 'stretch';
  if(!styles.justifyContent || styles.justifyContent === 'auto') styles.justifyContent = 'flex-start';
  if(!styles.flexWrap || styles.flexWrap === 'auto') styles.flexWrap = 'nowrap';
  if(!styles.alignContent || styles.alignContent === 'auto') styles.alignContent = 'stretch';

  let mainSize, mainStart, mainEnd, mainSign, mainBase, 
      crossSize, crossStart, crossEnd, crossSign, crossBase;
  
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

  let isAutoMainSize = false;

  if(!styles[mainSize]) { // auto sizing 父元素没有设置主轴大小 不会换行 主轴大小等于所有子元素主轴总和
    styles[mainSize] = 0;
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      if(itemStyle[mainSize] !== null || itemStyle[mainSize] !== undefined) {
        styles[mainSize] += item[mainSize]; 
      }
    }
    isAutoMainSize = true;
  }

  /*  元素收集器 
      每一个 flexLine 显示中的一行 这里的行是相对主轴(main axies)而言的 
      如果主轴是 x 轴那就是水平排列 flexLine 就是一行
      如果主轴是 y 轴那就是垂直排列 flexLine 就是一列
  */
  let flexLine = []; 
  const flexLines = [flexLine]; 

  // 主轴剩余空间 该值决定了下一个元素时候能假如当前 flexLine 初始等于父元素的 mainSize (width or height)
  let mainSpace = styles[mainSize];

  // 交叉轴空间 初始值为 0
  let crossSpace = 0;

  /*
    遍历子元素
    添加元素时 先比较 mainSpace和元素的mainSize(width or height)大小 如果剩余空间不够
    就把当前 flexLine 假如到 flexLines 中然后再建立一个新的 flexLine并且加入新元素
  */
  for(let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemStyle = getStyle(item);

    // 没有设置主轴属性的给一个默认值 0
    if(itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    if(itemStyle.flex) {
      flexLine.push(item);
    } else if(styles.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if(itemStyle[crossSize] !== null && itemStyle[crossSize] !== undefined) {
        // flex 布局中(假设主轴是 x) 某一行的高度等于这行中最高的元素高度
        crossSpace = Math.max(crossSpace, itemStyle[crossSize])
      }
      flexLine.push(item);
    } else {
      // edge case, 子元素mainSize特别大 大于父元素 
      // 把子元素减少到跟父元素一样大
      if (itemStyle[mainSize] > styles[mainSize]) {
        itemStyle[mainSize] = styles[mainSize];
      }

      // 当子元素大于当前行剩余空间 换行
      if(mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace; // 给当前行加入宽高的属性 方便今后计算
        flexLine.crossSpace = crossSpace;

        flexLine = [item];              // 吧当前元素放入新行 并且吧新行加入flexLines
        flexLines.push(flexLine);

        mainSpace = styles[mainSize];    // 重置
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }

      mainSpace -= itemStyle[mainSize];
      if(itemStyle[crossSize] !== null && itemStyle[crossSpace] !== undefined) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize])
      }

    }
    flexLine.mainSpace = mainSpace;
    console.log(items);


    /*
      主轴计算思路:
      找到所有 flex 元素
      吧主轴方向的剩余尺寸按比例分配给 flex 元素
      若剩余空降是负数 所有 flex 元素为 0 并且等比压缩非 flex 元素
      简单说就是根据不同情况 (假设主轴是 x) 计算出每个元素的 width(mainSize), left(mainStart)和 right(mainEnd)
    */
    if(styles.flexWrap === 'nowrap' || isAutoMainSize) {
      flexLine.crossSpace = (styles[crossSize] !== undefined) ? styles[crossSize] : crossSpace;
    } else {
      flexLine.crossSpace = crossSpace;
    }

    // 当主轴剩余空间小于零 将对所有主轴元素进行等比压缩
    // 只会发生在单行
    if(mainSpace < 0) {
      const scale = styles[mainSize] / (styles[mainSize] - mainSpace); // 压缩比例
      let currentMain = mainBase;

      for(let i = 0; i < items.length; i++) {
        const item = item[i];
        const itemStyle = getStyle(item);

        // 具有 flex 属性的元素不参与等比压缩
        if(itemStyle.flex) {
          itemStyle[mainSize] = 0;
        }

        // (假设主轴是 x) 对每个元素计算 width(mainSize), left(mainStart)和 right(mainEnd)的计算
        itemStyle[mainSize] = itemStyle[mainSize] * scale;
        itemStyle[mainStart] = currentMain;
        itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
        currentMain = itemStyle[mainEnd];
      }
    } else {
      // 多行逻辑
      flexLines.forEach(function(flexLineItem) {
        const mainSpace = flexLineItem.mainSpace;
        let flexTotal = 0;

        // 循环取出单个 flexLine item 里所有元素
        // 统计出所有有 flex 属性的元素 存放在 flexTotal 里
        for(let i = 0; i < flexLineItem.length; i++) {
          const item = flexLineItem[i];
          const itemStyle = getStyle(item);

          if((itemStyle.flex !== null) && (itemStyle.flex !== undefined)) {
            flexTotal += itemStyle.flex;
            continue;
          }
        }

        let currentMain, step = 0;
        // 有 flex 元素 将剩余空间 mainSpace 平均分布到所有 flex 元素里
        // 此处 justify-content 不起作用
        if (flexTotal > 0) {
          currentMain = mainBase;
          for(let i = 0; i < flexLineItem.length; i++) {
            const item = flexLineItem[i];
            const itemStyle = getStyle(item);

            if(itemStyle.flex) {
              itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
            }

            itemStyle[mainStart] = currentMain;
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
            currentMain = itemStyle[mainEnd];
          }
        } else {
          // 没有 flex 属性的元素 justify-content属性起作用???
          if(styles.justifyContent === 'flex-start') {
            currentMain = mainBase;
            step = 0;
          }

          if(styles.justifyContent === 'flex-end') {
            currentMain = mainSpace * mainSign + mainBase;
            step = 0;
          }

          if(styles.justifyContent === 'center') {
            currentMain = mainSpace / 2 * mainSign + mainBase;
            step = 0;
          }

          if(styles.justifyContent === 'space-between') {
            currentMain = mainBase;
            step = mainBase / (flexLineItem.length - 1) * mainSign;
          }

          if(styles.justifyContent === 'space-around') {
            currentMain = step / 2 + mainSign;
            step = mainBase / flexLineItem.length * mainSign;
          }

          for(let i = 0; i < flexLineItem.length; i++) {
            const item = flexLineItem[i];
            const itemStyle = getStyle(item);
            itemStyle[mainStart, currentMain];
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
            currentMain = itemStyle[mainEnd] + step;
          }

        }


      });

    }

    /*
      交叉轴计算思路:
      根据每一行中最大元素尺寸计算行高
      根据行高 flex-align 和 item-align 确定元素具体位置
      简单说就是根据不同情况 (假设主轴是 x) 计算出每个元素的  height(crossSize), top(crossStart)和 bottom(crossEnd)
    */
    //let crossSpace;

    if(!styles[crossSize]) {
      crossSpace = 0;
      styles[crossSize] = 0;
      for(let i = 0; i < flexLines.length; i++) {
        // 父元素(flex container)没有定义行高 自动适配高度 父元素的行高等于所有子元素(flex items)行高之和
        styles[crossSize] = styles[crossSize] + flexLines[i].crossSpace;
      }
    } else {
      crossSpace = styles[crossSize];
      for(let i = 0; i < flexLines.length; i++){
        crossSpace -= flexLines[i].crossSpace;
      } 
    }

    if(styles.flexWrap === 'wrap-reverse') {
      crossBase = styles[crossSize];
    } else {
      crossBase = 0;
    }

    let lineSize = styles[crossSize] / flexLines.length;
    let step = 0;

    if(styles.alignContent === 'flex-start') {
      crossBase += 0;
      step = 0;
    }

    if(styles.alignContent === 'flex-end') {
      crossBase += crossSign * crossSpace;
      step = 0;
    }

    if(styles.alignContent === 'center') {
      crossBase += crossSign * crossSpace / 2;
      step = 0;
    }
    
    if(styles.alignContent === 'space-between') {
      crossBase += 0;
      step = crossSpace / (flexLines.length - 1);
    }

    if(styles.alignContent === 'space-around') {
      step = crossSpace / (flexLines.length);
      crossBase += crossSign * setp / 2;
    }

    if(styles.alignContent === 'stretch') {
      step = 0;
      crossBase += 0;
    }

    flexLines.forEach(function(flexLineItem) {
      const lineCrossSize = styles.alignContent === 'stretch' ?
        flexLineItem.crossSpace + crossSpace / flexLines.length :
        flexLineItem.crossSpace;

      for (let i = 0; i < flexLine.length; i++) {
        const item = flexLine[i];
        const itemStyle = getStyle(item);
        const align = itemStyle.alignSelf || styles.alignItems;

        if (item === null) {
          itemStyle[crossSize] = (align === 'stretch') ? lineCrossSize : 0;
        }

        if(align === 'flex-start') {
          itemStyle[crossStart] = crossBase;
          itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
        }
        
        if(align === 'flex-end') {
          itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
          itemStyle[crossStart] = itemStyle[crossEnd] + crossSign * itemStyle[crossSize];
        }
        
        if(align === 'center') {
          itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2;
          itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
        }

        if(align === 'stretch') {
          itemStyle[crossStart] = crossBase;
          itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize]));
          itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
        }

      }

      crossBase += crossSign * (lineCrossSize + step);
      //console.log(flexLineItem);
    });
  }

}

module.exports.layout = layout;