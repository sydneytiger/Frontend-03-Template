
module.exports.logger = (title = 'debugger', data) => {
  console.log(`**** ${title} start ****`);
  console.log(data);
  console.log(`**** ${title} finished ****`);
}