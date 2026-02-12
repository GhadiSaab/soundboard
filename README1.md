# Raspberry Pi Sound Board

A web application that allows you to upload sounds from your phone and play them on a Raspberry Pi with configurable playback modes.

## Features

- Upload audio files (MP3, WAV, OGG, M4A, etc.)
- Play sounds remotely from your phone
- Three playback modes:
  - **Queue Mode**: Sounds play one after another
  - **Interrupt Mode**: New sounds stop current playback immediately
  - **Block Mode**: New sounds rejected while playing
- Mobile-first responsive design
- Real-time status updates
- Sound management (delete unwanted sounds)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Start Production Server

```bash
npm start
```

## Deployment on Raspberry Pi

### Prerequisites

1. **Install Node.js** (if not already installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

2. **Test Audio Output**:
```bash
speaker-test -t wav
```

If no sound, configure audio:
```bash
sudo raspi-config
# Navigate to: System Options -> Audio -> Select your output (HDMI/Headphones)
```

### Deployment Steps

1. **Clone/Copy the project to your Raspberry Pi**

2. **Install dependencies**:
```bash
npm install --production
```

3. **Install PM2** (Process Manager):
```bash
sudo npm install -g pm2
```

4. **Start the application**:
```bash
pm2 start server/index.js --name soundboard
```

5. **Configure autostart** (optional):
```bash
pm2 startup
pm2 save
```

6. **Find your Raspberry Pi IP**:
```bash
hostname -I
```

7. **Access from your phone**:
Open browser and navigate to: `http://<raspberry-pi-ip>:3000`

## Usage

### Main Interface

1. **Upload a Sound**: Tap the "Upload Sound" button and select an audio file
2. **Play a Sound**: Tap any sound button to play it
3. **Delete a Sound**: Tap the "Delete" button on any sound card
4. **Stop Playback**: Tap the stop button (⏹) in the header

### Settings

1. Tap the settings button (⚙️) in the header
2. Select your preferred playback mode:
   - **Queue Mode**: Best for playing multiple sounds in sequence
   - **Interrupt Mode**: Best for quick sound effects
   - **Block Mode**: Best for preventing overlapping sounds
3. Tap "Save Settings"

## Configuration

Edit the `.env` file to customize:

```env
PORT=3000                    # Server port
UPLOAD_DIR=./uploads         # Upload directory
DATABASE_PATH=./data/sounds.db  # Database path
MAX_FILE_SIZE=10485760       # Max file size (10MB)
```

## API Endpoints

### Sounds
- `GET /api/sounds` - List all sounds
- `POST /api/sounds/upload` - Upload a new sound
- `POST /api/sounds/:id/play` - Play a sound
- `DELETE /api/sounds/:id` - Delete a sound
- `POST /api/sounds/stop` - Stop all playback
- `GET /api/sounds/status/current` - Get playback status

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/:key` - Update a setting

### Health
- `GET /api/health` - Health check endpoint

## Troubleshooting

### No sound plays
1. Check audio device: `aplay -l`
2. Test audio: `speaker-test -t wav`
3. Check volume: `alsamixer`

### Can't access from phone
1. Verify Pi and phone are on same network
2. Check Pi IP: `hostname -I`
3. Try: `http://raspberrypi.local:3000`
4. Check firewall: `sudo ufw status`

### File upload fails
1. Check disk space: `df -h`
2. Verify uploads directory exists
3. Check file size (must be < 10MB)

### Port already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

## PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs soundboard

# Restart
pm2 restart soundboard

# Stop
pm2 stop soundboard

# Remove from PM2
pm2 delete soundboard
```

## Development

### Project Structure
```
.
├── server/
│   ├── index.js              # Main server
│   ├── db.js                 # Database setup
│   ├── controllers/
│   │   ├── audioPlayer.js    # Audio playback logic
│   │   └── soundController.js # Sound CRUD operations
│   ├── middleware/
│   │   ├── upload.js         # File upload handler
│   │   └── errorHandler.js   # Error handling
│   └── routes/
│       ├── sounds.js         # Sound routes
│       └── settings.js       # Settings routes
├── public/
│   ├── index.html            # Main UI
│   ├── settings.html         # Settings page
│   ├── css/
│   │   └── styles.css        # Styles
│   └── js/
│       ├── api.js            # API client
│       └── app.js            # App logic
├── uploads/                  # Audio files
└── data/                     # SQLite database
```

### Run Development Server

```bash
npm run dev
```

This uses nodemon to automatically restart on file changes.

## Technologies

- **Backend**: Node.js, Express, SQLite
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Audio**: play-sound (ALSA/aplay wrapper)
- **File Upload**: Multer
- **Database**: better-sqlite3

## License

ISC

## Contributing

Feel free to open issues or submit pull requests!
