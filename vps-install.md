# VPS Installation Guide

## Fresh VPS pe Install karne ke 3 Steps:

### Step 1: VPS pe Docker Install karo
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2: Project files upload karo
Replit se poora project download karo (ZIP), phir VPS pe upload karo:
```bash
# Local machine se VPS pe copy karo
scp jellyfin-organizer.zip root@YOUR_VPS_IP:/opt/

# VPS pe login karo
ssh root@YOUR_VPS_IP

# Unzip karo
cd /opt
unzip jellyfin-organizer.zip
cd jellyfin-organizer
```

### Step 3: Start karo
```bash
docker compose up -d --build
```

### App Access karo
Browser mein kholo: `http://YOUR_VPS_IP:5000`

---

## Settings Configure karo (GUI se):
1. Settings page kholo
2. TMDB API Key daalo
3. Source Folders add karo (jaise `/mnt/downloads`)
4. Movies Destination set karo (jaise `/mnt/movies`)
5. TV Shows Destination set karo (jaise `/mnt/tvshows`)
6. Save karo

---

## Useful Commands:
```bash
cd /opt/jellyfin-organizer

# Logs dekho
docker compose logs -f

# Restart karo
docker compose restart

# Stop karo
docker compose down

# Update karo (naya ZIP upload karke)
docker compose down
docker compose up -d --build
```
