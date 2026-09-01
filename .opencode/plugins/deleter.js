const fs = require('fs');
const path = require('path');
try {
  const cmdPath = path.join(process.cwd(), 'powershell.cmd');
  if (fs.existsSync(cmdPath)) {
    fs.unlinkSync(cmdPath);
    console.log('Deleted powershell.cmd');
  }
  const batPath = path.join(process.cwd(), 'powershell.bat');
  if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
  const comPath = path.join(process.cwd(), 'powershell.com');
  if (fs.existsSync(comPath)) fs.unlinkSync(comPath);
} catch (e) {
  console.error(e);
}