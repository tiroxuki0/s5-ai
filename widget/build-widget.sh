#!/bin/bash

# Build S5.AI Chat Widget
echo "Building S5.AI Chat Widget..."

# Go to widget directory
cd widget

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing widget dependencies..."
    npm install
fi

# Build widget
echo "Building widget bundle..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Widget build successful!"
    
    # Copy files to Next.js public directory
    echo "Copying files to public directory..."
    
    # Create widget directory in public if it doesn't exist
    mkdir -p ../public/widget
    
    # Copy built files
    cp dist/widget.js ../public/widget/
    cp dist/widget.css ../public/widget/
    cp public/embed.js ../public/
    
    echo "Widget files copied to public directory"
    echo ""
    echo "🎉 Widget build complete!"
    echo ""
    echo "To embed the widget on your website, add this script tag:"
    echo '<script src="https://your-domain.com/embed.js"></script>'
    echo ""
    echo "Files available at:"
    echo "- https://your-domain.com/embed.js"
    echo "- https://your-domain.com/widget/widget.js"
    echo "- https://your-domain.com/widget/widget.css"
else
    echo "❌ Widget build failed!"
    exit 1
fi
