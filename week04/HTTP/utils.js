
module.exports.logger = (title = 'debugger', data) => {
  console.log(`**** ${title} start ****`);
  console.log(data);
  console.log(`**** ${title} finished ****`);
}

module.exports.isEmptyObject = obj => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}