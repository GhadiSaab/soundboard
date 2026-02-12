/**
 * Main Application Logic
 */

// State
let sounds = [];
let currentDeleteId = null;

// DOM Elements
const soundsGrid = document.getElementById('soundsGrid');
const emptyState = document.getElementById('emptyState');
const fileInput = document.getElementById('fileInput');
const settingsBtn = document.getElementById('settingsBtn');
const stopBtn = document.getElementById('stopBtn');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const closeStatus = document.getElementById('closeStatus');
const loadingOverlay = document.getElementById('loadingOverlay');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmDelete = document.getElementById('confirmDelete');
const confirmCancel = document.getElementById('confirmCancel');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

/**
 * Initialize the application
 */
async function init() {
  // Check PIN protection
  await checkPinProtection();

  await loadSounds();
  await loadVolume();
  setupEventListeners();
}

/**
 * Check if PIN protection is enabled and user is authenticated
 */
async function checkPinProtection() {
  try {
    const response = await API.checkPinEnabled();

    if (response.enabled) {
      // Check if user is authenticated
      const isAuthenticated = sessionStorage.getItem('pin_verified') === 'true';

      if (!isAuthenticated) {
        // Redirect to login page
        window.location.href = '/login.html';
        return;
      }
    }
  } catch (error) {
    console.error('Error checking PIN protection:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // File upload
  fileInput.addEventListener('change', handleFileUpload);

  // Settings button
  settingsBtn.addEventListener('click', () => {
    window.location.href = '/settings.html';
  });

  // Stop button
  stopBtn.addEventListener('click', handleStop);

  // Close status bar
  closeStatus.addEventListener('click', hideStatus);

  // Modal buttons
  confirmDelete.addEventListener('click', handleConfirmDelete);
  confirmCancel.addEventListener('click', hideConfirmModal);

  // Close modal on background click
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal || e.target.classList.contains('modal-backdrop')) {
      hideConfirmModal();
    }
  });

  // Volume control
  let volumeTimeout;
  volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeValue.textContent = `${volume}%`;

    // Debounce the API call
    clearTimeout(volumeTimeout);
    volumeTimeout = setTimeout(async () => {
      try {
        await API.updateSetting('volume', volume);
      } catch (error) {
        console.error('Error updating volume:', error);
      }
    }, 300);
  });
}

/**
 * Load all sounds
 */
async function loadSounds() {
  try {
    const data = await API.getSounds();
    sounds = data.sounds || [];
    renderSounds();
  } catch (error) {
    console.error('Error loading sounds:', error);
    showStatus('Error loading sounds', 'error');
  }
}

/**
 * Load volume setting
 */
async function loadVolume() {
  try {
    const data = await API.getSettings();
    const settings = data.settings || [];
    const volumeSetting = settings.find(s => s.key === 'volume');
    const volume = volumeSetting ? parseInt(volumeSetting.value) : 80;

    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  } catch (error) {
    console.error('Error loading volume:', error);
  }
}

/**
 * Render sounds grid
 */
function renderSounds() {
  if (sounds.length === 0) {
    soundsGrid.innerHTML = '';
    soundsGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  soundsGrid.classList.remove('hidden');
  emptyState.classList.add('hidden');

  soundsGrid.innerHTML = sounds.map((sound, index) => `
    <div class="sound-card" data-id="${sound.id}" style="--index: ${index}">
      <div class="sound-btn-wrapper">
        <button class="sound-btn" onclick="playSound('${sound.id}')">
          <span class="sound-name" data-sound-id="${sound.id}">${escapeHtml(sound.name)}</span>
        </button>
        <button class="btn-edit-inline" onclick="event.stopPropagation(); startEdit('${sound.id}')" title="Rename" aria-label="Rename sound">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      <button class="delete-btn" onclick="confirmDeleteSound('${sound.id}', '${escapeHtml(sound.name)}')">
        Delete
      </button>
    </div>
  `).join('');
}

/**
 * Play a sound
 */
async function playSound(id) {
  const card = document.querySelector(`[data-id="${id}"]`);

  try {
    // Add playing class
    card?.classList.add('playing');

    await API.playSound(id);
    showStatus('Sound is playing', 'success');

    // Remove playing class after a delay (visual feedback)
    setTimeout(() => {
      card?.classList.remove('playing');
    }, 2000);
  } catch (error) {
    console.error('Error playing sound:', error);
    card?.classList.remove('playing');
    showStatus(error.message || 'Error playing sound', 'error');
  }
}

/**
 * Stop all playback
 */
async function handleStop() {
  try {
    await API.stopPlayback();
    // Remove playing class from all cards
    document.querySelectorAll('.sound-card.playing').forEach(card => {
      card.classList.remove('playing');
    });
    showStatus('Playback stopped', 'success');
  } catch (error) {
    console.error('Error stopping playback:', error);
    showStatus('Error stopping playback', 'error');
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('audio/')) {
    showStatus('Please select an audio file', 'error');
    fileInput.value = '';
    return;
  }

  // Validate file size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showStatus('File size must be less than 10MB', 'error');
    fileInput.value = '';
    return;
  }

  try {
    // Show loading overlay
    loadingOverlay.classList.remove('hidden');

    // Upload file
    await API.uploadSound(file);

    // Reload sounds
    await loadSounds();

    showStatus('Sound uploaded successfully!', 'success');
  } catch (error) {
    console.error('Error uploading sound:', error);
    showStatus(error.message || 'Error uploading sound', 'error');
  } finally {
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    // Reset file input
    fileInput.value = '';
  }
}

/**
 * Start editing a sound name
 */
function startEdit(id) {
  const nameElement = document.querySelector(`.sound-name[data-sound-id="${id}"]`);
  if (!nameElement) return;

  const currentName = nameElement.textContent;
  const soundButton = nameElement.closest('.sound-btn');
  const wrapper = soundButton.closest('.sound-btn-wrapper');
  const editButton = wrapper ? wrapper.querySelector('.btn-edit-inline') : null;

  // Hide edit button during editing
  if (editButton) {
    editButton.style.display = 'none';
  }

  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sound-name-input';
  input.value = currentName;
  input.dataset.soundId = id;
  input.dataset.originalName = currentName;

  // Replace name with input
  nameElement.replaceWith(input);

  // Focus and select after a tiny delay to ensure it's rendered
  setTimeout(() => {
    input.focus();
    input.select();
  }, 10);

  // Handle save on Enter or blur
  const saveEdit = async () => {
    const newName = input.value.trim();

    if (!newName) {
      showStatus('Name cannot be empty', 'error');
      input.value = input.dataset.originalName;
      return;
    }

    if (newName === input.dataset.originalName) {
      // No change, just restore
      const span = document.createElement('span');
      span.className = 'sound-name';
      span.dataset.soundId = id;
      span.textContent = newName;
      input.replaceWith(span);

      // Show edit button again
      if (editButton) {
        editButton.style.display = '';
      }
      return;
    }

    try {
      await API.updateSound(id, newName);

      // Update the sound in our local array
      const sound = sounds.find(s => s.id === id);
      if (sound) {
        sound.name = newName;
      }

      // Restore the span with new name
      const span = document.createElement('span');
      span.className = 'sound-name';
      span.dataset.soundId = id;
      span.textContent = newName;
      input.replaceWith(span);

      // Show edit button again
      if (editButton) {
        editButton.style.display = '';
      }

      showStatus('Sound renamed successfully!', 'success');
    } catch (error) {
      console.error('Error renaming sound:', error);
      showStatus(error.message || 'Error renaming sound', 'error');

      // Restore original name on error
      const span = document.createElement('span');
      span.className = 'sound-name';
      span.dataset.soundId = id;
      span.textContent = input.dataset.originalName;
      input.replaceWith(span);

      // Show edit button again
      if (editButton) {
        editButton.style.display = '';
      }
    }
  };

  // Cancel on Escape
  const cancelEdit = () => {
    const span = document.createElement('span');
    span.className = 'sound-name';
    span.dataset.soundId = id;
    span.textContent = input.dataset.originalName;
    input.replaceWith(span);

    // Show edit button again
    if (editButton) {
      editButton.style.display = '';
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });

  input.addEventListener('blur', saveEdit);
}

/**
 * Show confirmation modal for deleting a sound
 */
function confirmDeleteSound(id, name) {
  currentDeleteId = id;
  confirmMessage.textContent = `Are you sure you want to delete "${name}"?`;
  confirmModal.classList.remove('hidden');
}

/**
 * Hide confirmation modal
 */
function hideConfirmModal() {
  currentDeleteId = null;
  confirmModal.classList.add('hidden');
}

/**
 * Handle confirmed deletion
 */
async function handleConfirmDelete() {
  if (!currentDeleteId) return;

  try {
    await API.deleteSound(currentDeleteId);
    await loadSounds();
    showStatus('Sound deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting sound:', error);
    showStatus('Error deleting sound', 'error');
  } finally {
    hideConfirmModal();
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  statusText.textContent = message;
  statusBar.className = `status-bar ${type}`;
  statusBar.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideStatus();
  }, 5000);
}

/**
 * Hide status message
 */
function hideStatus() {
  statusBar.classList.add('hidden');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
