# Image to SVG to STL Converter

A comprehensive web-based tool for converting images to SVG and then to 3D STL mesh files, with real-time visualization and editing capabilities at every step.

## Features

### Step 1: Image Upload & Editing
- Upload any image file (JPG, PNG, GIF, etc.)
- Real-time brightness adjustment (-100 to +100)
- Real-time contrast adjustment (-100 to +100)
- Live canvas preview showing all edits

### Step 2: SVG Conversion & Stroke Control
- Convert edited image to SVG using Potrace library
- Adjustable threshold for black/white conversion (0-255)
- Independent stroke width controls for black regions (0-10)
- Independent stroke width controls for white regions (0-10)
- Real-time SVG preview

### Step 3: SVG Re-conversion Pipeline
- Convert SVG back to raster image
- Re-convert image back to SVG with new threshold
- Useful for refining and optimizing the SVG output
- Independent threshold control for re-conversion

### Step 4: 3D STL Mesh Generation
- Convert final SVG to 3D extruded mesh
- Adjustable extrusion depth (0.1-20 units)
- Adjustable bevel size (0-5 units)
- Interactive 3D visualizer with:
  - Orbit controls (click and drag to rotate)
  - Zoom controls (scroll wheel)
  - Pan controls (right-click and drag)
- Download STL file for 3D printing

## Technologies Used

- **Potrace.js**: Fast bitmap to vector tracing
- **Three.js**: 3D rendering and STL visualization
- **HTML5 Canvas**: Image manipulation and processing
- **Vanilla JavaScript**: No framework overhead for maximum performance

## How to Use

1. **Open `index.html` in a modern web browser**

2. **Step 1 - Upload Image:**
   - Click "Choose File" and select an image
   - Adjust brightness and contrast sliders to enhance your image
   - The canvas preview updates in real-time

3. **Step 2 - Convert to SVG:**
   - Click "Convert to SVG" button
   - Adjust the threshold slider to control black/white conversion
   - Use stroke width sliders to add thickness to black or white regions
   - Preview updates automatically

4. **Step 3 - Re-convert (Optional):**
   - Click "Re-convert SVG" to run the SVG through image conversion again
   - Adjust re-conversion threshold for different results
   - This step helps refine the SVG output

5. **Step 4 - Generate 3D Model:**
   - Click "Generate 3D Model" to create STL mesh
   - Adjust extrusion depth to control 3D thickness
   - Adjust bevel to add rounded edges
   - Use mouse to interact with 3D preview:
     - Left-click + drag: Rotate
     - Right-click + drag: Pan
     - Scroll wheel: Zoom
   - Click "Download STL" to save the file

## Installation

No installation required! Simply open the `index.html` file in any modern web browser.

For local development:
```bash
# Clone or download the repository
# Navigate to the directory
# Open index.html in your browser
```

Or use a simple HTTP server:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server
```

Then visit `http://localhost:8000`

## Browser Compatibility

Works best in modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Tips

- For large images, the browser may take a moment to process
- SVG conversion works best with high-contrast images
- Complex SVGs may take longer to convert to 3D meshes
- Reduce image size for faster processing if needed

## Use Cases

- Convert logos to 3D models for printing
- Create relief maps from photographs
- Generate 3D text from images
- Turn artwork into printable 3D objects
- Create embossed designs for manufacturing

## Libraries & Credits

- [Potrace](https://www.npmjs.com/package/potrace) - Bitmap tracing
- [Three.js](https://threejs.org/) - 3D rendering
- Built with vanilla JavaScript for optimal performance

## License

This project uses open-source libraries. Please check individual library licenses for details.

## Future Enhancements

Potential features for future versions:
- Binary STL export (currently ASCII)
- Color SVG support
- Multiple layer extrusion
- Custom color schemes
- Batch processing
- Advanced SVG path optimization

## Troubleshooting

**SVG conversion not working:**
- Ensure your image has loaded properly
- Try adjusting the threshold value
- Check browser console for errors

**3D model not displaying:**
- Make sure you've converted to SVG first
- Try refreshing the page
- Check that WebGL is enabled in your browser

**STL download fails:**
- Ensure you've generated the 3D model first
- Try a different browser
- Check available disk space

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.
