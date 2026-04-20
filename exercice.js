class Exercice {
    constructor(name, description, mediaUrl, effortDuration, restDuration, prepDuration) {
        this.id = Exercice.generateId();
        this.name = name;
        this.description = description;
        this.mediaUrl = mediaUrl;
        this.effortDuration = effortDuration;
        this.restDuration = restDuration;
        this.prepDuration = prepDuration;
        this.categories = [];
    } 

    static load(jsonData) {
        let exercice = new Exercice(jsonData.name, jsonData.description, jsonData.mediaUrl, jsonData.effortDuration, jsonData.restDuration, jsonData.prepDuration);
        exercice.categories = jsonData.categories;
        return exercice;
    }

}