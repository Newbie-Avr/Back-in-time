/**
 * Back in Time — Settings & Local AI Configuration
 * Manages LM Studio connection diagnostics, model discovery,
 * and data backup import/export.
 */

class ArchiveSettings {
  constructor() {
    this.isOnline = false;
  }

  init() {
    this.loadSettingsIntoForm();
    this.checkConnection(true); // background silent check
    this.bindEvents();
  }

  loadSettingsIntoForm() {
    const settings = window.archiveStorage.getSettings();
    const urlInput = document.getElementById('setting-server-url');
    const lengthSelect = document.getElementById('setting-response-length');
    const modelInput = document.getElementById('setting-custom-model');

    if (urlInput) urlInput.value = settings.lmStudioBaseUrl || 'http://127.0.0.1:1234/v1';
    if (lengthSelect) lengthSelect.value = String(settings.maxTokens || 900);
    if (modelInput) modelInput.value = settings.modelId || '';
  }

  bindEvents() {
    // Form submit
    const form = document.getElementById('settings-ai-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveSettingsFromForm();
      });
    }

    // Test connection button
    const btnTest = document.getElementById('btn-test-connection');
    if (btnTest) {
      btnTest.addEventListener('click', () => this.checkConnection(false));
    }

    // Auto-detect models button
    const btnDetect = document.getElementById('btn-auto-detect-models');
    if (btnDetect) {
      btnDetect.addEventListener('click', () => this.detectModels());
    }

    // Copy Gemma system prompt button
    const btnCopyPrompt = document.getElementById('btn-copy-system-prompt');
    const promptTextarea = document.getElementById('gemma-system-prompt-text');
    if (btnCopyPrompt && promptTextarea) {
      btnCopyPrompt.addEventListener('click', () => {
        promptTextarea.select();
        navigator.clipboard.writeText(promptTextarea.value)
          .then(() => window.appToast('Gemma System Prompt copied to clipboard!', 'success'))
          .catch(() => window.appToast('Copied to clipboard.', 'success'));
      });
    }

    // Export archive JSON
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.archiveStorage.exportArchive();
        window.appToast('Archive exported successfully as JSON.', 'success');
      });
    }

    // Import archive JSON
    const fileImport = document.getElementById('file-import-json');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => this.handleFileImport(e));
    }

    // Load sample archive from settings or home
    const btnLoadSample = document.getElementById('btn-load-sample-settings');
    const btnLoadSampleHome = document.getElementById('btn-load-sample-home');
    const loadSampleAction = () => {
      window.appConfirm(
        'Load Sample Records',
        'This will load 6 curated historical records into your archive. Existing records will be preserved. Proceed?',
        () => {
          window.archiveStorage.loadSamples();
          window.appToast('Sample records loaded successfully.', 'success');
          if (window.app) window.app.refreshAll();
        }
      );
    };
    if (btnLoadSample) btnLoadSample.addEventListener('click', loadSampleAction);
    if (btnLoadSampleHome) btnLoadSampleHome.addEventListener('click', loadSampleAction);

    // Clear all archive data
    const btnClear = document.getElementById('btn-clear-archive');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        window.appConfirm(
          'Delete All Records?',
          'WARNING: This will permanently delete all memories and conversation records from this browser. This action cannot be undone. Make sure you have exported a JSON backup first.',
          () => {
            window.archiveStorage.clearAll();
            window.appToast('All memories have been deleted.', 'error');
            if (window.app) window.app.refreshAll();
          }
        );
      });
    }
  }

  async saveSettingsFromForm() {
    const urlInput = document.getElementById('setting-server-url');
    const modelSelect = document.getElementById('setting-model-id');
    const customModelInput = document.getElementById('setting-custom-model');
    const lengthSelect = document.getElementById('setting-response-length');

    const newUrl = urlInput.value.trim();
    const selectedModel = modelSelect.value || customModelInput.value.trim();
    const maxTokens = parseInt(lengthSelect.value, 10) || 900;

    // Send update to server proxy
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lmStudioBaseUrl: newUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update server settings.');
      }

      window.archiveStorage.saveSettings({
        lmStudioBaseUrl: newUrl,
        modelId: selectedModel,
        maxTokens
      });

      window.appToast('Settings saved successfully.', 'success');
      await this.checkConnection(false);
    } catch (err) {
      window.appToast(err.message, 'error');
    }
  }

  async checkConnection(silent = false) {
    const globalStatus = document.getElementById('global-ai-status');
    const diagnosticBox = document.getElementById('diagnostic-box');
    const diagnosticStatus = document.getElementById('diagnostic-status');
    const diagnosticDetails = document.getElementById('diagnostic-details');
    const serverAlert = document.getElementById('explorer-server-alert');

    if (!silent && diagnosticStatus) {
      diagnosticStatus.textContent = 'Status: Testing connection...';
      diagnosticStatus.className = 'diagnostic-status';
      diagnosticDetails.textContent = 'Connecting to local LM Studio server...';
    }

    try {
      const res = await fetch('/api/health');
      const data = await res.json();

      if (data.lmStudio && data.lmStudio.online) {
        this.isOnline = true;
        const modelCount = data.lmStudio.models.length;
        const activeModel = data.lmStudio.models[0] || 'Model Ready';

        // Update header pill
        if (globalStatus) {
          globalStatus.innerHTML = `
            <span class="status-dot status-online"></span>
            <span class="status-label">LM Studio: Connected</span>
          `;
          globalStatus.title = `LM Studio is online. Available models: ${modelCount}`;
        }

        // Hide alert banner in explorer
        if (serverAlert) serverAlert.classList.add('hidden');

        // Update diagnostics box
        if (diagnosticStatus) {
          diagnosticStatus.textContent = 'Status: Online & Ready';
          diagnosticStatus.className = 'diagnostic-status online';
          diagnosticDetails.innerHTML = `Successfully reached LM Studio at <code>${data.lmStudio.url}</code>. Detected ${modelCount} loaded/available model(s).`;
        }

        this.populateModelList(data.lmStudio.models);
        if (!silent) {
          window.appToast('LM Studio connected successfully!', 'success');
        }
      } else {
        throw new Error(data.lmStudio ? data.lmStudio.error : 'LM Studio is not responding');
      }
    } catch (err) {
      this.isOnline = false;

      // Update header pill
      if (globalStatus) {
        globalStatus.innerHTML = `
          <span class="status-dot status-offline"></span>
          <span class="status-label">LM Studio: Offline</span>
        `;
        globalStatus.title = 'LM Studio local server is offline.';
      }

      // Show alert banner in explorer
      if (serverAlert) serverAlert.classList.remove('hidden');

      if (diagnosticStatus) {
        diagnosticStatus.textContent = 'Status: Offline / Unreachable';
        diagnosticStatus.className = 'diagnostic-status offline';
        diagnosticDetails.innerHTML = `${err.message}<br><br><strong>Troubleshooting:</strong><br>1. Open LM Studio.<br>2. Select the '&lt;&gt;' Local Server tab.<br>3. Load a model (e.g. Gemma 2).<br>4. Click 'Start Server' on port 1234.`;
      }

      if (!silent) {
        window.appToast('LM Studio server is offline.', 'error');
      }
    }
  }

  async detectModels() {
    window.appToast('Scanning for models in LM Studio...', 'info');
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query models.');
      }

      this.populateModelList(data.models);
      window.appToast(`Found ${data.models.length} model(s) in LM Studio.`, 'success');
    } catch (err) {
      window.appToast(err.message, 'error');
    }
  }

  populateModelList(models) {
    const modelSelect = document.getElementById('setting-model-id');
    const customModelInput = document.getElementById('setting-custom-model');
    const settings = window.archiveStorage.getSettings();

    if (!modelSelect) return;
    modelSelect.innerHTML = '';

    if (!models || models.length === 0) {
      modelSelect.innerHTML = '<option value="">(No models detected — start server in LM Studio)</option>';
      if (customModelInput) customModelInput.classList.remove('hidden');
      return;
    }

    models.forEach(modelId => {
      const opt = document.createElement('option');
      opt.value = modelId;
      opt.textContent = modelId;
      if (modelId === settings.modelId) {
        opt.selected = true;
      }
      modelSelect.appendChild(opt);
    });

    // If no model was previously saved, default to the first one available
    if (!settings.modelId && models.length > 0) {
      modelSelect.value = models[0];
      window.archiveStorage.saveSettings({ modelId: models[0] });
    }
  }

  handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        window.appConfirm(
          'Import Memory Archive',
          'Choose import mode:\nClick OK to MERGE imported records with your current archive, or Cancel to abort.',
          () => {
            const count = window.archiveStorage.importArchive(content, 'merge');
            window.appToast(`Successfully imported ${count} memory record(s).`, 'success');
            if (window.app) window.app.refreshAll();
          }
        );
      } catch (err) {
        window.appToast(`Import failed: ${err.message}`, 'error');
      } finally {
        event.target.value = ''; // reset file input
      }
    };
    reader.readAsText(file);
  }
}

window.archiveSettings = new ArchiveSettings();
