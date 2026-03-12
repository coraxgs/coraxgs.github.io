const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /class TerminalBoot \{[\s\S]*?\}\s*\}/;

const newTerminalCode = `// Feature 4: Interactive AI Terminal
class TerminalBoot {
  constructor(elementId) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    this.lines = [
      "Initializing Corax OS v2.0...",
      "Loading kernel modules...",
      "[OK] Swarm Intelligence loaded.",
      "[OK] Post-Quantum Cryptography initialized.",
      "[OK] Edge AI Node connected.",
      "Connection established. Awaiting command."
    ];
    this.currentLine = 0;
    this.container.innerHTML = ''; // Clear initial content
    this.init();
  }

  async init() {
    // Boot sequence
    for (let i = 0; i < this.lines.length; i++) {
      await this.typeLine(this.lines[i]);
    }
    this.setupInput();
  }

  async typeLine(text, delay = 50) {
    return new Promise(resolve => {
      const lineElement = document.createElement("div");
      lineElement.className = "terminal-line";
      this.container.appendChild(lineElement);

      let i = 0;
      const interval = setInterval(() => {
        lineElement.textContent += text.charAt(i);
        i++;
        this.container.scrollTop = this.container.scrollHeight;
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(resolve, 200);
        }
      }, delay);
    });
  }

  setupInput() {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'terminal-input-line';
    inputContainer.innerHTML = '<span class="prompt">root@corax:~#</span> <input type="text" id="terminal-input" autocomplete="off" autofocus>';
    this.container.appendChild(inputContainer);

    const inputField = document.getElementById('terminal-input');

    // Focus input when terminal is clicked
    this.container.parentElement.addEventListener('click', () => {
      inputField.focus();
    });

    inputField.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = inputField.value.trim().toLowerCase();
        inputField.value = '';
        inputContainer.remove(); // Remove input to print response

        await this.typeLine(\`root@corax:~# \${cmd}\`, 10);
        await this.processCommand(cmd);

        this.setupInput(); // Re-add input after response
        inputField.focus();
      }
    });
  }

  async processCommand(cmd) {
    switch (cmd) {
      case 'help':
        await this.typeLine("Available commands:");
        await this.typeLine("  status   - Show system diagnostics");
        await this.typeLine("  analyze  - Run environmental analysis");
        await this.typeLine("  deploy   - Initialize GAPbot swarm protocol");
        await this.typeLine("  clear    - Clear terminal output");
        break;
      case 'status':
        await this.typeLine("[System Status]");
        await this.typeLine("- Edge Nodes: 4/4 Online");
        await this.typeLine("- Swarm Latency: < 5ms");
        await this.typeLine("- Compliance Logic: ACTIVE (EU AI Act Compliant)");
        await this.typeLine("- GAPbot Fleet: Idle, charging via MPPT.");
        break;
      case 'analyze':
        await this.typeLine("Initiating Edge AI analysis (YOLOv8-Seg)...");
        await this.typeLine("[██████████] 100%");
        await this.typeLine("Result: Nominal. Resource usage optimized by 42%.");
        break;
      case 'deploy':
        await this.typeLine("WARNING: Authorized personnel only.");
        await this.typeLine("Authenticating via Web3 wallet...");
        setTimeout(async () => {
          await this.typeLine("Authentication successful. Deploying GAPbot unit Alpha.");
        }, 1000);
        break;
      case 'clear':
        this.container.innerHTML = '';
        break;
      case '':
        break;
      default:
        await this.typeLine(\`Command not found: \${cmd}. Type 'help' for options.\`);
    }
  }
}`;

code = code.replace(regex, newTerminalCode);
fs.writeFileSync('app.js', code);
console.log('Patched terminal.');
