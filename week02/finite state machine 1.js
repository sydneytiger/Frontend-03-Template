// 状态机 寻找包含 abcd 的字符串 
const match = str => {
  let state = checkA;

  for(let char of str) {
    state = state(char);
  }

  return state === end;
}

const checkA = char => {
  if(char === 'a'){
    return checkB;
  } else {
    return checkA;
  }
}

const end = () => {
  return end;
}

const checkB = char => {
  if(char === 'b'){
    return checkC;
  } else {
    return checkA(char);
  }
}

const checkC = char => {
  if(char === 'c'){
    return checkD;
  } else {
    return checkA(char);
  }
}

const checkD = char => {
  if(char === 'd'){
    return end;
  } else {
    return checkA(char);
  }
}

console.log('find abcd in imkkjababcdgosdf', match('imkkjababcdgosdf'));
console.log('find abcd in abaxbcdgosdf', match('abaxbcdgosdf'));