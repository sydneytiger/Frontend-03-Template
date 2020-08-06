//状态机 寻找 abababx 字符
const match = str => {
  let state = checkA;
  for(let char of str) {
    state = state(char);
  }
  return state === end;
}

function end(){
  return end;
}

function checkA(char) {
  if(char === 'a'){
    return checkB;
  } else {
    return checkA;
  }
}

function checkB(char) {
  if(char === 'b'){
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
    return checkA3;
  } else {
    return checkA(char);
  }
}

function checkA3(char) {
  if(char === 'a'){
    return checkB3;
  } else {
    return checkA(char);
  }
}

function checkB3(char) {
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
    return checkA3(char);
  }
}

console.log('find abababx in efeabababxsdfsd', match('efeabababxsdfsd'))
console.log('find abababx in efeababxabxuiu', match('efeababxabxuiu'))