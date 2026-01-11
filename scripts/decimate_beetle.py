"""
Blender Decimation Script for BeetleShell
Run with: blender -b --python scripts/decimate_beetle.py

Reduces polygon count from 474K to ~10K vertices while preserving shape.
"""

import bpy
import os
import sys

# Configuration
INPUT_PATH = "public/assets/models/beetle_shell.glb"
OUTPUT_PATH = "public/assets/models/beetle_shell_optimized.glb"
TARGET_RATIO = 0.02  # 2% of original = ~10K vertices from 474K

def main():
    # Get absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    input_file = os.path.join(project_root, INPUT_PATH)
    output_file = os.path.join(project_root, OUTPUT_PATH)
    
    print(f"[Decimate] Input: {input_file}")
    print(f"[Decimate] Output: {output_file}")
    print(f"[Decimate] Target ratio: {TARGET_RATIO * 100}%")
    
    # Clear default scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # Import GLB
    print("[Decimate] Importing GLB...")
    bpy.ops.import_scene.gltf(filepath=input_file)
    
    # Get all mesh objects
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    
    if not mesh_objects:
        print("[Decimate] ERROR: No mesh objects found!")
        sys.exit(1)
    
    total_verts_before = sum(len(obj.data.vertices) for obj in mesh_objects)
    print(f"[Decimate] Found {len(mesh_objects)} mesh(es), {total_verts_before:,} vertices total")
    
    # Apply decimation to each mesh
    for obj in mesh_objects:
        print(f"[Decimate] Processing: {obj.name} ({len(obj.data.vertices):,} verts)")
        
        # Select object
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # Add Decimate modifier
        modifier = obj.modifiers.new(name="Decimate", type='DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = TARGET_RATIO
        modifier.use_collapse_triangulate = True
        
        # Apply modifier
        bpy.ops.object.modifier_apply(modifier="Decimate")
        
        print(f"[Decimate] After: {len(obj.data.vertices):,} verts")
        obj.select_set(False)
    
    total_verts_after = sum(len(obj.data.vertices) for obj in mesh_objects)
    reduction = (1 - total_verts_after / total_verts_before) * 100
    print(f"[Decimate] Total: {total_verts_before:,} → {total_verts_after:,} ({reduction:.1f}% reduction)")
    
    # Select all meshes for export
    for obj in mesh_objects:
        obj.select_set(True)
    
    # Export optimized GLB
    print(f"[Decimate] Exporting to {output_file}...")
    bpy.ops.export_scene.gltf(
        filepath=output_file,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
    )
    
    print("[Decimate] DONE!")
    
    # Verify file was created
    if os.path.exists(output_file):
        size_mb = os.path.getsize(output_file) / (1024 * 1024)
        print(f"[Decimate] Output file size: {size_mb:.2f} MB")
    else:
        print("[Decimate] ERROR: Output file was not created!")
        sys.exit(1)

if __name__ == "__main__":
    main()
