//If you are seeing this please do not copy or distribute this code as your own.
//I have added detailed notes to this code just incase you are curious about how I did certain things.
//Thank you for your intrest in my project!!

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(15, 40, 35);
spotLight.castShadow = true;
scene.add(spotLight);

// Reflective floor using Reflector
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const reflector = new Reflector(floorGeometry, {
    color: 0x777777,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    clipBias: 0.003,
    recursion: 1
});
reflector.rotation.x = -Math.PI / 2;
reflector.receiveShadow = true;
scene.add(reflector);

// Load 3D models (Cartoon House Pub, Arcade Machine, Vending Machine, and TV along with anything else that needs loading.)
const loader = new GLTFLoader();
let arcadeMachine, screen, buttonMesh, glowingText, tvModel, tvScreen, vendingMachine, vendingScreen, vendingButtonMesh, secondGlowingText;
const targetPosition = new THREE.Vector3(-9, 2.5, -4);  
let isVideoPlaying = true;  
let isVendingVideoPlaying = true;
let screenClicked = false;  
let vendingScreenClicked = false;  


let vendingOriginalScreenMaterial;
let vendingVideo;
let vendingVideoTexture;

let isTVVideoPlaying = true;
let tvScreenClicked = false;
let tvVideo, tvVideoTexture;
let originalTVScreenMaterial;  
let tvBackButtonMesh;

let animationFrameId;  

// Video setup
const videoURL = 'https://storage.googleapis.com/video_bucket_for_portfolio/MortalKombat1arcadeALLFatalities2.mp4';
let video, videoTexture, originalScreenMaterial;

// Create a texture from the video element
function createVideoTexture() {
    video = document.createElement('video');
    video.src = videoURL;
    video.crossOrigin = 'anonymous';  
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    video.play().then(() => {
        console.log('Video playback started successfully.');
    }).catch(error => {
        console.error('Video playback failed:', error);
    });

    originalScreenMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00ff00,
        emissiveIntensity: 0, 
        toneMapped: false 
    });
}

function createTVVideoTexture() {
    const tvVideoURL = 'https://storage.googleapis.com/video_bucket_for_portfolio/tvscreen.mp4';
    tvVideo = document.createElement('video');
    tvVideo.src = tvVideoURL;
    tvVideo.crossOrigin = 'anonymous';
    tvVideo.loop = true;
    tvVideo.muted = true;
    tvVideo.playsInline = true;

    tvVideoTexture = new THREE.VideoTexture(tvVideo);
    tvVideoTexture.minFilter = THREE.LinearFilter;
    tvVideoTexture.magFilter = THREE.LinearFilter;
    tvVideoTexture.format = THREE.RGBFormat;

    // Start the video playback automatically
    tvVideo.play().then(() => {
        console.log('TV video playback started.');
    }).catch(error => {
        console.error('Error starting TV video:', error);
    });

    // Store the static image material for future reference
    if (tvScreen) {
        originalTVScreenMaterial = tvScreen.material; 
        tvScreen.material = new THREE.MeshStandardMaterial({
            map: tvVideoTexture,
            emissiveIntensity: 0,
            toneMapped: false
        });
    } else {
        console.error("tvScreen is not initialized.");
    }
}

// Load the pub model
loader.load('/np/free_cartoon_house_pub.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(0, -0.23, 0);
    model.castShadow = true;
    model.receiveShadow = true;
    scene.add(model);
}, undefined, function (error) {
    console.error('Error loading the pub model:', error);
});

// Load the arcade machine
loader.load('/np/arcade_machine__automaping.glb', function (gltf) {
    arcadeMachine = gltf.scene;
    arcadeMachine.position.set(-5.5, -0.23, -3.5);
    arcadeMachine.scale.set(1, 1, 1);
    arcadeMachine.rotation.set(Math.PI / 0.5, Math.PI / 0.67, 0);
    scene.add(arcadeMachine);

    // Create the green screen (starts with the video)
    const screenGeometry = new THREE.PlaneGeometry(1.3, 0.9);
    screen = new THREE.Mesh(screenGeometry, new THREE.MeshStandardMaterial({
        map: videoTexture,
        emissiveIntensity: 0,  
        toneMapped: false  
    }));
    screen.position.set(0.01, 2.7, 0.335);
    screen.rotation.y = Math.PI / 0.1;
    screen.rotation.x = Math.PI / -9;

    arcadeMachine.add(screen);

    screen.userData.clickable = true;
    arcadeMachine.userData.clickable = true;

    // Create restart button
    createRestartButton();
});

// Load the TV model and set its position and scale
loader.load('/np/flat_screen_television.glb', function (gltf) {
    tvModel = gltf.scene;
    tvModel.position.set(1.1, 12.5, -4.5); 
    tvModel.scale.set(0.07, 0.07, 0.07); 
    tvModel.rotation.set(0, Math.PI, 0);  
    tvModel.castShadow = true;
    tvModel.receiveShadow = true;
    scene.add(tvModel);

    // Add TV screen as a separate plane with an image texture
    const textureLoader = new THREE.TextureLoader();
    const tvScreenTexture = textureLoader.load('/tvscreen5.png');
    
    const screenGeometry = new THREE.PlaneGeometry(3.9, 1.7);
    const screenMaterial = new THREE.MeshBasicMaterial({
        map: tvScreenTexture,
        toneMapped: false,
        emissiveIntensity: 0,
        color: 0xffffff
    });
    
    tvScreen = new THREE.Mesh(screenGeometry, screenMaterial);
    
    // Set the position of the tvScreen relative to the TV model or independently
    tvScreen.position.set(1.1, 13.8, -4.65); 
    tvScreen.rotation.set(0, Math.PI, 0); 

    
    scene.add(tvScreen);

    
    createTVVideoTexture();

    tvScreen.userData.clickable = true;

    createTVBackButton();
});

// Load the vending machine model and set its position, scale, and rotation
loader.load('/np/vending_machine.glb', function (gltf) {
    vendingMachine = gltf.scene;
    vendingMachine.position.set(3, 2.2, 1.65); 
    vendingMachine.scale.set(2, 2, 2); 
    vendingMachine.rotation.set(0, Math.PI / 0.67, 0); 
    scene.add(vendingMachine);

    // Add a texture to the vending screen
    const textureLoader = new THREE.TextureLoader();
    const vendingScreenTexture = textureLoader.load('/vendingscreen2.png');

    // Create the screen geometry and material using the image texture
    const vendingScreenGeometry = new THREE.PlaneGeometry(0.57, 1.15);
    vendingOriginalScreenMaterial = new THREE.MeshStandardMaterial({
        map: vendingScreenTexture, 
        emissiveIntensity: 0,
        toneMapped: false
    });

    // Create the vending screen mesh
    vendingScreen = new THREE.Mesh(vendingScreenGeometry, vendingOriginalScreenMaterial);
    vendingScreen.position.set(0.08, 0.255, -0.39);  
    vendingScreen.rotation.y = Math.PI / 0.2; 
    vendingMachine.add(vendingScreen);

    
    vendingScreen.userData.clickable = true;

    
    createVendingBackButton();

    
    createVendingVideoTexture();
}, undefined, function (error) {
    console.error('Error loading the vending machine:', error);
});
let vendingButtonsGroup;
let vendingButton1, vendingButton2, vendingButton3;

function createVendingButtons() {
    vendingButtonsGroup = new THREE.Group();  

    const buttonGeometry = new THREE.PlaneGeometry(1.4, 0.4);  
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,  
        transparent: true,
        opacity: 0,  
        side: THREE.DoubleSide  
    });

    // Button 1
    vendingButton1 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    vendingButton1.position.set(-3.3, 0.8, 0.8);  
    vendingButton1.userData.clickable = false;
    vendingButton1.userData.link = 'https://discord.gg/minecraft-advertisement-993668335642349579';  
    vendingButtonsGroup.add(vendingButton1);

    // Button 2
    vendingButton2 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    vendingButton2.position.set(-3.3, 0.28, 0.8);  
    vendingButton2.userData.clickable = false;
    vendingButton2.userData.link = 'https://www.instagram.com/noah_milliken_757/';  
    vendingButtonsGroup.add(vendingButton2);

    // Button 3
    vendingButton3 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    vendingButton3.position.set(-3.3, -0.29, 0.8);  
    vendingButton3.userData.clickable = false;
    vendingButton3.userData.link = 'https://www.instagram.com/systemsurgeons/';  
    vendingButtonsGroup.add(vendingButton3);

    vendingButtonsGroup.position.set(3, 2, -1.5);  
    vendingButtonsGroup.rotation.y = Math.PI / 2;  
    scene.add(vendingButtonsGroup);  
}


createVendingButtons();

// Function to create and apply the video texture to the vending screen
function createVendingVideoTexture() {
    const vendingVideoURL = 'https://storage.googleapis.com/video_bucket_for_portfolio/redgoop.mp4';  // Add your video URL
    vendingVideo = document.createElement('video');
    vendingVideo.src = vendingVideoURL;
    vendingVideo.crossOrigin = 'anonymous';
    vendingVideo.loop = true;
    vendingVideo.muted = true;
    vendingVideo.playsInline = true;

    vendingVideoTexture = new THREE.VideoTexture(vendingVideo);
    vendingVideoTexture.minFilter = THREE.LinearFilter;
    vendingVideoTexture.magFilter = THREE.LinearFilter;
    vendingVideoTexture.format = THREE.RGBFormat;

    vendingVideo.play().then(() => {
        console.log('Vending machine video playback started.');
    }).catch(error => {
        console.error('Error starting vending machine video:', error);
    });

    if (vendingScreen) {
        vendingScreen.material = new THREE.MeshStandardMaterial({
            map: vendingVideoTexture,
            emissiveIntensity: 0,  
            toneMapped: false
        });
    }
}

// Function to handle vending screen click and switch video
function handleVendingScreenClick() {
    if (isVendingVideoPlaying && !vendingVideo.paused && !vendingScreenClicked) {
        vendingVideo.pause();  
        vendingScreen.material = vendingOriginalScreenMaterial;  
        isVendingVideoPlaying = false;
        vendingScreenClicked = true;  
        
        vendingButtonsGroup.children.forEach(button => {
            button.userData.clickable = true;
        });
        zoomToVendingScreen();  
        controls.enabled = false;
    }
}

const buttonGroup = new THREE.Group();

// Function to create buttons as 2D planes
function createButtons() {
    const buttonGeometry = new THREE.PlaneGeometry(1.4, 0.4); 
    const buttonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        transparent: true,  
        opacity: 0,   
        side: THREE.DoubleSide  
    });

    // Button 1
    const button1 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button1.position.set(-0.05, 13.8, 4.7);  
    button1.userData.clickable = false;
    button1.userData.link = 'https://docs.google.com/document/d/1fkahnsr61GsODC6eBnrBFpCdNjN2nHRx/edit?usp=sharing&ouid=107156698242254053175&rtpof=true&sd=true';  
    buttonGroup.add(button1);  

    // Button 2
    const button2 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button2.position.set(-1.1, 13.3, 4.7);  
    button2.userData.clickable = false;
    button2.userData.link = 'https://docs.google.com/document/d/1gi27lh99DjZTxJs1bg9kXEVoE1s2sxRSLtmG5Cd1Huo/edit?usp=sharing';  
    buttonGroup.add(button2);  

    // Button 3
    const button3 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button3.position.set(-2.15, 13.8, 4.7);
    button3.userData.clickable = false;
    button3.userData.link = 'https://docs.google.com/document/d/1ygg1HKmvDecHmpUsauWfEmvuI4UbNbQO/edit?usp=sharing&ouid=116043140266071063011&rtpof=true&sd=true';  
    buttonGroup.add(button3);  

    
    buttonGroup.visible = false;
    scene.add(buttonGroup);
}


createButtons();


buttonGroup.rotation.y = Math.PI / 1; 

// Function to add glowing text to the green screen
function addGlowingTextToScreen(text) {
    const fontLoader = new FontLoader();
    fontLoader.load('/np/MKX Title_Regular.json', function (font) {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 0.07,  
            depth: 0,  
            curveSegments: 12,
            bevelEnabled: false
        });

        // Create a material with emissive properties for the glow effect
        const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,  
            emissive: 0xffffff,  
            emissiveIntensity: 0.1,  
            toneMapped: false  
        });

        // Create the text mesh and position it over the green screen
        glowingText = new THREE.Mesh(textGeometry, textMaterial);
        glowingText.position.set(-0.43, 2.8, 0.4);  
        glowingText.rotation.set(0, Math.PI / 0.1, Math.PI / 0.1);  

        glowingText.userData.clickable = true;  
        glowingText.userData.link = 'https://gd.games/firesec/journys-beginning';  
    });
}
// Function to add the second glowing text below the arcade machine
function addSecondGlowingTextForArcade(text) {
    const fontLoader = new FontLoader();
    fontLoader.load('/MKX Title_Regular.json', function (font) {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 0.07,  
            depth: 0.15,  
            curveSegments: 12,
            bevelEnabled: false
        });

        // Create a material with emissive properties for the glow effect
        const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,  
            emissive: 0xffffff,  
            emissiveIntensity: 0.1,  
            toneMapped: false  
        });

        // Create the text mesh and position it slightly lower than the other text
        secondGlowingText = new THREE.Mesh(textGeometry, textMaterial);
        secondGlowingText.position.set(-0.4, 2.45, 0.3);  
        secondGlowingText.rotation.set(0, Math.PI / 0.1, Math.PI / 0.1);  

        
        secondGlowingText.userData.clickable = true;
        secondGlowingText.userData.link = 'https://discord.gg/Wgv7YkgBuP';

        
        if (arcadeMachine) {
            console.log("Arcade machine initialized, adding second glowing text.");
            arcadeMachine.add(secondGlowingText);
        } else {
            console.error("Arcade machine is not initialized yet.");
        }
    });
}

// Zoom functionality when TV screen is clicked
function zoomToTV() {
    const zoomDuration = 2000;
    const zoomStart = camera.position.clone();
    const zoomEnd = new THREE.Vector3(1, 16, -7);

    const startTime = Date.now();

    function zoomLoop() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / zoomDuration, 1);
        camera.position.lerpVectors(zoomStart, zoomEnd, t);
        if (t < 1) {
            requestAnimationFrame(zoomLoop);
        }
    }
    requestAnimationFrame(zoomLoop);
}
function handleTVScreenClick() {
    if (isTVVideoPlaying && !tvVideo.paused && !tvScreenClicked) {
        // Pause the video, switch to the static image, and display buttons
        tvVideo.pause();
        tvScreen.material = originalTVScreenMaterial;  
        isTVVideoPlaying = false;
        tvScreenClicked = true;
        buttonGroup.visible = true;  
        buttonGroup.children.forEach(button => {
            button.userData.clickable = true;  
        });
        zoomToTV();  
        controls.enabled = false;  
    }
}
function resetTVScene() {
    if (tvVideo) {
        tvVideo.currentTime = 0;  
        tvVideo.play();           

        // Switch the material back to the video texture
        tvScreen.material = new THREE.MeshStandardMaterial({
            map: tvVideoTexture,
            emissiveIntensity: 0,
            toneMapped: false
        });

        isTVVideoPlaying = true;
        tvScreenClicked = false;
        buttonGroup.visible = false;  
        buttonGroup.children.forEach(button => {
            button.userData.clickable = false; 
        });

        
        controls.enabled = true;
        camera.position.set(0, 50, 40); 
    }
}
// Function to switch to green screen and zoom
function toggleVideoScreenAndZoom() {
    if (isVideoPlaying && !video.paused && !screenClicked) {
        video.pause(); 
        screen.material = originalScreenMaterial; 
        isVideoPlaying = false;
        screenClicked = true;  
        if (arcadeMachine) {  
            arcadeMachine.add(glowingText);  
            arcadeMachine.add(secondGlowingText);
        } else {
            console.error("Arcade machine is not yet initialized.");
        }

        zoomToScreen();
    }
}

// Zoom functionality when the arcade screen is clicked
function zoomToScreen() {
    const zoomDuration = 2000;
    const zoomStart = camera.position.clone();
    const zoomEnd = targetPosition;

    const startTime = Date.now();

    function zoomLoop() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / zoomDuration, 1);
        camera.position.lerpVectors(zoomStart, zoomEnd, t);
        if (t < 1) {
            requestAnimationFrame(zoomLoop);
        } else {
            controls.enabled = false;
        }
    }
    requestAnimationFrame(zoomLoop);
}

// Function to zoom in on the vending screen
function zoomToVendingScreen() {
    const zoomDuration = 2000;
    const zoomStart = camera.position.clone();
    
    const zoomEnd = new THREE.Vector3(10, 2, 0.8); 

    const targetLookAt = new THREE.Vector3(5, 1, 0.4);
    
    const startTime = Date.now();

    function zoomLoop() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / zoomDuration, 1);
        
        camera.position.lerpVectors(zoomStart, zoomEnd, t);
        
        const currentLookAt = new THREE.Vector3().lerpVectors(camera.getWorldDirection(new THREE.Vector3()), targetLookAt, t);
        camera.lookAt(currentLookAt);

        if (t < 1) {
            requestAnimationFrame(zoomLoop);
        } else {
            controls.enabled = false;
        }
    }
    requestAnimationFrame(zoomLoop);
}

// Restart the scene and reinitialize everything
function resetScene() {
    video.currentTime = 0;
    video.play();
    screen.material = new THREE.MeshStandardMaterial({
        map: videoTexture,
        emissiveIntensity: 0,
        toneMapped: false
    });

    screenClicked = false;
    isVideoPlaying = true;

    camera.position.set(0, 50, 40);

    controls.enabled = true;

    if (glowingText) {
        arcadeMachine.remove(glowingText);
    }

    if (secondGlowingText) {
        arcadeMachine.remove(secondGlowingText);
    }
}

// Reset the vending machine scene when the back button is clicked
function resetVendingScene() {
    if (vendingVideo) {
        vendingVideo.currentTime = 0;
        vendingVideo.play();

        // Ensure the vending screen material is reset to the video texture
        vendingScreen.material = new THREE.MeshStandardMaterial({
            map: vendingVideoTexture,
            emissiveIntensity: 0,
            toneMapped: false
        });
    }
    
    // Hide and disable the buttons
     vendingButtonsGroup.children.forEach(button => {
        button.userData.clickable = false;
    });

    // Reset the flags so interactions can happen again
    vendingScreenClicked = false;
    isVendingVideoPlaying = true;
    controls.enabled = true;
    camera.position.set(0, 50, 40);
}

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = 1.5;
controls.minDistance = 10;
controls.maxDistance = 60;
controls.enablePan = false;

// Add text on the floor
function addText() {
    const fontLoader = new FontLoader();
    fontLoader.load('/np/SpaceMadness_Regular.json', function (font) {
        const textGeometry = new TextGeometry("Noah's Portfolio", {
            font: font,
            size: 2,
            depth: 0.5,
            curveSegments: 12,
            bevelEnabled: false
        });

        const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(5, -0.1, 10);
        textMesh.rotation.x = -Math.PI / 2;
        textMesh.castShadow = true;
        textMesh.receiveShadow = true;
        scene.add(textMesh);

        const secondaryTextGeometry = new TextGeometry("- Strategic Communications\n- Cyber Security\n- Game Dev\n- Website Dev\n- Marketing", {
            font: font,
            size: 0.8,
            depth: 0.2,
            curveSegments: 12,
            bevelEnabled: false
        });

        const secondaryTextMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const secondaryTextMesh = new THREE.Mesh(secondaryTextGeometry, secondaryTextMaterial);
        secondaryTextMesh.position.set(5, -0.1, 12);
        secondaryTextMesh.rotation.x = -Math.PI / 2;
        secondaryTextMesh.castShadow = true;
        secondaryTextMesh.receiveShadow = true;
        scene.add(secondaryTextMesh);
    });
}

addText();

// Create the restart button (independent of the screen)
function createRestartButton() {
    const buttonGeometry = new THREE.BoxGeometry(1, 1, 1);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
        metalness: 0.5,
        roughness: 0.1
    });
    buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.position.set(-6.7, 1.4, -3.51);
    buttonMesh.rotation.y = Math.PI / 0.0174;
    buttonMesh.scale.set(0.2, 0.2, 0.2);
    buttonMesh.userData.clickable = true;
    buttonMesh.userData.isButton = true;
    scene.add(buttonMesh);

    // Add text to the button
    const fontLoader = new FontLoader();
    fontLoader.load('/SpaceMadness_Regular.json', function (font) {
        const buttonTextGeometry = new TextGeometry('Back', {
            font: font,
            size: 0.25,
            depth: 0.06,
            curveSegments: 12,
            bevelEnabled: false
        });

        const buttonTextMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const buttonTextMesh = new THREE.Mesh(buttonTextGeometry, buttonTextMaterial);
        buttonTextMesh.position.set(-0.5, -0.05, 0.5);
        buttonTextMesh.rotation.y = 0;
        buttonMesh.add(buttonTextMesh);
    });
}

// Create the restart button for the vending machine
function createVendingBackButton() {
    const buttonGeometry = new THREE.BoxGeometry(1, 1, 1);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
        metalness: 0.5,
        roughness: 0.1
    });
    vendingButtonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    vendingButtonMesh.position.set(3.69, 3.8, 0.87);
    vendingButtonMesh.rotation.y = Math.PI / 2;
    vendingButtonMesh.scale.set(0.2, 0.2, 0.2);
    vendingButtonMesh.userData.clickable = true;
    vendingButtonMesh.userData.isButton = true;
    scene.add(vendingButtonMesh);

    // Add text to the vending back button
    const fontLoader = new FontLoader();
    fontLoader.load('/SpaceMadness_Regular.json', function (font) {
        const buttonTextGeometry = new TextGeometry('Back', {
            font: font,
            size: 0.25,
            depth: 0.06,
            curveSegments: 12,
            bevelEnabled: false
        });

        const buttonTextMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const buttonTextMesh = new THREE.Mesh(buttonTextGeometry, buttonTextMaterial);
        buttonTextMesh.position.set(-0.5, -0.05, 0.5);
        buttonTextMesh.rotation.y = 0;
        vendingButtonMesh.add(buttonTextMesh);
    });
}
function createTVBackButton() {
    const buttonGeometry = new THREE.BoxGeometry(1, 1, 1);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
        metalness: 0.5,
        roughness: 0.1
    });
    tvBackButtonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    tvBackButtonMesh.position.set(1.09, 12.76, -4.6);
    tvBackButtonMesh.rotation.y = Math.PI / 1;
    tvBackButtonMesh.scale.set(0.2, 0.2, 0.2);
    tvBackButtonMesh.userData.clickable = true;
    tvBackButtonMesh.userData.isButton = true;
    scene.add(tvBackButtonMesh);

    // Add text to the TV back button
    const fontLoader = new FontLoader();
    fontLoader.load('/SpaceMadness_Regular.json', function (font) {
        const buttonTextGeometry = new TextGeometry('Back', {
            font: font,
            size: 0.25,
            depth: 0.06,
            curveSegments: 12,
            bevelEnabled: false
        });

        const buttonTextMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const buttonTextMesh = new THREE.Mesh(buttonTextGeometry, buttonTextMaterial);
        buttonTextMesh.position.set(-0.5, -0.05, 0.5);
        tvBackButtonMesh.add(buttonTextMesh);
    });

    tvBackButtonMesh.userData.onClick = resetTVScene;
}
// Add stars (white particles)
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const starVertices = [];

    for (let i = 0; i < 1000; i++) {
        const x = THREE.MathUtils.randFloatSpread(200);
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

createStars();

// Raycaster for detecting clicks (including buttons, arcade machine, TV, and vending machine)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    intersects.forEach((intersect) => {
        if (intersect.object.userData.clickable) {
            
            // Handle arcade machine screen click
            if (intersect.object === screen && !screenClicked) {
                toggleVideoScreenAndZoom();
            } 

            // Handle glowing text click
            else if (intersect.object === glowingText) {
                const link = intersect.object.userData.link;
                if (link) {
                    window.open(link, '_blank');
                }
            } 
             // Handle second glowing text click for the arcade machine
             else if (intersect.object === secondGlowingText) {
                const link = intersect.object.userData.link;
                if (link) {
                    window.open(link, '_blank'); 
                }
            }
            // Handle arcade machine back button click
            else if (intersect.object === buttonMesh) {
                resetScene();
            }

            // Handle vending machine screen click
            else if (intersect.object === vendingScreen && !vendingScreenClicked) {
                handleVendingScreenClick();
            } 

            // Handle vending machine back button click
            else if (intersect.object === vendingButtonMesh) {
                resetVendingScene();
            }

            // Handle TV buttons click (Check if it is any of the TV buttons)
            else if (intersect.object.parent === buttonGroup) {
                const link = intersect.object.userData.link;
                if (link) {
                    window.open(link, '_blank');
                }
            }
            // Handle vending machine buttons click
            else if (intersect.object.parent === vendingButtonsGroup) {
                const link = intersect.object.userData.link;
                if (link) {
                    window.open(link, '_blank');
                }
            }
            // Handle TV screen click
            else if (intersect.object === tvScreen) {
                handleTVScreenClick();
            }

            // Handle TV back button click
            else if (intersect.object === tvBackButtonMesh) {
                resetTVScene(); 
            }
        }
    });
});

// Bloom Pass and Layer Configuration
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 2;
bloomPass.radius = 0;
composer.addPass(bloomPass);

// Animation loop
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    composer.render();
    controls.update();
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize video texture after the scene setup
createVideoTexture();
addGlowingTextToScreen("Journey's Beginning\n  (Game I Created)");
addSecondGlowingTextForArcade("Minecraft Server");
createButtons();
animate();