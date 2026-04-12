class Workout {
    constructor(name, defaultEffortDuration, defaultRestDuration, defaultPrepDuration) {
        this.name = name;
        this.defaultEffortDuration = defaultEffortDuration;
        this.defaultRestDuration = defaultRestDuration;
        this.defaultPrepDuration = defaultPrepDuration;
        this.exercices = [];
        this.themes = [];
    }

    addExercice(exercice) {
        this.exercices.push(exercice);
    }

    static loadWorkout(jsonData){

    }

}