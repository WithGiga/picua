# PiCUA Web Interface

A modern, comprehensive web-based interface for PiCUA (PiKVM Control Utility). This application combines a powerful CLI experience with AI-powered desktop automation, real-time streaming, and an intuitive graphical interface.

## ✨ Features

### 🤖 AI-Powered Desktop Automation
- **Claude Computer Use Agent**: Advanced AI assistant for desktop automation
- **Visual Analysis**: AI can see and understand your desktop through screenshots
- **Smart Mouse Actions**: Automatic coordinate verification and adjustment
- **Natural Language Commands**: Control your desktop with conversational AI
- **Multi-attempt Retry Logic**: Intelligent coordinate adjustment when actions fail

### 🖥️ Real-Time Desktop Streaming  
- **Live PiKVM Stream**: Real-time desktop viewing with optimized performance
- **Dual-Panel Layout**: Stream view alongside command interface
- **Responsive Streaming**: Adaptive quality based on connection
- **Stream Health Monitoring**: Automatic reconnection and error handling

### 💻 Advanced CLI Experience
- **Terminal-like Interface**: Authentic CLI feel with modern enhancements
- **Command History**: Navigate through previous commands with arrow keys
- **Tab Completion**: Smart command and parameter completion
- **Interactive Suggestions**: Context-aware command hints
- **Beautiful Chat UI**: Streamlined conversation interface for AI interactions

### 🎨 Modern User Interface
- **Animated Preloader**: Custom Lottie animation during app initialization
- **Responsive Design**: Seamless experience across desktop and mobile
- **Dark/Light Themes**: Adaptive interface with system preference detection
- **Status Indicators**: Real-time connection and system status
- **Quick Actions Panel**: One-click access to common operations

## Available Commands

### Session Management
- `login [ip]` - Login to PiKVM
- `logout` - Logout and remove saved credentials
- `change-password` - Change the current password
- `status` - Show current connection status
- `config` - Show current configuration
- `test` - Test connection to PiKVM

### Power Management
- `power [on|off|long|reset] [--wait]` - Send ATX power command

### Mass Storage Device (MSD)
- `msd status` - Show MSD status
- `msd list` - List available images
- `msd connect` - Connect MSD to host
- `msd disconnect` - Disconnect MSD from host
- `msd test` - Test MSD API connectivity

### Control Commands
- `type <text> [--slow]` - Type text
- `key <key>` - Press single key
- `shortcut <keys>` - Send keyboard shortcut
- `mouse [up|down|left|right]` - Move mouse by direction
- `mouse-move <x> <y>` - Move mouse to absolute position
- `mouse-move-rel <dx> <dy>` - Move mouse relative position
- `click [single|double] [left|right]` - Click mouse
- `scroll [dx] [dy]` - Scroll mouse wheel
- `drag <x1> <y1> <x2> <y2> [button]` - Drag mouse
- `snapshot` - Capture a screenshot

### AI Agent Commands
- `ai <message>` - Send message to AI assistant for desktop automation
- `screenshot` - Take screenshot for AI analysis
- `describe` - Get AI description of current desktop state

### Utility Commands
- `help` - Show help message
- `version` - Show version information
- `clear` - Clear terminal

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **PiCUA backend server** running on port 3001
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **PiKVM device** properly configured and accessible

### Installation

1. **Clone and navigate to the frontend directory:**
   ```bash
   cd picua-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install AI agent dependencies:**
   ```bash
   npm install @lottiefiles/react-lottie-player
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser and navigate to:**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

The built files will be in the `dist` directory and ready for deployment.

## 📖 Usage Guide

### 🎮 Basic Navigation

- **Type commands** in the terminal input field
- **Press Enter** to execute commands  
- **Use Tab** for intelligent command completion
- **Arrow Up/Down** to navigate command history
- **Type `help`** to see all available commands

### 🤖 AI Assistant Usage

The AI assistant provides natural language desktop automation:

```bash
# Ask AI to perform tasks
ai "open notepad and type hello world"
ai "take a screenshot and describe what you see"
ai "click on the start menu"
ai "help me navigate to the control panel"
```

### 🎛️ Quick Actions Panel

Use the Quick Actions panel for instant operations:
- **🔌 Status** - Check connection status
- **⚡ Power On** - Turn on the target system  
- **🔴 Power Off** - Turn off the target system
- **📸 Screenshot** - Capture and download a screenshot

### 📺 Live Stream View

- **Real-time desktop viewing** in the left panel
- **Automatic reconnection** if stream is interrupted
- **Responsive scaling** based on window size
- **Click to focus** on the stream area

### 💡 Command Examples

```bash
# Session Management
login 192.168.1.100
status
test

# AI-Powered Automation  
ai "open calculator and compute 2+2"
ai "take a screenshot of the desktop"
ai "click on the file explorer icon"

# Direct Control
power on
type "Hello World"
key Enter
shortcut ctrl+c
mouse-move 500 300
click left
snapshot

# Mass Storage
msd status
msd connect
msd list
```

## ⌨️ Keyboard Shortcuts

- **Tab** - Smart command completion
- **Enter** - Execute command
- **Arrow Up** - Previous command in history
- **Arrow Down** - Next command in history
- **Ctrl+L** - Clear terminal (equivalent to `clear` command)
- **Esc** - Cancel current input

## ⚙️ Configuration

### Backend Connection
The web interface connects to the PiCUA backend server on port 3001. Ensure your backend is running:

```bash
# Default backend URL
http://localhost:3001/api
```

### Environment Variables
Create a `.env` file in the frontend directory for custom configuration:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_STREAM_URL=http://localhost:3001/pikvm-stream
```

### API Configuration
Modify the API base URL in `src/picuaApi.js` if needed:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

## 🔧 Troubleshooting

### Common Issues

1. **🔌 Connection Failed**
   - Ensure the PiCUA backend server is running on port 3001
   - Check if the backend is accessible at `http://localhost:3001`
   - Verify your PiKVM device is online and reachable

2. **🤖 AI Agent Not Responding**
   - Check if Anthropic API key is configured in the backend
   - Verify the AI agent service is running
   - Check browser console for error messages

3. **📺 Stream Not Loading**
   - Verify PiKVM stream is accessible
   - Check network connectivity to PiKVM device
   - Try refreshing the page or restarting the backend

4. **💻 Commands Not Working**
   - Ensure you're logged in to PiKVM (`login` command)
   - Check connection status with `status` command
   - Verify PiKVM credentials are correct

### Debug Mode

1. **Open Developer Tools** (F12) to see detailed logs
2. **Check Console tab** for error messages and API calls
3. **Monitor Network tab** for failed requests
4. **Use test endpoints**:
   - `http://localhost:3001/` - Backend health check
   - `http://localhost:3001/test-stream` - Stream configuration test

### Performance Optimization

- **Close unused browser tabs** for better stream performance
- **Use Chrome or Firefox** for optimal compatibility
- **Ensure stable network connection** for real-time features

## 🛠️ Development

### Project Structure

```
src/
├── components/
│   ├── Preloader.jsx    # Animated loading screen with Lottie
│   └── JanusStream.jsx  # Stream component (if using Janus)
├── assets/             # Static assets (logos, images)
├── App.jsx            # Main application component with dual-panel layout
├── App.css            # Application styles and animations
├── picuaApi.js        # API client functions for backend communication
├── main.jsx           # Application entry point
├── index.css          # Global styles and Tailwind imports
└── Picua V2.json      # Lottie animation data for preloader
```

### Key Technologies

- **React 19** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Lottie React Player** - Animation rendering
- **Lucide React** - Beautiful icon library

### Adding New Features

#### 1. Adding New Commands
```javascript
// In App.jsx, add to the commands object
const commands = {
  'my-command': {
    description: 'Description of my command',
    usage: 'my-command <parameter>',
    handler: async (args) => {
      // Implementation
    }
  }
};
```

#### 2. Adding AI Agent Capabilities
```javascript
// Extend the AI agent in ai-integration/picua-agent.js
async executeNewAction(input) {
  // Add new action handling
}
```

#### 3. Styling Guidelines
- Use **Tailwind classes** for consistent styling
- Follow **responsive design** patterns (sm:, md:, lg:)
- Maintain **dark/light theme** compatibility
- Use **CSS custom properties** for dynamic values

### Development Workflow

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Run with backend:**
   ```bash
   # Terminal 1: Start backend
   cd ../
   node server.js
   
   # Terminal 2: Start frontend  
   cd picua-frontend
   npm run dev
   ```

3. **Build and test:**
   ```bash
   npm run build
   npm run preview
   ```

## 🤝 Contributing

### Getting Started
1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding standards
4. **Test thoroughly** with both manual and automated tests
5. **Commit your changes:** `git commit -m 'Add amazing feature'`
6. **Push to the branch:** `git push origin feature/amazing-feature`
7. **Submit a pull request**

### Code Standards
- **ESLint configuration** for code quality
- **Consistent naming** conventions (camelCase for JS, kebab-case for CSS)
- **Component documentation** with JSDoc comments
- **Responsive design** considerations for all new features

## 📄 License

This project is part of the PiCUA ecosystem and follows the same license terms. See the main repository for license details.

## 🆘 Support & Community

### Getting Help
- **📖 Documentation**: Check this README and inline code comments
- **🐛 Issues**: Report bugs and request features via GitHub issues
- **💬 Discussions**: Join community discussions for questions and ideas
- **🔧 Troubleshooting**: Follow the detailed troubleshooting guide above

### Useful Links
- **Backend Repository**: Link to PiCUA backend
- **PiKVM Documentation**: Official PiKVM docs
- **Anthropic Claude API**: AI integration documentation

---

**Built with ❤️ for the PiKVM community**
