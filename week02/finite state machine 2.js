//状态机 寻找 abcabx 字符
const match = str => {
  let state = checkA;
  for(let char of str) {
    state = state(char);
  }
  return state === end;
}

function checkA(char) {
  if(char === 'a'){
    return checkB;
  } else {
    return checkA;
  }
}

function end(){
  return end;
}

function checkB(char) {
  if(char === 'b'){
    return checkC;
  } else {
    return checkA(char);
  }
}

function checkC(char) {
  if(char === 'c'){
    return checkA2;
  } else {
    return checkA(char);
  }
}

function checkA2(char) {
  if(char === 'a'){
    return checkB2;
  } else {
    return checkA(char);
  }
}

function checkB2(char) {
  if(char === 'b'){
    return checkX;
  } else {
    return checkA(char);
  }
}

function checkX(char) {
  if(char === 'x'){
    return end;
  } else {
    return checkC(char);
  }
}

console.log('find abcabx in edabcabcabxsdf', match('edabcabcabxsdf'))
console.log('find abcabx in abxabxabxsdf', match('abxabxabxsdf'))