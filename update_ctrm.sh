#!/bin/bash

# Navigate to Cryptonium directory and update the repository
cd ~/Cryptonium || { echo "Directory ~/Cryptonium not found."; exit 1; }
git pull origin main

# Return to home directory
cd ~

# Restart and check the cryptonium.service
systemctl --user stop cryptonium.service
systemctl --user start cryptonium.service
systemctl --user status cryptonium.service