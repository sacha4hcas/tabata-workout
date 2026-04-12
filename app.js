const STORAGE_KEY = 'tabata_template_data';

function parseQuery() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function isEmptyData(data) {
  return (
    !data ||
    !data.profile
  );
}

async function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      normalizeProfile(data);
      if (!isEmptyData(data)) {
        normalizeStats(data);
        saveData(data);
        return data;
      }
      console.warn('Saved data is empty, loading sample file.');
    } catch (error) {
      console.warn('Invalid saved data, loading sample file.');
    }
  }

  try {
    const response = await fetch('sample_data.json');
    if (!response.ok) {
      throw new Error(`Sample data request failed: ${response.status}`);
    }
    const sample = await response.json();
    normalizeProfile(sample);
    normalizeStats(sample);
    saveData(sample);
    return sample;
  } catch (error) {
    console.error('Unable to load sample_data.json:', error);
    const fallback = {
      profile: { name: 'Guest', categories: [] },
      workouts: [],
      exercices: [],
      stats: []
    };
    normalizeProfile(fallback);
    normalizeStats(fallback);
    saveData(fallback);
    return fallback;
  }
}

async function loadSampleData() {
  try {
    const response = await fetch('sample_data.json');
    if (!response.ok) {
      throw new Error(`Sample data request failed: ${response.status}`);
    }
    const sample = await response.json();
    normalizeProfile(sample);
    normalizeStats(sample);
    saveData(sample);
    return sample;
  } catch (error) {
    console.error('Unable to load sample_data.json:', error);
    throw error;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeProfile(data) {
  if (!data.profile || typeof data.profile !== 'object') {
    data.profile = { name: 'Guest', categories: [] };
  }
  if (!Array.isArray(data.profile.categories)) {
    data.profile.categories = [];
  }
}

function getStat(data, label) {
  if (!Array.isArray(data.stats)) {
    data.stats = [];
  }
  return data.stats.find(stat => stat.label === label);
}

function incrementStat(data, label, amount = 1) {
  if (!Array.isArray(data.stats)) {
    data.stats = [];
  }
  let stat = getStat(data, label);
  if (!stat) {
    stat = { label, value: 0 };
    data.stats.push(stat);
  }
  stat.value = (stat.value || 0) + amount;
}

function normalizeStats(data) {
  if (!Array.isArray(data.stats)) {
    data.stats = [];
  }
  const totalExercices = Array.isArray(data.exercices) ? data.exercices.length : 0;
  const defaults = [
    { label: 'Workouts completed', value: 0 },
    { label: 'Exercices done', value: 0 },
    { label: 'Total exercices', value: totalExercices }
  ];
  defaults.forEach(defaultStat => {
    const existing = getStat(data, defaultStat.label);
    if (existing) {
      if (defaultStat.label === 'Total exercices') {
        existing.value = totalExercices;
      } else if (typeof existing.value !== 'number') {
        existing.value = defaultStat.value;
      }
    } else {
      data.stats.push({ ...defaultStat });
    }
  });
}

function getExportProfile(data) {
  return {
    profile: data.profile,
    workouts: data.workouts,
    exercices: data.exercices,
    stats: data.stats
  };
}

function downloadProfileJson(data) {
  const json = JSON.stringify(getExportProfile(data), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.profile.name || 'profile'}-tabata.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function validateProfileJson(obj) {
  if (!obj || typeof obj !== 'object') {
    return 'JSON must be an object.';
  }
  if (!obj.profile || typeof obj.profile.name !== 'string') {
    return 'Profile object must include a name string.';
  }
  if (!Array.isArray(obj.workouts)) {
    return 'Workouts must be an array.';
  }
  if (!Array.isArray(obj.exercices)) {
    return 'Exercices must be an array.';
  }
  if (obj.stats && !Array.isArray(obj.stats)) {
    return 'Stats must be an array if present.';
  }
  return null;
}

function loadProfileJson(data, jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Invalid JSON format.');
  }
  const validationError = validateProfileJson(parsed);
  if (validationError) {
    throw new Error(validationError);
  }
  data.profile = parsed.profile;
  data.workouts = parsed.workouts;
  data.exercices = parsed.exercices;
  data.stats = parsed.stats || [];
  normalizeStats(data);
  saveData(data);
}

function getWorkout(data, id) {
  return data.workouts.find(item => item.id === id);
}

function getExercice(data, id) {
  return data.exercices.find(item => item.id === id);
}

function highlightNavigation() {
  const page = document.body.dataset.page;
  document.querySelectorAll('nav a.nav-link').forEach(link => {
    if (link.getAttribute('href') === `${page}.html`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function renderHome(data) {
  const label = document.querySelector('#profileLabel');
  if (label) {
    label.textContent = `Profile: ${data.profile.name}`;
  }
}

function renderManageProfiles(data) {
  const input = document.querySelector('#profileName');
  const textarea = document.querySelector('#profileJsonData');
  const downloadButton = document.querySelector('#downloadJson');
  const loadButton = document.querySelector('#loadJson');
  const fileInput = document.querySelector('#importJsonFile');
  if (!input) return;

  input.value = data.profile.name;
  input.addEventListener('input', () => {
    data.profile.name = input.value || 'Guest';
    saveData(data);
    if (textarea) {
      textarea.value = JSON.stringify(getExportProfile(data), null, 2);
    }
  });

  if (textarea) {
    textarea.value = JSON.stringify(getExportProfile(data), null, 2);
  }

  downloadButton?.addEventListener('click', event => {
    event.preventDefault();
    downloadProfileJson(data);
  });

  loadButton?.addEventListener('click', event => {
    event.preventDefault();
    if (!textarea || !textarea.value.trim()) {
      alert('Paste profile JSON into the textarea before loading.');
      return;
    }
    try {
      loadProfileJson(data, textarea.value);
      alert('Profile JSON loaded successfully.');
      input.value = data.profile.name;
      textarea.value = JSON.stringify(getExportProfile(data), null, 2);
    } catch (error) {
      alert(`Unable to load profile JSON: ${error.message}`);
    }
  });

  const loadSampleButton = document.querySelector('#loadSample');
  loadSampleButton?.addEventListener('click', async event => {
    event.preventDefault();
    if (!confirm('This will reset all your data to the sample data. Continue?')) return;
    try {
      data = await loadSampleData();
      alert('Sample data loaded successfully.');
      input.value = data.profile.name;
      textarea.value = JSON.stringify(getExportProfile(data), null, 2);
    } catch (error) {
      alert(`Unable to load sample data: ${error.message}`);
    }
  });

  fileInput?.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (textarea) {
        textarea.value = reader.result;
      }
    };
    reader.readAsText(file);
  });
}

function renderManageCategories(data) {
  if (!Array.isArray(data.profile.categories)) {
    data.profile.categories = [];
  }
  const list = document.querySelector('#categoriesList');
  const input = document.querySelector('#newCategory');
  const addButton = document.querySelector('#addCategory');
  if (!list || !input || !addButton) return;

  function updateList() {
    list.innerHTML = '';
    data.profile.categories.forEach((category, index) => {
      const item = document.createElement('li');
      item.className = 'list-item';
      item.innerHTML = `
        <div>${category}</div>
        <div class="list-item-actions">
          <button class="button small" data-action="view-exercises" data-category="${category}">View Exercises</button>
          <button class="button small danger" data-index="${index}">Remove</button>
        </div>`;
      list.appendChild(item);
    });
  }

  updateList();

  addButton.addEventListener('click', () => {
    const newCat = input.value.trim();
    if (newCat && !data.profile.categories.includes(newCat)) {
      data.profile.categories.push(newCat);
      saveData(data);
      input.value = '';
      updateList();
    }
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const category = button.dataset.category;
    const index = button.dataset.index;
    if (action === 'view-exercises') {
      showCategoryExercises(category);
    } else if (button.classList.contains('danger')) {
      const index = parseInt(button.dataset.index);
      data.profile.categories.splice(index, 1);
      saveData(data);
      updateList();
    }
  });
}

function showCategoryExercises(category) {
  const section = document.querySelector('#categoryExercisesSection');
  const nameSpan = document.querySelector('#selectedCategoryName');
  const exercisesList = document.querySelector('#categoryExercisesList');
  if (!section || !nameSpan || !exercisesList) return;

  nameSpan.textContent = category;
  exercisesList.innerHTML = '';

  data.exercices.forEach(ex => {
    const hasCategory = Array.isArray(ex.categories) && ex.categories.includes(category);
    const item = document.createElement('li');
    item.className = `list-item ${hasCategory ? 'highlighted' : ''}`;
    item.innerHTML = `
      <div>
        <strong>${ex.name}</strong>
        <div>${ex.description}</div>
      </div>`;
    exercisesList.appendChild(item);
  });

  section.style.display = 'block';
}

function renderManageWorkouts(data) {
  const list = document.querySelector('#workoutList');
  if (!list) return;
  list.innerHTML = '';
  data.workouts.forEach(workout => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <strong>${workout.name}</strong>
        <div>${workout.exerciceIds.length} exercice(s)</div>
      </div>
      <div class="list-item-actions">
        <a class="button small" href="edit_workout.html?workoutId=${workout.id}">Edit Workout</a>
        <button class="button small danger" data-action="delete-workout" data-id="${workout.id}">Delete</button>
      </div>`;
    list.appendChild(item);
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const workoutId = button.dataset.id;
    if (action === 'delete-workout') {
      if (!confirm('Delete this workout? This cannot be undone.')) return;
      const index = data.workouts.findIndex(item => item.id === workoutId);
      if (index !== -1) {
        data.workouts.splice(index, 1);
        saveData(data);
        renderManageWorkouts(data);
      }
    }
  });
}

function renderManageExercices(data) {
  const list = document.querySelector('#exerciceList');
  if (!list) return;
  list.innerHTML = '';
  data.exercices.forEach(exercice => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <strong>${exercice.name}</strong>
        <div>${exercice.description}</div>
      </div>
      <div class="list-item-actions">
        <a class="button small" href="edit_exercice.html?exerciceId=${exercice.id}">Edit Exercice</a>
        <button class="button small danger" data-action="delete-exercice" data-id="${exercice.id}">Delete</button>
      </div>`;
    list.appendChild(item);
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const exerciceId = button.dataset.id;
    if (action === 'delete-exercice') {
      if (!confirm('Delete this exercise from the profile? This will remove it from all workouts.')) return;
      const exerciceIndex = data.exercices.findIndex(item => item.id === exerciceId);
      if (exerciceIndex !== -1) {
        data.exercices.splice(exerciceIndex, 1);
        data.workouts.forEach(workout => {
          workout.exerciceIds = workout.exerciceIds.filter(id => id !== exerciceId);
        });
        saveData(data);
        renderManageExercices(data);
      }
    }
  });
}

function renderEditWorkout(data) {
  const params = parseQuery();
  const workoutId = params.workoutId;
  const title = document.querySelector('#workoutTitle');
  const nameInput = document.querySelector('#workoutName');
  const list = document.querySelector('#exerciceList');
  const addExisting = document.querySelector('#addExisting');
  if (!title || !nameInput || !list || !addExisting) return;

  let workout = getWorkout(data, workoutId);
  let isNew = false;
  if (!workout) {
    workout = { id: `w${Date.now()}`, name: '', exerciceIds: [] };
    data.workouts.push(workout);
    saveData(data);
    isNew = true;
  }

  title.textContent = workoutId ? `Edit Workout: ${workout.name || 'New workout'}` : 'Create Workout';
  nameInput.value = workout.name;
  addExisting.href = `select_exercices.html?workoutId=${workout.id}`;

  nameInput.addEventListener('input', () => {
    workout.name = nameInput.value;
    title.textContent = `Edit Workout: ${workout.name || 'New workout'}`;
    saveData(data);
  });

  function refreshList() {
    list.innerHTML = '';
    if (workout.exerciceIds.length === 0) {
      list.innerHTML = '<p>No exercices added yet.</p>';
      return;
    }
    workout.exerciceIds.forEach((exerciceId, index) => {
      const exercice = getExercice(data, exerciceId);
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div>
          <strong>${exercice ? exercice.name : 'Unknown exercice'}</strong>
          <div>${exercice ? exercice.description : ''}</div>
        </div>
        <div class="list-item-actions">
          <a class="button small" href="edit_exercice.html?workoutId=${workout.id}&exerciceId=${exerciceId}">Edit Exercice</a>
          <button class="button small" type="button" data-action="up" data-index="${index}">↑</button>
          <button class="button small" type="button" data-action="down" data-index="${index}">↓</button>
        </div>`;
      list.appendChild(item);
    });
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (action === 'up' && index > 0) {
      [workout.exerciceIds[index - 1], workout.exerciceIds[index]] = [workout.exerciceIds[index], workout.exerciceIds[index - 1]];
      saveData(data);
      refreshList();
    }
    if (action === 'down' && index < workout.exerciceIds.length - 1) {
      [workout.exerciceIds[index + 1], workout.exerciceIds[index]] = [workout.exerciceIds[index], workout.exerciceIds[index + 1]];
      saveData(data);
      refreshList();
    }
  });

  refreshList();
}

function renderEditExercice(data) {
  const params = parseQuery();
  const exerciceId = params.exerciceId;
  const workoutId = params.workoutId;
  const title = document.querySelector('#exerciceTitle');
  const nameInput = document.querySelector('#exerciceName');
  const descriptionInput = document.querySelector('#exerciceDescription');
  const mediaInput = document.querySelector('#mediaUrl');
  const effortInput = document.querySelector('#effortDuration');
  const restInput = document.querySelector('#restDuration');
  const prepInput = document.querySelector('#prepDuration');
  const categoriesCheckboxes = document.querySelector('#categoriesCheckboxes');
  const saveButton = document.querySelector('#saveExercice');
  const cancelButton = document.querySelector('#cancelExercice');
  if (!title || !nameInput || !descriptionInput || !mediaInput || !effortInput || !restInput || !prepInput || !categoriesCheckboxes || !saveButton) return;

  let exercice = exerciceId ? getExercice(data, exerciceId) : null;
  if (!exercice) {
    title.textContent = 'Create Exercice';
    exercice = { id: `e${Date.now()}`, name: '', description: '', mediaUrl: 'https://via.placeholder.com/320x180?text=New+Exercice', effortDuration: 20, restDuration: 10, prepDuration: 5 };
  } else {
    title.textContent = `Edit Exercice: ${exercice.name}`;
    nameInput.value = exercice.name;
    descriptionInput.value = exercice.description;
    mediaInput.value = exercice.mediaUrl || '';
    effortInput.value = exercice.effortDuration;
    restInput.value = exercice.restDuration;
    prepInput.value = exercice.prepDuration;
  }

  // Populate category tags for exercise
  categoriesCheckboxes.innerHTML = '';
  const availableCategories = Array.isArray(data.profile.categories) ? data.profile.categories : [];
  const selectedCategories = Array.isArray(exercice.categories) ? exercice.categories : [];
  availableCategories.forEach(category => {
    const label = document.createElement('label');
    const isChecked = selectedCategories.includes(category) ? 'checked' : '';
    label.innerHTML = `<input type="checkbox" value="${category}" ${isChecked} /> ${category}`;
    categoriesCheckboxes.appendChild(label);
  });

  saveButton.addEventListener('click', () => {
    exercice.name = nameInput.value.trim() || 'Unnamed exercice';
    exercice.description = descriptionInput.value.trim();
    exercice.mediaUrl = mediaInput.value.trim();
    exercice.effortDuration = Number(effortInput.value) || 20;
    exercice.restDuration = Number(restInput.value) || 10;
    exercice.prepDuration = Number(prepInput.value) || 5;
    exercice.categories = Array.from(categoriesCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    if (!exerciceId) {
      data.exercices.push(exercice);
    }
    saveData(data);
    const target = workoutId ? `edit_workout.html?workoutId=${workoutId}` : 'manage_exercices.html';
    window.location.href = target;
  });

  cancelButton?.addEventListener('click', () => {
    const target = workoutId ? `edit_workout.html?workoutId=${workoutId}` : 'manage_exercices.html';
    window.location.href = target;
  });
}

function renderSelectExercices(data) {
  const params = parseQuery();
  const workoutId = params.workoutId;
  const list = document.querySelector('#exerciceList');
  if (!list) return;
  const workout = getWorkout(data, workoutId);
  if (!workout) {
    list.innerHTML = '<p>Workout not found.</p>';
    return;
  }
  list.innerHTML = '';
  data.exercices.forEach(exercice => {
    const alreadyAdded = workout.exerciceIds.includes(exercice.id);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <strong>${exercice.name}</strong>
        <div>${exercice.description}</div>
      </div>
      <div class="list-item-actions">
        <button class="button small" data-exercice="${exercice.id}" ${alreadyAdded ? 'disabled' : ''}>Select</button>
      </div>`;
    list.appendChild(item);
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !button.dataset.exercice) return;
    const exerciceId = button.dataset.exercice;
    if (!workout.exerciceIds.includes(exerciceId)) {
      workout.exerciceIds.push(exerciceId);
      saveData(data);
    }
    window.location.href = `edit_workout.html?workoutId=${workout.id}`;
  });
}

function renderStartWorkout(data) {
  const typeWorkout = document.querySelector('#typeWorkout');
  const typeCategories = document.querySelector('#typeCategories');
  const workoutSection = document.querySelector('#workoutSection');
  const categoriesSection = document.querySelector('#categoriesSection');
  const workoutSelect = document.querySelector('#workoutSelect');
  const categoriesCheckboxes = document.querySelector('#categoriesCheckboxes');
  const modeFull = document.querySelector('#modeFull');
  const modeInfinite = document.querySelector('#modeInfinite');
  const startButton = document.querySelector('#startWorkout');
  if (!typeWorkout || !typeCategories || !workoutSection || !categoriesSection || !workoutSelect || !categoriesCheckboxes || !modeFull || !modeInfinite || !startButton) return;

  data.workouts.forEach(workout => {
    const option = document.createElement('option');
    option.value = workout.id;
    option.textContent = workout.name;
    workoutSelect.appendChild(option);
  });

  function updateCategories() {
    categoriesCheckboxes.innerHTML = '';
    const categories = Array.isArray(data.profile.categories) ? data.profile.categories : [];
    if (categories.length === 0) {
      categoriesCheckboxes.textContent = 'No categories available. Add some first.';
      return;
    }
    categories.forEach(category => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${category}" /> ${category}`;
      categoriesCheckboxes.appendChild(label);
    });
  }

  function toggleSections() {
    if (typeWorkout.checked) {
      workoutSection.style.display = 'block';
      categoriesSection.style.display = 'none';
    } else {
      workoutSection.style.display = 'none';
      categoriesSection.style.display = 'block';
    }
  }

  updateCategories();
  toggleSections();

  typeWorkout.addEventListener('change', toggleSections);
  typeCategories.addEventListener('change', toggleSections);

  startButton.addEventListener('click', () => {
    const params = new URLSearchParams();
    const mode = modeInfinite.checked ? 'infinite' : 'full';
    params.set('mode', mode);
    params.set('random', document.querySelector('#randomOrder').checked.toString());

    if (typeWorkout.checked) {
      const workoutId = workoutSelect.value;
      if (!workoutId) {
        alert('Please select a workout.');
        return;
      }
      params.set('workoutId', workoutId);
    } else {
      const selectedCategories = Array.from(categoriesCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      if (selectedCategories.length === 0) {
        alert('Please select at least one category.');
        return;
      }
      params.set('categories', selectedCategories.join(','));
    }

    window.location.href = `workout.html?${params.toString()}`;
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderWorkout(data) {
  const params = parseQuery();
  const workoutId = params.workoutId;
  const categoriesParam = params.categories;
  let workout = null;
  let workoutName = 'Category Workout';
  let sequence = [];

  if (workoutId) {
    workout = getWorkout(data, workoutId);
    if (!workout) return;
    workoutName = workout.name;
    sequence = workout.exerciceIds.map(id => getExercice(data, id)).filter(Boolean);
  } else if (categoriesParam) {
    const selectedCategories = categoriesParam.split(',').filter(Boolean);
    sequence = data.exercices.filter(exercice => Array.isArray(exercice.categories) && exercice.categories.some(cat => selectedCategories.includes(cat)));
    workoutName = selectedCategories.length === 1 ? `Category: ${selectedCategories[0]}` : 'Categories Workout';
  } else {
    return;
  }

  const workoutNameLabel = document.querySelector('#workoutNameLabel');
  const globalTimer = document.querySelector('#globalTimer');
  const currentExerciceName = document.querySelector('#currentExerciceName');
  const currentPhaseName = document.querySelector('#currentPhaseName');
  const exerciceMedia = document.querySelector('#exerciceMedia');
  const exerciceMediaHolder = document.querySelector('#exerciceMediaHolder');
  const exerciceTimer = document.querySelector('#exerciceTimer');
  const nextExerciceName = document.querySelector('#nextExerciceName');
  const pauseResume = document.querySelector('#pauseResume');
  const skipButton = document.querySelector('#skipExercise');
  const stopWorkout = document.querySelector('#stopWorkout');
  if (!workoutNameLabel || !globalTimer || !currentExerciceName || !currentPhaseName || !exerciceMedia || !exerciceMediaHolder || !exerciceTimer || !nextExerciceName || !pauseResume || !skipButton || !stopWorkout) {
    return;
  }

  workoutNameLabel.textContent = workoutName;
  const random = params.random === 'true';
  const mode = params.mode === 'infinite' ? 'infinite' : 'full';
  const fullWorkout = mode === 'full';

  if (sequence.length === 0) {
    workoutNameLabel.textContent = 'No matching exercises';
    globalTimer.textContent = '00:00';
    currentExerciceName.textContent = 'None';
    currentPhaseName.textContent = 'Complete';
    exerciceTimer.textContent = '00:00';
    return;
  }

  if (fullWorkout && random) {
    sequence = shuffleArray(sequence);
  }

  const audioContext = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;

  function playTone(duration, frequency = 880) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    oscillator.start(audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration + 0.02);
  }

  function cuePhaseBeep() {
    if (!audioContext || ![1, 2, 3].includes(remainingSeconds)) return;
    const duration = remainingSeconds === 1 ? 0.25 : 0.1;
    const frequency = remainingSeconds === 1 ? 660 : 440;
    playTone(duration, frequency);
  }

  function getPhaseDuration(exercice, phase) {
    if (phase === 'prep') return exercice.prepDuration || 5;
    if (phase === 'exercise') return exercice.effortDuration || 20;
    if (phase === 'rest') return exercice.restDuration || 10;
    return 0;
  }

  function getPhaseLabel(phase) {
    if (phase === 'prep') return 'Preparation';
    if (phase === 'exercise') return 'Exercise';
    if (phase === 'rest') return 'Rest';
    return 'Complete';
  }

  function renderMedia(exercice) {
    if (exercice && exercice.mediaUrl) {
      exerciceMedia.src = exercice.mediaUrl;
      exerciceMedia.alt = exercice.name;
      exerciceMediaHolder.style.display = '';
    } else {
      exerciceMedia.src = '';
      exerciceMedia.alt = '';
      exerciceMediaHolder.style.display = 'none';
    }
  }

  function getNextExerciseName() {
    if (mode === 'infinite' && random) {
      return 'Random';
    }
    if (mode === 'infinite' && sequence.length > 0) {
      const nextIndex = (currentIndex + 1) % sequence.length;
      return sequence[nextIndex] ? sequence[nextIndex].name : 'None';
    }
    const next = sequence[currentIndex + 1];
    return next ? next.name : 'None';
  }

  let currentIndex = 0;
  let stage = 'prep';
  let remainingSeconds = sequence.length ? getPhaseDuration(sequence[0], stage) : 0;
  const totalSeconds = fullWorkout ? sequence.reduce((sum, item) => sum + getPhaseDuration(item, 'prep') + getPhaseDuration(item, 'exercise') + getPhaseDuration(item, 'rest'), 0) : 0;
  let elapsedSeconds = 0;
  let globalTimerValue = fullWorkout ? totalSeconds : 0;
  let timerInterval = null;
  let paused = false;

  function updateDisplay() {
    if (fullWorkout) {
      globalTimer.textContent = formatTime(Math.max(0, globalTimerValue));
    } else {
      globalTimer.textContent = formatTime(elapsedSeconds);
    }
    exerciceTimer.textContent = formatTime(Math.max(0, remainingSeconds));
    currentExerciceName.textContent = sequence[currentIndex] ? sequence[currentIndex].name : 'Finished';
    currentPhaseName.textContent = getPhaseLabel(stage);
    renderMedia(sequence[currentIndex]);
    nextExerciceName.textContent = getNextExerciseName();
    pauseResume.textContent = paused ? 'Resume' : 'Pause';
  }

  function stopSession() {
    clearInterval(timerInterval);
    window.location.href = 'start_workout.html';
  }

  function completeWorkout() {
    if (fullWorkout && sequence.length > 0) {
      incrementStat(data, 'Workouts completed', 1);
      saveData(data);
    }
    clearInterval(timerInterval);
    currentExerciceName.textContent = 'Workout complete';
    currentPhaseName.textContent = 'Complete';
    exerciceTimer.textContent = '00:00';
    nextExerciceName.textContent = 'Done';
    exerciceMediaHolder.style.display = 'none';
  }

  function pickNextExercise() {
    if (mode === 'full') {
      if (currentIndex < sequence.length - 1) {
        currentIndex += 1;
      } else {
        return false;
      }
    } else if (mode === 'infinite') {
      if (random) {
        currentIndex = Math.floor(Math.random() * sequence.length);
      } else {
        currentIndex = (currentIndex + 1) % sequence.length;
      }
    }
    stage = 'prep';
    remainingSeconds = getPhaseDuration(sequence[currentIndex], stage);
    return true;
  }

  function skipCurrentExercise() {
    if (sequence.length === 0) {
      completeWorkout();
      return;
    }

    if (fullWorkout) {
      const currentExercise = sequence[currentIndex];
      let skipDelta = remainingSeconds;
      if (stage === 'prep') {
        skipDelta += getPhaseDuration(currentExercise, 'exercise') + getPhaseDuration(currentExercise, 'rest');
      } else if (stage === 'exercise') {
        skipDelta += getPhaseDuration(currentExercise, 'rest');
      }
      globalTimerValue = Math.max(0, globalTimerValue - skipDelta);
    }

    if (!pickNextExercise()) {
      completeWorkout();
      return;
    }

    updateDisplay();
  }

  function nextStep() {
    if (sequence.length === 0) {
      completeWorkout();
      return;
    }

    if (remainingSeconds <= 0) {
      if (stage === 'prep') {
        stage = 'exercise';
        remainingSeconds = getPhaseDuration(sequence[currentIndex], stage);
      } else if (stage === 'exercise') {
        incrementStat(data, 'Exercices done', 1);
        saveData(data);
        stage = 'rest';
        remainingSeconds = getPhaseDuration(sequence[currentIndex], stage);
      } else if (stage === 'rest') {
        if (!pickNextExercise()) {
          completeWorkout();
          return;
        }
      }
    }

    if (fullWorkout && globalTimerValue <= 0) {
      completeWorkout();
      return;
    }

    updateDisplay();
  }

  function tick() {
    if (paused) return;
    cuePhaseBeep();
    if (fullWorkout) {
      if (globalTimerValue > 0) {
        globalTimerValue -= 1;
      }
    } else {
      elapsedSeconds += 1;
    }
    if (remainingSeconds > 0) {
      remainingSeconds -= 1;
    }
    nextStep();
  }

  pauseResume.addEventListener('click', () => {
    paused = !paused;
    pauseResume.textContent = paused ? 'Resume' : 'Pause';
  });

  skipButton.addEventListener('click', skipCurrentExercise);
  stopWorkout.addEventListener('click', stopSession);

  updateDisplay();
  timerInterval = setInterval(tick, 1000);
}

function renderStats(data) {
  const list = document.querySelector('#statsList');
  if (!list) return;
  list.innerHTML = '';
  data.stats.forEach(stat => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div><strong>${stat.label}</strong><div>${stat.value}</div></div>`;
    list.appendChild(item);
  });
}

let data;
window.addEventListener('DOMContentLoaded', async () => {
  data = await loadData();
  highlightNavigation();
  const page = document.body.dataset.page;
  if (!page) return;
  if (page === 'index') renderHome(data);
  if (page === 'manage_profiles') renderManageProfiles(data);
  if (page === 'manage_categories') renderManageCategories(data);
  if (page === 'manage_workouts') renderManageWorkouts(data);
  if (page === 'manage_exercices') renderManageExercices(data);
  if (page === 'edit_workout') renderEditWorkout(data);
  if (page === 'edit_exercice') renderEditExercice(data);
  if (page === 'select_exercices') renderSelectExercices(data);
  if (page === 'start_workout') renderStartWorkout(data);
  if (page === 'workout') renderWorkout(data);
  if (page === 'stats') renderStats(data);
});
