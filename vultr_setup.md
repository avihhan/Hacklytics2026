# Vultr Server Setup Guide for TaxPilot

This guide walk you through setting up your project on a Vultr VPS (Ubuntu 22.04/24.04 recommended).

## 1. System Preparation

Log in to your Vultr server via SSH and update the system:

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Docker & Docker Compose

Run the following command to install Docker:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Ensure your user can run docker:

```bash
sudo usermod -aG docker $USER
# Note: You may need to log out and back in for this to take effect.
```

## 3. Clone the Project

```bash
git clone https://github.com/avihhan/Hacklytics2026.git
cd Hacklytics2026
```

## 4. GCloud Environment Tag Resolution

If you see the warning: `Project 'hacklytics-488122' lacks an 'environment' tag`, it is a Google Cloud organizational policy nudge.

### For Personal Accounts (Gmail)

This warning can be safely ignored. However, to suppress it or align with best practices, you can try binding a tag if you have an Organization. Since you are using a personal Gmail account, there is no "Organization" parent to hold the tag keys.

**Option A: Ignore it**
The warning does not block functionality.

**Option B: Suppress via Config (if applicable)**
If you want to avoid organizational policy checks locally:

```bash
gcloud config set core/check_gcp_environment false
```

## 5. Running the Backend (API)

The API relies on the Actian VectorAI database.

1. **Start the Database**:

   ```bash
   cd apps/api
   docker compose up -d
   ```

2. **Set up Python Environment**:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   # Install the Actian wheel if provided
   pip install ./actiancortex-0.1.0b1-py3-none-any.whl
   ```

3. **Run the API**:
   ```bash
   python run.py
   ```

## 6. Accessing the API

Ensure port `8000` (API) and `50051` (VectorAI gRPC) are open in your Vultr firewall if you need external access.
