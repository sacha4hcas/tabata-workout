class Profile {
    constructor(name) {
        this.name = name;
        this.workouts = [];
        this.stats = [];
    }

    addWorkout(workout) {
        this.workouts.push(workout);
    }

    static loadProfile(jsonData){
        let profile = new Profile(jsonData.name);
        this.workouts = jsonData.workouts.map(workoutData => {
            Workout.load(workoutData);
        });
    }

}