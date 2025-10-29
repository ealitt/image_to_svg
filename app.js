// Global state
let originalImage = null;
let currentSVG = null;
let reconvertedSVG = null;
let scene, camera, renderer, controls;
let stlMesh = null;

// Canvas elements
const imageCanvas = document.getElementById('imageCanvas');
const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });

// Step 1: Image Upload and Editing
document.getElementById('imageInput').addEventListener('change', handleImageUpload);
document.getElementById('brightness').addEventListener('input', updateImagePreview);
document.getElementById('contrast').addEventListener('input', updateImagePreview);

// Step 2: SVG Conversion
document.getElementById('convertToSVG').addEventListener('click', convertToSVG);
document.getElementById('threshold').addEventListener('input', convertToSVG);
document.getElementById('blackStroke').addEventListener('input', updateSVGStrokes);
document.getElementById('whiteStroke').addEventListener('input', updateSVGStrokes);

// Step 3: Re-conversion
document.getElementById('reconvertSVG').addEventListener('click', reconvertSVGPipeline);
document.getElementById('reconvertThreshold').addEventListener('input', reconvertSVGPipeline);

// Step 4: 3D STL
document.getElementById('convertToSTL').addEventListener('click', convertToSTL);
document.getElementById('depth').addEventListener('input', updateSTLDepth);
document.getElementById('bevel').addEventListener('input', updateSTLDepth);
document.getElementById('downloadSTL').addEventListener('click', downloadSTL);

// Update slider value displays
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', (e) => {
        const valueSpan = document.getElementById(e.target.id + 'Value');
        if (valueSpan) {
            valueSpan.textContent = e.target.value;
        }
    });
});

// ============================================
// STEP 1: IMAGE UPLOAD AND EDITING
// ============================================

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;

            // Set canvas size to match image
            const maxWidth = 800;
            const scale = Math.min(1, maxWidth / img.width);
            imageCanvas.width = img.width * scale;
            imageCanvas.height = img.height * scale;

            updateImagePreview();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateImagePreview() {
    if (!originalImage) return;

    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);

    // Clear canvas
    ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

    // Draw original image
    ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);

    // Apply brightness and contrast
    const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const data = imageData.data;

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        // Apply contrast
        data[i] = contrastFactor * (data[i] - 128) + 128;     // R
        data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128; // G
        data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128; // B

        // Apply brightness
        data[i] = Math.max(0, Math.min(255, data[i] + brightness));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
    }

    ctx.putImageData(imageData, 0, 0);
}

// ============================================
// STEP 2: SVG CONVERSION
// ============================================

function convertToSVG() {
    if (!originalImage) {
        alert('Please upload an image first!');
        return;
    }

    // Get current canvas state
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageCanvas.width;
    tempCanvas.height = imageCanvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(imageCanvas, 0, 0);

    // Convert to grayscale and apply threshold
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const threshold = parseInt(document.getElementById('threshold').value);

    // Convert to binary based on threshold
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        const binary = gray > threshold ? 255 : 0;
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = binary;
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Use ImageTracer to convert to SVG
    const imgd = ImageTracer.getImgdata(tempCanvas);
    currentSVG = ImageTracer.imagedataToSVG(imgd, {
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        scale: 1,
        strokewidth: 1,
        linefilter: false,
        numberofcolors: 2,
        mincolorratio: 0,
        colorquantcycles: 3
    });
    displaySVG(currentSVG, 'svgPreview');
    updateSVGStrokes();
}

function displaySVG(svgString, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = svgString;
}

// Helper function to check if a color is dark (black/near-black)
function isColorDark(colorString) {
    if (!colorString) return false;

    // Handle hex colors
    if (colorString.startsWith('#')) {
        const hex = colorString.substring(1);
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r + g + b) / 3;
        return brightness < 128;
    }

    // Handle rgb/rgba colors
    if (colorString.startsWith('rgb')) {
        const match = colorString.match(/\d+/g);
        if (match && match.length >= 3) {
            const r = parseInt(match[0]);
            const g = parseInt(match[1]);
            const b = parseInt(match[2]);
            const brightness = (r + g + b) / 3;
            return brightness < 128;
        }
    }

    // Handle named colors
    if (colorString === 'black') return true;
    if (colorString === 'white') return false;

    return false;
}

function updateSVGStrokes() {
    if (!currentSVG) return;

    const blackStroke = parseFloat(document.getElementById('blackStroke').value);
    const whiteStroke = parseFloat(document.getElementById('whiteStroke').value);

    const container = document.getElementById('svgPreview');
    const svg = container.querySelector('svg');

    if (!svg) return;

    // Update strokes for all paths
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, index) => {
        const fill = path.getAttribute('fill');

        // Apply stroke based on fill color brightness
        if (isColorDark(fill)) {
            path.setAttribute('stroke', 'black');
            path.setAttribute('stroke-width', blackStroke);
        } else {
            path.setAttribute('stroke', 'white');
            path.setAttribute('stroke-width', whiteStroke);
        }

        // Set stroke-linejoin for better appearance
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
    });
}

// ============================================
// STEP 3: SVG → IMAGE → SVG RE-CONVERSION
// ============================================

function reconvertSVGPipeline() {
    if (!currentSVG) {
        alert('Please convert to SVG first!');
        return;
    }

    const container = document.getElementById('svgPreview');
    const svg = container.querySelector('svg');

    if (!svg) return;

    // Convert SVG to Image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function() {
        // Draw to canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        // Fill with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(img, 0, 0);

        // Apply threshold
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const threshold = parseInt(document.getElementById('reconvertThreshold').value);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            const binary = gray > threshold ? 255 : 0;
            imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = binary;
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Convert back to SVG using ImageTracer
        const imgd = ImageTracer.getImgdata(tempCanvas);
        reconvertedSVG = ImageTracer.imagedataToSVG(imgd, {
            ltres: 1,
            qtres: 1,
            pathomit: 8,
            scale: 1,
            strokewidth: 1,
            linefilter: false,
            numberofcolors: 2,
            mincolorratio: 0,
            colorquantcycles: 3
        });
        displaySVG(reconvertedSVG, 'reconvertedSVGPreview');

        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// ============================================
// STEP 4: 3D STL CONVERSION
// ============================================

function init3DViewer() {
    const container = document.getElementById('stlPreview');

    // Clear existing renderer
    if (renderer) {
        container.removeChild(renderer.domElement);
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 50;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 20);
    scene.add(gridHelper);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        if (container.clientWidth === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function convertToSTL() {
    const svgSource = reconvertedSVG || currentSVG;

    if (!svgSource) {
        alert('Please convert to SVG first!');
        return;
    }

    const container = document.getElementById(reconvertedSVG ? 'reconvertedSVGPreview' : 'svgPreview');
    const svg = container.querySelector('svg');

    if (!svg) return;

    // Initialize 3D viewer if not already done
    if (!renderer) {
        init3DViewer();
    }

    // Remove old mesh
    if (stlMesh) {
        scene.remove(stlMesh);
    }

    createMeshFromSVG(svg);
}

function createMeshFromSVG(svg) {
    const paths = svg.querySelectorAll('path');
    const depth = parseFloat(document.getElementById('depth').value);
    const bevel = parseFloat(document.getElementById('bevel').value);

    // Get SVG dimensions
    const viewBox = svg.getAttribute('viewBox');
    const [minX, minY, width, height] = viewBox ? viewBox.split(' ').map(Number) : [0, 0, 100, 100];

    // Create shape from SVG paths
    const shapes = [];

    paths.forEach(path => {
        const d = path.getAttribute('d');
        if (!d) return;

        try {
            const shape = createShapeFromPath(d, width, height);
            if (shape) {
                shapes.push(shape);
            }
        } catch (e) {
            console.warn('Could not parse path:', e);
        }
    });

    if (shapes.length === 0) {
        alert('No valid paths found in SVG');
        return;
    }

    // Create geometry with extrusion
    const extrudeSettings = {
        depth: depth,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3
    };

    const geometries = shapes.map(shape => new THREE.ExtrudeGeometry(shape, extrudeSettings));

    // Merge geometries
    const mergedGeometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];

    geometries.forEach(geom => {
        const pos = geom.attributes.position.array;
        const norm = geom.attributes.normal.array;
        positions.push(...pos);
        normals.push(...norm);
    });

    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    // Create mesh
    const material = new THREE.MeshPhongMaterial({
        color: 0x667eea,
        specular: 0x111111,
        shininess: 200
    });

    stlMesh = new THREE.Mesh(mergedGeometry, material);

    // Center the mesh
    stlMesh.geometry.computeBoundingBox();
    const box = stlMesh.geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    stlMesh.position.sub(center);

    scene.add(stlMesh);

    // Adjust camera
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.z = maxDim * 2;
}

function createShapeFromPath(d, svgWidth, svgHeight) {
    const shape = new THREE.Shape();

    // Simple SVG path parser (supports M, L, H, V, Z commands)
    const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g);

    if (!commands) return null;

    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    // Scale factor to convert SVG coordinates to Three.js
    const scale = 0.1;

    commands.forEach(cmd => {
        const type = cmd[0];
        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

        switch (type.toUpperCase()) {
            case 'M': // MoveTo
                currentX = coords[0] * scale;
                currentY = -coords[1] * scale; // Flip Y axis
                startX = currentX;
                startY = currentY;
                shape.moveTo(currentX, currentY);
                break;

            case 'L': // LineTo
                for (let i = 0; i < coords.length; i += 2) {
                    currentX = coords[i] * scale;
                    currentY = -coords[i + 1] * scale;
                    shape.lineTo(currentX, currentY);
                }
                break;

            case 'H': // Horizontal line
                coords.forEach(x => {
                    currentX = x * scale;
                    shape.lineTo(currentX, currentY);
                });
                break;

            case 'V': // Vertical line
                coords.forEach(y => {
                    currentY = -y * scale;
                    shape.lineTo(currentX, currentY);
                });
                break;

            case 'C': // Cubic bezier
                for (let i = 0; i < coords.length; i += 6) {
                    shape.bezierCurveTo(
                        coords[i] * scale, -coords[i + 1] * scale,
                        coords[i + 2] * scale, -coords[i + 3] * scale,
                        coords[i + 4] * scale, -coords[i + 5] * scale
                    );
                    currentX = coords[i + 4] * scale;
                    currentY = -coords[i + 5] * scale;
                }
                break;

            case 'Q': // Quadratic bezier
                for (let i = 0; i < coords.length; i += 4) {
                    shape.quadraticCurveTo(
                        coords[i] * scale, -coords[i + 1] * scale,
                        coords[i + 2] * scale, -coords[i + 3] * scale
                    );
                    currentX = coords[i + 2] * scale;
                    currentY = -coords[i + 3] * scale;
                }
                break;

            case 'Z': // Close path
                shape.lineTo(startX, startY);
                break;
        }
    });

    return shape;
}

function updateSTLDepth() {
    if (stlMesh) {
        convertToSTL(); // Regenerate with new parameters
    }
}

function downloadSTL() {
    if (!stlMesh) {
        alert('Please generate 3D model first!');
        return;
    }

    // Export to STL format
    const geometry = stlMesh.geometry;
    const stlString = generateSTLString(geometry);

    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.stl';
    link.click();
}

function generateSTLString(geometry) {
    const vertices = geometry.attributes.position.array;
    const normals = geometry.attributes.normal ? geometry.attributes.normal.array : null;

    let stl = 'solid model\n';

    for (let i = 0; i < vertices.length; i += 9) {
        // Calculate normal if not provided
        let nx, ny, nz;
        if (normals) {
            nx = normals[i];
            ny = normals[i + 1];
            nz = normals[i + 2];
        } else {
            // Calculate normal from vertices
            const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
            const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
            const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);
            const normal = new THREE.Vector3().crossVectors(
                new THREE.Vector3().subVectors(v2, v1),
                new THREE.Vector3().subVectors(v3, v1)
            ).normalize();
            nx = normal.x;
            ny = normal.y;
            nz = normal.z;
        }

        stl += `  facet normal ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
        stl += '    outer loop\n';
        stl += `      vertex ${vertices[i].toFixed(6)} ${vertices[i + 1].toFixed(6)} ${vertices[i + 2].toFixed(6)}\n`;
        stl += `      vertex ${vertices[i + 3].toFixed(6)} ${vertices[i + 4].toFixed(6)} ${vertices[i + 5].toFixed(6)}\n`;
        stl += `      vertex ${vertices[i + 6].toFixed(6)} ${vertices[i + 7].toFixed(6)} ${vertices[i + 8].toFixed(6)}\n`;
        stl += '    endloop\n';
        stl += '  endfacet\n';
    }

    stl += 'endsolid model\n';
    return stl;
}

// Initialize on load
window.addEventListener('load', () => {
    console.log('Image to SVG to STL Converter v1.3.0 loaded successfully!');
});
