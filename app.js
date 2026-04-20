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
      normalizeData(data);
      if (!isEmptyData(data)) {
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
    normalizeData(sample);
    saveData(sample);
    return sample;
  } catch (error) {
    console.error('Unable to load sample_data.json:', error);
    const fallback = {
      profile: { name: 'Guest', categories: [] },
      workouts: [],
      exercices: []
    };
    normalizeData(fallback);
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
    normalizeData(sample);
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

const STATS_STORAGE_KEY = 'tabata_stats_data';

function loadStatsData() {
  const stored = localStorage.getItem(STATS_STORAGE_KEY);
  if (!stored) {
    return { workoutsDone: [], exercicesDone: [] };
  }
  try {
    const parsed = JSON.parse(stored);
    return normalizeStatsData(parsed);
  } catch (error) {
    console.warn('Invalid stats storage, resetting history.');
    return { workoutsDone: [], exercicesDone: [] };
  }
}

function saveStatsData(stats) {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

function normalizeStatsData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { workoutsDone: [], exercicesDone: [] };
  }
  const normalized = {
    workoutsDone: Array.isArray(parsed.workoutsDone) ? parsed.workoutsDone : [],
    exercicesDone: Array.isArray(parsed.exercicesDone) ? parsed.exercicesDone : []
  };
  if (Array.isArray(parsed) && parsed.length > 0) {
    normalized.workoutsDone = parsed;
  }
  return normalized;
}

function validateStatsJson(obj) {
  if (Array.isArray(obj)) {
    return null;
  }
  if (!obj || typeof obj !== 'object') {
    return 'Stats JSON must be an array or object.';
  }
  if (!Array.isArray(obj.workoutsDone)) {
    return 'Stats object must include workoutsDone array.';
  }
  if (!Array.isArray(obj.exercicesDone)) {
    return 'Stats object must include exercicesDone array.';
  }
  return null;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderBanner(data) {
  const header = document.querySelector('header');
  if (!header) return;
  let banner = document.querySelector('#bannerBar');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'bannerBar';
    banner.className = 'banner-bar';
    header.insertAdjacentElement('afterend', banner);
  }
  const bannerText = data.profile.banner || `Profile: ${data.profile.name}`;
  banner.innerHTML = `
    <div class="banner-content">${bannerText}</div>
    <div class="banner-actions">
      <a class="button small" href="stats.html">Stats</a>
    </div>`;
}

function renderStatsPage(data) {
  const list = document.querySelector('#statsList');
  const textarea = document.querySelector('#statsJsonData');
  const downloadButton = document.querySelector('#downloadJson');
  const loadButton = document.querySelector('#loadJson');
  const fileInput = document.querySelector('#importJsonFile');
  if (textarea) {
    textarea.value = JSON.stringify(statsData, null, 2);
  }

  function updateList() {
    if (!list) return;
    list.innerHTML = '';
    if (!statsData.workoutsDone || statsData.workoutsDone.length === 0) {
      list.innerHTML = '<p>No workouts completed yet.</p>';
      return;
    }
    statsData.workoutsDone.slice().reverse().forEach(workout => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div>
          <strong>${workout.type === 'workout' ? 'Workout' : 'Category workout'}</strong>
          <div>ID: ${workout.id}</div>
          <div>Profile: ${workout.profileName || 'Unknown'}</div>
          <div>Selected workout: ${workout.selectedWorkout || 'N/A'}</div>
          <div>Selected categories: ${Array.isArray(workout.selectedCategories) ? workout.selectedCategories.join(', ') : 'N/A'}</div>
          <div>Start: ${formatDateTime(workout.startDateTime)}</div>
          <div>End: ${formatDateTime(workout.endDateTime)}</div>
        </div>
        <div class="list-item-actions">
          <button class="button small" data-action="view-workout" data-id="${workout.id}">View exercises</button>
        </div>`;
      list.appendChild(item);
    });
  }

  updateList();

  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      const json = JSON.stringify(statsData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stats.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  if (loadButton) {
    loadButton.addEventListener('click', () => {
      if (!textarea) return;
      try {
        const parsed = JSON.parse(textarea.value);
        const validationError = validateStatsJson(parsed);
        if (validationError) {
          alert(validationError);
          return;
        }
        statsData = normalizeStatsData(parsed);
        saveStatsData(statsData);
        updateList();
        alert('Stats JSON loaded successfully.');
      } catch (error) {
        alert('Invalid JSON format.');
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const validationError = validateStatsJson(parsed);
          if (validationError) {
            alert(validationError);
            return;
          }
          statsData = normalizeStatsData(parsed);
          saveStatsData(statsData);
          if (textarea) textarea.value = JSON.stringify(statsData, null, 2);
          updateList();
          alert('Stats JSON loaded successfully.');
        } catch (error) {
          alert('Invalid JSON format.');
        }
      };
      reader.readAsText(file);
    });
  }

  if (list) {
    list.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const workoutId = button.dataset.id;
      if (button.dataset.action === 'view-workout') {
        window.location.href = `workout_done.html?id=${workoutId}`;
      }
    });
  }
}

function renderWorkoutDonePage(data) {
  const params = parseQuery();
  const workoutDoneId = params.id;
  const title = document.querySelector('#workoutDoneTitle');
  const summary = document.querySelector('#workoutDoneSummary');
  const list = document.querySelector('#exerciceDoneList');
  if (!title || !summary || !list) return;

  const workout = statsData.workoutsDone.find(item => item.id === workoutDoneId);
  if (!workout) {
    title.textContent = 'Workout not found';
    summary.innerHTML = '<p>Unable to find workout history for this id.</p>';
    list.innerHTML = '';
    return;
  }

  title.textContent = `Workout done: ${workout.id}`;
  summary.innerHTML = `
    <div><strong>Type:</strong> ${workout.type === 'workout' ? 'Workout' : 'Category'}</div>
    <div><strong>Profile:</strong> ${workout.profileName || 'Unknown'}</div>
    <div><strong>Selected workout:</strong> ${workout.selectedWorkout || 'N/A'}</div>
    <div><strong>Selected categories:</strong> ${Array.isArray(workout.selectedCategories) ? workout.selectedCategories.join(', ') : 'N/A'}</div>
    <div><strong>Start:</strong> ${formatDateTime(workout.startDateTime)}</div>
    <div><strong>End:</strong> ${formatDateTime(workout.endDateTime)}</div>`;

  const exercices = statsData.exercicesDone.filter(item => item.workoutDoneId === workoutDoneId);
  list.innerHTML = '';
  if (exercices.length === 0) {
    list.innerHTML = '<p>No exercise history recorded for this workout.</p>';
    return;
  }
  exercices.forEach(ex => {
    const exercice = getExercice(data, ex.exerciceId);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <strong>${exercice ? exercice.name : ex.exerciceId}</strong>
        <div>Exercise ID: ${ex.exerciceId}</div>
        <div>Skipped: ${ex.skipped ? 'Yes' : 'No'}</div>
        <div>Start: ${formatDateTime(ex.startDateTime)}</div>
        <div>End: ${formatDateTime(ex.endDateTime)}</div>
      </div>`;
    list.appendChild(item);
  });
}

function getWorkoutDoneById(id) {
  return statsData.workoutsDone.find(item => item.id === id);
}

function getExercicesDoneForWorkout(id) {
  return statsData.exercicesDone.filter(item => item.workoutDoneId === id);
}

function getWorkoutDoneExercisesCount(workoutId) {
  return getExercicesDoneForWorkout(workoutId).length;
}

function getStatsDataCopy() {
  return JSON.parse(JSON.stringify(statsData));
}

function appendStatsJsonToTextarea(textarea) {
  if (!textarea) return;
  textarea.value = JSON.stringify(statsData, null, 2);
}

function deleteStatsData() {
  statsData = { workoutsDone: [], exercicesDone: [] };
  saveStatsData(statsData);
}

function initializeStatsData() {
  statsData = loadStatsData();
}

function normalizeData(data) {
  if (!data.profile || typeof data.profile !== 'object') {
    data.profile = { name: 'Guest', banner: '', categories: [] };
  }
  if (!Array.isArray(data.profile.categories)) {
    data.profile.categories = [];
  }
  if (typeof data.profile.banner !== 'string') {
    data.profile.banner = '';
  }
  if (!Array.isArray(data.exercices)) {
    data.exercices = [];
  }
  data.exercices.forEach(ex => {
    if (!Array.isArray(ex.categories)) {
      ex.categories = [];
    }
    if (typeof ex.completionCount !== 'number') {
      ex.completionCount = 0;
    }
  });
  if (!Array.isArray(data.workouts)) {
    data.workouts = [];
  }
}

function getExportProfile(data) {
  return {
    profile: data.profile,
    workouts: data.workouts,
    exercices: data.exercices
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
  normalizeData(data);
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
    item.className = `list-item clickable ${hasCategory ? 'highlighted' : ''}`;
    item.innerHTML = `
      <div>
        <strong>${ex.name}</strong>
        <div>${ex.description}</div>
      </div>`;
    item.addEventListener('click', () => {
      if (!Array.isArray(ex.categories)) ex.categories = [];
      const index = ex.categories.indexOf(category);
      if (index > -1) {
        ex.categories.splice(index, 1);
      } else {
        ex.categories.push(category);
      }
      saveData(data);
      showCategoryExercises(category);
    });
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
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Completed: ${exercice.completionCount || 0} times</div>
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

  // Display completion count
  const completionCountDisplay = document.querySelector('#completionCount');
  if (completionCountDisplay) {
    completionCountDisplay.textContent = exercice.completionCount || 0;
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
  const selectAllCategories = document.querySelector('#selectAllCategories');
  const categoriesCheckboxes = document.querySelector('#categoriesCheckboxes');
  const modeFull = document.querySelector('#modeFull');
  const modeInfinite = document.querySelector('#modeInfinite');
  const startButton = document.querySelector('#startWorkout');
  if (!typeWorkout || !typeCategories || !workoutSection || !categoriesSection || !workoutSelect || !selectAllCategories || !categoriesCheckboxes || !modeFull || !modeInfinite || !startButton) return;

  data.workouts.forEach(workout => {
    const option = document.createElement('option');
    option.value = workout.id;
    option.textContent = workout.name;
    workoutSelect.appendChild(option);
  });

  function syncSelectAllCategories() {
    const categoryInputs = Array.from(categoriesCheckboxes.querySelectorAll('input[type="checkbox"]'));
    const checkedCount = categoryInputs.filter(input => input.checked).length;
    const hasCategories = categoryInputs.length > 0;
    selectAllCategories.disabled = !hasCategories;
    selectAllCategories.checked = hasCategories && checkedCount === categoryInputs.length;
    selectAllCategories.indeterminate = hasCategories && checkedCount > 0 && checkedCount < categoryInputs.length;
  }

  function setAllCategoriesChecked(checked) {
    const categoryInputs = categoriesCheckboxes.querySelectorAll('input[type="checkbox"]');
    categoryInputs.forEach(input => {
      input.checked = checked;
    });
    syncSelectAllCategories();
  }

  function updateCategories() {
    categoriesCheckboxes.innerHTML = '';
    const categories = Array.isArray(data.profile.categories) ? data.profile.categories : [];
    if (categories.length === 0) {
      categoriesCheckboxes.textContent = 'No categories available. Add some first.';
      syncSelectAllCategories();
      return;
    }
    categories.forEach(category => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${category}" /> ${category}`;
      categoriesCheckboxes.appendChild(label);
    });
    syncSelectAllCategories();
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
  selectAllCategories.addEventListener('change', () => {
    setAllCategoriesChecked(selectAllCategories.checked);
  });
  categoriesCheckboxes.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    syncSelectAllCategories();
  });

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
  const phaseStage = document.querySelector('#phaseStage');
  const exerciceMedia = document.querySelector('#exerciceMedia');
  const exerciceMediaHolder = document.querySelector('#exerciceMediaHolder');
  const exerciceTimer = document.querySelector('#exerciceTimer');
  const nextExerciceName = document.querySelector('#nextExerciceName');
  const pauseResume = document.querySelector('#pauseResume');
  const skipButton = document.querySelector('#skipExercise');
  const stopWorkout = document.querySelector('#stopWorkout');
  const workoutDoneActions = document.querySelector('#workoutDoneActions');
  if (!workoutNameLabel || !globalTimer || !currentExerciceName || !currentPhaseName || !phaseStage || !exerciceMedia || !exerciceMediaHolder || !exerciceTimer || !nextExerciceName || !pauseResume || !skipButton || !stopWorkout || !workoutDoneActions) {
    return;
  }

  workoutNameLabel.textContent = workoutName;
  const random = params.random === 'true';
  const mode = params.mode === 'infinite' ? 'infinite' : 'full';
  const fullWorkout = mode === 'full';
  const selectedCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
  const workoutDoneId = `wd${Date.now()}`;
  const workoutDone = {
    id: workoutDoneId,
    type: workoutId ? 'workout' : 'category',
    selectedCategories,
    selectedWorkout: workoutId || '',
    startDateTime: new Date().toISOString(),
    endDateTime: null,
    profileName: data.profile.name || 'Guest'
  };
  const exerciceSessions = [];
  let currentExerciseSession = null;

  function closeCurrentExerciseSession(skipped) {
    if (!currentExerciseSession || currentExerciseSession.endDateTime) return;
    currentExerciseSession.skipped = Boolean(skipped);
    currentExerciseSession.endDateTime = new Date().toISOString();
    exerciceSessions.push(currentExerciseSession);
    currentExerciseSession = null;
  }

  function startExerciseSession(exercice) {
    if (!exercice) return;
    closeCurrentExerciseSession(true);
    currentExerciseSession = {
      exerciceId: exercice.id,
      workoutDoneId,
      skipped: false,
      startDateTime: new Date().toISOString(),
      endDateTime: null
    };
  }

  function saveWorkoutStats() {
    workoutDone.endDateTime = new Date().toISOString();
    statsData.workoutsDone.push(workoutDone);
    statsData.exercicesDone.push(...exerciceSessions);
    saveStatsData(statsData);
  }

  function showWorkoutDoneButton() {
    workoutDoneActions.innerHTML = '';
    const button = document.createElement('button');
    button.className = 'button';
    button.textContent = 'View workout details';
    button.addEventListener('click', () => {
      window.location.href = `workout_done.html?id=${workoutDoneId}`;
    });
    workoutDoneActions.appendChild(button);
  }

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

  const prepCountdownAudio = new Audio(encodeURI('countdown start workout.mp3'));
  const effortCountdownAudio = new Audio(encodeURI('countdown end workout.mp3'));
  prepCountdownAudio.preload = 'auto';
  effortCountdownAudio.preload = 'auto';
  prepCountdownAudio.load();
  effortCountdownAudio.load();

  let workoutAudioPrimed = false;
  let workoutAudioPrimePromise = null;
  let hasPlayedPrepCountdownForPhase = false;
  let hasPlayedEffortCountdownForPhase = false;

  prepCountdownAudio.volume = 1;
  effortCountdownAudio.volume = 1;

  function primeSingleAudio(audio) {
    audio.muted = true;
    return audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  }

  function primeWorkoutAudio() {
    if (workoutAudioPrimed) return Promise.resolve();
    if (workoutAudioPrimePromise) return workoutAudioPrimePromise;
    workoutAudioPrimePromise = Promise.all([
      primeSingleAudio(prepCountdownAudio),
      primeSingleAudio(effortCountdownAudio)
    ]).then(() => {
      workoutAudioPrimed = true;
    }).finally(() => {
      workoutAudioPrimePromise = null;
    });
    return workoutAudioPrimePromise;
  }

  function playCountdownAudio(audio) {
    const startPlayback = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay rejections if no user gesture happened yet.
      });
    };
    if (workoutAudioPrimed) {
      startPlayback();
      return;
    }
    primeWorkoutAudio().finally(startPlayback);
  }

  function triggerPhaseCountdownCues() {
    if (stage === 'prep') {
      if (remainingSeconds === 3 && !hasPlayedPrepCountdownForPhase) {
        playCountdownAudio(prepCountdownAudio);
        hasPlayedPrepCountdownForPhase = true;
      }
    } else {
      hasPlayedPrepCountdownForPhase = false;
    }

    if (stage === 'exercise') {
      if (remainingSeconds === 3 && !hasPlayedEffortCountdownForPhase) {
        playCountdownAudio(effortCountdownAudio);
        hasPlayedEffortCountdownForPhase = true;
      }
    } else {
      hasPlayedEffortCountdownForPhase = false;
    }
  }

  function getPhaseDuration(exercice, phase) {
    if (phase === 'prep') return exercice.prepDuration || 5;
    if (phase === 'exercise') return exercice.effortDuration || 20;
    if (phase === 'rest') return exercice.restDuration || 10;
    return 0;
  }

  function getPhaseLabel(phase) {
    if (phase === 'prep') return 'Preparation';
    if (phase === 'exercise') return 'Effort';
    if (phase === 'rest') return 'Rest';
    return 'Complete';
  }

  function setPhaseState(phase) {
    phaseStage.classList.remove('phase-prep', 'phase-effort', 'phase-rest', 'phase-complete', 'phase-stopped');
    if (phase === 'prep') {
      phaseStage.classList.add('phase-prep');
      return;
    }
    if (phase === 'exercise') {
      phaseStage.classList.add('phase-effort');
      return;
    }
    if (phase === 'rest') {
      phaseStage.classList.add('phase-rest');
      return;
    }
    if (phase === 'stopped') {
      phaseStage.classList.add('phase-stopped');
      return;
    }
    phaseStage.classList.add('phase-complete');
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
  if (sequence.length > 0) {
    startExerciseSession(sequence[0]);
  }
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
    setPhaseState(stage);
    renderMedia(sequence[currentIndex]);
    nextExerciceName.textContent = getNextExerciseName();
    pauseResume.textContent = paused ? 'Resume' : 'Pause';
    triggerPhaseCountdownCues();
  }

  function stopSession() {
    clearInterval(timerInterval);
    closeCurrentExerciseSession(true);
    saveWorkoutStats();
    currentExerciceName.textContent = 'Workout stopped';
    currentPhaseName.textContent = 'Stopped';
    setPhaseState('stopped');
    exerciceTimer.textContent = '00:00';
    nextExerciceName.textContent = 'Stopped';
    exerciceMediaHolder.style.display = 'none';
    showWorkoutDoneButton();
  }

  function completeWorkout() {
    closeCurrentExerciseSession(false);
    saveWorkoutStats();
    clearInterval(timerInterval);
    currentExerciceName.textContent = 'Workout complete';
    currentPhaseName.textContent = 'Complete';
    setPhaseState('complete');
    exerciceTimer.textContent = '00:00';
    nextExerciceName.textContent = 'Done';
    exerciceMediaHolder.style.display = 'none';
    showWorkoutDoneButton();
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
    hasPlayedPrepCountdownForPhase = false;
    hasPlayedEffortCountdownForPhase = false;
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

    closeCurrentExerciseSession(true);
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
        hasPlayedPrepCountdownForPhase = false;
        hasPlayedEffortCountdownForPhase = false;
      } else if (stage === 'exercise') {
        const currentExercise = sequence[currentIndex];
        if (currentExercise) {
          if (typeof currentExercise.completionCount !== 'number') {
            currentExercise.completionCount = 0;
          }
          currentExercise.completionCount += 1;
        }
        closeCurrentExerciseSession(false);
        saveData(data);
        stage = 'rest';
        remainingSeconds = getPhaseDuration(sequence[currentIndex], stage);
        hasPlayedEffortCountdownForPhase = false;
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
    primeWorkoutAudio();
    paused = !paused;
    pauseResume.textContent = paused ? 'Resume' : 'Pause';
  });
  skipButton.addEventListener('click', primeWorkoutAudio);
  stopWorkout.addEventListener('click', primeWorkoutAudio);
  document.addEventListener('pointerdown', primeWorkoutAudio, { once: true });
  document.addEventListener('keydown', primeWorkoutAudio, { once: true });
  document.addEventListener('touchstart', primeWorkoutAudio, { once: true });
  skipButton.addEventListener('click', skipCurrentExercise);
  stopWorkout.addEventListener('click', stopSession);
  updateDisplay();
  timerInterval = setInterval(tick, 1000);
}

function renderButtonTest() {
  const startButton = document.querySelector('#testPlayStart');
  const endButton = document.querySelector('#testPlayEnd');
  const stopButton = document.querySelector('#testStopAll');
  const primeButton = document.querySelector('#testPrimeAudio');
  const volumeSlider = document.querySelector('#testVolume');
  const volumeValue = document.querySelector('#testVolumeValue');
  const log = document.querySelector('#audioTestLog');
  if (!startButton || !endButton || !stopButton || !primeButton || !volumeSlider || !volumeValue || !log) return;

  const startAudio = new Audio(encodeURI('countdown start workout.mp3'));
  const endAudio = new Audio(encodeURI('countdown end workout.mp3'));
  startAudio.preload = 'auto';
  endAudio.preload = 'auto';
  startAudio.load();
  endAudio.load();

  let startPrimed = false;
  let endPrimed = false;
  let primePromise = null;

  function appendLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    log.textContent = `[${timestamp}] ${message}\n${log.textContent}`;
  }

  function applyVolume() {
    const level = Number(volumeSlider.value) / 100;
    const mapped = Math.min(1, Math.pow(level, 0.92));
    startAudio.volume = mapped;
    endAudio.volume = mapped;
    volumeValue.textContent = `${Math.round(level * 100)}%`;
  }

  function primeAudio(audio, markPrimed, label) {
    audio.muted = true;
    const requestAt = performance.now();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      return playPromise.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        markPrimed();
        appendLog(`${label} primed in ${Math.round(performance.now() - requestAt)} ms`);
      }).catch(error => {
        audio.muted = false;
        appendLog(`${label} prime failed: ${error.message}`);
      });
    }
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    markPrimed();
    appendLog(`${label} primed`);
    return Promise.resolve();
  }

  function primeBoth() {
    if (primePromise) return primePromise;
    const tasks = [];
    if (!startPrimed) {
      tasks.push(primeAudio(startAudio, () => {
        startPrimed = true;
      }, 'Start sound'));
    }
    if (!endPrimed) {
      tasks.push(primeAudio(endAudio, () => {
        endPrimed = true;
      }, 'End sound'));
    }
    if (tasks.length === 0) return Promise.resolve();
    primePromise = Promise.all(tasks).finally(() => {
      primePromise = null;
    });
    return primePromise;
  }

  async function playWithMetrics(audio, label) {
    await primeBoth();
    const requestAt = performance.now();
    const onPlaying = () => {
      appendLog(`${label} playing event after ${Math.round(performance.now() - requestAt)} ms`);
      audio.removeEventListener('playing', onPlaying);
    };

    audio.pause();
    audio.currentTime = 0;
    audio.addEventListener('playing', onPlaying);
    audio.play().then(() => {
      appendLog(`${label} play() resolved in ${Math.round(performance.now() - requestAt)} ms`);
    }).catch(error => {
      audio.removeEventListener('playing', onPlaying);
      appendLog(`${label} play failed: ${error.message}`);
    });
  }

  function stopAll() {
    startAudio.pause();
    endAudio.pause();
    startAudio.currentTime = 0;
    endAudio.currentTime = 0;
    appendLog('Stopped all sounds');
  }

  volumeSlider.addEventListener('input', applyVolume);
  primeButton.addEventListener('click', () => {
    primeBoth();
  });
  startButton.addEventListener('click', () => {
    playWithMetrics(startAudio, 'Start sound');
  });
  endButton.addEventListener('click', () => {
    playWithMetrics(endAudio, 'End sound');
  });
  stopButton.addEventListener('click', stopAll);

  applyVolume();
  appendLog('Audio test ready');
}

let data;
let statsData;
window.addEventListener('DOMContentLoaded', async () => {
  data = await loadData();
  statsData = loadStatsData();
  renderBanner(data);
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
  if (page === 'button_test') renderButtonTest();
  if (page === 'stats') renderStatsPage(data);
  if (page === 'workout_done') renderWorkoutDonePage(data);
});
