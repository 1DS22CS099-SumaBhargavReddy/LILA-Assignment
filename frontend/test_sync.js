const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // -- Player 1 (Creator) --
  const p1Context = await browser.newContext();
  const p1Page = await p1Context.newPage();
  const p1Logs = [];
  p1Page.on('console', msg => {
    console.log('[P1]', msg.text());
    p1Logs.push(msg.text());
  });

  await p1Page.goto('http://localhost:5173');
  
  // Login P1
  await p1Page.fill('input[placeholder="Enter your nickname..."]', 'Creator');
  await p1Page.click('text=Enter the Arena');
  await p1Page.waitForSelector('text=Private Room', { timeout: 5000 });
  
  // Create Room
  await p1Page.click('text=Private Room');
  await p1Page.click('text=Create Room');
  
  // Use a random code
  const code = 'TEST' + Math.floor(Math.random() * 1000);
  await p1Page.fill('input[placeholder*="e.g. MYGAME"]', code);
  await p1Page.click('button.room-action-btn:has-text("Create Room")');
  
  // Wait for the waiting screen
  await p1Page.waitForSelector('text=Room Created!', { timeout: 5000 });
  console.log(`P1 created room with code: ${code}`);

  // -- Player 2 (Joiner) --
  const p2Context = await browser.newContext();
  const p2Page = await p2Context.newPage();
  const p2Logs = [];
  p2Page.on('console', msg => {
    console.log('[P2]', msg.text());
    p2Logs.push(msg.text());
  });

  await p2Page.goto('http://localhost:5173');
  
  // Login P2
  await p2Page.fill('input[placeholder="Enter your nickname..."]', 'Joiner');
  await p2Page.click('text=Enter the Arena');
  await p2Page.waitForSelector('text=Private Room', { timeout: 5000 });
  
  // Join Room
  await p2Page.click('text=Private Room');
  await p2Page.click('text=Join Room');
  await p2Page.fill('input[placeholder*="Paste or type Game ID"]', code);
  await p2Page.click('button.room-action-btn:has-text("Enter Game")');
  
  // Wait for P2 to enter game
  await p2Page.waitForSelector('.game-screen', { timeout: 5000 }).catch(() => console.log("P2 didn't enter game screen!"));
  console.log("P2 is checking game screen...", await p2Page.$('.game-screen') !== null);

  // Wait a bit to see if P1 transitions
  await new Promise(r => setTimeout(r, 2000));
  console.log("P1 is checking game screen...", await p1Page.$('.game-screen') !== null);

  await browser.close();
})();
