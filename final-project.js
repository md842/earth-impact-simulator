import {defs, tiny} from './dependencies/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Material, Texture, Shape, Scene,
} = tiny;

export class FinalProject extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            s5: new defs.Subdivision_Sphere(5),
        };

        // Define the materials used to draw the Earth and its moon.
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {
            earth: new Material(bump, 
                {specularity: 0.75, diffusivity: 1, ambient: 1, texture: new Texture("assets/earth.gif")}),
            moon: new Material(new defs.Phong_Shader(), 
                {specularity: 0.75, diffusivity: 1, ambient: 0.25, color: hex_color("#333333")}),
            projectile: new Material(new defs.Phong_Shader(), 
                {specularity: 0.75, diffusivity: 1, ambient: 0.25, color: hex_color("#FF0000")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Default View", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Attach camera to projectile", ["Control", "p"], () => this.attached = () => this.projectile);
        this.key_triggered_button("Move Projectile", ["Control", "p"], () => null);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // We need to guard each operation on desired by checking if it has become null in the middle
        // because "View solar system" is clickable at any time during the process!
        let desired = this.initial_camera_location;
        if (this.attached == null)
            program_state.set_camera(this.initial_camera_location.map((x,i) =>
                Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        else{
            desired = this.attached();
            if (desired == null)
                program_state.set_camera(this.initial_camera_location.map((x,i) =>
                    Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
            else{
                desired = desired.times(Mat4.translation(0, 0, 5));
                if (desired == null)
                    program_state.set_camera(this.initial_camera_location.map((x,i) =>
                        Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
                else{
                    desired = Mat4.inverse(desired);
                    if (desired == null)
                        program_state.set_camera(this.initial_camera_location.map((x,i) =>
                            Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
                    else
                        program_state.set_camera(desired.map((x,i) =>
                            Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
                }
            }
        }

        // Define the program's lights
        program_state.lights = [new Light(vec4(0, 0, 0, 1), color(1, 1, 1, 1), 1000)];

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        let model_transform = Mat4.identity();

        // Draw Earth
        const rotation_multiplier = 0.25; // Control the rotation speed of Earth on its axis
        let earth_transform = model_transform.times(Mat4.rotation(t * rotation_multiplier, t, t / (rotation_multiplier ** 2), 1).times(Mat4.scale(3, 3, 3)));
        this.shapes.s5.draw(context, program_state, earth_transform, this.materials.earth);
        this.earth = earth_transform;

        // Draw moon
        let moon_transform = earth_transform.times(Mat4.rotation(t, 0, t, 1)).times(Mat4.translation(2, 0, 0).times(Mat4.rotation(t, 0, t, 1)).times(Mat4.scale(0.1, 0.1, 0.1)));
        this.shapes.s5.draw(context, program_state, moon_transform, this.materials.moon);
        this.moon = moon_transform;

        // Draw projectile
        let projectile_transform = model_transform.times(Mat4.rotation(4.7, 0, 4.7, 1)).times(Mat4.translation(9, 0, 0)).times(Mat4.scale(0.3, 0.3, 0.3)).times(Mat4.translation(-5*t, 0, 0));
        this.shapes.s5.draw(context, program_state, projectile_transform, this.materials.projectile);
        this.projectile = projectile_transform;
    }
}