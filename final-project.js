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

        this.launch = this.hit = this.reset = this.destroy = false;
        this.projectile_speed = 0;
        this.projectile_pos = 0;
        this.projectile_size = 0.1;

        // Define the materials used to draw the Earth and its moon.
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {
            earth: new Material(bump, 
                {specularity: 0.75, diffusivity: 1, ambient: 1, texture: new Texture("assets/earth.gif")}),
            destroyed_earth: new Material(new defs.Phong_Shader(), 
                {specularity: 0.75, diffusivity: 1, ambient: 0.25, color: hex_color("#FF0000")}),
            moon: new Material(bump,
                {specularity: 0.75, diffusivity: 1, ambient: 1, texture: new Texture("assets/moon.jpg")}),
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
        this.new_line();
        this.live_string(box=>box.textContent = "Current Speed: " + this.projectile_speed + " km/s");
        this.new_line();
        this.key_triggered_button("Increase Speed", ["Control", "i"], () => this.projectile_speed += 1);
        this.key_triggered_button("Decrease Speed", ["Control", "d"], () => this.projectile_speed - 1 >= 0 ? this.projectile_speed-= 1 : this.projectile_speed = 0);
        this.new_line();
        this.live_string(box=>box.textContent = "Current Size: " + Math.round(this.projectile_size * 10000) + "km");
        this.new_line();
        this.key_triggered_button("Increase Size", ["Control", "w"], () => this.projectile_size + 0.1 <= 0.9 ? this.projectile_size += 0.1: this.projectile_size = 0.9);
        this.key_triggered_button("Decrease Size", ["Control", "s"], () => this.projectile_size - 0.1 >= 0.1 ? this.projectile_size-= 0.1 : this.projectile_size = 0);
        this.new_line();
        this.key_triggered_button("Launch Projectile", ["Control", "l"], () => this.launch = !this.launch);
        this.key_triggered_button("Reset Projectile", ["Control", "r"], () => this.reset = true);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // Define the program's lights
        program_state.lights = [new Light(vec4(0, 0, 0, 1), color(1, 1, 1, 1), 1000)];

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        let model_transform = Mat4.identity();

        // EARTH
        const rotation_multiplier = 0.25; // Control the rotation speed of Earth on its axis
        let earth_transform = model_transform.times(Mat4.rotation(t * rotation_multiplier, t, t / (rotation_multiplier ** 2), 1).times(Mat4.scale(3, 3, 3)));
        if(this.destroy)
            this.shapes.s5.draw(context, program_state, earth_transform, this.materials.destroyed_earth);
        else
            this.shapes.s5.draw(context, program_state, earth_transform, this.materials.earth);
        this.earth = earth_transform;

        // MOON
        let moon_transform = earth_transform.times(Mat4.rotation(t, 0, t, 1)).times(Mat4.translation(2, 0, 0).times(Mat4.rotation(t, 0, t, 1)).times(Mat4.scale(0.1, 0.1, 0.1)));
        this.shapes.s5.draw(context, program_state, moon_transform, this.materials.moon);
        this.moon = moon_transform;

        // PROJECTILE
        let projectile_transform = model_transform.times(Mat4.rotation(4.7, 0, 4.7, 1)).times(Mat4.translation(9, 0, 0)).times(Mat4.scale(this.projectile_size, this.projectile_size, this.projectile_size));
        if(this.projectile_pos <= -6/this.projectile_size){
            this.hit = true;
            if(this.projectile_speed * this.projectile_size * 10 > 60)
                this.destroy = true;
        }
            
        if(this.reset){
            this.launch = this.hit = this.reset = this.destroy = false;
            this.projectile_pos = 0;
        }
            
        if(this.launch)
            this.projectile_pos = this.hit ? -6/this.projectile_size : -this.projectile_speed / (5*t) + this.projectile_pos;
        projectile_transform = projectile_transform.times(Mat4.translation(this.projectile_pos, 0, 0));       
        this.shapes.s5.draw(context, program_state, projectile_transform, this.materials.projectile);

        // camera movement
        this.projectile = projectile_transform;

        let desired = this.initial_camera_location;
        if (this.attached === undefined) {}
        else {
            if (this.attached() == null) {
                program_state.set_camera(this.initial_camera_location.map((x,i) =>
                    Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
            }
            // in project 3, desired = Mat4.inverse(Mat4.translation(-1,2,-4).times(this.attached()))
            if(!!this.attached()) { desired = Mat4.inverse(this.attached().times(Mat4.translation(0,0,5)));}
            desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
            program_state.set_camera(desired);
        }
    }
}