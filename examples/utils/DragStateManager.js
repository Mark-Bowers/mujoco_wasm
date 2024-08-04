import * as THREE from 'three';
import { Vector3 } from 'three';

THREE.Mesh.prototype.setHighlightState = (function() {
    const highlightColor = 0xff0000;
    let selectedMesh = null;

    function highlight(mesh) {
        // If another mesh was previously selected, unhighlight it first
        if (selectedMesh) {
            unhighlight(selectedMesh);
        }

        // Create a clone of the material and set the emmisive highlight color
        const highlightedMaterial = mesh.material.clone();
        highlightedMaterial.emissive.setHex(highlightColor);

        // Save the original material and apply the highlighted material to this mesh
        mesh._originalMaterial = mesh.material;
        mesh.material = highlightedMaterial;

        selectedMesh = mesh;
    }

    function unhighlight(mesh) {
        mesh.material.dispose();  // Dispose the current highlighted material to free memory
        mesh.material = mesh._originalMaterial; // Restore the original material

        selectedMesh = null;
    }

    return function() {
        // Check if the mesh is being unhighlighted or highlighted
        if (this === selectedMesh) {
            unhighlight(this);
        } else {
            highlight(this);
        }
    };
})();

export class DragStateManager {
    constructor(scene, renderer, camera, container, controls) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.mousePos = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        //this.raycaster.layers.set(1);
        //					this.raycaster.params.Mesh.threshold = 3;
        this.raycaster.params.Line.threshold = 0.1;
        this.grabDistance = 0.0;
        this.active = false;
        this.physicsObject = null;
        this.controls = controls;

        this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 15, 0x666666);
        this.arrow.setLength(15, 3, 1);
        this.scene.add(this.arrow);
        //this.residuals.push(arrow);
        this.arrow.line.material.transparent = true;
        this.arrow.cone.material.transparent = true;
        this.arrow.line.material.opacity = 0.5;
        this.arrow.cone.material.opacity = 0.5;
        this.arrow.visible = false;

        this.localHit = new Vector3();
        this.worldHit = new Vector3();
        this.currentWorld = new Vector3();

        container.addEventListener( 'pointerdown', this.onPointer.bind(this), true );
        document.addEventListener( 'pointermove', this.onPointer.bind(this), true );
        document.addEventListener( 'pointerup'  , this.onPointer.bind(this), true );
        document.addEventListener( 'pointerout' , this.onPointer.bind(this), true );
        container.addEventListener( 'dblclick', this.onPointer.bind(this), false );
    }
    updateRaycaster(x, y) {
        var rect = this.renderer.domElement.getBoundingClientRect();
        this.mousePos.x =  ((x - rect.left) / rect.width) * 2 - 1;
        this.mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mousePos, this.camera);
    }
    start(x, y) {
        this.physicsObject = null;
        this.updateRaycaster(x, y);
        let intersects = this.raycaster.intersectObjects(this.scene.children);
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            if (obj.bodyID && obj.bodyID > 0) {
                this.physicsObject = obj;
                this.grabDistance = intersects[0].distance;
                let hit = this.raycaster.ray.origin.clone();
                hit.addScaledVector(this.raycaster.ray.direction, this.grabDistance);
                this.arrow.position.copy(hit);
                //this.physicsObject.startGrab(hit);
                this.active = true;
                this.controls.enabled = false;
                this.localHit = obj.worldToLocal(hit.clone());
                this.worldHit.copy(hit);
                this.currentWorld.copy(hit);
                this.arrow.visible = true;
                break;
            }
        }
    }
    move(x, y) {
        if (this.active) {
            this.updateRaycaster(x, y);
            let hit = this.raycaster.ray.origin.clone();
            hit.addScaledVector(this.raycaster.ray.direction, this.grabDistance);
            this.currentWorld.copy(hit);

            this.update();

            if (this.physicsObject != null) {
                //this.physicsObject.moveGrabbed(hit);
            }
        }
    }
    update() {
        if (this.worldHit && this.localHit && this.currentWorld && this.arrow && this.physicsObject) {
            this.worldHit.copy(this.localHit);
            this.physicsObject.localToWorld(this.worldHit);
            this.arrow.position.copy(this.worldHit);
            this.arrow.setDirection(this.currentWorld.clone().sub(this.worldHit).normalize());
            this.arrow.setLength(this.currentWorld.clone().sub(this.worldHit).length());
        }
    }
    end(evt) {
        //this.physicsObject.endGrab();
        this.physicsObject = null;

        this.active = false;
        this.controls.enabled = true;
        //this.controls.onPointerUp(evt);
        this.arrow.visible = false;
        this.mouseDown = false;
    }
    onPointer(evt) {
        if (evt.type == "pointerdown") {
            this.start(evt.clientX, evt.clientY);
            this.mouseDown = true;
        } else if (evt.type == "pointermove" && this.mouseDown) {
            if (this.active) { this.move(evt.clientX, evt.clientY); }
        } else if (evt.type == "pointerup" /*|| evt.type == "pointerout"*/) {
            this.end(evt);
        }
        if (evt.type == "dblclick") {
            this.start(evt.clientX, evt.clientY);
            this.doubleClick = true;
            if (this.physicsObject) {
                this.physicsObject.setHighlightState();
            }
        }
    }
}
