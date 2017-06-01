const fs = require('fs');
fs.readFile('colors.txt', 'utf8', (err, data) => {
  if(err) throw err;
  let res = [];
  data = data.split('\n');
  data.forEach(item => {
    item = item.substr(item.indexOf('#'));
    item = item.substr(0, item.indexOf(';'));
    res.push(item);
  });
  console.log(res);
});
