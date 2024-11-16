#!/bin/bash

# Copy the nginx configuration file to the EC2 instance
scp nginx.conf ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com:/tmp/nginx.conf

# SSH into the EC2 instance and update nginx configuration
ssh ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com '
    # Move the new configuration file to the correct location
    sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf

    # Test the nginx configuration
    sudo nginx -t

    # If the test is successful, reload nginx
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "Nginx configuration updated and reloaded successfully."
    else
        echo "Error in nginx configuration. Please check the file and try again."
    fi
'
