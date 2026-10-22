import { spawn } from 'child_process';

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-sandbox',
  '--disable-gpu',
  '--user-data-dir=' + process.cwd() + '\\scratch\\chrome-profile'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5000/login', { method: 'PUT' });
  const tabData = await newTabRes.json();
  const ws = new WebSocket(tabData.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Console.enable');

  await send('Runtime.evaluate', {
    expression: `
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      }).then(r => r.json())
    `,
    awaitPromise: true
  });

  // Navigate using wouter client-side navigation or location.href
  await send('Runtime.evaluate', {
    expression: `window.location.href = '/escalation-portal'`
  });

  await new Promise(r => setTimeout(r, 6000));

  const pageInfo = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        url: window.location.href,
        levelCardsCount: document.querySelectorAll('[id^="level-card-"]').length,
        card1Text: document.querySelector('#level-card-layer1')?.innerText,
        selectPresent: !!document.querySelector('#escalation-region-select')
      })
    `,
    returnByValue: true
  });
  console.log('PAGE INFO:', pageInfo?.result?.value);

  ws.close();
} catch (err) {
  console.error('Error running test:', err);
} finally {
  chromeProc.kill('SIGKILL');
}
