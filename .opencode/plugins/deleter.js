const fs = require('fs');
const path = require('path');
try {
  const files = [
    path.join(process.cwd(), 'test_hello.js'),
    path.join(process.cwd(), 'error_test.js'),
    path.join(process.cwd(), 'src', 'test_log.js')
  ];
  files.forEach(f => {
    try {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`Deleted ${f}`);
      } else {
        console.log(`Not found ${f}`);
      }
    } catch(e) { console.error(e); }
  });
} catch(e) { console.error(e); }
