# CloudAnim Studio

A professional web-based point cloud visualization and animation tool supporting custom attributes, SE3 transformations, and video export.

## Features

*   **PLY Import:** Support for binary little-endian PLY files with custom attributes (`group_id`, `part_id`).
*   **Visualization Modes:** RGB, Group ID, and Part ID coloring.
*   **Animations:**
    *   **Displacement:** Visualize point cloud alignment displacement (Start -> End).
    *   **SE3 Transform:** Apply specific rotation and translation to selected parts of the cloud (Identity -> SE3).
*   **Export:** Record animations directly to WebM video.
*   **Customization:** Adjustable background color.

## Deployment Guide (Remote Server with Port Forwarding)

Follow these steps to deploy CloudAnim Studio on a remote Linux server (e.g., AWS EC2, DigitalOcean) and access it locally.

### 1. Prepare Remote Server
SSH into your remote server:
```bash
ssh user@your-remote-ip
```
Install Node.js (version 20+ recommended):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Transfer Code
You can clone your repository or copy files directly.
```bash
git clone https://github.com/your-username/cloud-anim-studio.git
cd cloud-anim-studio
```

### 3. Build the Application
Install dependencies and build the static site:
```bash
npm install
npm run build
```
This will create a `dist/` folder containing the optimized application.

### 4. Run the Web Server
Use `serve` to host the `dist` folder on port 3000.
```bash
npx serve -s dist -l 3000
```
*To keep it running in the background, use PM2:*
```bash
sudo npm install -g pm2
pm2 start "npx serve -s dist -l 3000" --name cloud-anim
```

### 5. Access via Port Forwarding
On your **local machine**, open a new terminal and run:
```bash
ssh -L 3000:localhost:3000 user@your-remote-ip
```
*   **-L 3000:localhost:3000**: Forwards your local port 3000 to the remote server's localhost:3000.

Open your browser and navigate to:
**http://localhost:3000**
